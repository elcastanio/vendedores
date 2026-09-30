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

// Genera y descarga un PDF tipo comprobante con el detalle de un pedido
// (un cliente, un día), para que el vendedor se lo pueda mandar a su cliente.
export async function descargarComprobantePedido({ vendorNombre, cliente, dia, mesNombre, lineas }) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margen = 40;
  let y = margen;

  try {
    const logo = await cargarLogo();
    doc.addImage(logo, "PNG", margen, y, 130, 32);
  } catch (e) {
    // Si por algún motivo no se puede cargar el logo, seguimos sin él.
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(110, 98, 80);
  doc.text(`× ${vendorNombre}`, margen, y + 52);

  y += 90;
  doc.setDrawColor(217, 206, 183);
  doc.line(margen, y, 555 - margen, y);
  y += 28;

  doc.setFontSize(16);
  doc.setTextColor(43, 33, 21);
  doc.setFont("helvetica", "bold");
  doc.text("Comprobante de pedido", margen, y);
  y += 22;

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 50, 38);
  doc.text(`Cliente: ${cliente}`, margen, y);
  y += 16;
  doc.text(`Fecha: Día ${dia} de ${mesNombre}`, margen, y);
  y += 28;

  // Encabezado de la tabla
  const colProducto = margen, colUnidades = 330, colPrecio = 400, colTotal = 480;
  doc.setFont("helvetica", "bold");
  doc.setFillColor(43, 33, 21);
  doc.rect(margen, y - 14, 555 - margen * 2, 22, "F");
  doc.setTextColor(255, 255, 255);
  doc.text("Producto", colProducto + 6, y + 2);
  doc.text("Unid.", colUnidades, y + 2);
  doc.text("Precio", colPrecio, y + 2);
  doc.text("Total", colTotal, y + 2);
  y += 22;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(43, 33, 21);
  let total = 0;
  lineas.forEach((l, i) => {
    if (y > 760) { doc.addPage(); y = margen; }
    if (i % 2 === 1) { doc.setFillColor(246, 241, 228); doc.rect(margen, y - 14, 555 - margen * 2, 20, "F"); }
    const nombre = doc.splitTextToSize(l.producto, 270)[0];
    doc.text(nombre, colProducto + 6, y);
    doc.text(String(l.unidades), colUnidades, y);
    doc.text(fmt(l.precio), colPrecio, y);
    doc.text(fmt(l.total), colTotal, y);
    total += Number(l.total || 0);
    y += 20;
  });

  y += 10;
  doc.setDrawColor(217, 206, 183);
  doc.line(margen, y, 555 - margen, y);
  y += 24;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Total del pedido", colPrecio - 40, y);
  doc.text(fmt(total), colTotal, y);

  y += 50;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(110, 98, 80);
  doc.text("¡Gracias por tu compra!", margen, y);

  const nombreArchivo = `Pedido ${cliente} - Dia ${dia} ${mesNombre}.pdf`.replace(/[\\/:*?"<>|]/g, "");
  doc.save(nombreArchivo);
}
