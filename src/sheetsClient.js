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
    if (action === "prepararColumnas") return respond(prepararColumnas(body));
    if (action === "addStock") return respond(addStock(body));
    if (action === "fetchStock") return respond(fetchStock(body));
    if (action === "updateStockEstado") return respond(updateStockEstado(body));
    if (action === "fetchObjetivoSheet") return respond(fetchObjetivoDesdeSheet(body));
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
  const encabezados = sheet.getRange(headerRow, 10, 1, 2).getValues()[0];
  if (encabezados[0] !== "Despachado" || encabezados[1] !== "Faltante") {
    sheet.getRange(headerRow, 10, 1, 2).setValues([["Despachado", "Faltante"]]);
  }
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
  sheet.getRange(row, 10, 1, 2).setValues([["PENDIENTE", "NO"]]);
  return { ok: true, fila: row };
}

// Lee todas las líneas cargadas del mes (para que la app las muestre).
function fetchPedidos(body) {
  const sheetId = body.sheetId, mes = body.mes;
  const sheet = getSheet_(sheetId, mes);
  ensureExtraColumns_(sheet);
  const numRows = Math.max(sheet.getMaxRows() - 2, 1);
  const values = sheet.getRange(3, 1, numRows, 11).getValues();
  const pedidos = [];
  for (let i = 0; i < values.length; i++) {
    const r = values[i];
    if (r[0] === "" || r[0] === null) continue;
    pedidos.push({
      fila: i + 3, dia: r[0], categoria: r[1], cliente: r[2], producto: r[3],
      unidades: r[4], precio: r[5], total: r[6], acumulado: r[7],
      observaciones: r[8], estado: r[9], despachado: r[9] === "DESPACHADO", faltante: r[10] === "SI",
    });
  }
  return { pedidos: pedidos };
}

// El admin marca una línea como Pendiente/En proceso/Despachado, o con
// faltante, directo en la planilla.
function updatePedidoEstado(body) {
  const sheet = getSheet_(body.sheetId, body.mes);
  if (body.estado !== undefined) sheet.getRange(body.fila, 10).setValue(body.estado);
  if (body.faltante !== undefined) sheet.getRange(body.fila, 11).setValue(body.faltante ? "SI" : "NO");
  return { ok: true };
}

