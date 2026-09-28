import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });
  try {
    const { vendorId, sheetId, mensaje, detalle } = req.body;

    const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

    // Si viene el sheetId (por ejemplo, disparado desde la propia planilla)
    // en vez del vendorId, buscamos a qué vendedor corresponde esa planilla.
    let vendorIdFinal = vendorId;
    if (!vendorIdFinal && sheetId) {
      const { data: vendorRows, error: vendorError } = await supabase.from("vendors").select("id, sheet_url");
      if (vendorError) throw vendorError;
      const match = (vendorRows || []).find((v) => (v.sheet_url || "").includes(sheetId));
      if (match) vendorIdFinal = match.id;
    }
    if (!vendorIdFinal) return res.status(400).json({ error: "No se pudo identificar al vendedor (faltan vendorId y sheetId, o no hay ninguna planilla que coincida)." });

    webpush.setVapidDetails(
      "mailto:admin@elcastanio.com.ar",
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );

    const { data, error } = await supabase.from("push_subscriptions").select("*").eq("vendor_id", vendorIdFinal);
    if (error) throw error;

    // Si un mismo celular quedó registrado dos veces, se le manda una sola vez.
    const vistos = new Set();
    const destinos = (data || []).filter((row) => {
      const ep = row.subscription && row.subscription.endpoint;
      if (!ep || vistos.has(ep)) return false;
      vistos.add(ep);
      return true;
    });

    // Guardamos el aviso en la bandeja del vendedor (con el detalle) para que
    // al tocar la notificación pueda abrirlo dentro de la app.
    let avisoId = null;
    if (detalle) {
      avisoId = `${vendorIdFinal}-${Date.now()}`;
      const hoyAR = new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" });
      const { error: errAviso } = await supabase.from("notificaciones").insert({
        id: avisoId,
        vendor_id: vendorIdFinal,
        fecha_despacho: hoyAR,
        semana_label: detalle.semanaLabel || "",
        semana: detalle.semana || "",
        mes: detalle.mes || "",
        cajas: detalle.cajas || null,
        faltantes: detalle.faltantes || [],
      });
      if (errAviso) { console.error("No pude guardar el aviso:", errAviso); avisoId = null; }
    }

    const payload = JSON.stringify({
      title: "El Castaño",
      body: mensaje || "Se despachó tu pedido de la semana.",
      avisoId,
    });

    const resultados = await Promise.allSettled(
      destinos.map((row) => webpush.sendNotification(row.subscription, payload))
    );

    // Si una suscripción quedó vieja/inválida (410/404), la borramos.
    for (let i = 0; i < resultados.length; i++) {
      const r = resultados[i];
      if (r.status === "rejected" && (r.reason?.statusCode === 410 || r.reason?.statusCode === 404)) {
        await supabase.from("push_subscriptions").delete().eq("id", destinos[i].id);
      }
    }

    res.status(200).json({ ok: true, enviados: resultados.filter((r) => r.status === "fulfilled").length });
  } catch (err) {
    console.error("Error en notify-dispatch:", err);
    res.status(500).json({ error: String(err.message || err) });
  }
}
