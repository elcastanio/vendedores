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
  return data.pedidos || [];
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
