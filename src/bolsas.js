// Cálculo de bolsas por cliente para armar los pedidos (reglas de El Castaño).
// Solo cuenta clientes MINORISTA. Mayorista, Granel y Comercio no llevan bolsa.

const BOLSA_CHICA = { litros: 5, kg: 3 };      // capacidad útil (75% del volumen) y peso máximo
const BOLSA_GRANDE = { litros: 12.6, kg: 6 };

const norm = (t) => String(t == null ? "" : t).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim().toLowerCase();

// Productos sin gramaje en el nombre (valores confirmados). peso en gramos, litros o fuera de bolsa.
const CONFIRMADOS = [
  { clave: "tableta de chocolate al 70", g: 100 },
  { clave: "pura frutta", litros: 1 },
  { clave: "blend detox", litros: 1 },
  { clave: "green detox", litros: 1 },
  { clave: "promo semanal", g: 100 },
  { clave: "alfajor de arroz", g: 26 },
  { clave: "regalo dia de la madre", g: 300 },
  { clave: "kit especial muestras", g: 1000 },
  { clave: "barra proteica de coco", g: 50 },
  { clave: "dulce de membrillo 10", g: 500 },
  { clave: "box chica", fuera: true },
];

// "Granola artesanal 400 g." -> { g: 400 } ; "Aceite de oliva x 2 lt." -> { litros: 2 } ; sin gramaje -> null
function leerGramaje(nombreNorm) {
  const re = /(\d+(?:[.,]\d+)?)\s*(kgs?|kilos?|grs?|gramos?|g|lts?|litros?|l|ml|cc)(?![a-z0-9])/g;
  let m, ultimo = null;
  while ((m = re.exec(nombreNorm)) !== null) ultimo = m;
  if (!ultimo) return null;
  const n = parseFloat(ultimo[1].replace(",", "."));
  const u = ultimo[2];
  if (/^kg|^kilo/.test(u)) return { g: n * 1000 };
  if (/^g/.test(u)) return { g: n };
  if (/^l/.test(u)) return { litros: n };
  return { litros: n / 1000 }; // ml, cc
}

const RE_CEREAL_LIVIANO = /copos de maiz|aritos|bolitas de cereal|inflad|tutuca/;
const RE_LIQUIDO = /aceite|vinagre|aceto|jugo|pura frutta/;
const RE_FRASCO = /\bdulce de\b|\bmiel\b|pasta de mani|aceituna|mostaza|mermelada/;
const RE_SEMILLAS = /semilla|harina|azucar|arroz|fecula|eritritol|avena|\bsal\b|garbanz|quinoa/;

// Describe un producto para la bolsa. Devuelve:
//  { sinGramaje: true } si no se puede calcular (hay que consultar),
//  { fuera: "motivo" } si va suelto, o { kgUnidad, litrosUnidad, esPaquete1kg, g }.
export function describirProducto(nombre) {
  const n = norm(nombre);
  const conf = CONFIRMADOS.find((c) => n.indexOf(c.clave) !== -1);
  if (conf && conf.fuera) return { fuera: "Box Chica: va suelta" };
  const gram = conf ? conf : leerGramaje(n);
  if (!gram) return { sinGramaje: true };
  const gramos = gram.g !== undefined ? gram.g : null;
  const litros = gram.litros !== undefined ? gram.litros : null;

  if (/aceite/.test(n) && litros !== null && Math.abs(litros - 2) < 0.01) return { fuera: "Aceite de 2 lt: va suelto" };
  if (RE_CEREAL_LIVIANO.test(n) && gramos !== null && (gramos >= 500)) return { fuera: "Cereal liviano de " + (gramos >= 1000 ? "1 kg" : "500 g") + ": va suelto" };

  // Líquidos: 1,3 L de volumen por cada litro de producto (por el envase); se toma 1 kg por litro de peso.
  if (litros !== null || RE_LIQUIDO.test(n)) {
    const l = litros !== null ? litros : (gramos || 0) / 1000;
    return { kgUnidad: l, volUnidad: l * 1.3, esPaquete1kg: false, gramosUnidad: l * 1000, liquido: true };
  }
  const kg = gramos / 1000;
  let dens = 0.45;
  if (RE_CEREAL_LIVIANO.test(n)) dens = 0.15;
  else if (/cereal ba/.test(n)) dens = 0.45;                 // el cereal bañado en chocolate ocupa como un mix
  else if (/granola/.test(n) || /\bmix\b/.test(n)) dens = 0.45;
  else if (/chocolate|botoncito|banad/.test(n)) dens = 0.60;
  else if (RE_FRASCO.test(n)) dens = 0.75;
  else if (RE_SEMILLAS.test(n)) dens = 0.65;
  return { kgUnidad: kg, volUnidad: kg / dens, esPaquete1kg: gramos >= 1000, gramosUnidad: gramos, liquido: false };
}

