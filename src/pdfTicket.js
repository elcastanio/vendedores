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
  const comisionMinorista = minoristaComercio * (Number(pctMinorista) || 0);
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
  fila(`Tu comisión · Minorista y Comercio (${pctTexto(pctMinorista)})`, fmtC(r.comisionMinorista));
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
