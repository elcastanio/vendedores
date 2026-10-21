import { jsPDF } from "jspdf";

let logoDataUrlPromise = null;
function cargarLogo() {
  if (!logoDataUrlPromise) {
    logoDataUrlPromise = fetch("/logo.png")
      .then((r) => r.blob())
      .then((blob) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      }));
  }
  return logoDataUrlPromise;
}

// Con centavos, para la cuenta de comisión y saldo (no se redondea).
function fmtC(n) {
  const v = Math.round((Number(n) || 0) * 100) / 100;
  return "$" + v.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmt(n) {
  return "$" + Number(n || 0).toLocaleString("es-AR", { maximumFractionDigits: 0 });
}

// Paleta acorde a la app (TOKENS)
const RUST = [0, 60, 105];
const TEXT = [20, 37, 58];
const TEXT_SOFT = [90, 107, 126];
const CREAM = [237, 243, 249];
const BORDER = [218, 226, 236];

// Dibuja un tilde chiquito dentro de un cuadrado, como en un ticket de
// "picking" — la referencia visual que pidió Mati.
function dibujarCheck(doc, x, y) {
  doc.setDrawColor(...RUST);
  doc.setLineWidth(1.1);
  doc.roundedRect(x, y - 8, 10, 10, 2, 2, "S");
  doc.line(x + 2, y - 3, x + 4.2, y - 0.5);
  doc.line(x + 4.2, y - 0.5, x + 8, y - 6);
}

// Arma el PDF tipo comprobante con el detalle de un pedido (un cliente, un día).
// Si el pedido es largo, sigue en páginas nuevas: cada página lleva su marco y su
// encabezado de tabla, y los nombres largos de producto se parten en varias líneas.
export async function armarComprobante({ vendorNombre, cliente, dia, mesNombre, lineas }) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = 595, pageH = 842;
  const boxX = 56, boxW = pageW - boxX * 2;
  const boxTop = 56;
  const limiteY = pageH - 64; // hasta acá se escribe contenido; el marco cierra más abajo
  const padX = boxX + 26;
  const rightX = boxX + boxW - 26;
  const colCheck = padX, colProducto = padX + 20, colCant = rightX - 210, colPrecio = rightX - 125, colTotal = rightX - 45;
  const anchoNombre = colCant - colProducto - 14;
  const bloqueFinal = 122; // alto que necesita el cierre (subtotal, total, agradecimiento y borde del marco)

  // Marco punteado de cada página (se dibuja al terminar la página, con su alto real).
  const finMarco = {};
  const dibujarMarco = (pagina) => {
    doc.setPage(pagina);
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(1);
    doc.setLineDashPattern([2.5, 2], 0);
    doc.roundedRect(boxX, boxTop, boxW, finMarco[pagina] - boxTop, 10, 10, "S");
    doc.setLineDashPattern([], 0);
  };

  const encabezadoTabla = (y) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...TEXT_SOFT);
    doc.text("PRODUCTO", colProducto, y);
    doc.text("CANT.", colCant, y, { align: "right" });
    doc.text("PRECIO UNIT.", colPrecio, y, { align: "right" });
    doc.text("TOTAL", colTotal, y, { align: "right" });
    y += 12;
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.75);
    doc.line(padX, y, rightX, y);
    return y + 20;
  };

  let pagina = 1;
  let y = boxTop + 40;

  // Logo arriba a la derecha, chiquito, como una marca de agua elegante.
  try {
    const logo = await cargarLogo();
    const w = 92, h = 22;
    doc.addImage(logo, "PNG", rightX - w, boxTop + 18, w, h);
  } catch (e) { /* seguimos sin logo si no se pudo cargar */ }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.setTextColor(...TEXT);
  doc.text(`Pedido para ${cliente}`, padX, y);
  y += 18;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(...TEXT_SOFT);
  doc.text(`Realizado el día ${dia} de ${mesNombre}`, padX, y);
  y += 26;

  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.75);
  doc.line(padX, y, rightX, y);
  y += 22;

  y = encabezadoTabla(y);

  // Si el pedido es largo, las filas se compactan un poco para que entre en una sola página si se puede.
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  const partesPorLinea = lineas.map((l) => doc.splitTextToSize(String(l.producto), anchoNombre));
  const altoTotal = (min) => partesPorLinea.reduce((acc, p) => acc + Math.max(min, p.length * 13 + (min - 13)), 0);
  let minFila = 24;
  while (minFila > 19 && y + altoTotal(minFila) + bloqueFinal > pageH - 56) minFila--;

  let total = 0, unidades = 0;
  lineas.forEach((l, idx) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    const partes = partesPorLinea[idx];
    const altoFila = Math.max(minFila, partes.length * 13 + (minFila - 13));
    if (y + altoFila > limiteY) {
      finMarco[pagina] = pageH - 56;
      dibujarMarco(pagina);
      doc.addPage();
      pagina++;
      y = boxTop + 36;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(...TEXT_SOFT);
      doc.text(`Pedido para ${cliente} (continuación)`, padX, y);
      y += 24;
      y = encabezadoTabla(y);
    }
    dibujarCheck(doc, colCheck, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(...TEXT);
    doc.text(partes, colProducto, y);
    doc.text(String(l.unidades), colCant, y, { align: "right" });
    doc.text(fmt(l.precio), colPrecio, y, { align: "right" });
    doc.setFont("helvetica", "bold");
    doc.text(fmt(l.total), colTotal, y, { align: "right" });
    total += Number(l.total || 0);
    unidades += Number(l.unidades || 0);
    y += altoFila;
  });

  // El cierre (subtotal, total y agradecimiento) nunca queda cortado: si no entra, va en página nueva.
  if (y + bloqueFinal > pageH - 56) {
    finMarco[pagina] = pageH - 56;
    dibujarMarco(pagina);
    doc.addPage();
    pagina++;
    y = boxTop + 36;
  }

  y += 4;
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.75);
  doc.line(padX, y, rightX, y);
  y += 22;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(...TEXT_SOFT);
  doc.text(`Subtotal (${unidades} ${unidades === 1 ? "unidad" : "unidades"})`, padX, y);
  doc.setTextColor(...TEXT);
  doc.text(fmt(total), rightX, y, { align: "right" });
  y += 24;

  doc.setFillColor(...CREAM);
  doc.roundedRect(padX - 10, y - 16, boxW - 32, 30, 5, 5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...RUST);
  doc.text("Total", padX, y + 4);
  doc.text(fmt(total), rightX, y + 4, { align: "right" });
  y += 46;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...TEXT_SOFT);
  doc.text("¡Gracias por tu compra!", padX, y);
  doc.text(`El Castaño × ${vendorNombre}`, rightX, y, { align: "right" });

  finMarco[pagina] = y + 26;
  dibujarMarco(pagina);

  const nombreArchivo = `Pedido ${cliente} - Dia ${dia} ${mesNombre}.pdf`.replace(/[\\/:*?"<>|]/g, "");
  return { doc, nombreArchivo };
}

// Comparte (en el celu) o descarga un PDF ya armado.
async function compartirODescargar(doc, nombreArchivo) {
  const blob = doc.output("blob");

  // En el celu, mejor usar el botón nativo de compartir con el PDF
  // adjunto directo (sin texto ni link) — así en WhatsApp llega el
  // archivo solo, no un link temporal que no funciona.
  const archivo = new File([blob], nombreArchivo, { type: "application/pdf" });
  if (navigator.canShare && navigator.canShare({ files: [archivo] })) {
    try {
      await navigator.share({ files: [archivo] });
      return;
    } catch (e) {
      if (e && e.name === "AbortError") return; // el vendedor cerró el panel de compartir
      // si falla por otro motivo, seguimos con la descarga de abajo
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

// Genera el comprobante y lo comparte o descarga.
export async function descargarComprobantePedido(datos) {
  const { doc, nombreArchivo } = await armarComprobante(datos);
  await compartirODescargar(doc, nombreArchivo);
}

// ---------------------------------------------------------------------------
// Resumen de un despacho: productos enviados, faltantes, cajas y cuenta a rendir.
// Comisión base de este despacho: Minorista + Comercio al % del vendedor,
// Mayorista + Granel al 5% fijo. El premio por objetivo y el bono se liquidan a fin de mes.
// ---------------------------------------------------------------------------
export const PCT_MAYORISTA_GRANEL = 0.05;
export const PCT_COMERCIO = 0.10;

function pctTexto(x) {
  return `${String(Math.round(Number(x || 0) * 1000) / 10).replace(".", ",")}%`;
}
function fechaCorta(iso) {
  const [, m, d] = String(iso).split("-");
  return `${Number(d)}/${Number(m)}`;
}

// Calcula lo que se vendió, la comisión y lo que hay que rendir.
export function calcularRendicionDespacho(porCategoria, pctMinorista) {
  const minoristaComercio = (porCategoria.Minorista || 0) + (porCategoria.Comercio || 0);
  const mayoristaGranel = (porCategoria.Mayorista || 0) + (porCategoria.Granel || 0);
  const comisionMinorista = (porCategoria.Minorista || 0) * (Number(pctMinorista) || 0) + (porCategoria.Comercio || 0) * PCT_COMERCIO;
  const comisionMayorista = mayoristaGranel * PCT_MAYORISTA_GRANEL;
  const vendido = minoristaComercio + mayoristaGranel;
  const c2 = (x) => Math.round(x * 100) / 100;
  return { minoristaComercio: c2(minoristaComercio), mayoristaGranel: c2(mayoristaGranel), comisionMinorista: c2(comisionMinorista), comisionMayorista: c2(comisionMayorista), vendido: c2(vendido), comision: c2(comisionMinorista + comisionMayorista), aRendir: c2(vendido - comisionMinorista - comisionMayorista) };
}

export async function armarResumenDespacho({ vendorNombre, fecha, mesNombre, cajas, nota, productos, faltantes, porCategoria, pctMinorista }) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = 595, pageH = 842;
  const boxX = 56, boxW = pageW - boxX * 2, boxTop = 56;
  const limiteY = pageH - 64;
  const padX = boxX + 26, rightX = boxX + boxW - 26;
  const colProducto = padX, colCant = rightX - 140, colPrecio = rightX - 75, colTotal = rightX;
  const anchoNombre = colCant - colProducto - 36;
  const r = calcularRendicionDespacho(porCategoria, pctMinorista);
  // Los números de unidades se centran justo debajo de la palabra "UNIDADES".
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  const centroUnidades = padX + doc.getTextWidth("UNIDADES") / 2;

  const finMarco = {};
  const dibujarMarco = (pagina) => {
    doc.setPage(pagina);
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(1);
    doc.setLineDashPattern([2.5, 2], 0);
    doc.roundedRect(boxX, boxTop, boxW, finMarco[pagina] - boxTop, 10, 10, "S");
    doc.setLineDashPattern([], 0);
  };

  let pagina = 1;
  let y = boxTop + 40;
  const nuevaPagina = () => {
    finMarco[pagina] = pageH - 56;
    dibujarMarco(pagina);
    doc.addPage();
    pagina++;
    y = boxTop + 36;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...TEXT_SOFT);
    doc.text(`Resumen del despacho del ${fechaCorta(fecha)} (continuación)`, padX, y);
    y += 24;
  };
  const asegurar = (alto) => { if (y + alto > limiteY) nuevaPagina(); };
  const linea = () => { doc.setDrawColor(...BORDER); doc.setLineWidth(0.75); doc.line(padX, y, rightX, y); };
  const titulo = (texto) => {
    asegurar(50);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...RUST);
    doc.text(texto, padX, y);
    y += 16;
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.setTextColor(...TEXT);
  doc.text(`Despacho del ${fechaCorta(fecha)}`, padX, y);
  y += 18;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(...TEXT_SOFT);
  doc.text(`${vendorNombre} · ${mesNombre}`, padX, y);
  y += 22;
  linea();
  y += 24;

  // 1) Productos enviados: solo producto y unidades, en orden alfabético
  titulo("Productos enviados");
  const encabezado = () => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...TEXT_SOFT);
    doc.text("UNIDADES", padX, y);
    doc.text("PRODUCTO", padX + 62, y);
    y += 6;
    linea();
    y += 15;
  };
  asegurar(60);
  encabezado();
  let totalUnidades = 0;
  productos.forEach((l) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const partes = doc.splitTextToSize(String(l.producto), rightX - (padX + 62));
    const alto = Math.max(18, partes.length * 12.5 + 5);
    if (y + alto > limiteY) { nuevaPagina(); encabezado(); }
    doc.setTextColor(...TEXT);
    doc.text(partes, padX + 62, y);
    doc.setFont("helvetica", "bold");
    doc.text(String(l.unidades), centroUnidades, y, { align: "center" });
    totalUnidades += Number(l.unidades) || 0;
    y += alto;
  });
  if (productos.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...TEXT_SOFT);
    doc.text("No hay productos en este despacho.", padX, y);
    y += 24;
  } else {
    asegurar(30);
    y += 2;
    linea();
    y += 17;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...TEXT_SOFT);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...TEXT);
    doc.text(String(totalUnidades), centroUnidades, y, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...TEXT_SOFT);
    doc.text("Total de unidades enviadas", padX + 62, y);
    y += 28;
  }

  // 2) Cajas
  asegurar(70);
  titulo("Cajas enviadas");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(...TEXT);
  doc.text(cajas ? `${cajas} ${Number(cajas) === 1 ? "caja" : "cajas"}` : "Sin dato de cajas", padX, y);
  y += 16;
  if (nota) {
    const partesNota = doc.splitTextToSize(String(nota), rightX - padX);
    asegurar(partesNota.length * 13 + 6);
    doc.setFontSize(9.5);
    doc.setTextColor(...TEXT_SOFT);
    doc.text(partesNota, padX, y);
    y += partesNota.length * 13;
  }
  y += 16;

  // 3) Faltantes
  titulo("Productos faltantes");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  if (faltantes.length === 0) {
    doc.setTextColor(...TEXT_SOFT);
    doc.text("Sin faltantes.", padX, y);
    y += 22;
  } else {
    faltantes.forEach((f) => {
      const partes = doc.splitTextToSize(String(f.producto), rightX - (padX + 62));
      const alto = Math.max(18, partes.length * 12.5 + 5);
      asegurar(alto);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(...TEXT);
      doc.text(partes, padX + 62, y);
      doc.setFont("helvetica", "bold");
      doc.text(String(f.n), centroUnidades, y, { align: "center" });
      y += alto;
    });
    y += 8;
  }

  // 4) Cuenta: vendido, comisión y a rendir (siempre juntos en la misma página)
  const alto4 = 235;
  asegurar(alto4);
  titulo("Resumen de pago");
  const fila = (etiqueta, valor, negrita) => {
    doc.setFont("helvetica", negrita ? "bold" : "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(...(negrita ? TEXT : TEXT_SOFT));
    doc.text(etiqueta, padX, y);
    doc.setTextColor(...TEXT);
    doc.text(valor, rightX, y, { align: "right" });
    y += 20;
  };
  fila("Vendiste · Minorista y Comercio", fmtC(r.minoristaComercio));
  fila("Vendiste · Mayorista y Granel", fmtC(r.mayoristaGranel));
  fila("Total vendido", fmtC(r.vendido), true);
  y += 2; linea(); y += 18;
  fila(`Tu comisión · Minorista (${pctTexto(pctMinorista)}) y Comercio (${pctTexto(PCT_COMERCIO)})`, fmtC(r.comisionMinorista));
  fila(`Tu comisión · Mayorista y Granel (${pctTexto(PCT_MAYORISTA_GRANEL)})`, fmtC(r.comisionMayorista));
  fila("Tu comisión total", fmtC(r.comision), true);
  y += 4;
  doc.setFillColor(...CREAM);
  doc.roundedRect(padX - 10, y - 16, boxW - 32, 32, 5, 5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...RUST);
  doc.text("Tenés que rendir", padX, y + 4);
  doc.text(fmtC(r.aRendir), rightX, y + 4, { align: "right" });
  y += 40;

  // Pie: logo de El Castaño × nombre del vendedor
  asegurar(40);
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...TEXT_SOFT);
  const textoVendedor = `× ${vendorNombre}`;
  const anchoVendedor = doc.getTextWidth(textoVendedor);
  doc.text(textoVendedor, rightX, y, { align: "right" });
  try {
    const logo = await cargarLogo();
    const w = 60, h = 14.5;
    doc.addImage(logo, "PNG", rightX - anchoVendedor - 8 - w, y - 11, w, h);
  } catch (e) {
    doc.text("El Castaño", rightX - anchoVendedor - 6, y, { align: "right" });
  }

  finMarco[pagina] = y + 26;
  dibujarMarco(pagina);

  const nombreArchivo = `Despacho ${fechaCorta(fecha).replace("/", "-")} ${mesNombre} - ${vendorNombre}.pdf`.replace(/[\\/:*?"<>|]/g, "");
  return { doc, nombreArchivo };
}

export async function descargarResumenDespacho(datos) {
  const { doc, nombreArchivo } = await armarResumenDespacho(datos);
  await compartirODescargar(doc, nombreArchivo);
}


// ---------------------------------------------------------------------------
// Términos y condiciones firmados (con DNI y firma dibujada en pantalla).
// ---------------------------------------------------------------------------
export async function descargarTerminosFirmados({ titulo, clausulas, version, nombre, dni, firma, aceptadoEn }) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = 595, pageH = 842, margen = 56, ancho = pageW - margen * 2;
  const limiteY = pageH - 70;
  let y = 60;

  try {
    const logo = await cargarLogo();
    doc.addImage(logo, "PNG", margen, y - 14, 90, 28);
  } catch (e) { /* sin logo */ }
  y += 36;

  const nuevaPaginaSiHaceFalta = (alto) => { if (y + alto > limiteY) { doc.addPage(); y = 60; } };

  doc.setFont("helvetica", "bold"); doc.setFontSize(15); doc.setTextColor(...TEXT);
  doc.splitTextToSize(titulo, ancho).forEach((l) => { doc.text(l, margen, y); y += 20; });
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...TEXT_SOFT);
  doc.text(`Versión ${version}`, margen, y); y += 22;

  clausulas.forEach(([tit, texto]) => {
    const lineas = doc.splitTextToSize(texto, ancho);
    nuevaPaginaSiHaceFalta(16 + lineas.length * 13 + 10);
    doc.setFont("helvetica", "bold"); doc.setFontSize(10.5); doc.setTextColor(...TEXT);
    doc.text(tit, margen, y); y += 15;
    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(...TEXT);
    lineas.forEach((l) => { doc.text(l, margen, y); y += 13; });
    y += 9;
  });

  // Bloque de firma (siempre completo en una misma página)
  nuevaPaginaSiHaceFalta(190);
  y += 6;
  doc.setDrawColor(...BORDER); doc.setLineWidth(1); doc.line(margen, y, margen + ancho, y); y += 22;
  doc.setFont("helvetica", "bold"); doc.setFontSize(10.5); doc.setTextColor(...TEXT);
  doc.text("Aceptado y firmado por el vendedor", margen, y); y += 18;
  doc.setFont("helvetica", "normal"); doc.setFontSize(10);
  const fechaTxt = new Date(aceptadoEn).toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", dateStyle: "long", timeStyle: "short" });
  doc.text(`Nombre: ${nombre}`, margen, y); y += 14;
  doc.text(`DNI: ${dni}`, margen, y); y += 14;
  doc.text(`Fecha y hora: ${fechaTxt}`, margen, y); y += 12;
  try { doc.addImage(firma, "PNG", margen, y, 200, 80); } catch (e) { /* firma ilegible */ }
  y += 84;
  doc.setDrawColor(...TEXT_SOFT); doc.line(margen, y, margen + 220, y); y += 12;
  doc.setFontSize(8.5); doc.setTextColor(...TEXT_SOFT); doc.text("Firma", margen, y);

  const nombreArchivo = `Terminos y condiciones - ${nombre}.pdf`.replace(/[\\/:*?"<>|]/g, "");
  await compartirODescargar(doc, nombreArchivo);
}

// ---------------------------------------------------------------------------
// Detalle de pedido consolidado (para armar los pedidos): encabezado con totales y bolsas,
// resumen por cliente y detalle de productos por cliente.
// lineas: [{ categoria, cliente, producto, unidades, precio, total }]
// ---------------------------------------------------------------------------
const DET_AZUL = [27, 90, 122];
const DET_TITULO = [27, 70, 100];
const DET_CLARO = [234, 241, 245];
const DET_BORDE = [190, 208, 220];

function fmtDet(n) {
  return "$ " + Math.round(Number(n) || 0).toLocaleString("es-AR", { maximumFractionDigits: 0 });
}

function fechaDetalle(iso) {
  const [y, m, d] = String(iso).split("-");
  return `${d}/${m}/${y}`;
}

export async function armarDetallePedido({ vendorNombre, fecha, lineas, bolsasTexto }) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageH = 842, X = 44, W = 507, limiteY = pageH - 48;
  let y = 56;

  // Agrupa por cliente (y canal), en el orden en que aparecen.
  const grupos = [];
  const mapa = new Map();
  lineas.forEach((l) => {
    const k = String(l.cliente || "").trim().toLowerCase() + "|" + String(l.categoria || "").trim().toLowerCase();
    if (!mapa.has(k)) { const g = { cliente: String(l.cliente || "").trim(), canal: String(l.categoria || "").trim(), unidades: 0, subtotal: 0, items: [] }; mapa.set(k, g); grupos.push(g); }
    const g = mapa.get(k);
    g.unidades += Number(l.unidades) || 0;
    g.subtotal += Number(l.total) || 0;
    g.items.push(l);
  });
  const totalUnidades = grupos.reduce((a, g) => a + g.unidades, 0);
  const totalPedido = grupos.reduce((a, g) => a + g.subtotal, 0);
  const canales = Array.from(new Set(lineas.map((l) => String(l.categoria || "").trim()).filter(Boolean)));

  const nueva = () => { doc.addPage(); y = 48; };
  const hace = (alto) => { if (y + alto > limiteY) nueva(); };
  const celda = (x, w, h, relleno) => {
    doc.setDrawColor(...DET_BORDE); doc.setLineWidth(0.5);
    if (relleno) { doc.setFillColor(...relleno); doc.rect(x, y, w, h, "FD"); } else doc.rect(x, y, w, h, "S");
  };
  const texto = (t, x, base, { size = 8.5, bold = false, color = [0, 0, 0], align = "left" } = {}) => {
    doc.setFont("helvetica", bold ? "bold" : "normal"); doc.setFontSize(size); doc.setTextColor(...color);
    doc.text(String(t), x, base, { align });
  };

  // Título
  texto("PRESUPUESTO", X, y + 20, { size: 24, bold: true, color: DET_TITULO });
  y += 40;
  texto(vendorNombre, X, y, { size: 14, bold: true, color: DET_TITULO });
  y += 14;

  // Datos generales
  const filas = [
    ["Fecha", fechaDetalle(fecha), "Vendedor/a", vendorNombre],
    ["Tipo de pedido", "Pedido consolidado", "Clientes", String(grupos.length)],
    ["Canal", canales.join(" · ") || "-", "Registros", String(lineas.length)],
  ];
  const cw = [105, 150, 105, 147], rh = 17;
  filas.forEach((f) => {
    let x = X;
    f.forEach((c, i) => {
      celda(x, cw[i], rh, null);
      texto(c, x + 6, y + 11.5, { size: 8, bold: i % 2 === 0, color: i % 2 === 0 ? DET_TITULO : DET_AZUL });
      x += cw[i];
    });
    y += rh;
  });
  celda(X, cw[0], rh, null); celda(X + cw[0], W - cw[0], rh, null);
  texto("Bolsas", X + 6, y + 11.5, { size: 8, bold: true, color: DET_TITULO });
  texto(bolsasTexto, X + cw[0] + 6, y + 11.5, { size: 8, bold: true, color: DET_TITULO });
  y += rh + 10;

  // Totales
  const mitad = W / 2;
  [["TOTAL DE UNIDADES", String(totalUnidades), X], ["TOTAL DEL PEDIDO", fmtDet(totalPedido), X + mitad]].forEach((b) => {
    doc.setFillColor(...DET_AZUL); doc.rect(b[2], y, mitad, 17, "F");
    texto(b[0], b[2] + mitad / 2, y + 11.5, { size: 8.5, bold: true, color: [255, 255, 255], align: "center" });
    doc.setFillColor(...DET_CLARO); doc.rect(b[2], y + 17, mitad, 32, "F");
    texto(b[1], b[2] + mitad / 2, y + 39, { size: 16, bold: true, color: [0, 0, 0], align: "center" });
  });
  y += 49 + 24;

  // Resumen por cliente
  texto("Resumen por cliente", X, y, { size: 14, bold: true, color: DET_TITULO });
  y += 10;
  const rc = [213, 107, 80, 107];
  const encabezadoResumen = () => {
    let x = X;
    ["Cliente", "Canal", "Unidades", "Subtotal"].forEach((t, i) => {
      doc.setFillColor(...DET_AZUL); doc.rect(x, y, rc[i], 17, "F");
      if (i >= 2) texto(t, x + rc[i] - 6, y + 11.5, { size: 8, bold: true, color: [255, 255, 255], align: "right" });
      else texto(t, x + 6, y + 11.5, { size: 8, bold: true, color: [255, 255, 255] });
      x += rc[i];
    });
    y += 17;
  };
  encabezadoResumen();
  grupos.forEach((g, idx) => {
    if (y + 16.5 > limiteY) { nueva(); encabezadoResumen(); }
    let x = X;
    [g.cliente, g.canal, String(g.unidades), fmtDet(g.subtotal)].forEach((t, i) => {
      celda(x, rc[i], 16.5, idx % 2 === 1 ? DET_CLARO : null);
      if (i >= 2) texto(t, x + rc[i] - 6, y + 11.5, { size: 8, align: "right" });
      else texto(t, x + 6, y + 11.5, { size: 8 });
      x += rc[i];
    });
    y += 16.5;
  });
  y += 26;

  // Detalle de productos por cliente
  hace(60);
  texto("Detalle de productos por cliente", X, y, { size: 14, bold: true, color: DET_TITULO });
  y += 10;
  const dc = [213, 107, 80, 107]; // Producto, Cant., Precio unit., Importe
  const dibujarEncabezadoCliente = (g, continua) => {
    doc.setFillColor(...DET_AZUL); doc.rect(X, y, W, 18, "F");
    texto(g.cliente + (continua ? " (continuación)" : ""), X + 6, y + 12.5, { size: 8.5, bold: true, color: [255, 255, 255] });
    texto(g.canal, X + 276, y + 12.5, { size: 8.5, bold: true, color: [255, 255, 255], align: "center" });
    texto(g.unidades + " un.", X + 360, y + 12.5, { size: 8.5, bold: true, color: [255, 255, 255], align: "center" });
    texto(fmtDet(g.subtotal), X + W - 6, y + 12.5, { size: 8.5, bold: true, color: [255, 255, 255], align: "right" });
    y += 18;
    let x = X;
    ["Producto", "Cant.", "Precio unit.", "Importe"].forEach((t, i) => {
      celda(x, dc[i], 17, DET_CLARO);
      texto(t, x + 6, y + 11.5, { size: 8, bold: true });
      x += dc[i];
    });
    y += 17;
  };
  grupos.forEach((g) => {
    // Si el bloque entra en una página, se mantiene junto; si no, se parte con "continuación".
    const altoBloque = 18 + 17 + g.items.reduce((acc, l) => acc + Math.max(16.5, doc.splitTextToSize(String(l.producto || ""), dc[0] - 12).length * 10 + 6.5), 0);
    if (altoBloque <= limiteY - 48) hace(altoBloque); else hace(18 + 17 + 34);
    dibujarEncabezadoCliente(g, false);
    g.items.forEach((l) => {
      const nombre = doc.splitTextToSize(String(l.producto || ""), dc[0] - 12);
      const alto = Math.max(16.5, nombre.length * 10 + 6.5);
      if (y + alto > limiteY) { nueva(); dibujarEncabezadoCliente(g, true); }
      let x = X;
      const vals = [null, String(l.unidades), fmtDet(l.precio), fmtDet(l.total)];
      dc.forEach((w, i) => {
        celda(x, w, alto, null);
        if (i === 0) { doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(...DET_AZUL); doc.text(nombre, x + 6, y + 11.5); }
        else texto(vals[i], x + w - 6, y + 11.5, { size: 8, align: "right" });
        x += w;
      });
      y += alto;
    });
    y += 12;
  });

  // Total general
  hace(24);
  celda(X, W, 20, DET_CLARO);
  texto("TOTAL GENERAL", X + 6, y + 13.5, { size: 9, bold: true, color: DET_TITULO });
  texto(totalUnidades + " unidades", X + 213 + 107 + 80 - 6, y + 13.5, { size: 9, bold: true, align: "right" });
  texto(fmtDet(totalPedido), X + W - 6, y + 13.5, { size: 9, bold: true, align: "right" });

  const [yy, mm, dd] = String(fecha).split("-");
  const nombreArchivo = `Detalle ${vendorNombre} ${dd}-${mm}-${yy}.pdf`.replace(/[\\/:*?"<>|]/g, "");
  return { doc, nombreArchivo };
}

export async function descargarDetallePedido(datos) {
  const { doc, nombreArchivo } = await armarDetallePedido(datos);
  await compartirODescargar(doc, nombreArchivo);
}
