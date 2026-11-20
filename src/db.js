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

// Un producto se ofrece en una categoría solo si su precio ahí es mayor a 0.
// Excepción: los productos marcados como "Regalo por compra" se ofrecen siempre, a $0.
export function tienePrecio(producto, categoria) {
  if (!producto) return false;
  if (producto.es_regalo) return true;
  return Number(producto[precioCampoDeCategoria(categoria)] || 0) > 0;
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
    es_regalo: p.es_regalo === true,
    sku: p.sku ? String(p.sku).trim() : "",
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
  if (p.sku && String(p.sku).trim()) row.sku = String(p.sku).trim(); // solo si lo cargan (la columna sku tiene que existir)
  if (p.es_regalo) row.es_regalo = true; // solo se manda si está marcado (así anda aunque la columna todavía no exista)
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
export async function bulkUpsertProducts(rows, existingProducts, campos) {
  const TODOS = ["minorista", "mayorista", "granel", "comercios"];
  const elegidos = Array.isArray(campos) && campos.length ? campos.filter((c) => TODOS.includes(c)) : TODOS;
  const soloAlgunos = elegidos.length < TODOS.length;
  const claveSku = (s) => String(s || "").trim().toLowerCase();
  const claveNombre = (s) => String(s || "").trim().toLowerCase();

  // Copia de trabajo de los productos existentes.
  const productos = existingProducts.map((p) => ({ ...p, sku: p.sku || "" }));
  const porSku = {};
  productos.forEach((p) => { if (p.sku) porSku[claveSku(p.sku)] = p; });

  const tienePrecio = (r) => (soloAlgunos ? elegidos : TODOS).some((c) => Number(r[c]) > 0);
  // Las filas con precio van primero: si un nombre está repetido, el producto existente se asocia al SKU que sí tiene precio.
  const conLista = rows
    .filter((r) => r.nombre && String(r.nombre).trim())
    .map((r, i) => ({ r, i }))
    .sort((a, b) => (tienePrecio(b.r) ? 1 : 0) - (tienePrecio(a.r) ? 1 : 0) || a.i - b.i)
    .map((x) => x.r);

  const mapa = new Map(); // id -> fila a guardar
  const skuYaVisto = new Set();
  const duplicados = [];
  const sinPrecio = [];
  const noEncontrados = [];

  conLista.forEach((r) => {
    const nombre = String(r.nombre).trim();
    const sku = String(r.sku || "").trim();
    if (sku) { if (skuYaVisto.has(claveSku(sku))) duplicados.push(sku); skuYaVisto.add(claveSku(sku)); }

    // Se busca SOLO por SKU (el nombre no se usa para encontrar productos).
    if (!sku) { noEncontrados.push(nombre + " (sin SKU en el Excel)"); return; }
    const prod = porSku[claveSku(sku)];
    if (!prod) { noEncontrados.push(nombre); return; } // la carga masiva nunca crea productos: solo actualiza los que ya existen
    let fila = mapa.get(prod.id);
    const habiaFila = !!fila;
    if (!fila) fila = { id: prod.id, nombre: prod.nombre, sku: prod.sku || "", precio_minorista: prod.precio_minorista, precio_mayorista: prod.precio_mayorista, precio_granel: prod.precio_granel, precio_comercios: prod.precio_comercios };
    let toco = false;
    if (soloAlgunos) {
      // Una celda vacía o en 0 NO pisa el precio que ya tiene el producto.
      elegidos.forEach((c) => { const v = Number(r[c]); if (v > 0) { fila["precio_" + c] = v; toco = true; } });
    } else {
      TODOS.forEach((c) => { fila["precio_" + c] = Number(r[c]) || 0; });
      toco = true;
    }
    if (fila.sku !== (prod.sku || "")) fila.sku = prod.sku || "";
    if (!toco && !habiaFila) sinPrecio.push(nombre);
    // Se guarda si cambió algún precio o si solo se está completando el SKU.
    if (toco || !existingProducts.find((e) => e.id === prod.id).sku && prod.sku) mapa.set(prod.id, fila);
  });

  const paraGuardar = Array.from(mapa.values()).map((f) => { const g = { ...f }; if (!g.sku) delete g.sku; return g; });
  const creados = 0;
  if (paraGuardar.length === 0) return { guardados: 0, creados: 0, duplicados, sinPrecio, noEncontrados };
  // Supabase soporta hasta cierto tamaño por request; los mandamos en tandas.
  const TAMANIO_TANDA = 500;
  for (let i = 0; i < paraGuardar.length; i += TAMANIO_TANDA) {
    const tanda = paraGuardar.slice(i, i + TAMANIO_TANDA);
    const { error } = await supabase.from("products").upsert(tanda, { onConflict: "id" });
    if (error) throw error;
  }
  return { guardados: paraGuardar.length, creados, duplicados, sinPrecio, noEncontrados };
}

// Paso de una sola vez: completa el SKU de los productos de la app que todavía no tienen, usando el Excel.
// Es el único lugar donde se usa el nombre (para saber a qué producto de la app le toca cada SKU).
export async function assignSkusDesdeExcel(rows, existingProducts) {
  const clave = (s) => String(s || "").trim().toLowerCase();
  const usados = new Set(existingProducts.filter((p) => p.sku).map((p) => clave(p.sku)));
  const libres = {};
  existingProducts.filter((p) => !p.sku).forEach((p) => { (libres[clave(p.nombre)] = libres[clave(p.nombre)] || []).push(p); });
  const tienePrecio = (r) => ["minorista", "mayorista", "granel", "comercios"].some((c) => Number(r[c]) > 0);
  const lista = rows.filter((r) => r.nombre && String(r.sku || "").trim())
    .map((r, i) => ({ r, i }))
    .sort((a, b) => (tienePrecio(b.r) ? 1 : 0) - (tienePrecio(a.r) ? 1 : 0) || a.i - b.i)
    .map((x) => x.r);
  const paraGuardar = [];
  const sobrantes = []; // SKU del Excel cuyo nombre ya tenía otro SKU asignado
  lista.forEach((r) => {
    const sku = String(r.sku).trim();
    if (usados.has(clave(sku))) return;
    const cand = libres[clave(r.nombre)];
    if (!cand || cand.length === 0) { if ((existingProducts.some((p) => clave(p.nombre) === clave(r.nombre)))) sobrantes.push(sku + " · " + String(r.nombre).trim()); return; }
    const prod = cand.shift();
    usados.add(clave(sku));
    paraGuardar.push({ id: prod.id, nombre: prod.nombre, sku, precio_minorista: prod.precio_minorista, precio_mayorista: prod.precio_mayorista, precio_granel: prod.precio_granel, precio_comercios: prod.precio_comercios });
  });
  const sinSku = Object.values(libres).flat().map((p) => p.nombre);
  for (let i = 0; i < paraGuardar.length; i += 500) {
    const { error } = await supabase.from("products").upsert(paraGuardar.slice(i, i + 500), { onConflict: "id" });
    if (error) throw error;
  }
  return { asignados: paraGuardar.length, sinSku, sobrantes };
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
  return { guardados: paraGuardar.length, noEncontrados, duplicados };
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

// ---------- AVISOS (bandeja de notificaciones del vendedor) ----------

export async function fetchNotificaciones(vendorId) {
  const { data, error } = await supabase.from("notificaciones").select("*").eq("vendor_id", vendorId).order("creada_en", { ascending: false }).limit(50);
  if (error) throw error;
  return (data || []).map((n) => ({
    id: n.id, fechaDespacho: n.fecha_despacho, semanaLabel: n.semana_label || "", semana: n.semana || "", mes: n.mes || "",
    cajas: n.cajas === null || n.cajas === undefined ? null : Number(n.cajas),
    faltantes: Array.isArray(n.faltantes) ? n.faltantes : [], leida: !!n.leida, creadaEn: n.creada_en,
  }));
}

export async function marcarNotificacionLeida(id) {
  const { error } = await supabase.from("notificaciones").update({ leida: true }).eq("id", id);
  if (error) throw error;
}

export async function eliminarNotificacion(id) {
  const { error } = await supabase.from("notificaciones").delete().eq("id", id);
  if (error) throw error;
}

export async function marcarTodasLeidas(vendorId) {
  const { error } = await supabase.from("notificaciones").update({ leida: true }).eq("vendor_id", vendorId).eq("leida", false);
  if (error) throw error;
}

// ---------- TÉRMINOS Y CONDICIONES (firma en pantalla) ----------

function mapTerminos(r) {
  return { id: r.id, vendorId: r.vendor_id, version: r.version, nombre: r.nombre, dni: r.dni, firma: r.firma, aceptadoEn: r.aceptado_en };
}

// Última firma de un vendedor (o null si nunca firmó).
export async function fetchTerminosVendedor(vendorId) {
  const { data, error } = await supabase.from("terminos_aceptados").select("*").eq("vendor_id", vendorId).order("aceptado_en", { ascending: false }).limit(1);
  if (error) throw error;
  return data && data.length > 0 ? mapTerminos(data[0]) : null;
}

export async function guardarTerminos({ vendorId, version, nombre, dni, firma }) {
  const row = { id: `${vendorId}-${Date.now()}`, vendor_id: vendorId, version, nombre, dni, firma };
  const { error } = await supabase.from("terminos_aceptados").insert(row);
  if (error) throw error;
  return mapTerminos({ ...row, aceptado_en: new Date().toISOString() });
}

// Para el admin: todas las firmas (la más nueva de cada vendedor queda primera).
export async function fetchTerminosTodos() {
  const { data, error } = await supabase.from("terminos_aceptados").select("*").order("aceptado_en", { ascending: false });
  if (error) throw error;
  return (data || []).map(mapTerminos);
}

// ---------- PREMIOS (objetivo y equipo; se aplican a la próxima rendición) ----------

function mapPremio(r) {
  return {
    id: r.id, vendorId: r.vendor_id, mes: r.mes,
    objetivo: Number(r.objetivo) || 0, equipo: Number(r.equipo) || 0,
    usadoObjetivo: Number(r.usado_objetivo) || 0, usadoEquipo: Number(r.usado_equipo) || 0,
    habilitado: !!r.habilitado, creadoEn: r.creado_en,
  };
}

// Todos los premios (para el admin), del más nuevo al más viejo.
export async function fetchPremiosTodos() {
  const { data, error } = await supabase.from("premios").select("*").order("creado_en", { ascending: false });
  if (error) throw error;
  return (data || []).map(mapPremio);
}

// Premios habilitados de un vendedor que todavía tienen algo para aplicar (del más viejo al más nuevo).
export async function fetchPremiosDisponibles(vendorId) {
  const { data, error } = await supabase.from("premios").select("*").eq("vendor_id", vendorId).eq("habilitado", true).order("creado_en", { ascending: true });
  if (error) throw error;
  return (data || []).map(mapPremio).filter((p) => p.objetivo - p.usadoObjetivo > 0 || p.equipo - p.usadoEquipo > 0);
}

// Crea varios premios de una vez: [{ vendorId, mes, objetivo, equipo }]. Quedan SIN habilitar.
export async function addPremios(lista) {
  const rows = lista.map((p) => ({ id: uid(), vendor_id: p.vendorId, mes: p.mes, objetivo: p.objetivo || 0, equipo: p.equipo || 0, habilitado: false }));
  if (rows.length === 0) return [];
  const { error } = await supabase.from("premios").insert(rows);
  if (error) throw error;
  return rows;
}

export async function setPremioHabilitado(ids, habilitado) {
  const { error } = await supabase.from("premios").update({ habilitado }).in("id", ids);
  if (error) throw error;
}

export async function deletePremio(id) {
  const { error } = await supabase.from("premios").delete().eq("id", id);
  if (error) throw error;
}

// Historial de aplicaciones (para el admin).
export async function fetchPremiosAplicaciones() {
  const { data, error } = await supabase.from("premios_aplicaciones").select("*").order("aplicado_en", { ascending: false });
  if (error) throw error;
  return (data || []).map((r) => ({ id: r.id, premioId: r.premio_id, vendorId: r.vendor_id, fechaRendicion: r.fecha_rendicion, montoObjetivo: Number(r.monto_objetivo) || 0, montoEquipo: Number(r.monto_equipo) || 0, aplicadoEn: r.aplicado_en }));
}

// Descuenta del premio lo que se aplica a una rendición. Falla si el premio ya cambió (por ejemplo, doble toque),
// para que nunca se aplique dos veces. Devuelve lo necesario para poder deshacerlo si falla la planilla.
export async function reservarAplicacionPremio({ premio, montoObjetivo, montoEquipo, fechaRendicion }) {
  const nuevoObj = premio.usadoObjetivo + montoObjetivo;
  const nuevoEq = premio.usadoEquipo + montoEquipo;
  const { data, error } = await supabase.from("premios")
    .update({ usado_objetivo: nuevoObj, usado_equipo: nuevoEq })
    .eq("id", premio.id).eq("usado_objetivo", premio.usadoObjetivo).eq("usado_equipo", premio.usadoEquipo).eq("habilitado", true)
    .select("id");
  if (error) throw error;
  if (!data || data.length === 0) throw new Error("Este premio ya se aplicó o cambió. Recargá la pantalla.");
  const apId = uid();
  const { error: e2 } = await supabase.from("premios_aplicaciones").insert({
    id: apId, premio_id: premio.id, vendor_id: premio.vendorId, fecha_rendicion: fechaRendicion, monto_objetivo: montoObjetivo, monto_equipo: montoEquipo,
  });
  if (e2) {
    await supabase.from("premios").update({ usado_objetivo: premio.usadoObjetivo, usado_equipo: premio.usadoEquipo }).eq("id", premio.id);
    throw e2;
  }
  return { premioId: premio.id, apId, usadoObjetivo: premio.usadoObjetivo, usadoEquipo: premio.usadoEquipo };
}

// Deshace una reserva (si no se pudo escribir en la planilla).
export async function deshacerAplicacionPremio(reserva) {
  await supabase.from("premios").update({ usado_objetivo: reserva.usadoObjetivo, usado_equipo: reserva.usadoEquipo }).eq("id", reserva.premioId);
  await supabase.from("premios_aplicaciones").delete().eq("id", reserva.apId);
}

// ---------- CATÁLOGOS (PDFs que los vendedores descargan y comparten) ----------

const BUCKET_CATALOGOS = "catalogos";

export async function fetchCatalogos() {
  const { data, error } = await supabase.from("catalogos").select("*").order("orden").order("creado_en");
  if (error) throw error;
  return (data || []).map((c) => ({ id: c.id, nombre: c.nombre, path: c.path, url: c.url, orden: c.orden || 0 }));
}

function nombreSeguroArchivo(nombre) {
  return String(nombre).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "catalogo";
}

async function subirPdf(nombre, archivo) {
  const path = `${Date.now()}-${nombreSeguroArchivo(nombre)}.pdf`;
  const { error } = await supabase.storage.from(BUCKET_CATALOGOS).upload(path, archivo, { contentType: "application/pdf", upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET_CATALOGOS).getPublicUrl(path);
  return { path, url: data.publicUrl };
}

export async function addCatalogo(nombre, archivo, orden) {
  const { path, url } = await subirPdf(nombre, archivo);
  const { error } = await supabase.from("catalogos").insert({ id: `cat-${Date.now()}`, nombre, path, url, orden: orden || 0 });
  if (error) { await supabase.storage.from(BUCKET_CATALOGOS).remove([path]); throw error; }
}

export async function reemplazarCatalogo(catalogo, archivo) {
  const { path, url } = await subirPdf(catalogo.nombre, archivo);
  const { error } = await supabase.from("catalogos").update({ path, url }).eq("id", catalogo.id);
  if (error) { await supabase.storage.from(BUCKET_CATALOGOS).remove([path]); throw error; }
  await supabase.storage.from(BUCKET_CATALOGOS).remove([catalogo.path]);
}

export async function renombrarCatalogo(id, nombre) {
  const { error } = await supabase.from("catalogos").update({ nombre }).eq("id", id);
  if (error) throw error;
}

export async function eliminarCatalogo(catalogo) {
  const { error } = await supabase.from("catalogos").delete().eq("id", catalogo.id);
  if (error) throw error;
  await supabase.storage.from(BUCKET_CATALOGOS).remove([catalogo.path]);
}
