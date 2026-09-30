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

function fmt(n) {
  return "$" + Number(n || 0).toLocaleString("es-AR", { maximumFractionDigits: 0 });
}

// Paleta acorde a la app (TOKENS)
const RUST = [181, 84, 42];
const TEXT = [43, 33, 21];
const TEXT_SOFT = [110, 98, 80];
const CREAM = [246, 241, 228];
const BORDER = [217, 206, 183];

// Dibuja un tilde chiquito dentro de un cuadrado, como en un ticket de
// "picking" — la referencia visual que pidió Mati.
function dibujarCheck(doc, x, y) {
  doc.setDrawColor(...RUST);
  doc.setLineWidth(1.1);
  doc.roundedRect(x, y - 8, 10, 10, 2, 2, "S");
  doc.line(x + 2, y - 3, x + 4.2, y - 0.5);
  doc.line(x + 4.2, y - 0.5, x + 8, y - 6);
}

// Genera y descarga un PDF tipo comprobante con el detalle de un pedido
// (un cliente, un día), para que el vendedor se lo pueda mandar a su cliente.
export async function descargarComprobantePedido({ vendorNombre, cliente, dia, mesNombre, lineas }) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = 595;
  const boxX = 56, boxW = pageW - boxX * 2;
  const boxTop = 56;

  // Marco punteado alrededor de todo el comprobante.
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(1);
  doc.setLineDashPattern([2.5, 2], 0);
  const boxBottomEstimado = boxTop + 264 + lineas.length * 24;
  doc.roundedRect(boxX, boxTop, boxW, boxBottomEstimado - boxTop, 10, 10, "S");
  doc.setLineDashPattern([], 0);

  const padX = boxX + 26;
  const rightX = boxX + boxW - 26;
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

  // Encabezado de la tabla
  const colCheck = padX, colProducto = padX + 20, colCant = rightX - 210, colPrecio = rightX - 125, colTotal = rightX - 45;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...TEXT_SOFT);
  doc.text("PRODUCTO", colProducto, y);
  doc.text("CANT.", colCant, y, { align: "right" });
  doc.text("PRECIO UNIT.", colPrecio, y, { align: "right" });
  doc.text("TOTAL", colTotal, y, { align: "right" });
  y += 12;
  doc.setDrawColor(...BORDER);
  doc.line(padX, y, rightX, y);
  y += 20;

  let total = 0, unidades = 0;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  lineas.forEach((l) => {
    if (y > 740) { doc.addPage(); y = 56; }
    dibujarCheck(doc, colCheck, y);
    doc.setTextColor(...TEXT);
    const nombre = doc.splitTextToSize(l.producto, colCant - colProducto - 16)[0];
    doc.text(nombre, colProducto, y);
    doc.text(String(l.unidades), colCant, y, { align: "right" });
    doc.text(fmt(l.precio), colPrecio, y, { align: "right" });
    doc.setFont("helvetica", "bold");
    doc.text(fmt(l.total), colTotal, y, { align: "right" });
    doc.setFont("helvetica", "normal");
    total += Number(l.total || 0);
    unidades += Number(l.unidades || 0);
    y += 24;
  });

  y += 4;
  doc.setDrawColor(...BORDER);
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

  const nombreArchivo = `Pedido ${cliente} - Dia ${dia} ${mesNombre}.pdf`.replace(/[\\/:*?"<>|]/g, "");
  doc.save(nombreArchivo);
}
