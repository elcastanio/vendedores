import React, { useState, useEffect, useCallback, useMemo } from "react";
import * as XLSX from "xlsx";
import {
  ClipboardList, Target, Package, Wallet, LogOut, Plus, Check, X, Loader2,
  ShieldCheck, Users, Boxes, ListChecks, ChevronRight, AlertTriangle, Upload,
  ExternalLink, RefreshCw,
} from "lucide-react";
import * as db from "./db";
import * as sheets from "./sheetsClient";

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || "castano2026";

const TOKENS = {
  bg: "#EFE9DC", surface: "#FFFDF8", border: "#D9CEB7", text: "#2B2115", textSoft: "#6E6250",
  olive: "#6B7A3D", oliveDark: "#4F5C2A", rust: "#B5542A", rustDark: "#8E3F1D", danger: "#A13A2E", cream: "#F6F1E4",
};

function GlobalStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Work+Sans:wght@400;500;600;700&display=swap');
      * { box-sizing: border-box; }
      html, body, #root { height: 100%; }
      body { font-family: 'Work Sans', sans-serif; color: ${TOKENS.text}; background: ${TOKENS.bg}; }
      .ec-serif { font-family: 'Fraunces', serif; }
      .ec-shell { max-width: 460px; margin: 0 auto; min-height: 100vh; background: ${TOKENS.bg}; display: flex; flex-direction: column; position: relative; }
      .ec-admin-shell { max-width: 1000px; margin: 0 auto; min-height: 100vh; background: ${TOKENS.bg}; display: flex; flex-direction: column; }
      .ec-topbar { padding: 22px 20px 16px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid ${TOKENS.border}; }
      .ec-brand { font-size: 20px; font-weight: 600; letter-spacing: 0.2px; }
      .ec-brand span { color: ${TOKENS.rust}; }
      .ec-sub { font-size: 12.5px; color: ${TOKENS.textSoft}; margin-top: 2px; }
      .ec-content { flex: 1; padding: 18px 18px 100px; overflow-y: auto; }
      .ec-card { background: ${TOKENS.surface}; border: 1px solid ${TOKENS.border}; border-radius: 10px; padding: 16px; margin-bottom: 14px; }
      .ec-card h3 { margin: 0 0 12px; font-size: 15px; font-weight: 600; display: flex; align-items: center; gap: 8px; }
      .ec-field { margin-bottom: 12px; }
      .ec-field label { display: block; font-size: 12.5px; color: ${TOKENS.textSoft}; margin-bottom: 5px; }
      .ec-field input, .ec-field select, .ec-field textarea {
        width: 100%; padding: 10px 11px; border: 1px solid ${TOKENS.border}; border-radius: 7px;
        font-size: 14.5px; font-family: inherit; background: #fff; color: ${TOKENS.text};
      }
      .ec-field input[type="date"] { font-size: 13.5px; min-width: 0; }
      .ec-field input:disabled { background: ${TOKENS.cream}; color: ${TOKENS.textSoft}; }
      .ec-field input:focus, .ec-field select:focus, .ec-field textarea:focus { outline: 2px solid ${TOKENS.olive}; outline-offset: 1px; }
      .ec-row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
      .ec-row2 > .ec-field { min-width: 0; }
      .ec-row2 > .ec-field input, .ec-row2 > .ec-field select { min-width: 0; width: 100%; box-sizing: border-box; }
      .ec-btn { display: inline-flex; align-items: center; justify-content: center; gap: 7px; border: none; border-radius: 7px; padding: 11px 16px; font-size: 14.5px; font-weight: 600; font-family: inherit; cursor: pointer; }
      .ec-btn:focus-visible { outline: 2px solid ${TOKENS.oliveDark}; outline-offset: 2px; }
      .ec-btn-primary { background: ${TOKENS.olive}; color: #fff; }
      .ec-btn-primary:hover { background: ${TOKENS.oliveDark}; }
      .ec-btn-rust { background: ${TOKENS.rust}; color: #fff; }
      .ec-btn-rust:hover { background: ${TOKENS.rustDark}; }
      .ec-btn-ghost { background: transparent; color: ${TOKENS.textSoft}; border: 1px solid ${TOKENS.border}; }
      .ec-btn-block { width: 100%; }
      .ec-btn[disabled] { opacity: 0.55; cursor: default; }
      .ec-pedido-row { border: 1px solid ${TOKENS.border}; border-radius: 8px; padding: 11px 12px; margin-bottom: 9px; background: #fff; }
      .ec-pedido-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
      .ec-pedido-cliente { font-weight: 600; font-size: 14.5px; }
      .ec-pedido-meta { font-size: 12.5px; color: ${TOKENS.textSoft}; margin-top: 2px; }
      .ec-linea { display: flex; justify-content: space-between; font-size: 13px; padding: 4px 0; border-top: 1px dashed ${TOKENS.border}; }
      .ec-subtotal { display: flex; justify-content: space-between; font-size: 13.5px; font-weight: 600; padding-top: 6px; margin-top: 4px; border-top: 1px solid ${TOKENS.border}; }
      .ec-badge { font-size: 11.5px; font-weight: 600; padding: 3px 9px; border-radius: 20px; white-space: nowrap; }
      .ec-badge-pend { background: #F0E6CE; color: #8A6A21; }
      .ec-badge-desp { background: #E1E8D2; color: ${TOKENS.oliveDark}; }
      .ec-badge-a { background: #E1E8D2; color: ${TOKENS.oliveDark}; }
      .ec-badge-b { background: #F0E6CE; color: #8A6A21; }
      .ec-badge-c { background: #F5E2DC; color: ${TOKENS.rustDark}; }
      .ec-note { margin-top: 7px; font-size: 12.5px; padding: 7px 9px; border-radius: 6px; background: ${TOKENS.cream}; }
      .ec-note.warn { background: #F5E2DC; color: ${TOKENS.rustDark}; }
      .ec-tabbar { position: sticky; bottom: 0; display: flex; border-top: 1px solid ${TOKENS.border}; background: ${TOKENS.surface}; }
      .ec-tab { flex: 1; border: none; background: transparent; padding: 10px 4px 12px; display: flex; flex-direction: column; align-items: center; gap: 4px; font-family: inherit; font-size: 10.5px; font-weight: 600; color: ${TOKENS.textSoft}; cursor: pointer; }
      .ec-tab.active { color: ${TOKENS.rust}; }
      .ec-progress-track { width: 100%; height: 12px; background: ${TOKENS.cream}; border-radius: 20px; overflow: hidden; border: 1px solid ${TOKENS.border}; }
      .ec-progress-fill { height: 100%; background: ${TOKENS.olive}; border-radius: 20px 0 0 20px; transition: width 0.4s ease; }
      .ec-big-num { font-family: 'Fraunces', serif; font-size: 34px; font-weight: 600; line-height: 1; }
      .ec-login-wrap { flex: 1; display: flex; flex-direction: column; justify-content: center; padding: 32px 26px; }
      .ec-admin-tabs { display: flex; gap: 6px; padding: 0 20px 14px; border-bottom: 1px solid ${TOKENS.border}; flex-wrap: wrap; }
      .ec-admin-tab { border: 1px solid ${TOKENS.border}; background: #fff; border-radius: 7px; padding: 8px 13px; font-size: 13px; font-weight: 600; color: ${TOKENS.textSoft}; cursor: pointer; font-family: inherit; display: flex; align-items: center; gap: 6px; }
      .ec-admin-tab.active { background: ${TOKENS.oliveDark}; color: #fff; border-color: ${TOKENS.oliveDark}; }
      .ec-table { width: 100%; border-collapse: collapse; }
      .ec-table th { text-align: left; font-size: 12px; color: ${TOKENS.textSoft}; padding: 6px 8px; border-bottom: 1px solid ${TOKENS.border}; white-space: nowrap; }
      .ec-table td { padding: 7px 8px; border-bottom: 1px solid ${TOKENS.border}; font-size: 13.5px; vertical-align: top; }
      .ec-error { color: ${TOKENS.danger}; font-size: 13px; margin-top: 8px; }
      .ec-ok { color: ${TOKENS.oliveDark}; font-size: 13px; margin-top: 8px; }
      .ec-empty { text-align: center; color: ${TOKENS.textSoft}; font-size: 13.5px; padding: 30px 10px; }
      .ec-row-actions { display: flex; gap: 6px; flex-wrap: wrap; }
      .ec-select-inline { padding: 5px 7px; border-radius: 6px; border: 1px solid ${TOKENS.border}; font-family: inherit; font-size: 12.5px; }
      .ec-summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px; }
      .ec-summary-item { background: ${TOKENS.cream}; border-radius: 8px; padding: 10px; }
      .ec-summary-item .label { font-size: 11px; color: ${TOKENS.textSoft}; }
      .ec-summary-item .value { font-size: 16px; font-weight: 600; }
      @keyframes spin { to { transform: rotate(360deg); } }
    `}</style>
  );
}

function Spinner({ label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: 24, color: TOKENS.textSoft, fontSize: 13.5 }}>
      <Loader2 size={16} style={{ animation: "spin 0.9s linear infinite" }} />
      {label || "Cargando..."}
    </div>
  );
}

function fmtMoney(n) {
  return "$" + Number(n || 0).toLocaleString("es-AR", { maximumFractionDigits: 0 });
}
function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function fechaHoy() {
  return new Date().toISOString().slice(0, 10);
}

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <>
          <GlobalStyle />
          <div className="ec-shell"><div className="ec-content"><div className="ec-card">
            <h3 style={{ color: TOKENS.danger }}><AlertTriangle size={16} /> Se produjo un error</h3>
            <div style={{ fontSize: 13, color: TOKENS.textSoft, wordBreak: "break-word" }}>{this.state.error.message || String(this.state.error)}</div>
          </div></div></div>
        </>
      );
    }
    return this.props.children;
  }
}

// ---------------- LOGIN ----------------

function LoginScreen({ vendors, onVendorLogin, onAdminLogin }) {
  const [mode, setMode] = useState("vendedor");
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setError("");
    if (mode === "admin") {
      if (password === ADMIN_PASSWORD) onAdminLogin();
      else setError("Contraseña de administrador incorrecta.");
      return;
    }
    if (!vendors || vendors.length === 0) { setError("No hay vendedores cargados todavía."); return; }
    const v = vendors.find((v) => (v.usuario || "").trim().toLowerCase() === usuario.trim().toLowerCase());
    if (!v || v.password !== password) { setError("Usuario o contraseña incorrectos."); return; }
    onVendorLogin(v.id);
  };

  return (
    <div className="ec-shell">
      <div className="ec-login-wrap">
        <div className="ec-serif" style={{ fontSize: 30, fontWeight: 600, marginBottom: 4 }}>El <span style={{ color: TOKENS.rust }}>Castaño</span></div>
        <div className="ec-sub" style={{ marginBottom: 30 }}>Pedidos, objetivos y stock para tu red de vendedores</div>
        <div onKeyDown={(e) => { if (e.key === "Enter") submit(e); }}>
          {mode === "vendedor" ? (
            <>
              <div className="ec-field"><label>Usuario</label><input value={usuario} onChange={(e) => setUsuario(e.target.value)} placeholder="tu usuario" autoComplete="username" /></div>
              <div className="ec-field"><label>Contraseña</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••" autoComplete="current-password" /></div>
            </>
          ) : (
            <div className="ec-field"><label>Contraseña de administrador</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••" autoComplete="current-password" /></div>
          )}
          {error && <div className="ec-error">{error}</div>}
          <button type="button" onClick={submit} className="ec-btn ec-btn-rust ec-btn-block" style={{ marginTop: 6 }}>Entrar</button>
        </div>
        <button className="ec-btn ec-btn-ghost ec-btn-block" style={{ marginTop: 12 }} onClick={() => { setError(""); setPassword(""); setMode(mode === "vendedor" ? "admin" : "vendedor"); }}>
          {mode === "vendedor" ? (<><ShieldCheck size={15} /> Soy administrador</>) : "Volver a acceso de vendedor"}
        </button>
      </div>
    </div>
  );
}

// ---------------- VENDOR APP ----------------

function VendorApp({ vendor, products, onLogout }) {
  const [tab, setTab] = useState("pedidos");
  return (
    <div className="ec-shell">
      <div className="ec-topbar">
        <div><div className="ec-brand ec-serif">El <span>Castaño</span></div><div className="ec-sub">{vendor.nombre}</div></div>
        <button className="ec-btn ec-btn-ghost" onClick={onLogout}><LogOut size={14} /> Salir</button>
      </div>
      <div className="ec-content">
        {!vendor.sheetUrl && (
          <div className="ec-card"><div className="ec-error" style={{ marginTop: 0 }}>
            Todavía no tenés una planilla vinculada. Pedile al administrador que la cargue en tu ficha.
          </div></div>
        )}
        {tab === "pedidos" && <PedidosTab vendor={vendor} products={products} />}
        {tab === "objetivo" && <ObjetivoTab vendor={vendor} />}
        {tab === "stock" && <StockTab vendor={vendor} products={products} />}
        {tab === "rendiciones" && <RendicionesTab vendor={vendor} />}
      </div>
      <div className="ec-tabbar">
        <TabBtn active={tab === "pedidos"} onClick={() => setTab("pedidos")} icon={<ClipboardList size={17} />} label="Pedidos" />
        <TabBtn active={tab === "objetivo"} onClick={() => setTab("objetivo")} icon={<Target size={17} />} label="Objetivo" />
        <TabBtn active={tab === "stock"} onClick={() => setTab("stock")} icon={<Package size={17} />} label="Stock" />
        <TabBtn active={tab === "rendiciones"} onClick={() => setTab("rendiciones")} icon={<Wallet size={17} />} label="Rendiciones" />
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, icon, label }) {
  return <button className={`ec-tab ${active ? "active" : ""}`} onClick={onClick}>{icon}{label}</button>;
}

// Buscador de producto con autocompletado — reemplaza al <select> nativo,
// que se vuelve inusable con más de unos pocos cientos de productos.
function ProductPicker({ products, value, onChange, placeholder }) {
  const seleccionado = products.find((p) => p.id === value);
  const [query, setQuery] = useState(seleccionado?.nombre || "");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const boxRef = React.useRef(null);

  useEffect(() => {
    const actual = products.find((p) => p.id === value);
    setQuery(actual?.nombre || "");
  }, [value, products]);

  const filtrados = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q ? products.filter((p) => p.nombre.toLowerCase().includes(q)) : products;
    return base.slice(0, 40);
  }, [query, products]);

  useEffect(() => {
    function onClickOutside(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const elegir = (p) => {
    onChange(p.id);
    setQuery(p.nombre);
    setOpen(false);
  };

  return (
    <div ref={boxRef} style={{ position: "relative" }}>
      <input
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); setHighlight(0); if (!e.target.value) onChange(""); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setHighlight((h) => Math.min(h + 1, filtrados.length - 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setHighlight((h) => Math.max(h - 1, 0)); }
          else if (e.key === "Enter") { e.preventDefault(); if (filtrados[highlight]) elegir(filtrados[highlight]); }
          else if (e.key === "Escape") { setOpen(false); }
        }}
        placeholder={placeholder || "Escribí para buscar..."}
        autoComplete="off"
      />
      {open && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0, zIndex: 20,
          background: "#fff", border: `1px solid ${TOKENS.border}`, borderRadius: 8,
          maxHeight: 220, overflowY: "auto", marginTop: 4, boxShadow: "0 6px 16px rgba(43,33,21,0.12)",
        }}>
          {filtrados.length === 0 ? (
            <div style={{ padding: "10px 12px", fontSize: 13, color: TOKENS.textSoft }}>Sin resultados</div>
          ) : (
            filtrados.map((p, i) => (
              <div
                key={p.id}
                onMouseDown={(e) => { e.preventDefault(); elegir(p); }}
                style={{
                  padding: "9px 12px", fontSize: 13.5, cursor: "pointer",
                  background: i === highlight ? TOKENS.cream : "transparent",
                }}
              >
                {p.nombre}
              </div>
            ))
          )}
          {products.length > 40 && filtrados.length === 40 && (
            <div style={{ padding: "7px 12px", fontSize: 11.5, color: TOKENS.textSoft, borderTop: `1px solid ${TOKENS.border}` }}>
              Mostrando los primeros 40 resultados — seguí escribiendo para afinar la búsqueda.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PedidosTab({ vendor, products }) {
  const [fecha, setFecha] = useState(fechaHoy);
  const [categoria, setCategoria] = useState(db.CATEGORIAS[0]);
  const [cliente, setCliente] = useState("");
  const [productoId, setProductoId] = useState("");
  const [unidades, setUnidades] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [pedidos, setPedidos] = useState(null);
  const [loadError, setLoadError] = useState("");

  const mesActual = sheets.mesDeFecha(fechaHoy());
  const productoSel = products.find((p) => p.id === productoId);
  const precio = db.precioProducto(productoSel, categoria);
  const total = precio * (Number(unidades) || 0);

  const cargar = useCallback(async () => {
    if (!vendor.sheetUrl) return;
    setLoadError("");
    try { setPedidos(await sheets.fetchPedidosSheet(vendor.sheetUrl, mesActual)); }
    catch (e) { setLoadError(e.message); }
  }, [vendor.sheetUrl, mesActual]);

  useEffect(() => { cargar(); }, [cargar]);

  const submit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setError("");
    if (!cliente.trim() || !productoSel || !unidades || Number(unidades) <= 0) {
      setError("Completá cliente, producto y unidades (mayor a 0).");
      return;
    }
    setSaving(true);
    try {
      await sheets.addPedidoSheet(vendor.sheetUrl, {
        fecha, categoria, cliente: cliente.trim(), producto: productoSel.nombre, unidades: Number(unidades), precio,
      });
      setUnidades("");
      cargar();
    } catch (err) {
      setError("No se pudo guardar el pedido: " + err.message);
    }
    setSaving(false);
  };

  const grupos = useMemo(() => {
    if (!pedidos) return null;
    const map = new Map();
    pedidos.forEach((p) => {
      const key = `${p.dia}|${p.cliente}`;
      if (!map.has(key)) map.set(key, { dia: p.dia, cliente: p.cliente, categoria: p.categoria, lineas: [] });
      map.get(key).lineas.push(p);
    });
    return Array.from(map.values()).reverse();
  }, [pedidos]);

  if (!vendor.sheetUrl) return null;

  return (
    <>
      <div className="ec-card">
        <h3><ClipboardList size={16} /> Nuevo pedido — {mesActual}</h3>
        <div onKeyDown={(e) => { if (e.key === "Enter") submit(e); }}>
          <div className="ec-row2">
            <div className="ec-field"><label>Fecha</label><input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} /></div>
            <div className="ec-field"><label>Categoría</label>
              <select value={categoria} onChange={(e) => setCategoria(e.target.value)}>
                {db.CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="ec-field"><label>Cliente</label><input value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Nombre del cliente" /></div>
          <div className="ec-field"><label>Producto</label>
            {products.length === 0 ? (
              <input disabled value="Sin productos cargados" />
            ) : (
              <ProductPicker products={products} value={productoId} onChange={setProductoId} placeholder="Escribí para buscar un producto..." />
            )}
          </div>
          <div className="ec-row2">
            <div className="ec-field"><label>Unidades</label><input type="number" min="1" value={unidades} onChange={(e) => setUnidades(e.target.value)} placeholder="0" /></div>
            <div className="ec-field"><label>Precio</label><input value={fmtMoney(precio)} disabled /></div>
          </div>
          <div className="ec-summary-item" style={{ marginBottom: 12 }}><div className="label">TOTAL DE ESTA LÍNEA</div><div className="value">{fmtMoney(total)}</div></div>
          {error && <div className="ec-error">{error}</div>}
          <button className="ec-btn ec-btn-primary ec-btn-block" disabled={saving} type="button" onClick={submit}>
            {saving ? <Loader2 size={15} style={{ animation: "spin 0.9s linear infinite" }} /> : <Plus size={15} />} Cargar línea de pedido
          </button>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "18px 0 10px" }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: TOKENS.textSoft }}>PEDIDOS DE {mesActual.toUpperCase()}</span>
        <button className="ec-btn ec-btn-ghost" style={{ padding: "5px 9px" }} onClick={cargar}><RefreshCw size={13} /></button>
      </div>
      {loadError && <div className="ec-error">{loadError}</div>}
      {grupos === null ? <Spinner label="Cargando pedidos de la planilla..." /> : grupos.length === 0 ? (
        <div className="ec-empty">Todavía no cargaste ningún pedido este mes.</div>
      ) : (
        grupos.map((g, i) => {
          const subtotal = g.lineas.reduce((acc, l) => acc + Number(l.total || 0), 0);
          const todasDespachadas = g.lineas.every((l) => l.despachado);
          return (
            <div className="ec-pedido-row" key={i}>
              <div className="ec-pedido-top">
                <div><div className="ec-pedido-cliente">{g.cliente}</div><div className="ec-pedido-meta">Día {g.dia} · {g.categoria}</div></div>
                <span className={`ec-badge ${todasDespachadas ? "ec-badge-desp" : "ec-badge-pend"}`}>{todasDespachadas ? "Despachado" : "Pendiente"}</span>
              </div>
              {g.lineas.map((l) => (
                <div key={l.fila}>
                  <div className="ec-linea"><span>{l.producto} × {l.unidades}</span><span>{fmtMoney(l.total)}</span></div>
                  {l.faltante && <div className="ec-note warn"><AlertTriangle size={12} style={{ marginRight: 5, verticalAlign: -2 }} />Faltante: {l.faltante}</div>}
                </div>
              ))}
              <div className="ec-subtotal"><span>Subtotal</span><span>{fmtMoney(subtotal)}</span></div>
            </div>
          );
        })
      )}
    </>
  );
}

function ObjetivoTab({ vendor }) {
  const [objetivos, setObjetivos] = useState(null);
  const [pedidos, setPedidos] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const mesActual = sheets.mesDeFecha(fechaHoy());
        const [obj, ped] = await Promise.all([
          db.fetchObjetivos(),
          vendor.sheetUrl ? sheets.fetchPedidosSheet(vendor.sheetUrl, mesActual) : Promise.resolve([]),
        ]);
        setObjetivos(obj);
        setPedidos(ped);
      } catch (e) { setError(e.message); }
    })();
  }, [vendor.sheetUrl]);

  if (objetivos === null || pedidos === null) return <Spinner label="Calculando objetivo..." />;
  if (error) return <div className="ec-error">{error}</div>;

  const mesActual = currentMonthKey();
  const objetivoRow = objetivos.find((o) => o.vendor_id === vendor.id && o.mes === mesActual);
  const objetivo = Number(objetivoRow?.objetivo || 0);

  const porCategoria = {};
  db.CATEGORIAS.forEach((c) => (porCategoria[c] = 0));
  let totalVentas = 0;
  pedidos.forEach((p) => {
    const t = Number(p.total || 0);
    porCategoria[p.categoria] = (porCategoria[p.categoria] || 0) + t;
    totalVentas += t;
  });
  const comisionGanada = totalVentas * (vendor.comision || 0);
  const pct = objetivo > 0 ? Math.min(100, Math.round((totalVentas / objetivo) * 100)) : 0;
  const restante = Math.max(0, objetivo - totalVentas);

  return (
    <div className="ec-card">
      <h3><Target size={16} /> Objetivo del mes</h3>
      <div className="ec-big-num">{fmtMoney(totalVentas)}</div>
      <div className="ec-sub" style={{ marginBottom: 14 }}>vendido sobre una meta de {objetivo > 0 ? fmtMoney(objetivo) : "sin definir"}</div>
      <div className="ec-progress-track"><div className="ec-progress-fill" style={{ width: `${pct}%` }} /></div>
      <div className="ec-sub" style={{ marginTop: 8 }}>{objetivo > 0 ? `${pct}% cumplido · falta ${fmtMoney(restante)}` : "Todavía no te cargaron un objetivo para este mes"}</div>
      <div className="ec-summary-grid">
        {db.CATEGORIAS.map((c) => (
          <div className="ec-summary-item" key={c}><div className="label">{c.toUpperCase()}</div><div className="value">{fmtMoney(porCategoria[c])}</div></div>
        ))}
      </div>
      <div className="ec-summary-item" style={{ marginTop: 10 }}>
        <div className="label">TU COMISIÓN ESTE MES ({Math.round((vendor.comision || 0) * 100)}%)</div>
        <div className="value">{fmtMoney(comisionGanada)}</div>
      </div>
    </div>
  );
}

function StockTab({ vendor, products }) {
  const [fecha, setFecha] = useState(fechaHoy);
  const [productoId, setProductoId] = useState("");
  const [unidades, setUnidades] = useState("");
  const [observacion, setObservacion] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [stock, setStock] = useState(null);

  const cargar = useCallback(async () => {
    try { setStock(await db.fetchStockExtra(vendor.id)); } catch (e) { setError(e.message); }
  }, [vendor.id]);
  useEffect(() => { cargar(); }, [cargar]);

  const productoNombre = (id) => products.find((p) => p.id === id)?.nombre || "Producto eliminado";

  const agregar = async () => {
    setError("");
    if (!productoId || !unidades || Number(unidades) <= 0) { setError("Elegí un producto y una cantidad mayor a 0."); return; }
    setSaving(true);
    try {
      await db.addStockExtra(vendor.id, { fecha, productoId, unidades: Number(unidades), observacion });
      setUnidades(""); setObservacion(""); cargar();
    } catch (e) { setError("No se pudo guardar: " + e.message); }
    setSaving(false);
  };
  const marcarVendido = async (id) => { try { await db.marcarStockVendido(id); cargar(); } catch (e) { setError(e.message); } };

  return (
    <>
      <div className="ec-card">
        <h3><Package size={16} /> Registrar mercadería de más</h3>
        <div className="ec-sub" style={{ marginBottom: 12 }}>Si en un envío te llegó algo de más, registralo acá. Cuando lo vendas, marcalo como "Vendido".</div>
        <div className="ec-field"><label>Fecha</label><input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} /></div>
        <div className="ec-field"><label>Producto</label>
          <ProductPicker products={products} value={productoId} onChange={setProductoId} placeholder="Escribí para buscar un producto..." />
        </div>
        <div className="ec-field"><label>Unidades</label><input type="number" min="1" value={unidades} onChange={(e) => setUnidades(e.target.value)} placeholder="0" /></div>
        <div className="ec-field"><label>Observación (opcional)</label><input value={observacion} onChange={(e) => setObservacion(e.target.value)} /></div>
        {error && <div className="ec-error">{error}</div>}
        <button className="ec-btn ec-btn-primary ec-btn-block" onClick={agregar} disabled={saving} type="button">
          {saving ? <Loader2 size={15} style={{ animation: "spin 0.9s linear infinite" }} /> : <Plus size={15} />} Registrar
        </button>
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, margin: "18px 0 10px", color: TOKENS.textSoft }}>REGISTROS</div>
      {stock === null ? <Spinner label="Cargando..." /> : stock.length === 0 ? (
        <div className="ec-empty">Todavía no registraste mercadería de más.</div>
      ) : (
        stock.map((s) => (
          <div className="ec-pedido-row" key={s.id}>
            <div className="ec-pedido-top">
              <div><div className="ec-pedido-cliente">{productoNombre(s.productoId)} × {s.unidades}</div><div className="ec-pedido-meta">{s.fecha}</div></div>
              <span className={`ec-badge ${s.estado === "Vendido" ? "ec-badge-desp" : "ec-badge-pend"}`}>{s.estado}</span>
            </div>
            {s.observacion && <div className="ec-note">{s.observacion}</div>}
            {s.estado !== "Vendido" && <button className="ec-btn ec-btn-ghost" style={{ marginTop: 8, padding: "6px 10px" }} onClick={() => marcarVendido(s.id)}>Marcar como vendido</button>}
          </div>
        ))
      )}
    </>
  );
}

function RendicionesTab({ vendor }) {
  const [rendiciones, setRendiciones] = useState(null);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    if (!vendor.sheetUrl) return;
    setError("");
    try { setRendiciones(await sheets.fetchRendicionesSheet(vendor.sheetUrl)); }
    catch (e) { setError(e.message); }
  }, [vendor.sheetUrl]);
  useEffect(() => { cargar(); }, [cargar]);

  if (!vendor.sheetUrl) return null;
  if (error) return <div className="ec-error">{error}</div>;
  if (rendiciones === null) return <Spinner label="Cargando rendiciones..." />;

  const badgeClase = (c) => (c === "A" ? "ec-badge-a" : c === "B" ? "ec-badge-b" : c === "C" ? "ec-badge-c" : "ec-badge-pend");

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: TOKENS.textSoft }}>HISTORIAL DE RENDICIONES</span>
        <button className="ec-btn ec-btn-ghost" style={{ padding: "5px 9px" }} onClick={cargar}><RefreshCw size={13} /></button>
      </div>
      {rendiciones.length === 0 ? (
        <div className="ec-empty">Todavía no hay rendiciones cargadas.</div>
      ) : (
        rendiciones.map((r, i) => (
          <div className="ec-pedido-row" key={i}>
            <div className="ec-pedido-top">
              <div><div className="ec-pedido-cliente">{r.fecha}</div><div className="ec-pedido-meta">Vendido {r.totalVendido} · Comisión {r.comision}</div></div>
              <span className={`ec-badge ${badgeClase(r.estadoColor)}`}>{r.estadoColor || r.estado}</span>
            </div>
            <div className="ec-linea"><span>Transferencias</span><span>{r.transferencias}</span></div>
            <div className="ec-linea"><span>Envío</span><span>{r.envio}</span></div>
            <div className="ec-subtotal"><span>A rendir</span><span>{r.aRendir}</span></div>
            {r.montoPagado && <div className="ec-note">Pagado: {r.montoPagado} {r.fechaPago ? `el ${r.fechaPago}` : ""}</div>}
            {r.observaciones && <div className="ec-note">{r.observaciones}</div>}
          </div>
        ))
      )}
    </>
  );
}

// ---------------- ADMIN APP ----------------

function AdminApp({ vendors, products, onLogout, refreshVendors, refreshProducts }) {
  const [tab, setTab] = useState("vendedores");
  return (
    <div className="ec-admin-shell">
      <div className="ec-topbar">
        <div><div className="ec-brand ec-serif">El <span>Castaño</span> · Admin</div><div className="ec-sub">Panel de gestión de vendedores</div></div>
        <button className="ec-btn ec-btn-ghost" onClick={onLogout}><LogOut size={14} /> Salir</button>
      </div>
      <div className="ec-admin-tabs">
        <button className={`ec-admin-tab ${tab === "vendedores" ? "active" : ""}`} onClick={() => setTab("vendedores")}><Users size={14} /> Vendedores</button>
        <button className={`ec-admin-tab ${tab === "productos" ? "active" : ""}`} onClick={() => setTab("productos")}><Boxes size={14} /> Productos</button>
        <button className={`ec-admin-tab ${tab === "objetivos" ? "active" : ""}`} onClick={() => setTab("objetivos")}><Target size={14} /> Objetivos</button>
        <button className={`ec-admin-tab ${tab === "pedidos" ? "active" : ""}`} onClick={() => setTab("pedidos")}><ListChecks size={14} /> Pedidos</button>
      </div>
      <div className="ec-content" style={{ paddingBottom: 40 }}>
        {tab === "vendedores" && <VendedoresAdmin vendors={vendors} refreshVendors={refreshVendors} />}
        {tab === "productos" && <ProductosAdmin products={products} refreshProducts={refreshProducts} />}
        {tab === "objetivos" && <ObjetivosAdmin vendors={vendors} />}
        {tab === "pedidos" && <PedidosAdmin vendors={vendors} />}
      </div>
    </div>
  );
}

function VendedoresAdmin({ vendors, refreshVendors }) {
  const [form, setForm] = useState({ nombre: "", usuario: "", password: "", comision: "10", sheetUrl: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editVals, setEditVals] = useState({});

  const agregar = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setError("");
    if (!form.nombre.trim() || !form.usuario.trim() || !form.password.trim()) { setError("Completá nombre, usuario y contraseña."); return; }
    if (vendors.some((v) => v.usuario.toLowerCase() === form.usuario.trim().toLowerCase())) { setError("Ya existe un vendedor con ese usuario."); return; }
    setSaving(true);
    try {
      await db.addVendor({ nombre: form.nombre.trim(), usuario: form.usuario.trim(), password: form.password, comision: (Number(form.comision) || 0) / 100, sheetUrl: form.sheetUrl.trim() });
      setForm({ nombre: "", usuario: "", password: "", comision: "10", sheetUrl: "" });
      refreshVendors();
    } catch (err) { setError("No se pudo guardar: " + err.message); }
    setSaving(false);
  };

  const startEdit = (v) => { setEditId(v.id); setEditVals({ ...v, comisionPct: Math.round(v.comision * 100) }); };
  const saveEdit = async () => {
    try {
      await db.updateVendor(editId, { nombre: editVals.nombre, usuario: editVals.usuario, password: editVals.password, comision: (Number(editVals.comisionPct) || 0) / 100, sheetUrl: editVals.sheetUrl });
      setEditId(null); refreshVendors();
    } catch (err) { setError("No se pudo guardar el cambio: " + err.message); }
  };
  const eliminar = async (id) => { try { await db.deleteVendor(id); refreshVendors(); } catch (err) { setError("No se pudo borrar: " + err.message); } };

  return (
    <>
      <div className="ec-card">
        <h3><Plus size={16} /> Nuevo vendedor</h3>
        <div onKeyDown={(e) => { if (e.key === "Enter") agregar(e); }}>
          <div className="ec-row2">
            <div className="ec-field"><label>Nombre</label><input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></div>
            <div className="ec-field"><label>Usuario</label><input value={form.usuario} onChange={(e) => setForm({ ...form, usuario: e.target.value })} /></div>
          </div>
          <div className="ec-row2">
            <div className="ec-field"><label>Contraseña</label><input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
            <div className="ec-field"><label>Comisión (%)</label><input type="number" min="0" max="100" value={form.comision} onChange={(e) => setForm({ ...form, comision: e.target.value })} /></div>
          </div>
          <div className="ec-field"><label>Link de su planilla de Google Sheets</label><input value={form.sheetUrl} onChange={(e) => setForm({ ...form, sheetUrl: e.target.value })} placeholder="https://docs.google.com/spreadsheets/d/..." /></div>
          {error && <div className="ec-error">{error}</div>}
          <button className="ec-btn ec-btn-primary" disabled={saving} type="button" onClick={agregar}>Agregar vendedor</button>
        </div>
      </div>
      <div className="ec-card">
        <h3><Users size={16} /> Vendedores ({vendors.length})</h3>
        <div style={{ overflowX: "auto" }}>
        <table className="ec-table">
          <thead><tr><th>Nombre</th><th>Usuario</th><th>Comisión</th><th>Planilla</th><th></th></tr></thead>
          <tbody>
            {vendors.map((v) => editId === v.id ? (
              <tr key={v.id}>
                <td><input value={editVals.nombre} onChange={(e) => setEditVals({ ...editVals, nombre: e.target.value })} /></td>
                <td><input value={editVals.usuario} onChange={(e) => setEditVals({ ...editVals, usuario: e.target.value })} /></td>
                <td><input type="number" style={{ width: 70 }} value={editVals.comisionPct} onChange={(e) => setEditVals({ ...editVals, comisionPct: e.target.value })} /></td>
                <td><input style={{ width: 160 }} value={editVals.sheetUrl} onChange={(e) => setEditVals({ ...editVals, sheetUrl: e.target.value })} /></td>
                <td className="ec-row-actions">
                  <button className="ec-btn ec-btn-primary" style={{ padding: "6px 9px" }} onClick={saveEdit}><Check size={13} /></button>
                  <button className="ec-btn ec-btn-ghost" style={{ padding: "6px 9px" }} onClick={() => setEditId(null)}><X size={13} /></button>
                </td>
              </tr>
            ) : (
              <tr key={v.id}>
                <td>{v.nombre}</td><td>{v.usuario}</td><td>{Math.round(v.comision * 100)}%</td>
                <td>{v.sheetUrl ? <a href={v.sheetUrl} target="_blank" rel="noreferrer" style={{ color: TOKENS.olive }}><ExternalLink size={13} /></a> : <span style={{ color: TOKENS.danger, fontSize: 12 }}>Sin planilla</span>}</td>
                <td className="ec-row-actions">
                  <button className="ec-btn ec-btn-ghost" style={{ padding: "6px 9px" }} onClick={() => startEdit(v)}>Editar</button>
                  <button className="ec-btn ec-btn-ghost" style={{ padding: "6px 9px", color: TOKENS.danger }} onClick={() => eliminar(v.id)}>Borrar</button>
                </td>
              </tr>
            ))}
            {vendors.length === 0 && <tr><td colSpan={5} className="ec-empty">Todavía no hay vendedores cargados.</td></tr>}
          </tbody>
        </table>
        </div>
      </div>
    </>
  );
}

// Busca la solapa más apropiada ("Precios" si existe, si no la primera) y
// dentro de ella detecta cuál es la fila real de encabezados (puede no ser
// la primera, como en los archivos de El Castaño que arrancan con un título).
// Reconoce nombres de columna alternativos (Nombre / Nombre producto / Producto,
// Granel / Granel/Industrias, etc.) para no obligar a reformatear el archivo.
function parseCatalogWorkbook(wb) {
  const nombreSolapa = wb.SheetNames.find((n) => n.trim().toLowerCase() === "precios") || wb.SheetNames[0];
  const ws = wb.Sheets[nombreSolapa];
  const filas = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

  const ALIAS = {
    nombre: ["nombre producto", "nombre", "producto"],
    minorista: ["minorista"],
    mayorista: ["mayorista"],
    granel: ["granel/industrias", "granel"],
    comercios: ["comercios"],
  };

  let headerRowIdx = -1;
  let colIndex = {};
  for (let i = 0; i < Math.min(filas.length, 15); i++) {
    const celdas = filas[i].map((c) => String(c).trim().toLowerCase());
    const tieneNombre = celdas.some((c) => ALIAS.nombre.includes(c));
    if (!tieneNombre) continue;
    const encontrar = (alias) => {
      const idx = celdas.findIndex((c) => alias.includes(c));
      return idx;
    };
    colIndex = {
      nombre: encontrar(ALIAS.nombre),
      minorista: encontrar(ALIAS.minorista),
      mayorista: encontrar(ALIAS.mayorista),
      granel: encontrar(ALIAS.granel),
      comercios: encontrar(ALIAS.comercios),
    };
    headerRowIdx = i;
    break;
  }
  if (headerRowIdx === -1) return { solapa: nombreSolapa, filas: [] };

  const num = (v) => {
    if (v === "" || v === null || v === undefined) return 0;
    if (typeof v === "number") return v;
    const limpio = String(v).replace(/[^0-9.,-]/g, "").replace(",", ".");
    return Number(limpio) || 0;
  };

  const resultado = [];
  for (let i = headerRowIdx + 1; i < filas.length; i++) {
    const fila = filas[i];
    const nombre = colIndex.nombre >= 0 ? String(fila[colIndex.nombre] || "").trim() : "";
    if (!nombre) continue;
    resultado.push({
      nombre,
      minorista: colIndex.minorista >= 0 ? num(fila[colIndex.minorista]) : 0,
      mayorista: colIndex.mayorista >= 0 ? num(fila[colIndex.mayorista]) : 0,
      granel: colIndex.granel >= 0 ? num(fila[colIndex.granel]) : 0,
      comercios: colIndex.comercios >= 0 ? num(fila[colIndex.comercios]) : 0,
    });
  }
  return { solapa: nombreSolapa, filas: resultado };
}

function ProductosAdmin({ products, refreshProducts }) {
  const [form, setForm] = useState({ nombre: "", precio_minorista: "", precio_mayorista: "", precio_granel: "", precio_comercios: "" });
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [editId, setEditId] = useState(null);
  const [editVals, setEditVals] = useState({});
  const [filtro, setFiltro] = useState("");
  const [uploading, setUploading] = useState(false);

  const agregar = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setError("");
    if (!form.nombre.trim()) return;
    try { await db.addProduct(form); setForm({ nombre: "", precio_minorista: "", precio_mayorista: "", precio_granel: "", precio_comercios: "" }); refreshProducts(); }
    catch (err) { setError("No se pudo guardar: " + err.message); }
  };
  const startEdit = (p) => { setEditId(p.id); setEditVals({ ...p }); };
  const saveEdit = async () => { try { await db.updateProduct(editId, editVals); setEditId(null); refreshProducts(); } catch (err) { setError(err.message); } };
  const eliminar = async (id) => { try { await db.deleteProduct(id); refreshProducts(); } catch (err) { setError(err.message); } };

  const manejarArchivo = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setError(""); setOk(""); setUploading(true);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf);
      const { solapa, filas: parseadas } = parseCatalogWorkbook(wb);
      if (parseadas.length === 0) {
        setError(`No encontré filas con nombre de producto en la solapa "${solapa}". Revisá que tenga una columna Nombre (o "Nombre producto"/"Producto").`);
      } else {
        const res = await db.bulkUpsertProducts(parseadas, products);
        setOk(`Leí la solapa "${solapa}" y guardé ${res.guardados} producto(s).`);
        refreshProducts();
      }
    } catch (err) { setError("No se pudo leer el archivo: " + err.message); }
    setUploading(false);
    e.target.value = "";
  };

  const filtrados = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    const base = q ? products.filter((p) => p.nombre.toLowerCase().includes(q)) : products;
    return base.slice(0, 100);
  }, [filtro, products]);

  return (
    <>
      <div className="ec-card">
        <h3><Upload size={16} /> Carga masiva desde Excel</h3>
        <div className="ec-sub" style={{ marginBottom: 12 }}>
          Detecta sola la solapa "Precios" (si existe) y la fila de encabezados, aunque no sea la primera.
          Reconoce columnas Nombre / "Nombre producto" / Producto, y Minorista, Mayorista, Comercios,
          Granel o "Granel/Industrias". Si el nombre ya existe (sin importar mayúsculas/minúsculas),
          actualiza sus precios; si es nuevo, lo agrega. Ideal para subir tu archivo de precios tal cual.
        </div>
        <label className="ec-btn ec-btn-primary" style={{ cursor: "pointer" }}>
          <Upload size={15} /> {uploading ? "Cargando..." : "Elegir archivo Excel"}
          <input type="file" accept=".xlsx,.xls" onChange={manejarArchivo} style={{ display: "none" }} disabled={uploading} />
        </label>
        {error && <div className="ec-error">{error}</div>}
        {ok && <div className="ec-ok">{ok}</div>}
      </div>

      <div className="ec-card">
        <h3><Boxes size={16} /> Catálogo de productos ({products.length})</h3>
        <div className="ec-sub" style={{ marginBottom: 12 }}>
          Importante: el nombre tiene que quedar escrito EXACTAMENTE como figura en la planilla de cada vendedor (solapa "Datos - Activos"), porque así es como se va a guardar en la columna Producto.
        </div>
        <div onKeyDown={(e) => { if (e.key === "Enter") agregar(e); }} style={{ marginBottom: 16 }}>
          <div className="ec-field"><label>Nombre del producto</label><input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></div>
          <div className="ec-row2">
            <div className="ec-field"><label>Precio Minorista</label><input type="number" value={form.precio_minorista} onChange={(e) => setForm({ ...form, precio_minorista: e.target.value })} /></div>
            <div className="ec-field"><label>Precio Mayorista</label><input type="number" value={form.precio_mayorista} onChange={(e) => setForm({ ...form, precio_mayorista: e.target.value })} /></div>
          </div>
          <div className="ec-row2">
            <div className="ec-field"><label>Precio Granel</label><input type="number" value={form.precio_granel} onChange={(e) => setForm({ ...form, precio_granel: e.target.value })} /></div>
            <div className="ec-field"><label>Precio Comercios</label><input type="number" value={form.precio_comercios} onChange={(e) => setForm({ ...form, precio_comercios: e.target.value })} /></div>
          </div>
          <button className="ec-btn ec-btn-primary" type="button" onClick={agregar}><Plus size={15} /> Agregar producto</button>
        </div>

        <div className="ec-field" style={{ maxWidth: 320 }}>
          <label>Buscar en el catálogo</label>
          <input value={filtro} onChange={(e) => setFiltro(e.target.value)} placeholder="Escribí para filtrar por nombre..." />
        </div>

        <div style={{ overflowX: "auto" }}>
        <table className="ec-table">
          <thead><tr><th>Producto</th><th>Minorista</th><th>Mayorista</th><th>Granel</th><th>Comercios</th><th></th></tr></thead>
          <tbody>
            {filtrados.map((p) => editId === p.id ? (
              <tr key={p.id}>
                <td><input value={editVals.nombre} onChange={(e) => setEditVals({ ...editVals, nombre: e.target.value })} /></td>
                <td><input type="number" style={{ width: 90 }} value={editVals.precio_minorista} onChange={(e) => setEditVals({ ...editVals, precio_minorista: Number(e.target.value) })} /></td>
                <td><input type="number" style={{ width: 90 }} value={editVals.precio_mayorista} onChange={(e) => setEditVals({ ...editVals, precio_mayorista: Number(e.target.value) })} /></td>
                <td><input type="number" style={{ width: 90 }} value={editVals.precio_granel} onChange={(e) => setEditVals({ ...editVals, precio_granel: Number(e.target.value) })} /></td>
                <td><input type="number" style={{ width: 90 }} value={editVals.precio_comercios} onChange={(e) => setEditVals({ ...editVals, precio_comercios: Number(e.target.value) })} /></td>
                <td className="ec-row-actions">
                  <button className="ec-btn ec-btn-primary" style={{ padding: "6px 9px" }} onClick={saveEdit}><Check size={13} /></button>
                  <button className="ec-btn ec-btn-ghost" style={{ padding: "6px 9px" }} onClick={() => setEditId(null)}><X size={13} /></button>
                </td>
              </tr>
            ) : (
              <tr key={p.id}>
                <td>{p.nombre}</td><td>{fmtMoney(p.precio_minorista)}</td><td>{fmtMoney(p.precio_mayorista)}</td><td>{fmtMoney(p.precio_granel)}</td><td>{fmtMoney(p.precio_comercios)}</td>
                <td className="ec-row-actions">
                  <button className="ec-btn ec-btn-ghost" style={{ padding: "6px 9px" }} onClick={() => startEdit(p)}>Editar</button>
                  <button className="ec-btn ec-btn-ghost" style={{ padding: "6px 9px", color: TOKENS.danger }} onClick={() => eliminar(p.id)}>Borrar</button>
                </td>
              </tr>
            ))}
            {products.length === 0 && <tr><td colSpan={6} className="ec-empty">Todavía no hay productos cargados.</td></tr>}
          </tbody>
        </table>
        {products.length > 100 && (
          <div className="ec-sub" style={{ marginTop: 8 }}>
            Mostrando {filtrados.length} de {products.length} productos — usá el buscador para encontrar uno puntual.
          </div>
        )}
        </div>
      </div>
    </>
  );
}
function ObjetivosAdmin({ vendors }) {
  const [mes, setMes] = useState(currentMonthKey());
  const [objetivos, setObjetivos] = useState(null);
  const [valores, setValores] = useState({});
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [uploading, setUploading] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const rows = await db.fetchObjetivos(mes);
      setObjetivos(rows);
      const v = {};
      rows.forEach((r) => (v[r.vendor_id] = r.objetivo));
      setValores(v);
    } catch (e) { setError(e.message); }
  }, [mes]);
  useEffect(() => { cargar(); }, [cargar]);

  const guardarUno = async (vendorId) => {
    setError(""); setOk("");
    try { await db.upsertObjetivo(vendorId, mes, Number(valores[vendorId]) || 0); setOk("Guardado."); cargar(); }
    catch (e) { setError(e.message); }
  };

  const manejarArchivo = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setError(""); setOk(""); setUploading(true);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
      const parseadas = rows.map((r) => ({
        vendorNombre: r.Vendedor ?? r.vendedor ?? "",
        mes: String(r.Mes ?? r.mes ?? "").trim(),
        objetivo: r.Objetivo ?? r.objetivo ?? 0,
      })).filter((r) => r.vendorNombre && r.mes);
      if (parseadas.length === 0) {
        setError("El archivo no tiene filas con columnas Vendedor, Mes y Objetivo.");
      } else {
        const res = await db.bulkUpsertObjetivos(parseadas, vendors);
        setOk(`Se guardaron ${res.guardados} objetivo(s).` + (res.noEncontrados.length ? ` No se encontró vendedor para: ${res.noEncontrados.join(", ")}.` : ""));
        cargar();
      }
    } catch (err) { setError("No se pudo leer el archivo: " + err.message); }
    setUploading(false);
    e.target.value = "";
  };

  return (
    <>
      <div className="ec-card">
        <h3><Upload size={16} /> Carga masiva desde Excel</h3>
        <div className="ec-sub" style={{ marginBottom: 12 }}>El archivo tiene que tener las columnas <b>Vendedor</b>, <b>Mes</b> (formato AAAA-MM, ej 2026-09) y <b>Objetivo</b>.</div>
        <label className="ec-btn ec-btn-primary" style={{ cursor: "pointer" }}>
          <Upload size={15} /> {uploading ? "Cargando..." : "Elegir archivo Excel"}
          <input type="file" accept=".xlsx,.xls" onChange={manejarArchivo} style={{ display: "none" }} disabled={uploading} />
        </label>
        {error && <div className="ec-error">{error}</div>}
        {ok && <div className="ec-ok">{ok}</div>}
      </div>
      <div className="ec-card">
        <h3><Target size={16} /> Objetivos por vendedor</h3>
        <div className="ec-field" style={{ maxWidth: 200 }}><label>Mes</label><input type="month" value={mes} onChange={(e) => setMes(e.target.value)} /></div>
        {objetivos === null ? <Spinner label="Cargando..." /> : (
          <div style={{ overflowX: "auto" }}>
          <table className="ec-table">
            <thead><tr><th>Vendedor</th><th>Objetivo</th><th></th></tr></thead>
            <tbody>
              {vendors.map((v) => (
                <tr key={v.id}>
                  <td>{v.nombre}</td>
                  <td><input type="number" style={{ width: 130 }} value={valores[v.id] ?? ""} onChange={(e) => setValores({ ...valores, [v.id]: e.target.value })} /></td>
                  <td><button className="ec-btn ec-btn-ghost" style={{ padding: "6px 9px" }} onClick={() => guardarUno(v.id)}>Guardar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </>
  );
}

function PedidosAdmin({ vendors }) {
  const [vendorId, setVendorId] = useState(vendors[0]?.id || "");
  const [mes, setMes] = useState(sheets.mesDeFecha(fechaHoy()));
  const [pedidos, setPedidos] = useState(null);
  const [error, setError] = useState("");
  const [editingRow, setEditingRow] = useState(null);
  const [editVals, setEditVals] = useState({});

  const vendor = vendors.find((v) => v.id === vendorId);

  const cargar = useCallback(async () => {
    if (!vendor || !vendor.sheetUrl) { setPedidos([]); return; }
    setError("");
    try { setPedidos(await sheets.fetchPedidosSheet(vendor.sheetUrl, mes)); }
    catch (e) { setError(e.message); setPedidos([]); }
  }, [vendor, mes]);
  useEffect(() => { cargar(); }, [cargar]);

  const startEdit = (p) => { setEditingRow(p.fila); setEditVals({ despachado: p.despachado, faltante: p.faltante }); };
  const guardarFila = async (p) => {
    try { await sheets.updatePedidoSheet(vendor.sheetUrl, mes, p.fila, editVals); setEditingRow(null); cargar(); }
    catch (e) { setError("No se pudo guardar: " + e.message); }
  };

  return (
    <div className="ec-card">
      <h3><ListChecks size={16} /> Pedidos por vendedor</h3>
      <div className="ec-row2">
        <div className="ec-field"><label>Vendedor</label>
          <select value={vendorId} onChange={(e) => setVendorId(e.target.value)}>{vendors.map((v) => <option key={v.id} value={v.id}>{v.nombre}</option>)}</select>
        </div>
        <div className="ec-field"><label>Mes</label>
          <select value={mes} onChange={(e) => setMes(e.target.value)}>
            {["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"].map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>
      {vendor && !vendor.sheetUrl && <div className="ec-error">Este vendedor todavía no tiene planilla vinculada.</div>}
      {error && <div className="ec-error">{error}</div>}
      {pedidos === null ? <Spinner label="Cargando..." /> : pedidos.length === 0 ? (
        <div className="ec-empty">No hay pedidos cargados en {mes} para este vendedor.</div>
      ) : (
        pedidos.map((p) => (
          <div className="ec-pedido-row" key={p.fila}>
            <div className="ec-pedido-top">
              <div><div className="ec-pedido-cliente">{p.cliente}</div><div className="ec-pedido-meta">{p.producto} · {p.unidades} u. · {p.categoria} · Día {p.dia} · {fmtMoney(p.total)}</div></div>
              {editingRow !== p.fila && <span className={`ec-badge ${p.despachado ? "ec-badge-desp" : "ec-badge-pend"}`}>{p.despachado ? "Despachado" : "Pendiente"}</span>}
            </div>
            {editingRow === p.fila ? (
              <div style={{ marginTop: 10 }}>
                <div className="ec-field"><label>Estado</label>
                  <select className="ec-select-inline" value={editVals.despachado ? "si" : "no"} onChange={(e) => setEditVals({ ...editVals, despachado: e.target.value === "si" })}>
                    <option value="no">Pendiente</option><option value="si">Despachado</option>
                  </select>
                </div>
                <div className="ec-field"><label>Faltante</label><input value={editVals.faltante} onChange={(e) => setEditVals({ ...editVals, faltante: e.target.value })} placeholder="Ej: faltaron 2 unidades" /></div>
                <div className="ec-row-actions">
                  <button className="ec-btn ec-btn-primary" onClick={() => guardarFila(p)}>Guardar</button>
                  <button className="ec-btn ec-btn-ghost" onClick={() => setEditingRow(null)}>Cancelar</button>
                </div>
              </div>
            ) : (
              <>
                {p.faltante && <div className="ec-note warn"><AlertTriangle size={12} style={{ marginRight: 5, verticalAlign: -2 }} />Faltante: {p.faltante}</div>}
                <button className="ec-btn ec-btn-ghost" style={{ marginTop: 8, padding: "6px 10px" }} onClick={() => startEdit(p)}>Editar estado <ChevronRight size={13} /></button>
              </>
            )}
          </div>
        ))
      )}
    </div>
  );
}

// ---------------- ROOT ----------------

function AppInner() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [vendors, setVendors] = useState([]);
  const [products, setProducts] = useState([]);
  const [session, setSession] = useState(null);

  const refreshVendors = useCallback(async () => setVendors(await db.fetchVendors()), []);
  const refreshProducts = useCallback(async () => setProducts(await db.fetchProducts()), []);

  useEffect(() => {
    (async () => {
      try {
        const [v, p] = await Promise.all([db.fetchVendors(), db.fetchProducts()]);
        setVendors(v); setProducts(p);
      } catch (e) {
        setLoadError("No se pudo conectar con la base de datos. Revisá VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY. Detalle: " + e.message);
      }
      setLoading(false);
    })();
  }, []);

  const activeVendor = session?.role === "vendor" ? vendors.find((v) => v.id === session.vendorId) : null;

  return (
    <>
      <GlobalStyle />
      {loading ? (
        <div className="ec-shell"><Spinner label="Cargando la aplicación..." /></div>
      ) : loadError ? (
        <div className="ec-shell"><div className="ec-content"><div className="ec-card">
          <h3 style={{ color: TOKENS.danger }}><AlertTriangle size={16} /> Error de conexión</h3>
          <div style={{ fontSize: 13, color: TOKENS.textSoft }}>{loadError}</div>
        </div></div></div>
      ) : session === null ? (
        <LoginScreen vendors={vendors} onVendorLogin={(vendorId) => setSession({ role: "vendor", vendorId })} onAdminLogin={() => setSession({ role: "admin" })} />
      ) : session.role === "admin" ? (
        <AdminApp vendors={vendors} products={products} onLogout={() => setSession(null)} refreshVendors={refreshVendors} refreshProducts={refreshProducts} />
      ) : activeVendor ? (
        <VendorApp vendor={activeVendor} products={products} onLogout={() => setSession(null)} />
      ) : (
        <div className="ec-shell"><div className="ec-empty">Tu usuario ya no existe. Contactá al administrador.</div></div>
      )}
    </>
  );
}

export default function App() {
  return (<ErrorBoundary><AppInner /></ErrorBoundary>);
}