// Le da formato a las columnas Despachado/Faltante igual al resto de la
// planilla, les pone un desplegable de valores válidos, y normaliza las
// filas ya cargadas (por si venían con SI/NO viejo o estaban vacías).
// Se corre a pedido del admin, una vez por solapa — no en cada lectura.
function prepararColumnas(body) {
  const sheet = getSheet_(body.sheetId, body.mes);
  const headerRow = 2;
  sheet.getRange(headerRow, 10, 1, 2).setValues([["Despachado", "Faltante"]]);
  sheet.getRange(headerRow, 9, 1, 1).copyFormatToRange(sheet, 10, 11, headerRow, headerRow);

  const maxRow = sheet.getMaxRows();
  const filasDatos = maxRow - 2;
  if (filasDatos > 0) {
    sheet.getRange(3, 6, filasDatos, 1).copyFormatToRange(sheet, 10, 11, 3, 2 + filasDatos);

    const reglaDespachado = SpreadsheetApp.newDataValidation()
      .requireValueInList(["PENDIENTE", "EN PROCESO", "DESPACHADO"], true)
      .setAllowInvalid(false)
      .build();
    sheet.getRange(3, 10, filasDatos, 1).setDataValidation(reglaDespachado);

    const reglaFaltante = SpreadsheetApp.newDataValidation()
      .requireValueInList(["NO", "SI"], true)
      .setAllowInvalid(false)
      .build();
    sheet.getRange(3, 11, filasDatos, 1).setDataValidation(reglaFaltante);

    const rangoDatos = sheet.getRange(3, 1, filasDatos, 11);
    const valores = rangoDatos.getValues();
    let cambios = false;
    for (let i = 0; i < valores.length; i++) {
      if (valores[i][0] === "" || valores[i][0] === null) continue;
      const desp = valores[i][9];
      if (desp === "SI") { valores[i][9] = "DESPACHADO"; cambios = true; }
      else if (desp !== "DESPACHADO" && desp !== "EN PROCESO") { valores[i][9] = "PENDIENTE"; cambios = true; }
      const falt = valores[i][10];
      if (falt !== "SI" && falt !== "NO") { valores[i][10] = "NO"; cambios = true; }
    }
    if (cambios) rangoDatos.setValues(valores);
  }
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

// ---------- STOCK ----------
// La solapa Stock tiene el encabezado en la fila 1 (no la 2 como los meses):
// Fecha Ingreso, Producto, Unidades, Estado, Observaciones. Estado ya tiene
// su propio desplegable en la planilla: Vendido / A la venta / Devuelto.

function findLastStockRow_(sheet) {
  const numRows = Math.max(sheet.getMaxRows() - 1, 1);
  const colA = sheet.getRange(2, 1, numRows, 1).getValues();
  let last = 1;
  for (let i = 0; i < colA.length; i++) {
    if (colA[i][0] !== "" && colA[i][0] !== null) last = i + 2;
  }
  return last;
}

function getStockSheet_(sheetId) {
  const ss = SpreadsheetApp.openById(sheetId);
  const sheet = ss.getSheetByName("Stock");
  if (!sheet) throw new Error("No existe la solapa Stock en esta planilla.");
  return sheet;
}

// Registra mercadería de más. Queda con Estado "A la venta" por defecto.
function addStock(body) {
  const sheet = getStockSheet_(body.sheetId);
  const row = findLastStockRow_(sheet) + 1;
  const fechaDate = new Date(body.fecha + "T00:00:00");
  sheet.getRange(row, 1, 1, 5).setValues([[fechaDate, body.producto, body.unidades, "A la venta", body.observacion || ""]]);
  return { ok: true, fila: row };
}

// Lee todo lo registrado en Stock (para que la app se lo muestre al vendedor).
function fetchStock(body) {
  const sheet = getStockSheet_(body.sheetId);
  const numRows = Math.max(sheet.getMaxRows() - 1, 1);
  const values = sheet.getRange(2, 1, numRows, 5).getDisplayValues();
  const items = [];
  for (let i = 0; i < values.length; i++) {
    const r = values[i];
    if (r[1] === "" || r[1] === null) continue;
    items.push({ fila: i + 2, fecha: r[0], producto: r[1], unidades: r[2], estado: r[3], observacion: r[4] });
  }
  return { stock: items };
}

// Cambia el Estado de una fila (ej. de "A la venta" a "Vendido").
function updateStockEstado(body) {
  const sheet = getStockSheet_(body.sheetId);
  if (body.estado !== undefined) sheet.getRange(body.fila, 4).setValue(body.estado);
  return { ok: true };
}

// ---------- OBJETIVO (Panel de control) ----------
// Lee el objetivo del "RESUMEN DEL TRIMESTRE" en la solapa Panel de control
// de la propia planilla del vendedor: busca la columna del mes pedido
// (encabezados tipo OCTUBRE/NOVIEMBRE/DICIEMBRE) y, debajo, la fila
// "Objetivo..." (Objetivo minorista, etc.), sin depender de filas/columnas
// fijas por si el diseño cambia un poco de una planilla a otra.
function fetchObjetivoDesdeSheet(body) {
  const ss = SpreadsheetApp.openById(body.sheetId);
  let sheet = null;
  const hojas = ss.getSheets();
  for (let i = 0; i < hojas.length; i++) {
    if (hojas[i].getName().trim().toLowerCase() === "panel de control") { sheet = hojas[i]; break; }
  }
  if (!sheet) throw new Error('No existe la solapa "Panel de control" en esta planilla.');

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  const valores = sheet.getRange(1, 1, lastRow, lastCol).getValues();

  // Buscamos puntualmente la fila de encabezado del resumen (la que dice
  // "Concepto" en la columna B), no la primera vez que aparece el mes en
  // toda la hoja — el mes también aparece más arriba como indicador de
  // "mes en curso", en otra columna, y nos confundía con esa.
  let filaHeader = -1;
  for (let r = 0; r < valores.length; r++) {
    const b = String(valores[r][1] || "").trim().toLowerCase();
    if (b === "concepto") { filaHeader = r; break; }
  }
  if (filaHeader === -1) return { objetivo: null, encontrado: false };

  const mesBuscado = String(body.mes).trim().toLowerCase();
  let colMes = -1;
  for (let c = 0; c < valores[filaHeader].length; c++) {
    const val = String(valores[filaHeader][c] || "").trim().toLowerCase();
    if (val === mesBuscado) { colMes = c; break; }
  }
  if (colMes === -1) return { objetivo: null, encontrado: false };

  let filaObjetivo = -1;
  for (let r = filaHeader + 1; r < valores.length; r++) {
    const etiqueta = String(valores[r][1] || "").trim().toLowerCase();
    if (etiqueta.indexOf("objetivo") !== -1) { filaObjetivo = r; break; }
  }
  if (filaObjetivo === -1) return { objetivo: null, encontrado: false };

  const val = valores[filaObjetivo][colMes];
  const objetivo = (val === "" || val === null) ? 0 : Number(val);
  return { objetivo: objetivo, encontrado: true };
}
