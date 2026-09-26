import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });
  try {
    const { vendorId, subscription } = req.body;
    if (!vendorId || !subscription) return res.status(400).json({ error: "Faltan datos" });

    const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
    const id = `${vendorId}-${Date.now()}`;
    const { error } = await supabase.from("push_subscriptions").insert({ id, vendor_id: vendorId, subscription });
    if (error) throw error;
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: String(err.message || err) });
  }
}