// Bolsas de UN cliente a partir de sus productos [{producto, unidades}].
function bolsasDeCliente(items) {
  let kg = 0, vol = 0, hay1kg = false, pocos = true, gramosTotal = 0, enBolsa = 0;
  items.forEach((it) => {
    const d = it.desc, u = Number(it.unidades) || 0;
    if (d.fuera) return;
    enBolsa++;
    kg += d.kgUnidad * u; vol += d.volUnidad * u; gramosTotal += d.gramosUnidad * u;
    if (d.esPaquete1kg) hay1kg = true;
    if (d.liquido || d.gramosUnidad > 100) pocos = false;
  });
  if (enBolsa === 0) return { chicas: 0, grandes: 0, motivo: "Todo va suelto" };
  if (pocos && gramosTotal <= 200) return { chicas: 0, grandes: 0, motivo: "Pedido muy chico (hasta 200 g): va sin bolsa" };
  let grandes = 0, v = vol, w = kg;
  while (v > BOLSA_GRANDE.litros + 1e-9 || w > BOLSA_GRANDE.kg + 1e-9) { grandes++; v -= BOLSA_GRANDE.litros; w -= BOLSA_GRANDE.kg; }
  let chicas = 0;
  if (v > 1e-9 || w > 1e-9) {
    if (v <= BOLSA_CHICA.litros + 1e-9 && w <= BOLSA_CHICA.kg + 1e-9) chicas = 1; else grandes++;
  }
  if (hay1kg && grandes === 0) { grandes = 1; chicas = 0; }
  return { chicas, grandes, motivo: "" };
}

// lineas: [{ categoria, cliente, producto, unidades }]. Devuelve:
// { chicas, grandes, clientes: [...], sinBolsa: [...], variasBolsas: [...], fuera: [...], sinGramaje: [...] }
export function calcularBolsas(lineas) {
  const porCliente = new Map();
  const sinGramaje = new Set();
  (lineas || []).forEach((l) => {
    if (norm(l.categoria) !== "minorista") return;
    if (!String(l.producto || "").trim()) return;
    const clave = norm(l.cliente);
    if (!porCliente.has(clave)) porCliente.set(clave, { cliente: String(l.cliente || "").trim(), items: [] });
    const desc = describirProducto(l.producto);
    if (desc.sinGramaje) sinGramaje.add(String(l.producto).trim());
    porCliente.get(clave).items.push({ producto: l.producto, unidades: l.unidades, desc });
  });
  const res = { chicas: 0, grandes: 0, clientes: [], sinBolsa: [], variasBolsas: [], fuera: [], sinGramaje: Array.from(sinGramaje) };
  if (res.sinGramaje.length) return res;
  porCliente.forEach((c) => {
    const b = bolsasDeCliente(c.items);
    res.chicas += b.chicas; res.grandes += b.grandes;
    res.clientes.push({ cliente: c.cliente, chicas: b.chicas, grandes: b.grandes });
    if (b.chicas + b.grandes === 0) res.sinBolsa.push({ cliente: c.cliente, motivo: b.motivo });
    if (b.chicas + b.grandes > 1) res.variasBolsas.push({ cliente: c.cliente, chicas: b.chicas, grandes: b.grandes });
    c.items.forEach((it) => { if (it.desc.fuera) res.fuera.push({ cliente: c.cliente, producto: it.producto, motivo: it.desc.fuera }); });
  });
  return res;
}

export function textoBolsas(r) {
  return `${r.chicas} chica${r.chicas === 1 ? "" : "s"} · ${r.grandes} grande${r.grandes === 1 ? "" : "s"}`;
}
