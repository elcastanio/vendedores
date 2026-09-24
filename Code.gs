/**
 * El Castaño - puente entre la app de vendedores y las planillas de Google Sheets.
 *
 * INSTRUCCIONES:
 * 1. Cambiá el valor de TOKEN de abajo por algo secreto tuyo (letras y números).
 * 2. En script.google.com > Proyecto nuevo > pegá todo este código.
 * 3. Implementar > Nueva implementación > tipo "Aplicación web".
 *    - Ejecutar como: Yo (tu cuenta)
 *    - Quién tiene acceso: Cualquier usuario
 * 4. Te va a pedir autorizar permisos la primera vez (es tu propia cuenta, es seguro).
 * 5. Copiá la URL que te da (termina en /exec) y pegala en el .env de la app como
 *    VITE_SHEETS_API_URL. El TOKEN que pusiste arriba va en VITE_SHEETS_TOKEN.
 */

const TOKEN = "CAMBIAR_ESTE_TOKEN_SECRETO_123";

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    if (body.token !== TOKEN) return respond({ error: "Token inválido" });
    const action = body.action;
    if (action === "addPedido") return respond(addPedido(body));
    if (action === "fetchPedidos") return respond(fetchPedidos(body));
    if (action === "updatePedido") return respond(updatePedidoEstado(body));
    if (action === "fetchRendiciones") return respond(fetchRendicionesFn(body));
    return respond({ error: "Acción desconocida: " + action });
  } catch (err) {
    return respond({ error: String(err) });
  }
}

function respond(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function getSheet_(sheetId, tabName) {
  const ss = SpreadsheetApp.openById(sheetId);
  const sheet = ss.getSheetByName(tabName);
  if (!sheet) throw new Error('No existe la solapa "' + tabName + '" en esta planilla.');
  return sheet;
}

function ensureExtraColumns_(sheet) {
  const headerRow = 2;
  const jHeader = sheet.getRange(headerRow, 10).getValue();
  const kHeader = sheet.getRange(headerRow, 11).getValue();
  if (jHeader !== "Despachado") sheet.getRange(headerRow, 10).setValue("Despachado");
  if (kHeader !== "Faltante") sheet.getRange(headerRow, 11).setValue("Faltante");
}

function findLastDataRow_(sheet) {
  const numRows = Math.max(sheet.getMaxRows() - 2, 1);
  const colA = sheet.getRange(3, 1, numRows, 1).getValues();
  let last = 2;
  for (let i = 0; i < colA.length; i++) {
    if (colA[i][0] !== "" && colA[i][0] !== null) last = i + 3;
  }
  return last;
}

// Agrega una nueva línea de pedido en la solapa del mes correspondiente.
function addPedido(body) {
  const sheetId = body.sheetId, mes = body.mes;
  const sheet = getSheet_(sheetId, mes);
  ensureExtraColumns_(sheet);
  const dia = new Date(body.fecha + "T00:00:00").getDate();
  const row = findLastDataRow_(sheet) + 1;
  sheet.getRange(row, 1, 1, 6).setValues([[dia, body.categoria, body.cliente, body.producto, body.unidades, body.precio]]);
  sheet.getRange(row, 10).setValue("NO");
  return { ok: true, fila: row };
}

// Lee todas las líneas cargadas del mes (para que la app las muestre).
function fetchPedidos(body) {
  const sheetId = body.sheetId, mes = body.mes;
  const sheet = getSheet_(sheetId, mes);
  ensureExtraColumns_(sheet);
  const lastRow = findLastDataRow_(sheet);
  if (lastRow < 3) return { pedidos: [] };
  const values = sheet.getRange(3, 1, lastRow - 2, 11).getValues();
  const pedidos = [];
  values.forEach(function (r, i) {
    if (r[0] === "" || r[0] === null) return;
    pedidos.push({
      fila: i + 3, dia: r[0], categoria: r[1], cliente: r[2], producto: r[3],
      unidades: r[4], precio: r[5], total: r[6], acumulado: r[7],
      observaciones: r[8], despachado: r[9] === "SI", faltante: r[10] || "",
    });
  });
  return { pedidos: pedidos };
}

// El admin marca una línea como despachada / con faltante, directo en la planilla.
function updatePedidoEstado(body) {
  const sheet = getSheet_(body.sheetId, body.mes);
  if (body.despachado !== undefined) sheet.getRange(body.fila, 10).setValue(body.despachado ? "SI" : "NO");
  if (body.faltante !== undefined) sheet.getRange(body.fila, 11).setValue(body.faltante);
  return { ok: true };
}

// Lee la solapa Rendiciones tal cual la carga el admin.
function fetchRendicionesFn(body) {
  const ss = SpreadsheetApp.openById(body.sheetId);
  const sheet = ss.getSheetByName("Rendiciones");
  if (!sheet) throw new Error("No existe la solapa Rendiciones en esta planilla.");
  const lastRow = sheet.getLastRow();
  if (lastRow < 3) return { rendiciones: [] };
  const values = sheet.getRange(3, 1, lastRow - 2, 12).getDisplayValues();
  const rendiciones = [];
  values.forEach(function (r) {
    if (r[0] === "") return;
    rendiciones.push({
      fecha: r[0], totalVendido: r[1], comision: r[2], subtotal: r[3],
      transferencias: r[4], envio: r[5], aRendir: r[6], estado: r[7],
      montoPagado: r[8], fechaPago: r[9], estadoColor: r[10], observaciones: r[11],
    });
  });
  return { rendiciones: rendiciones };
}
