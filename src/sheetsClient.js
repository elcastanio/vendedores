// Habla con el Google Apps Script que lee/escribe en las planillas de cada vendedor.
// Ver apps-script/Code.gs para el código que hay que publicar del lado de Google.

const API_URL = import.meta.env.VITE_SHEETS_API_URL;
const TOKEN = import.meta.env.VITE_SHEETS_TOKEN;

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

export function mesDeFecha(fechaISO) {
  const d = new Date(fechaISO + "T00:00:00");
  return MESES[d.getMonth()];
}

// A partir de un valor de <input type="month"> ("2026-10"), devuelve el
// nombre de la solapa correspondiente ("Octubre").
export function nombreMesDeValor(valorMes) {
  const [, m] = valorMes.split("-");
  return MESES[Number(m) - 1];
}

export function extraerSheetId(urlOId) {
  if (!urlOId) return "";
  const m = String(urlOId).match(/\/d\/([a-zA-Z0-9-_]+)/);
  return m ? m[1] : urlOId.trim();
}

async function llamar(action, params) {
  if (!API_URL) throw new Error("Falta configurar VITE_SHEETS_API_URL en el .env (la URL del Apps Script publicado).");
  if (!TOKEN) throw new Error("Falta configurar VITE_SHEETS_TOKEN en el .env.");
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" }, // evita preflight CORS con Apps Script
    body: JSON.stringify({ action, token: TOKEN, ...params }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

export async function addPedidoSheet(sheetUrl, { fecha, categoria, cliente, producto, unidades, precio }) {
  const sheetId = extraerSheetId(sheetUrl);
  const mes = mesDeFecha(fecha);
  return llamar("addPedido", { sheetId, mes, fecha, categoria, cliente, producto, unidades, precio });
}

export async function fetchPedidosSheet(sheetUrl, mes) {
  const sheetId = extraerSheetId(sheetUrl);
  const data = await llamar("fetchPedidos", { sheetId, mes });
  const pedidos = data.pedidos || [];
  // Los datos del despacho (cajas y nota de cada semana) viajan en la misma
  // consulta; quedan disponibles como pedidos.despachos.
  pedidos.despachos = data.despachos || [];
  return pedidos;
}

export async function updatePedidoSheet(sheetUrl, mes, fila, fields) {
  const sheetId = extraerSheetId(sheetUrl);
  return llamar("updatePedido", { sheetId, mes, fila, ...fields });
}

export async function fetchRendicionesSheet(sheetUrl) {
  const sheetId = extraerSheetId(sheetUrl);
  const data = await llamar("fetchRendiciones", { sheetId });
  return data.rendiciones || [];
}

// Le da formato/validación a las columnas Despachado y Faltante de una
// solapa, y normaliza las filas ya cargadas. Se llama a pedido del admin.
export async function prepararColumnasSheet(sheetUrl, mes) {
  const sheetId = extraerSheetId(sheetUrl);
  return llamar("prepararColumnas", { sheetId, mes });
}

export async function addStockSheet(sheetUrl, { fecha, producto, unidades, observacion }) {
  const sheetId = extraerSheetId(sheetUrl);
  return llamar("addStock", { sheetId, fecha, producto, unidades, observacion });
}

export async function fetchStockSheet(sheetUrl) {
  const sheetId = extraerSheetId(sheetUrl);
  const data = await llamar("fetchStock", { sheetId });
  return data.stock || [];
}

export async function updateStockEstadoSheet(sheetUrl, fila, estado) {
  const sheetId = extraerSheetId(sheetUrl);
  return llamar("updateStockEstado", { sheetId, fila, estado });
}

// Lee el objetivo (y, si el vendedor lidera un equipo, el bono de equipo)
// de un mes puntual, directo de la solapa "Panel de control".
export async function fetchObjetivoDesdeSheet(sheetUrl, mes) {
  const sheetId = extraerSheetId(sheetUrl);
  return llamar("fetchObjetivoSheet", { sheetId, mes });
}

// Lee el detalle de cada integrante del equipo (solapa "Equipo") para un
// mes puntual. Si el vendedor no lidera un equipo, tieneEquipo viene en false.
export async function fetchEquipoDesdeSheet(sheetUrl, mes) {
  const sheetId = extraerSheetId(sheetUrl);
  return llamar("fetchEquipo", { sheetId, mes });
}


// Datos de cada despacho semanal (cajas y nota), guardados en la solapa
// "Despachos" de la planilla del vendedor.
export async function guardarDespachoSheet(sheetUrl, { mes, semana, cajas, nota }) {
  const sheetId = extraerSheetId(sheetUrl);
  return llamar("guardarDespacho", { sheetId, mes, semana, cajas, nota });
}

// El vendedor edita o anula un pedido PROPIO que todavía esté en PENDIENTE.
// El script revisa el estado real antes de aplicar el cambio; si ya no está
// en PENDIENTE, devuelve un mensaje para avisarle que hable con admin.
export async function editarPedidoSheet(sheetUrl, mes, fila, { categoria, cliente, producto, unidades, clienteAnterior, productoAnterior }) {
  const sheetId = extraerSheetId(sheetUrl);
  return llamar("editarPedido", { sheetId, mes, fila, categoria, cliente, producto, unidades, clienteAnterior, productoAnterior });
}

export async function anularPedidoSheet(sheetUrl, mes, fila, { cliente, producto } = {}) {
  const sheetId = extraerSheetId(sheetUrl);
  return llamar("anularPedido", { sheetId, mes, fila, cliente, producto });
}
