import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });
  try {
    const { vendorId, subscription } = req.body;
    if (!vendorId || !subscription || !subscription.endpoint) return res.status(400).json({ error: "Faltan datos" });

    const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

    // Un mismo celular + un mismo vendedor = una sola fila (no se duplica
    // aunque la app lo registre cada vez que se abre).
    const huella = createHash("sha1").update(subscription.endpoint).digest("hex").slice(0, 20);
    const id = `${vendorId}-${huella}`;

    // Limpia filas viejas del mismo celular y vendedor (formato anterior).
    await supabase.from("push_subscriptions").delete()
      .eq("vendor_id", vendorId).eq("subscription->>endpoint", subscription.endpoint).neq("id", id);

    const { error } = await supabase.from("push_subscriptions").upsert({ id, vendor_id: vendorId, subscription }, { onConflict: "id" });
    if (error) throw error;
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Error en save-subscription:", err);
    res.status(500).json({ error: String(err.message || err) });
  }
}
