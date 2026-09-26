import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });
  try {
    const { vendorId, mensaje } = req.body;
    if (!vendorId) return res.status(400).json({ error: "Falta vendorId" });

    webpush.setVapidDetails(
      "mailto:admin@elcastanio.com.ar",
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );

    const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
    const { data, error } = await supabase.from("push_subscriptions").select("*").eq("vendor_id", vendorId);
    if (error) throw error;

    const payload = JSON.stringify({
      title: "El Castaño",
      body: mensaje || "Se despachó tu pedido de la semana.",
    });

    const resultados = await Promise.allSettled(
      (data || []).map((row) => webpush.sendNotification(row.subscription, payload))
    );

    // Si una suscripción quedó vieja/inválida (410/404), la borramos.
    for (let i = 0; i < resultados.length; i++) {
      const r = resultados[i];
      if (r.status === "rejected" && (r.reason?.statusCode === 410 || r.reason?.statusCode === 404)) {
        await supabase.from("push_subscriptions").delete().eq("id", data[i].id);
      }
    }

    res.status(200).json({ ok: true, enviados: resultados.filter((r) => r.status === "fulfilled").length });
  } catch (err) {
    res.status(500).json({ error: String(err.message || err) });
  }
}
