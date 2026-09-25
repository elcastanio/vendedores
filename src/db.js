import { supabase } from "./supabaseClient";

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export const CATEGORIAS = ["Minorista", "Mayorista", "Granel", "Comercio"];

function precioCampoDeCategoria(categoria) {
  return (
    { Minorista: "precio_minorista", Mayorista: "precio_mayorista", Granel: "precio_granel", Comercio: "precio_comercios" }[categoria] ||
    "precio_minorista"
  );
}

export function precioProducto(producto, categoria) {
  if (!producto) return 0;
  return Number(producto[precioCampoDeCategoria(categoria)] || 0);
}

// ---------- VENDORS ----------

export async function fetchVendors() {
  const { data, error } = await supabase.from("vendors").select("*").order("nombre");
  if (error) throw error;
  return (data || []).map((v) => ({
    id: v.id,
    nombre: v.nombre,
    usuario: v.usuario,
    password: v.password,
    comision: Number(v.comision) || 0,
    sheetUrl: v.sheet_url || "",
  }));
}

export async function addVendor(v) {
  const row = {
    id: uid(),
    nombre: v.nombre,
    usuario: v.usuario,
    password: v.password,
    comision: Number(v.comision) || 0,
    sheet_url: v.sheetUrl || "",
  };
  const { error } = await supabase.from("vendors").insert(row);
  if (error) throw error;
  return row.id;
}

export async function updateVendor(id, fields) {
  const row = {};
  if (fields.nombre !== undefined) row.nombre = fields.nombre;
  if (fields.usuario !== undefined) row.usuario = fields.usuario;
  if (fields.password !== undefined) row.password = fields.password;
  if (fields.comision !== undefined) row.comision = fields.comision;
  if (fields.sheetUrl !== undefined) row.sheet_url = fields.sheetUrl;
  const { error } = await supabase.from("vendors").update(row).eq("id", id);
  if (error) throw error;
}

export async function deleteVendor(id) {
  const { error } = await supabase.from("vendors").delete().eq("id", id);
  if (error) throw error;
}

// ---------- PRODUCTS ----------

export async function fetchProducts() {
  const { data, error } = await supabase.from("products").select("*").order("nombre");
  if (error) throw error;
  return (data || []).map((p) => ({
    id: p.id,
    nombre: p.nombre,
    precio_minorista: Number(p.precio_minorista) || 0,
    precio_mayorista: Number(p.precio_mayorista) || 0,
    precio_granel: Number(p.precio_granel) || 0,
    precio_comercios: Number(p.precio_comercios) || 0,
  }));
}

export async function addProduct(p) {
  const row = {
    id: uid(),
    nombre: p.nombre,
    precio_minorista: Number(p.precio_minorista) || 0,
    precio_mayorista: Number(p.precio_mayorista) || 0,
    precio_granel: Number(p.precio_granel) || 0,
    precio_comercios: Number(p.precio_comercios) || 0,
  };
  const { error } = await supabase.from("products").insert(row);
  if (error) throw error;
}

export async function updateProduct(id, fields) {
  const { error } = await supabase.from("products").update(fields).eq("id", id);
  if (error) throw error;
}

export async function deleteProduct(id) {
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw error;
}

// carga masiva: filas = [{ nombre, minorista, mayorista, granel, comercios }]
// Actualiza el producto si ya existe uno con ese nombre (sin importar mayúsculas),
// o lo crea si es nuevo.
export async function bulkUpsertProducts(rows, existingProducts) {
  const porNombre = {};
  existingProducts.forEach((p) => { porNombre[p.nombre.trim().toLowerCase()] = p.id; });
  const paraGuardar = rows
    .filter((r) => r.nombre && String(r.nombre).trim())
    .map((r) => {
      const nombre = String(r.nombre).trim();
      const id = porNombre[nombre.toLowerCase()] || uid();
      return {
        id,
        nombre,
        precio_minorista: Number(r.minorista) || 0,
        precio_mayorista: Number(r.mayorista) || 0,
        precio_granel: Number(r.granel) || 0,
        precio_comercios: Number(r.comercios) || 0,
      };
    });
  if (paraGuardar.length === 0) return { guardados: 0 };
  // Supabase soporta hasta cierto tamaño por request; los mandamos en tandas.
  const TAMANIO_TANDA = 500;
  for (let i = 0; i < paraGuardar.length; i += TAMANIO_TANDA) {
    const tanda = paraGuardar.slice(i, i + TAMANIO_TANDA);
    const { error } = await supabase.from("products").upsert(tanda, { onConflict: "id" });
    if (error) throw error;
  }
  return { guardados: paraGuardar.length };
}

// ---------- OBJETIVOS ----------

export async function fetchObjetivos(mes) {
  let q = supabase.from("objetivos").select("*");
  if (mes) q = q.eq("mes", mes);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function upsertObjetivo(vendorId, mes, objetivo) {
  const { error } = await supabase.from("objetivos").upsert({ vendor_id: vendorId, mes, objetivo }, { onConflict: "vendor_id,mes" });
  if (error) throw error;
}

export async function bulkUpsertObjetivos(rows, vendors) {
  const porNombre = {};
  vendors.forEach((v) => { porNombre[v.nombre.trim().toLowerCase()] = v.id; });
  const noEncontrados = [];
  const paraGuardar = [];
  rows.forEach((r) => {
    const vendorId = porNombre[String(r.vendorNombre || "").trim().toLowerCase()];
    if (!vendorId) { noEncontrados.push(r.vendorNombre); return; }
    paraGuardar.push({ vendor_id: vendorId, mes: r.mes, objetivo: Number(r.objetivo) || 0 });
  });
  if (paraGuardar.length > 0) {
    const { error } = await supabase.from("objetivos").upsert(paraGuardar, { onConflict: "vendor_id,mes" });
    if (error) throw error;
  }
  return { guardados: paraGuardar.length, noEncontrados };
}

// ---------- CLIENTES ----------

export async function fetchClientes(vendorId) {
  const { data, error } = await supabase.from("clientes").select("*").eq("vendor_id", vendorId).order("nombre");
  if (error) throw error;
  return data || [];
}

export async function addCliente(vendorId, c) {
  const row = { id: uid(), vendor_id: vendorId, nombre: c.nombre, telefono: c.telefono || "", email: c.email || "", dni: c.dni || "", domicilio: c.domicilio || "" };
  const { error } = await supabase.from("clientes").insert(row);
  if (error) throw error;
}

// ---------- STOCK EXTRA ----------

export async function fetchStockExtra(vendorId) {
  const { data, error } = await supabase.from("stock_extra").select("*").eq("vendor_id", vendorId).order("fecha", { ascending: false });
  if (error) throw error;
  return (data || []).map((s) => ({
    id: s.id, fecha: s.fecha, productoId: s.producto_id, unidades: Number(s.unidades), estado: s.estado, observacion: s.observacion || "",
  }));
}

export async function addStockExtra(vendorId, item) {
  const row = { id: uid(), vendor_id: vendorId, fecha: item.fecha, producto_id: item.productoId, unidades: item.unidades, estado: "Pendiente", observacion: item.observacion || "" };
  const { error } = await supabase.from("stock_extra").insert(row);
  if (error) throw error;
}

export async function marcarStockVendido(id) {
  const { error } = await supabase.from("stock_extra").update({ estado: "Vendido" }).eq("id", id);
  if (error) throw error;
}
