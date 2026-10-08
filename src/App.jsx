import React, { useState, useEffect, useCallback, useMemo } from "react";
import * as XLSX from "xlsx";
import {
  ClipboardList, Target, Package, Wallet, LogOut, Plus, Check, X, Loader2,
  ShieldCheck, Users, Boxes, ListChecks, ChevronRight, AlertTriangle, Upload,
  ExternalLink, RefreshCw, Bell, BellOff, Pencil, FileDown, Trash2,
} from "lucide-react";
import * as db from "./db";
import * as sheets from "./sheetsClient";
import { descargarComprobantePedido, descargarResumenDespacho } from "./pdfTicket";
import { soportaPush, suscribirVendedor, yaEstaSuscripto, registrarSiYaSuscripto } from "./push";

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || "castano2026";

const TOKENS = {
  bg: "#F5F8FC", surface: "#FFFFFF", border: "#DAE2EC", text: "#14253A", textSoft: "#5A6B7E",
  olive: "#003C69", oliveDark: "#002B4C", rust: "#0B5CA3", rustDark: "#003C69", danger: "#B3342A", cream: "#EDF3F9",
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
      @media (min-width: 640px) {
        body { background: ${TOKENS.border}; }
        .ec-shell { max-width: 900px; min-height: calc(100vh - 64px); margin: 32px auto; border-radius: 18px; box-shadow: 0 18px 50px rgba(0,60,105,0.12); border: 1px solid ${TOKENS.border}; overflow: hidden; }
        .ec-pedidos-grid { display: grid; grid-template-columns: minmax(300px, 360px) 1fr; gap: 20px; align-items: start; }
      }
      .ec-admin-shell { max-width: 1000px; margin: 0 auto; min-height: 100vh; background: ${TOKENS.bg}; display: flex; flex-direction: column; }
      .ec-topbar { padding: 22px 20px 16px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid ${TOKENS.border}; }
      .ec-brand { font-size: 20px; font-weight: 600; letter-spacing: 0.2px; }
      .ec-brand span { color: ${TOKENS.rust}; }
      .ec-sub { font-size: 12.5px; color: ${TOKENS.textSoft}; margin-top: 2px; }
      .ec-content { flex: 1; padding: 18px 18px 100px; overflow-y: auto; }
      .ec-card { background: ${TOKENS.surface}; border: 1px solid ${TOKENS.border}; border-radius: 10px; padding: 16px; margin-bottom: 14px; }
      .ec-card h3 { margin: 0 0 12px; font-size: 15px; font-weight: 600; display: flex; align-items: center; gap: 8px; }
      .ec-field { margin-bottom: 12px; max-width: 100%; }
      .ec-field label { display: block; font-size: 12.5px; color: ${TOKENS.textSoft}; margin-bottom: 5px; }
      .ec-field input, .ec-field select, .ec-field textarea {
        width: 100%; padding: 10px 11px; border: 1px solid ${TOKENS.border}; border-radius: 7px;
        font-size: 14.5px; font-family: inherit; background: #fff; color: ${TOKENS.text};
      }
      .ec-field input[type="date"] { font-size: 13.5px; min-width: 0; width: 100%; max-width: 100%; box-sizing: border-box; display: block; }
      .ec-fecha-display {
        width: 100%; padding: 10px 11px; border: 1px solid ${TOKENS.border}; border-radius: 7px;
        font-size: 14.5px; font-family: inherit; background: #fff; color: ${TOKENS.text}; box-sizing: border-box;
      }
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
      .ec-badge-pend { background: #FDF0D2; color: #8A6A21; }
      .ec-badge-proceso { background: #DCEAF7; color: ${TOKENS.rustDark}; }
      .ec-badge-desp { background: #DDF1E4; color: #1E6B3C; }
      .ec-badge-a { background: #DDF1E4; color: #1E6B3C; }
      .ec-badge-b { background: #FDF0D2; color: #8A6A21; }
      .ec-badge-c { background: #FBE4E1; color: #9A2E25; }
      .ec-note { margin-top: 7px; font-size: 12.5px; padding: 7px 9px; border-radius: 6px; background: ${TOKENS.cream}; }
      .ec-note.warn { background: #FBE4E1; color: #9A2E25; }
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
      .ec-ok { color: #1E6B3C; font-size: 13px; margin-top: 8px; }
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

// Saludo según la hora en Argentina: día hasta las 12, tarde hasta las 20, noche el resto.
function saludoSegunHora() {
  const hora = Number(new Date().toLocaleString("en-GB", { hour: "2-digit", hour12: false, timeZone: "America/Argentina/Buenos_Aires" }).slice(0, 2));
  if (hora >= 5 && hora < 12) return "Buenos días";
  if (hora >= 12 && hora < 20) return "Buenas tardes";
  return "Buenas noches";
}

function fmtMoney(n) {
  return "$" + Number(n || 0).toLocaleString("es-AR", { maximumFractionDigits: 0 });
}
function claseBadgeEstado(estado) {
  if (estado === "DESPACHADO") return "ec-badge-desp";
  if (estado === "EN PROCESO") return "ec-badge-proceso";
  return "ec-badge-pend";
}
function etiquetaEstado(estado) {
  if (estado === "DESPACHADO") return "Despachado";
  if (estado === "EN PROCESO") return "En proceso";
  return "Pendiente";
}
// Para un grupo de líneas (un pedido, o todos los pendientes juntos):
// si alguna está "en proceso", mostramos ese estado; si no, Pendiente.
function estadoAgregado(lineas) {
  if (lineas.every((l) => l.estado === "DESPACHADO")) return "DESPACHADO";
  if (lineas.some((l) => l.estado === "PENDIENTE")) return "PENDIENTE";
  return "EN PROCESO";
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
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setError("");
    // El administrador entra con el usuario "admin" y su contraseña, en los mismos campos que los vendedores.
    if (usuario.trim().toLowerCase() === "admin") {
      if (password === ADMIN_PASSWORD) onAdminLogin();
      else setError("Usuario o contraseña incorrectos.");
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
        <img src="/logo.png" alt="El Castaño" style={{ display: "block", width: "72%", maxWidth: 280, margin: "0 auto 14px" }} />
        <div className="ec-sub" style={{ marginBottom: 30, textAlign: "center", letterSpacing: 2.5, fontWeight: 600 }}>ALIMENTOS NATURALES</div>
        <div onKeyDown={(e) => { if (e.key === "Enter") submit(e); }}>
          <div className="ec-field"><label>Usuario</label><input value={usuario} onChange={(e) => setUsuario(e.target.value)} placeholder="tu usuario" autoComplete="username" /></div>
          <div className="ec-field"><label>Contraseña</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••" autoComplete="current-password" /></div>
          {error && <div className="ec-error">{error}</div>}
          <button type="button" onClick={submit} className="ec-btn ec-btn-rust ec-btn-block" style={{ marginTop: 6 }}>Iniciar sesión</button>
        </div>
      </div>
    </div>
  );
}

// ---------------- VENDOR APP ----------------

function VendorApp({ vendor, products, onLogout }) {
  const [tab, setTab] = useState("pedidos");
  const [pedidosMes, setPedidosMes] = useState(null);
  const [pedidosError, setPedidosError] = useState("");
  const [rendiciones, setRendiciones] = useState(null);
  const [rendicionesError, setRendicionesError] = useState("");
  const [stock, setStock] = useState(null);
  const [stockError, setStockError] = useState("");
  const [suscripto, setSuscripto] = useState(null);
  const [activando, setActivando] = useState(false);
  const [avisos, setAvisos] = useState([]);
  const [avisoAbierto, setAvisoAbierto] = useState(null);
  const [datosAvisos, setDatosAvisos] = useState({});
  const [cargandoAvisos, setCargandoAvisos] = useState(false);
  const mesActualVendor = sheets.mesDeFecha(fechaHoy());

  const cargarPedidosMes = useCallback(async () => {
    if (!vendor.sheetUrl) return;
    setPedidosError("");
    try { setPedidosMes(await sheets.fetchPedidosSheet(vendor.sheetUrl, mesActualVendor)); }
    catch (e) { setPedidosError(e.message); }
  }, [vendor.sheetUrl, mesActualVendor]);

  const cargarRendiciones = useCallback(async () => {
    if (!vendor.sheetUrl) return;
    setRendicionesError("");
    try { setRendiciones(await sheets.fetchRendicionesSheet(vendor.sheetUrl)); }
    catch (e) { setRendicionesError(e.message); }
  }, [vendor.sheetUrl]);

  const cargarStock = useCallback(async () => {
    if (!vendor.sheetUrl) return;
    setStockError("");
    try { setStock(await sheets.fetchStockSheet(vendor.sheetUrl)); }
    catch (e) { setStockError(e.message); }
  }, [vendor.sheetUrl]);

  useEffect(() => { cargarPedidosMes(); }, [cargarPedidosMes]);
  useEffect(() => { cargarRendiciones(); }, [cargarRendiciones]);
  useEffect(() => { cargarStock(); }, [cargarStock]);
  useEffect(() => {
    if (!soportaPush()) { setSuscripto(false); return; }
    yaEstaSuscripto().then(setSuscripto);
    // Si el celu ya tiene el permiso, lo registramos también para este vendedor.
    registrarSiYaSuscripto(vendor.id).catch(() => {});
  }, [vendor.id]);

  const cargarAvisos = useCallback(async () => {
    try { setAvisos(await db.fetchNotificaciones(vendor.id)); } catch (e) {}
  }, [vendor.id]);
  useEffect(() => { cargarAvisos(); }, [cargarAvisos]);

  // Al volver a la app (por ejemplo desde una notificación) se refrescan los avisos.
  useEffect(() => {
    const alVolver = () => { if (document.visibilityState === "visible") cargarAvisos(); };
    document.addEventListener("visibilitychange", alVolver);
    return () => document.removeEventListener("visibilitychange", alVolver);
  }, [cargarAvisos]);

  const abrirAviso = useCallback((id) => {
    setTab("avisos");
    setAvisoAbierto(id || null);
    cargarAvisos();
  }, [cargarAvisos]);

  // Abrir un aviso desde la notificación: con la app cerrada llega por la URL
  // (?aviso=ID); con la app abierta, por un mensaje del service worker.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("aviso");
    if (id) {
      abrirAviso(id);
      window.history.replaceState({}, "", window.location.pathname);
    }
    const alMensaje = (e) => { if (e.data && e.data.tipo === "abrirAviso") abrirAviso(e.data.avisoId); };
    if ("serviceWorker" in navigator) navigator.serviceWorker.addEventListener("message", alMensaje);
    return () => { if ("serviceWorker" in navigator) navigator.serviceWorker.removeEventListener("message", alMensaje); };
  }, [abrirAviso]);

  // Al ver los avisos se leen de la planilla los meses a los que se refieren,
  // para mostrar cajas y faltantes actualizados.
  const mesesAvisosKey = useMemo(
    () => Array.from(new Set(avisos.filter((a) => a.mes).map((a) => a.mes))).join("|"),
    [avisos]
  );
  useEffect(() => {
    if (tab !== "avisos" || !vendor.sheetUrl || !mesesAvisosKey) return;
    let cancelado = false;
    setCargandoAvisos(true);
    Promise.all(mesesAvisosKey.split("|").map(async (mes) => {
      try {
        const data = await sheets.fetchPedidosSheet(vendor.sheetUrl, mes);
        if (!cancelado) setDatosAvisos((prev) => ({ ...prev, [mes.toLowerCase()]: data }));
      } catch (e) {
        if (!cancelado) setDatosAvisos((prev) => ({ ...prev, [mes.toLowerCase()]: prev[mes.toLowerCase()] || null }));
      }
    })).then(() => { if (!cancelado) setCargandoAvisos(false); });
    return () => { cancelado = true; };
  }, [tab, mesesAvisosKey, vendor.sheetUrl]);

  // Un aviso abierto se marca como leído.
  useEffect(() => {
    if (!avisoAbierto) return;
    const a = avisos.find((x) => x.id === avisoAbierto);
    if (a && !a.leida) {
      setAvisos((prev) => prev.map((x) => (x.id === a.id ? { ...x, leida: true } : x)));
      db.marcarNotificacionLeida(a.id).catch(() => {});
    }
  }, [avisoAbierto, avisos]);

  const eliminarAviso = async (id) => {
    setAvisos((prev) => prev.filter((x) => x.id !== id));
    setAvisoAbierto(null);
    try { await db.eliminarNotificacion(id); } catch (e) { cargarAvisos(); }
  };

  const leerTodos = () => {
    setAvisos((prev) => prev.map((x) => ({ ...x, leida: true })));
    db.marcarTodasLeidas(vendor.id).catch(() => {});
  };
  const noLeidos = avisos.filter((a) => !a.leida).length;

  const activarNotificaciones = async () => {
    setActivando(true);
    try { await suscribirVendedor(vendor.id); setSuscripto(true); }
    catch (e) { alert(e.message); }
    setActivando(false);
  };

  return (
    <div className="ec-shell">
      <div className="ec-topbar">
        <div><img src="/logo.png" alt="El Castaño" style={{ height: 22 }} /><div className="ec-sub" style={{ marginTop: 4 }}>{saludoSegunHora()}, {vendor.nombre}</div></div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button className="ec-btn ec-btn-ghost" style={{ position: "relative" }} onClick={() => { setTab("avisos"); setAvisoAbierto(null); }} aria-label="Avisos">
            <Bell size={14} />
            {noLeidos > 0 && (
              <span style={{ position: "absolute", top: -7, right: -7, background: TOKENS.rust, color: "#fff", borderRadius: 10, fontSize: 10, fontWeight: 700, minWidth: 17, height: 17, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>{noLeidos}</span>
            )}
          </button>
          <button className="ec-btn ec-btn-ghost" onClick={onLogout}><LogOut size={14} /> Salir</button>
        </div>
      </div>
      <div className="ec-content">
        {suscripto === false && soportaPush() && (
          <div className="ec-card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Bell size={18} style={{ color: TOKENS.rust, flexShrink: 0 }} />
              <span style={{ fontSize: 13 }}>Activá los avisos para enterarte apenas se despache tu pedido de la semana.</span>
            </div>
            <button className="ec-btn ec-btn-primary" style={{ flexShrink: 0, padding: "8px 12px", fontSize: 13 }} disabled={activando} onClick={activarNotificaciones}>
              {activando ? <Loader2 size={14} style={{ animation: "spin 0.9s linear infinite" }} /> : "Activar"}
            </button>
          </div>
        )}
        {!vendor.sheetUrl && (
          <div className="ec-card"><div className="ec-error" style={{ marginTop: 0 }}>
            Todavía no tenés una planilla vinculada. Pedile al administrador que la cargue en tu ficha.
          </div></div>
        )}
        {tab === "avisos" && <AvisosTab avisos={avisos} abierto={avisoAbierto} setAbierto={setAvisoAbierto} onLeerTodos={leerTodos} onIrAPedidos={() => setTab("pedidos")} onEliminar={eliminarAviso} datosPorMes={datosAvisos} cargando={cargandoAvisos} vendor={vendor} />}
        {tab === "pedidos" && <PedidosTab vendor={vendor} products={products} pedidos={pedidosMes} loadError={pedidosError} onChanged={cargarPedidosMes} mesReal={mesActualVendor} mesRealClave={currentMonthKey()} />}
        {tab === "objetivo" && <ObjetivoTab vendor={vendor} pedidos={pedidosMes} loadError={pedidosError} mesRealNombre={mesActualVendor} mesRealClave={currentMonthKey()} />}
        {tab === "equipo" && <EquipoTab vendor={vendor} mesRealNombre={mesActualVendor} mesRealClave={currentMonthKey()} />}
        {tab === "stock" && <StockTab vendor={vendor} products={products} stock={stock} loadError={stockError} onChanged={cargarStock} />}
        {tab === "rendiciones" && <RendicionesTab vendor={vendor} rendiciones={rendiciones} error={rendicionesError} onChanged={cargarRendiciones} />}
      </div>
      <div className="ec-tabbar">
        <TabBtn active={tab === "pedidos"} onClick={() => setTab("pedidos")} icon={<ClipboardList size={17} />} label="Pedidos" />
        <TabBtn active={tab === "objetivo"} onClick={() => setTab("objetivo")} icon={<Target size={17} />} label="Objetivo" />
        <TabBtn active={tab === "equipo"} onClick={() => setTab("equipo")} icon={<Users size={17} />} label="Equipo" />
        <TabBtn active={tab === "stock"} onClick={() => setTab("stock")} icon={<Package size={17} />} label="Stock" />
        <TabBtn active={tab === "rendiciones"} onClick={() => setTab("rendiciones")} icon={<Wallet size={17} />} label="Rendiciones" />

      </div>
    </div>
  );
}

function TabBtn({ active, onClick, icon, label }) {
  return <button className={`ec-tab ${active ? "active" : ""}`} onClick={onClick}>{icon}{label}</button>;
}

// Muestra la fecha con nuestro propio formato y estilo (igual a los demás
// campos), pero el selector nativo de calendario del celular sigue debajo,
// invisible, para que se siga pudiendo tocar y elegir con el dedo como
// siempre. Así evitamos que iOS/Android dibujen el cuadro a su manera.
function FechaField({ label, value, onChange }) {
  const d = new Date(value + "T00:00:00");
  const valido = !isNaN(d.getTime());
  const texto = valido ? `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}` : "Elegir fecha";
  return (
    <div className="ec-field">
      <label>{label}</label>
      <div style={{ position: "relative", overflow: "hidden", borderRadius: 7 }}>
        <div className="ec-fecha-display">{texto}</div>
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, border: "none", padding: 0, margin: 0 }}
        />
      </div>
    </div>
  );
}

// Igual que FechaField pero para elegir mes (<input type="month">), que en
// el celu tiene el mismo problema de desborde que el de fecha.
function MesField({ label, value, onChange }) {
  const [anio, mesNum] = String(value).split("-");
  const nombreMes = sheets.nombreMesDeValor(value);
  const texto = nombreMes ? `${nombreMes} ${anio}` : "Elegir mes";
  return (
    <div className="ec-field">
      {label && <label>{label}</label>}
      <div style={{ position: "relative", overflow: "hidden", borderRadius: 7 }}>
        <div className="ec-fecha-display">{texto}</div>
        <input
          type="month"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, border: "none", padding: 0, margin: 0 }}
        />
      </div>
    </div>
  );
}

// Buscador de producto con autocompletado — reemplaza al <select> nativo,
// que se vuelve inusable con más de unos pocos cientos de productos.
function ProductPicker({ products, value, onChange, placeholder, categoria }) {
  // Si se indica categoría, solo se ofrecen los productos con precio mayor a 0 en esa categoría.
  const productosDisponibles = useMemo(
    () => (categoria ? products.filter((p) => db.tienePrecio(p, categoria)) : products),
    [products, categoria]
  );
  products = productosDisponibles;
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
    const limpiar = (s) => String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const palabras = limpiar(query).trim().split(/\s+/).filter(Boolean);
    const base = palabras.length
      ? products.filter((p) => { const n = limpiar(p.nombre); return palabras.every((w) => n.includes(w)); })
      : products;
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
          maxHeight: 220, overflowY: "auto", marginTop: 4, boxShadow: "0 6px 16px rgba(0,60,105,0.12)",
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

function lunesDe(fecha) {
  const d = new Date(fecha);
  const dia = (d.getDay() + 6) % 7; // 0 = lunes
  d.setDate(d.getDate() - dia);
  d.setHours(0, 0, 0, 0);
  return d;
}
function infoSemana(diaDelMes, referencia) {
  const fecha = new Date(referencia.getFullYear(), referencia.getMonth(), diaDelMes);
  const lunes = lunesDe(fecha);
  const domingo = new Date(lunes);
  domingo.setDate(domingo.getDate() + 6);
  const fmt = (d) => `${d.getDate()}/${d.getMonth() + 1}`;
  return { key: lunes.toISOString().slice(0, 10), label: `Semana del ${fmt(lunes)} al ${fmt(domingo)}` };
}

function fmtFechaAviso(iso) {
  const [, m, d] = String(iso).split("-");
  return `${Number(d)}/${Number(m)}`;
}

// Bandeja de avisos del vendedor. Al abrir uno se muestra el detalle.
// Arma los datos del PDF de un despacho a partir de las líneas del mes (en vivo).
function datosResumenDespacho(datos, fecha, despacho, vendor, mesNombre) {
  const delDespacho = datos.filter((l) => l.despachado && l.fechaDespacho === fecha);
  const porProducto = new Map();
  const porCategoria = {};
  delDespacho.forEach((l) => {
    const entregadas = unidadesEntregadas(l);
    if (entregadas <= 0) return;
    const total = Number(l.total) || entregadas * Number(l.precio || 0);
    porProducto.set(l.producto, (porProducto.get(l.producto) || 0) + entregadas);
    porCategoria[l.categoria] = (porCategoria[l.categoria] || 0) + total;
  });
  // Faltantes: lo que faltó de este despacho + lo que sigue sin despachar de esos mismos pedidos.
  const pedidosDelDespacho = new Set(delDespacho.map((l) => `${l.dia}|${l.cliente}`));
  const mapaFalt = new Map();
  delDespacho.forEach((l) => sumarFaltante(mapaFalt, l.producto, unidadesFalt(l)));
  datos.forEach((l) => {
    if (!l.despachado && pedidosDelDespacho.has(`${l.dia}|${l.cliente}`)) sumarFaltante(mapaFalt, l.producto, Number(l.unidades) || 0);
  });
  const alfabetico = (x, y) => String(x.producto).localeCompare(String(y.producto), "es", { sensitivity: "base" });
  return {
    vendorNombre: vendor.nombre, fecha, mesNombre,
    cajas: despacho && despacho.cajas ? despacho.cajas : null,
    nota: despacho && despacho.nota ? despacho.nota : "",
    productos: Array.from(porProducto, ([producto, unidades]) => ({ producto, unidades })).sort(alfabetico),
    faltantes: Array.from(mapaFalt, ([producto, n]) => ({ producto, n })).sort(alfabetico),
    porCategoria, pctMinorista: vendor.comision || 0,
  };
}

function AvisosTab({ avisos, abierto, setAbierto, onLeerTodos, onIrAPedidos, onEliminar, datosPorMes, cargando, vendor }) {
  const noLeidos = avisos.filter((a) => !a.leida).length;
  const [descargandoAviso, setDescargandoAviso] = useState(null);
  const descargarResumen = async (a, datos, fecha, despacho) => {
    setDescargandoAviso(a.id);
    try {
      await descargarResumenDespacho(datosResumenDespacho(datos, fecha, despacho, vendor, a.mes));
    } catch (e) { alert("No se pudo generar el PDF: " + e.message); }
    setDescargandoAviso(null);
  };
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "4px 0 10px" }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: TOKENS.textSoft }}>AVISOS</span>
        {noLeidos > 0 && (
          <button className="ec-btn ec-btn-ghost" style={{ padding: "5px 9px", fontSize: 12 }} onClick={onLeerTodos}>Marcar todos como leídos</button>
        )}
      </div>
      {avisos.length === 0 ? (
        <div className="ec-empty">Todavía no tenés avisos. Cuando despachemos tus pedidos, aparecen acá.</div>
      ) : (
        avisos.map((a) => {
          const abiertoEste = abierto === a.id;
          // Los avisos de un despacho por fecha muestran cajas y faltantes EN VIVO
          // (de la planilla), así si después cambian el aviso no queda desactualizado.
          // Los avisos viejos (que traían la semana del pedido) se asocian al despacho
          // por su fecha, así también se actualizan.
          const nuevoFormato = !!a.semana && a.semana.indexOf("D:") === 0;
          const fechaDesp = nuevoFormato ? a.semana.slice(2) : (a.fechaDespacho || "");
          const datos = a.mes ? datosPorMes[a.mes.toLowerCase()] : null;
          const hayEnVivo = !!datos && !!fechaDesp && datos.some((l) => l.despachado && l.fechaDespacho === fechaDesp);
          const despachoVivo = hayEnVivo ? (datos.despachos || []).find((d) => d.semana === "D:" + fechaDesp && d.mes.toLowerCase() === a.mes.toLowerCase()) : null;
          const cajas = hayEnVivo ? (despachoVivo && despachoVivo.cajas ? despachoVivo.cajas : null) : a.cajas;
          const faltantes = hayEnVivo ? faltantesDeDespacho(datos, fechaDesp) : a.faltantes;
          // Si el despacho ya no existe en la planilla (se deshizo), el aviso no se muestra.
          if (nuevoFormato && datos && !hayEnVivo) return null;
          return (
            <div className="ec-card" key={a.id} style={!a.leida ? { borderColor: TOKENS.rust } : undefined}>
              <div className="ec-pedido-top" style={{ cursor: "pointer" }} onClick={() => setAbierto(abiertoEste ? null : a.id)}>
                <div>
                  <div className="ec-pedido-cliente">
                    {!a.leida && <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 4, background: TOKENS.rust, marginRight: 7 }} />}
                    Pedidos despachados
                  </div>
                  <div className="ec-pedido-meta">{fmtFechaAviso(a.fechaDespacho)}{!nuevoFormato && !hayEnVivo && a.semanaLabel ? ` · Semana del ${a.semanaLabel}` : ""}</div>
                </div>
                <ChevronRight size={16} style={{ transform: abiertoEste ? "rotate(90deg)" : "none", transition: "transform 0.15s" }} />
              </div>
              {abiertoEste && (
                <div style={{ marginTop: 10, borderTop: `1px solid ${TOKENS.border}`, paddingTop: 10, fontSize: 14, lineHeight: 1.65 }}>
                  <div>Tus pedidos se despacharon el <b>{fmtFechaAviso(a.fechaDespacho)}</b>.</div>
                  {cargando && !!a.mes ? (
                    <div style={{ color: TOKENS.textSoft }}>Actualizando detalle...</div>
                  ) : (
                    <>
                      {cajas ? <div>Recibís <b>{cajas} {cajas === 1 ? "caja" : "cajas"}</b>.</div> : null}
                      <div>{faltantes.length > 0 ? <>Faltante: <b>{faltantes.join(", ")}</b></> : "Sin faltantes."}</div>
                    </>
                  )}
                  <div style={{ color: TOKENS.textSoft, marginTop: 6 }}>Revisá el detalle de tus pedidos para más información.</div>
                  <div className="ec-row-actions" style={{ marginTop: 12 }}>
                    <button className="ec-btn ec-btn-primary" onClick={onIrAPedidos}>Ver mis pedidos</button>
                    {hayEnVivo && !cargando && (
                      <button className="ec-btn ec-btn-ghost" disabled={descargandoAviso === a.id} onClick={() => descargarResumen(a, datos, fechaDesp, despachoVivo)}>
                        {descargandoAviso === a.id ? <Loader2 size={14} style={{ animation: "spin 0.9s linear infinite" }} /> : <FileDown size={14} />} Descargar PDF
                      </button>
                    )}
                    <button className="ec-btn ec-btn-ghost" onClick={() => { if (window.confirm("¿Borrar este aviso?")) onEliminar(a.id); }} aria-label="Borrar aviso">
                      <Trash2 size={14} /> Borrar
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
    </>
  );
}

// Resumen de un despacho: faltantes (o "Sin faltantes"), cajas y nota.
function ResumenDespacho({ faltantes, despacho }) {
  return (
    <div style={{ marginTop: 10, padding: "9px 11px", background: TOKENS.cream, borderRadius: 8, fontSize: 13, lineHeight: 1.55 }}>
      <div>{faltantes.length > 0 ? <><b>Faltantes:</b> {faltantes.join(", ")}</> : <b>Sin faltantes</b>}</div>
      {despacho && despacho.cajas ? <div><b>Cajas:</b> {despacho.cajas}</div> : null}
      {despacho && despacho.nota ? <div style={{ color: TOKENS.textSoft }}>{despacho.nota}</div> : null}
    </div>
  );
}

// Fecha de hoy en Argentina (AAAA-MM-DD), sin depender de la hora del celular.
function hoyAR() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" });
}
function etiquetaDespacho(fecha) {
  const [, m, d] = String(fecha).split("-");
  return `Despacho del ${Number(d)}/${Number(m)}`;
}
// Unidades que faltaron de una línea (columna Faltante: SI = toda la línea, o un número).
function unidadesFalt(l) {
  if (l.unidadesFaltantes !== undefined && l.unidadesFaltantes !== null) return Number(l.unidadesFaltantes) || 0;
  return l.faltante ? Number(l.unidades) || 0 : 0;
}
function unidadesEntregadas(l) {
  return Math.max(0, (Number(l.unidades) || 0) - unidadesFalt(l));
}
function sumarFaltante(mapa, producto, n) {
  if (!producto || !(n > 0)) return;
  mapa.set(producto, (mapa.get(producto) || 0) + n);
}
function textoFaltantes(mapa) {
  return Array.from(mapa.entries()).map(([p, n]) => `${p} (${n} u.)`);
}
// Faltantes de un despacho (las líneas que salieron en esa fecha): lo que faltó
// (en unidades) + lo que sigue sin despachar de esos mismos pedidos.
function faltantesDeDespacho(lineasMes, fecha) {
  const delDespacho = lineasMes.filter((l) => l.despachado && l.fechaDespacho === fecha);
  const pedidos = new Set(delDespacho.map((l) => `${l.dia}|${l.cliente}`));
  const m = new Map();
  delDespacho.forEach((l) => sumarFaltante(m, l.producto, unidadesFalt(l)));
  lineasMes.forEach((l) => {
    if (!l.despachado && pedidos.has(`${l.dia}|${l.cliente}`)) sumarFaltante(m, l.producto, Number(l.unidades) || 0);
  });
  return textoFaltantes(m);
}

function faltantesDe(lineas) {
  const m = new Map();
  lineas.forEach((l) => sumarFaltante(m, l.producto, unidadesFalt(l)));
  return textoFaltantes(m);
}

function PedidosTab({ vendor, products, pedidos, loadError, onChanged, mesReal, mesRealClave }) {
  const [fecha, setFecha] = useState(fechaHoy);
  const [categoria, setCategoria] = useState(db.CATEGORIAS[0]);
  const [cliente, setCliente] = useState("");
  const [productoId, setProductoId] = useState("");
  const [unidades, setUnidades] = useState("");
  const [carrito, setCarrito] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [semanaAbierta, setSemanaAbierta] = useState(null);
  const [editandoLinea, setEditandoLinea] = useState(null);
  const [anulandoFila, setAnulandoFila] = useState(null); // fila que se está borrando (hasta que la lista se actualiza)
  const [edLinea, setEdLinea] = useState({ categoria: "", cliente: "", productoId: "", unidades: "" });
  const [guardandoLinea, setGuardandoLinea] = useState(false);
  const [errorLinea, setErrorLinea] = useState("");
  const [mesConsulta, setMesConsulta] = useState(mesRealClave);
  const [pedidosPropios, setPedidosPropios] = useState(null);
  const [errorPropio, setErrorPropio] = useState("");

  // Avisa a la actualización automática que hay algo a medias (no recargar en este momento).
  useEffect(() => {
    window.__ecOcupado = carrito.length > 0 || cliente.trim() !== "" || editandoLinea !== null;
    return () => { window.__ecOcupado = false; };
  }, [carrito, cliente, editandoLinea]);

  const mesActual = sheets.mesDeFecha(fecha); // mes al que se escribe el pedido nuevo
  const mesVista = sheets.nombreMesDeValor(mesConsulta); // mes que se muestra en la lista de abajo
  const esMesVistaReal = mesVista === mesReal;
  const productoSel = products.find((p) => p.id === productoId);
  const precio = db.precioProducto(productoSel, categoria);
  const totalLinea = precio * (Number(unidades) || 0);
  const totalCarrito = carrito.reduce((acc, l) => acc + l.total, 0);

  // Si el mes que se quiere VER es distinto al mes real (por ejemplo,
  // querés revisar octubre estando parado en noviembre), pedimos esa
  // solapa aparte en vez de reusar los datos del mes real ya cargados.
  const cargarMesPropio = useCallback(async () => {
    if (!vendor.sheetUrl || esMesVistaReal) return;
    setErrorPropio("");
    try { setPedidosPropios(await sheets.fetchPedidosSheet(vendor.sheetUrl, mesVista)); }
    catch (e) { setErrorPropio(e.message); }
  }, [vendor.sheetUrl, mesVista, esMesVistaReal]);

  useEffect(() => { if (!esMesVistaReal) cargarMesPropio(); }, [cargarMesPropio, esMesVistaReal]);

  const pedidosDelMes = esMesVistaReal ? pedidos : pedidosPropios;
  const errorDelMes = esMesVistaReal ? loadError : errorPropio;
  const refrescar = esMesVistaReal ? onChanged : cargarMesPropio;

  const agregarAlCarrito = () => {
    setError("");
    if (!productoSel || !unidades || Number(unidades) <= 0) {
      setError("Elegí un producto y unidades (mayor a 0).");
      return;
    }
    setCarrito([...carrito, {
      id: `${productoSel.id}-${Date.now()}`,
      productoNombre: productoSel.nombre,
      unidades: Number(unidades),
      precio,
      total: totalLinea,
    }]);
    setProductoId("");
    setUnidades("");
  };

  const quitarDelCarrito = (id) => setCarrito(carrito.filter((l) => l.id !== id));

  // Si la línea ya no está pendiente (la agarró administración), avisamos
  // con la alerta en vez de dejar tocar nada.
  const intentarTocarLinea = (l) => {
    if (l.estado !== "PENDIENTE") {
      alert("Este pedido ya está en proceso. Para modificarlo o anularlo, contactate con administración.");
      return false;
    }
    return true;
  };

  const empezarEdicion = (l) => {
    if (!intentarTocarLinea(l)) return;
    setErrorLinea("");
    const prod = products.find((p) => p.nombre === l.producto);
    setEdLinea({ categoria: l.categoria, cliente: l.cliente, productoId: prod ? prod.id : "", unidades: String(l.unidades) });
    setEditandoLinea(l.fila);
  };

  const guardarEdicionLinea = async (l) => {
    setErrorLinea("");
    const prod = products.find((p) => p.id === edLinea.productoId);
    if (!prod || !edLinea.unidades || Number(edLinea.unidades) <= 0) { setErrorLinea("Elegí un producto y unidades (mayor a 0)."); return; }
    setGuardandoLinea(true);
    try {
      await sheets.editarPedidoSheet(vendor.sheetUrl, mesVista, l.fila, {
        categoria: edLinea.categoria, cliente: edLinea.cliente.trim(), producto: prod.nombre, unidades: Number(edLinea.unidades),
        clienteAnterior: l.cliente, productoAnterior: l.producto,
      });
      await refrescar(); // se espera a que la lista muestre el cambio antes de cerrar la edición
      setEditandoLinea(null);
    } catch (e) { setErrorLinea(e.message); }
    setGuardandoLinea(false);
  };

  const anularLinea = async (l) => {
    if (!intentarTocarLinea(l)) return;
    if (!confirm(`¿Anular el pedido de ${l.producto} × ${l.unidades} para ${l.cliente}?`)) return;
    setAnulandoFila(l.fila);
    try { await sheets.anularPedidoSheet(vendor.sheetUrl, mesVista, l.fila, { cliente: l.cliente, producto: l.producto }); await refrescar(); }
    catch (e) {
      // "Load failed" / "Failed to fetch": se cortó la conexión pero la planilla suele haberlo borrado.
      // Se vuelve a leer la planilla para mostrar el estado real, sin alarmar.
      if (/load failed|failed to fetch|networkerror/i.test(e.message || "")) await refrescar();
      else alert(e.message);
    }
    setAnulandoFila(null);
  };

  const [descargando, setDescargando] = useState(null);
  const descargarPdf = async (g) => {
    const clave = g.cliente + "-" + g.dia;
    setDescargando(clave);
    try {
      await descargarComprobantePedido({
        vendorNombre: vendor.nombre, cliente: g.cliente, dia: g.dia, mesNombre: mesVista,
        // El comprobante muestra solo lo entregado: se descuentan las unidades faltantes.
        lineas: g.lineas
          .filter((l) => unidadesEntregadas(l) > 0)
          .map((l) => (unidadesFalt(l) > 0 ? { ...l, unidades: unidadesEntregadas(l), total: unidadesEntregadas(l) * Number(l.precio || 0) } : l)),
      });
    } catch (e) { alert("No se pudo generar el PDF: " + e.message); }
    setDescargando(null);
  };

  const guardarPedido = async () => {
    setError("");
    if (!cliente.trim()) { setError("Completá el nombre del cliente."); return; }
    if (carrito.length === 0) { setError("Agregá al menos un producto al pedido."); return; }
    setGuardando(true);
    try {
      for (const linea of carrito) {
        await sheets.addPedidoSheet(vendor.sheetUrl, {
          fecha, categoria, cliente: cliente.trim(), producto: linea.productoNombre, unidades: linea.unidades, precio: linea.precio,
        });
      }
      setCliente("");
      setCarrito([]);
      // Si el pedido se cargó en el mismo mes que se está viendo abajo, lo refrescamos.
      if (mesActual === mesVista) refrescar();
    } catch (err) {
      setError("No se pudo guardar el pedido: " + err.message);
    }
    setGuardando(false);
  };

  // Agrupa líneas consecutivas del mismo día y cliente como un mismo pedido.
  // Así, si dos clientes distintos comparten nombre pero se cargaron en
  // momentos distintos (con otras líneas en el medio), no quedan mezclados.
  const vista = useMemo(() => {
    if (!pedidosDelMes) return null;
    const referencia = new Date(mesConsulta + "-01T00:00:00");
    const ordenadas = [...pedidosDelMes].sort((a, b) => a.fila - b.fila);
    const ordenes = [];
    let actual = null;
    ordenadas.forEach((p) => {
      if (actual && actual.dia === p.dia && actual.cliente === p.cliente) {
        actual.lineas.push(p);
      } else {
        actual = { dia: p.dia, cliente: p.cliente, categoria: p.categoria, lineas: [p] };
        ordenes.push(actual);
      }
    });

    // Cada línea va a donde corresponde: lo que sigue sin despachar queda en
    // pendientes (por semana del pedido); lo despachado se agrupa por FECHA DE
    // DESPACHO, así un pedido puede salir en envíos distintos sin mezclarse.
    const pendientesPorSemana = new Map();
    const despachosPorClave = new Map();
    const pendientesPorPedido = new Map();
    ordenes.forEach((orden) => {
      const { key, label } = infoSemana(orden.dia, referencia);
      const ordenKey = `${orden.dia}|${orden.cliente}`;
      const pend = orden.lineas.filter((l) => !l.despachado);
      if (pend.length > 0) {
        if (!pendientesPorSemana.has(key)) pendientesPorSemana.set(key, { key, label, ordenes: [] });
        pendientesPorSemana.get(key).ordenes.push({ ...orden, lineas: pend });
        pendientesPorPedido.set(ordenKey, [...(pendientesPorPedido.get(ordenKey) || []), ...pend]);
      }
      const porGrupo = new Map();
      orden.lineas.filter((l) => l.despachado).forEach((l) => {
        const gk = l.fechaDespacho ? "D:" + l.fechaDespacho : key;
        if (!porGrupo.has(gk)) porGrupo.set(gk, { label: l.fechaDespacho ? etiquetaDespacho(l.fechaDespacho) : label, sort: l.fechaDespacho || key, lineas: [] });
        porGrupo.get(gk).lineas.push(l);
      });
      porGrupo.forEach((g, gk) => {
        if (!despachosPorClave.has(gk)) despachosPorClave.set(gk, { key: gk, label: g.label, sort: g.sort, ordenes: [], ordenKeys: new Set() });
        const dest = despachosPorClave.get(gk);
        dest.ordenes.push({ ...orden, lineas: g.lineas });
        dest.ordenKeys.add(ordenKey);
      });
    });

    const gruposPendientes = Array.from(pendientesPorSemana.values()).sort((a, b) => a.key.localeCompare(b.key));
    const semanasCompletas = Array.from(despachosPorClave.values()).sort((a, b) => b.sort.localeCompare(a.sort)).map((g) => {
      // Faltantes del despacho: lo marcado + lo que falta enviar de esos mismos pedidos.
      const lineasGrupo = g.ordenes.flatMap((o) => o.lineas);
      const m = new Map();
      lineasGrupo.forEach((l) => sumarFaltante(m, l.producto, unidadesFalt(l)));
      g.ordenKeys.forEach((ok) => (pendientesPorPedido.get(ok) || []).forEach((l) => sumarFaltante(m, l.producto, Number(l.unidades) || 0)));
      return { ...g, faltantes: textoFaltantes(m) };
    });
    return { gruposPendientes, semanasCompletas };
  }, [pedidosDelMes, mesConsulta]);

  if (!vendor.sheetUrl) return null;

  return (
    <>
      <div className="ec-pedidos-grid">
      <div>
      <div className="ec-card">
        <h3><ClipboardList size={16} /> Nuevo pedido — {mesActual}</h3>
        <div onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); agregarAlCarrito(); } }}>
          <FechaField label="Fecha" value={fecha} onChange={setFecha} />
          <div className="ec-field"><label>Categoría</label>
            <select value={categoria} onChange={(e) => {
              const nueva = e.target.value;
              setCategoria(nueva);
              // Si el producto elegido no tiene precio en la nueva categoría, se limpia la elección.
              const sel = products.find((p) => p.id === productoId);
              if (sel && !db.tienePrecio(sel, nueva)) setProductoId("");
            }}>
              {db.CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="ec-field"><label>Cliente</label><input value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Nombre del cliente" /></div>

          {carrito.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              {carrito.map((l) => (
                <div className="ec-linea" key={l.id}>
                  <span>{l.productoNombre} × {l.unidades}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {fmtMoney(l.total)}
                    <button type="button" onClick={() => quitarDelCarrito(l.id)} style={{ background: "none", border: "none", cursor: "pointer", color: TOKENS.danger, padding: 0 }}>
                      <X size={14} />
                    </button>
                  </span>
                </div>
              ))}
              <div className="ec-subtotal"><span>Total del pedido</span><span>{fmtMoney(totalCarrito)}</span></div>
            </div>
          )}

          <div className="ec-field"><label>Producto</label>
            {products.length === 0 ? (
              <input disabled value="Sin productos cargados" />
            ) : (
              <ProductPicker products={products} categoria={categoria} value={productoId} onChange={setProductoId} placeholder="Escribí para buscar un producto..." />
            )}
          </div>
          <div className="ec-row2">
            <div className="ec-field"><label>Unidades</label><input type="number" min="1" value={unidades} onChange={(e) => setUnidades(e.target.value)} placeholder="0" /></div>
            <div className="ec-field"><label>Precio</label><input value={fmtMoney(precio)} disabled /></div>
          </div>
          {error && <div className="ec-error">{error}</div>}
          <button className="ec-btn ec-btn-ghost ec-btn-block" type="button" onClick={agregarAlCarrito} style={{ marginBottom: 10 }}>
            <Plus size={15} /> Agregar producto al pedido
          </button>
          <button className="ec-btn ec-btn-primary ec-btn-block" disabled={guardando} type="button" onClick={guardarPedido}>
            {guardando ? <Loader2 size={15} style={{ animation: "spin 0.9s linear infinite" }} /> : <Check size={15} />} Guardar pedido
          </button>
        </div>
      </div>
      </div>

      <div>
      <div className="ec-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: TOKENS.textSoft }}>VER PEDIDOS DE</span>
          <button className="ec-btn ec-btn-ghost" style={{ padding: "5px 9px" }} onClick={refrescar}><RefreshCw size={13} /></button>
        </div>
        <MesField value={mesConsulta} onChange={setMesConsulta} />
      </div>

      {errorDelMes && <div className="ec-error">{errorDelMes}</div>}
      {vista === null ? <Spinner label="Cargando pedidos de la planilla..." /> : (vista.gruposPendientes.length === 0 && vista.semanasCompletas.length === 0) ? (
        <div className="ec-empty">Todavía no hay pedidos cargados en {mesVista}.</div>
      ) : (
        <>
          {vista.gruposPendientes.length > 0 && (() => {
            const todasOrdenes = vista.gruposPendientes.flatMap((s) => s.ordenes);
            const todasLineas = todasOrdenes.flatMap((o) => o.lineas);
            const total = todasLineas.reduce((acc, l) => acc + Number(l.total || 0), 0);
            const abierta = semanaAbierta === "pendientes";
            return (
              <div className="ec-pedido-row" style={{ borderColor: TOKENS.rust }}>
                <div className="ec-pedido-top" style={{ cursor: "pointer" }} onClick={() => setSemanaAbierta(abierta ? null : "pendientes")}>
                  <div>
                    <div className="ec-pedido-cliente">Pendientes acumulados</div>
                    <div className="ec-pedido-meta">{todasOrdenes.length} pedido(s) sin despachar · {fmtMoney(total)}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className={`ec-badge ${claseBadgeEstado(estadoAgregado(todasLineas))}`}>{etiquetaEstado(estadoAgregado(todasLineas))}</span>
                    <ChevronRight size={16} style={{ transform: abierta ? "rotate(90deg)" : "none", transition: "transform 0.15s" }} />
                  </div>
                </div>
                {abierta && (
                  <div style={{ marginTop: 10, borderTop: `1px solid ${TOKENS.border}`, paddingTop: 8 }}>
                    {vista.gruposPendientes.map((sem) => (
                      <div key={sem.key} style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: TOKENS.textSoft, marginBottom: 6 }}>{sem.label.toUpperCase()}</div>
                        {sem.ordenes.map((g, i) => {
                          const subtotal = g.lineas.reduce((acc, l) => acc + Number(l.total || 0), 0);
                          return (
                            <div key={i} style={{ marginBottom: 10 }}>
                              <div className="ec-pedido-top">
                                <div><div className="ec-pedido-cliente">{g.cliente}</div><div className="ec-pedido-meta">Día {g.dia} · {g.categoria}</div></div>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <button type="button" onClick={() => descargarPdf(g)} disabled={descargando === g.cliente + "-" + g.dia} className="ec-btn ec-btn-ghost" style={{ padding: "5px 8px" }} aria-label="Descargar comprobante">
                                    {descargando === g.cliente + "-" + g.dia ? <Loader2 size={13} style={{ animation: "spin 0.9s linear infinite" }} /> : <FileDown size={13} />}
                                  </button>
                                  <span className={`ec-badge ${claseBadgeEstado(estadoAgregado(g.lineas))}`}>{etiquetaEstado(estadoAgregado(g.lineas))}</span>
                                </div>
                              </div>
                              {g.lineas.map((l) => (
                                <div key={l.fila}>
                                  {editandoLinea === l.fila ? (
                                    <div style={{ margin: "8px 0", padding: 10, background: TOKENS.cream, borderRadius: 8 }}>
                                      <div className="ec-field"><label>Categoría</label>
                                        <select value={edLinea.categoria} onChange={(e) => {
                                          const nueva = e.target.value;
                                          const sel = products.find((p) => p.id === edLinea.productoId);
                                          setEdLinea({ ...edLinea, categoria: nueva, productoId: sel && !db.tienePrecio(sel, nueva) ? "" : edLinea.productoId });
                                        }}>
                                          {db.CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                      </div>
                                      <div className="ec-field"><label>Cliente</label><input value={edLinea.cliente} onChange={(e) => setEdLinea({ ...edLinea, cliente: e.target.value })} /></div>
                                      <div className="ec-field"><label>Producto</label>
                                        <ProductPicker products={products} categoria={edLinea.categoria} value={edLinea.productoId} onChange={(v) => setEdLinea({ ...edLinea, productoId: v })} placeholder="Escribí para buscar..." />
                                      </div>
                                      <div className="ec-field"><label>Unidades</label><input type="number" min="1" value={edLinea.unidades} onChange={(e) => setEdLinea({ ...edLinea, unidades: e.target.value })} /></div>
                                      {errorLinea && <div className="ec-error">{errorLinea}</div>}
                                      <div className="ec-row-actions">
                                        <button className="ec-btn ec-btn-primary" disabled={guardandoLinea} onClick={() => guardarEdicionLinea(l)}>
                                          {guardandoLinea ? <Loader2 size={14} style={{ animation: "spin 0.9s linear infinite" }} /> : <Check size={14} />} Guardar
                                        </button>
                                        <button className="ec-btn ec-btn-ghost" onClick={() => setEditandoLinea(null)}>Cancelar</button>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      <div className="ec-linea">
                                        <span>{l.producto} × {unidadesEntregadas(l)} {l.estado === "DESPACHADO" ? "✓" : l.estado === "EN PROCESO" ? "⏳" : ""}{Number(l.precio) > 0 && <span style={{ color: TOKENS.textSoft, fontSize: 12 }}> · {fmtMoney(l.precio)} c/u</span>}</span>
                                        <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                          {fmtMoney(l.total)}
                                          {anulandoFila === l.fila ? (
                                            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: TOKENS.danger, fontSize: 12 }}><Loader2 size={14} style={{ animation: "spin 0.9s linear infinite" }} />Borrando...</span>
                                          ) : (
                                            <>
                                              <button type="button" disabled={anulandoFila !== null} onClick={() => empezarEdicion(l)} style={{ background: "none", border: "none", cursor: anulandoFila !== null ? "default" : "pointer", opacity: anulandoFila !== null ? 0.35 : 1, color: TOKENS.textSoft, padding: 0 }} aria-label="Editar"><Pencil size={13} /></button>
                                              <button type="button" disabled={anulandoFila !== null} onClick={() => anularLinea(l)} style={{ background: "none", border: "none", cursor: anulandoFila !== null ? "default" : "pointer", opacity: anulandoFila !== null ? 0.35 : 1, color: TOKENS.danger, padding: 0 }} aria-label="Anular"><X size={14} /></button>
                                            </>
                                          )}
                                        </span>
                                      </div>
                                      {unidadesFalt(l) > 0 && <div className="ec-note warn"><AlertTriangle size={12} style={{ marginRight: 5, verticalAlign: -2 }} />Faltan {unidadesFalt(l)} de {l.unidades} u.: {l.producto}</div>}
                                    </>
                                  )}
                                </div>
                              ))}
                              <div className="ec-subtotal"><span>Subtotal</span><span>{fmtMoney(subtotal)}</span></div>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {vista.semanasCompletas.map((sem) => {
            const todasLineas = sem.ordenes.flatMap((o) => o.lineas);
            const total = todasLineas.reduce((acc, l) => acc + Number(l.total || 0), 0);
            const abierta = semanaAbierta === sem.key;
            return (
              <div className="ec-pedido-row" key={sem.key}>
                <div className="ec-pedido-top" style={{ cursor: "pointer" }} onClick={() => setSemanaAbierta(abierta ? null : sem.key)}>
                  <div>
                    <div className="ec-pedido-cliente">{sem.label}</div>
                    <div className="ec-pedido-meta">{sem.ordenes.length} pedido(s) · {fmtMoney(total)}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="ec-badge ec-badge-desp">Despachado</span>
                    <ChevronRight size={16} style={{ transform: abierta ? "rotate(90deg)" : "none", transition: "transform 0.15s" }} />
                  </div>
                </div>
                <ResumenDespacho
                  faltantes={sem.faltantes}
                  despacho={((pedidosDelMes && pedidosDelMes.despachos) || []).find((d) => d.semana === sem.key && d.mes.toLowerCase() === mesVista.toLowerCase())}
                />
                {abierta && (
                  <div style={{ marginTop: 10, borderTop: `1px solid ${TOKENS.border}`, paddingTop: 8 }}>
                    {sem.ordenes.map((g, i) => {
                      const subtotal = g.lineas.reduce((acc, l) => acc + Number(l.total || 0), 0);
                      return (
                        <div key={i} style={{ marginBottom: 12 }}>
                          <div className="ec-pedido-top">
                            <div><div className="ec-pedido-cliente">{g.cliente}</div><div className="ec-pedido-meta">Día {g.dia} · {g.categoria}</div></div>
                            <button type="button" onClick={() => descargarPdf(g)} disabled={descargando === g.cliente + "-" + g.dia} className="ec-btn ec-btn-ghost" style={{ padding: "5px 8px" }} aria-label="Descargar comprobante">
                              {descargando === g.cliente + "-" + g.dia ? <Loader2 size={13} style={{ animation: "spin 0.9s linear infinite" }} /> : <FileDown size={13} />}
                            </button>
                          </div>
                          {g.lineas.map((l) => (
                            <div key={l.fila}>
                              <div className="ec-linea"><span>{l.producto} × {unidadesEntregadas(l)}{Number(l.precio) > 0 && <span style={{ color: TOKENS.textSoft, fontSize: 12 }}> · {fmtMoney(l.precio)} c/u</span>}</span><span>{fmtMoney(l.total)}</span></div>
                              {unidadesFalt(l) > 0 && <div className="ec-note warn"><AlertTriangle size={12} style={{ marginRight: 5, verticalAlign: -2 }} />Faltan {unidadesFalt(l)} de {l.unidades} u.: {l.producto}</div>}
                            </div>
                          ))}
                          <div className="ec-subtotal"><span>Subtotal</span><span>{fmtMoney(subtotal)}</span></div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}
      </div>
      </div>
    </>
  );
}

function ObjetivoTab({ vendor, pedidos, loadError, mesRealNombre, mesRealClave }) {
  const [objetivoInfo, setObjetivoInfo] = useState(null);
  const [error, setError] = useState("");
  const [mesSel, setMesSel] = useState(mesRealClave);
  const [pedidosPropios, setPedidosPropios] = useState(null);
  const [errorPropio, setErrorPropio] = useState("");

  const nombreSolapaSel = sheets.nombreMesDeValor(mesSel);
  const esMesReal = nombreSolapaSel === mesRealNombre;

  useEffect(() => {
    if (!vendor.sheetUrl) return;
    setObjetivoInfo(null);
    setError("");
    (async () => {
      try { setObjetivoInfo(await sheets.fetchObjetivoDesdeSheet(vendor.sheetUrl, nombreSolapaSel)); }
      catch (e) { setError(e.message); }
    })();
  }, [vendor.sheetUrl, vendor.nombre, nombreSolapaSel]);

  const cargarMesPropio = useCallback(async () => {
    if (!vendor.sheetUrl || esMesReal) return;
    setErrorPropio("");
    try { setPedidosPropios(await sheets.fetchPedidosSheet(vendor.sheetUrl, nombreSolapaSel)); }
    catch (e) { setErrorPropio(e.message); }
  }, [vendor.sheetUrl, nombreSolapaSel, esMesReal]);

  useEffect(() => { if (!esMesReal) cargarMesPropio(); }, [cargarMesPropio, esMesReal]);

  const pedidosDelMes = esMesReal ? pedidos : pedidosPropios;
  const errorDelMes = esMesReal ? loadError : errorPropio;

  if (objetivoInfo === null || pedidosDelMes === null) return (
    <div className="ec-card">
      <h3><Target size={16} /> Objetivo</h3>
      <div style={{ maxWidth: 220 }}><MesField label="Mes" value={mesSel} onChange={setMesSel} /></div>
      <Spinner label="Calculando objetivo..." />
    </div>
  );
  if (error || errorDelMes) return (
    <div className="ec-card">
      <h3><Target size={16} /> Objetivo</h3>
      <div style={{ maxWidth: 220 }}><MesField label="Mes" value={mesSel} onChange={setMesSel} /></div>
      <div className="ec-error">{error || errorDelMes}</div>
    </div>
  );
  if (!objetivoInfo.encontrado) return (
    <div className="ec-card">
      <h3><Target size={16} /> Objetivo</h3>
      <div style={{ maxWidth: 220, marginBottom: 12 }}><MesField label="Mes" value={mesSel} onChange={setMesSel} /></div>
      <div className="ec-error">No pude encontrar el objetivo de {nombreSolapaSel} en el "Resumen del trimestre" de tu Panel de control. Avisale al administrador para que revise esa solapa.</div>
    </div>
  );

  const objetivo = Number(objetivoInfo.objetivo || 0);

  const porCategoria = {};
  db.CATEGORIAS.forEach((c) => (porCategoria[c] = 0));
  pedidosDelMes.forEach((p) => {
    const t = Number(p.total || 0);
    porCategoria[p.categoria] = (porCategoria[p.categoria] || 0) + t;
  });

  // Minorista y Comercio se miden juntos contra el objetivo, con premio
  // escalonado. Mayorista y Granel van juntos aparte, comisión fija.
  const minoristaComercio = (porCategoria.Minorista || 0) + (porCategoria.Comercio || 0);
  const mayoristaGranel = (porCategoria.Mayorista || 0) + (porCategoria.Granel || 0);
  const totalVentas = minoristaComercio + mayoristaGranel;
  const baseComision = vendor.comision || 0;

  const comisionMayorista = mayoristaGranel * (mayoristaGranel <= 5000000 ? 0.05 : 0.06);

  let comisionMinorista;
  let escalon;
  if (objetivo > 0) {
    if (minoristaComercio < objetivo * 0.8) {
      comisionMinorista = minoristaComercio * baseComision;
      escalon = "base";
    } else if (minoristaComercio < objetivo) {
      comisionMinorista = minoristaComercio * baseComision + minoristaComercio * 0.035;
      escalon = "80%";
    } else if (minoristaComercio === objetivo) {
      comisionMinorista = minoristaComercio * baseComision + minoristaComercio * 0.05;
      escalon = "objetivo";
    } else {
      const exceso = minoristaComercio - objetivo;
      comisionMinorista = minoristaComercio * baseComision + minoristaComercio * 0.05 + (0.05 * exceso * exceso) / objetivo;
      escalon = "superado";
    }
  } else {
    comisionMinorista = minoristaComercio * baseComision;
    escalon = "sin objetivo";
  }
  const bonoEquipo = objetivoInfo.equipoBonus || 0;
  const comisionTotal = comisionMinorista + comisionMayorista + bonoEquipo;

  const pct = objetivo > 0 ? Math.min(100, Math.round((minoristaComercio / objetivo) * 100)) : 0;
  const restante = Math.max(0, objetivo - minoristaComercio);
  const primerNombre = (vendor.nombre || "").trim().split(" ")[0];

  let mensajeMotivador = "";
  if (objetivo > 0) {
    if (escalon === "base") {
      const proximoUmbral = objetivo * 0.8;
      const falta = proximoUmbral - minoristaComercio;
      const comisionProyectada = proximoUmbral * baseComision + proximoUmbral * 0.035;
      const ganancia = comisionProyectada - comisionMinorista;
      mensajeMotivador = `¡Vamos ${primerNombre}! Te faltan ${fmtMoney(falta)} en ventas para llegar al 80% del objetivo — ahí tu comisión sube a ${fmtMoney(comisionProyectada)} (+${fmtMoney(ganancia)}).`;
    } else if (escalon === "80%") {
      const falta = objetivo - minoristaComercio;
      const comisionProyectada = objetivo * baseComision + objetivo * 0.05;
      const ganancia = comisionProyectada - comisionMinorista;
      mensajeMotivador = `¡Ya casi ${primerNombre}! Te faltan ${fmtMoney(falta)} para cumplir el objetivo — tu comisión pasaría a ${fmtMoney(comisionProyectada)} (+${fmtMoney(ganancia)}).`;
    } else if (escalon === "objetivo") {
      mensajeMotivador = `¡Objetivo cumplido, ${primerNombre}! De acá en más, cada peso extra que vendas suma premio creciente a tu comisión.`;
    } else {
      const exceso = minoristaComercio - objetivo;
      mensajeMotivador = `¡Vas superando el objetivo por ${fmtMoney(exceso)}, ${primerNombre}! Seguí vendiendo — cada peso extra te suma más premio.`;
    }
  }

  return (
    <div className="ec-card">
      <h3><Target size={16} /> Objetivo de {nombreSolapaSel}</h3>
      <div style={{ maxWidth: 220, marginBottom: 16 }}><MesField label="Mes a consultar" value={mesSel} onChange={setMesSel} /></div>
      {objetivo > 0 ? (
        <>
          <div className="ec-big-num">{fmtMoney(minoristaComercio)}</div>
          <div className="ec-sub" style={{ marginBottom: 14 }}>vendido en Minorista + Comercio sobre una meta de {fmtMoney(objetivo)}</div>
          <div className="ec-progress-track"><div className="ec-progress-fill" style={{ width: `${pct}%` }} /></div>
          <div className="ec-sub" style={{ marginTop: 8 }}>
            {pct}% cumplido{restante > 0 ? ` · falta ${fmtMoney(restante)}` : ""}
          </div>
          <div className="ec-note" style={{ marginTop: 10, background: TOKENS.cream, borderLeft: `3px solid ${TOKENS.olive}`, fontWeight: 500 }}>{mensajeMotivador}</div>
        </>
      ) : (
        <div className="ec-empty" style={{ padding: "10px 0 4px" }}>Todavía no te cargaron un objetivo para este mes — cobrás tu comisión base sin escalones.</div>
      )}
      <div className="ec-summary-grid" style={{ marginTop: 14 }}>
        {db.CATEGORIAS.map((c) => (
          <div className="ec-summary-item" key={c}><div className="label">{c.toUpperCase()}</div><div className="value">{fmtMoney(porCategoria[c])}</div></div>
        ))}
      </div>
      <div className="ec-summary-grid" style={{ marginTop: 10 }}>
        <div className="ec-summary-item"><div className="label">COMISIÓN MINORISTA/COMERCIO</div><div className="value">{fmtMoney(comisionMinorista)}</div></div>
        <div className="ec-summary-item"><div className="label">COMISIÓN MAYORISTA/GRANEL</div><div className="value">{fmtMoney(comisionMayorista)}</div></div>
      </div>
      {objetivoInfo.equipoBonus !== null && objetivoInfo.equipoBonus !== undefined && (
        <div className="ec-summary-item" style={{ marginTop: 10 }}>
          <div className="label">BONO DE EQUIPO</div>
          <div className="value">{fmtMoney(bonoEquipo)}</div>
        </div>
      )}
      <div className="ec-summary-item" style={{ marginTop: 10 }}>
        <div className="label">TU COMISIÓN TOTAL DE {nombreSolapaSel.toUpperCase()}</div>
        <div className="value">{fmtMoney(comisionTotal)}</div>
      </div>
    </div>
  );
}

// Muestra un valor de la solapa Equipo tal cual viene: si es un número, con
// formato de plata; si es texto ("–", "OBJETIVO LOGRADO 👏", etc.), tal cual.
function valorEquipo(v) {
  if (typeof v === "number") return fmtMoney(v);
  const s = String(v || "").trim();
  return s === "" ? "–" : s;
}

function EquipoTab({ vendor, mesRealNombre, mesRealClave }) {
  const [mesSel, setMesSel] = useState(mesRealClave);
  const [info, setInfo] = useState(null);
  const [error, setError] = useState("");
  const nombreSolapaSel = sheets.nombreMesDeValor(mesSel);

  useEffect(() => {
    if (!vendor.sheetUrl) return;
    setInfo(null);
    setError("");
    (async () => {
      try { setInfo(await sheets.fetchEquipoDesdeSheet(vendor.sheetUrl, nombreSolapaSel)); }
      catch (e) { setError(e.message); }
    })();
  }, [vendor.sheetUrl, nombreSolapaSel]);

  if (!vendor.sheetUrl) return null;

  return (
    <div className="ec-card">
      <h3><Users size={16} /> Mi equipo</h3>
      <div style={{ maxWidth: 220, marginBottom: 16 }}><MesField label="Mes a consultar" value={mesSel} onChange={setMesSel} /></div>
      {error ? (
        <div className="ec-error">{error}</div>
      ) : info === null ? (
        <Spinner label="Cargando tu equipo..." />
      ) : !info.tieneEquipo ? (
        <div className="ec-empty">No tenés un equipo a cargo.</div>
      ) : info.error ? (
        <div className="ec-error">{info.error}</div>
      ) : info.miembros.length === 0 ? (
        <div className="ec-empty">Todavía no hay nadie cargado en tu equipo.</div>
      ) : (
        <>
          {(() => {
            const ventasEquipo = info.miembros.reduce((acc, m) => acc + (typeof m.ventas === "number" ? m.ventas : 0), 0);
            const objetivoEquipo = info.miembros.reduce((acc, m) => acc + (typeof m.objetivo === "number" ? m.objetivo : 0), 0);
            const pctEquipo = objetivoEquipo > 0 ? Math.min(100, Math.round((ventasEquipo / objetivoEquipo) * 100)) : 0;
            const restanteEquipo = Math.max(0, objetivoEquipo - ventasEquipo);
            return (
              <div className="ec-card" style={{ background: TOKENS.cream, marginBottom: 14 }}>
                <div className="label" style={{ marginBottom: 6 }}>AVANCE DEL EQUIPO — {nombreSolapaSel.toUpperCase()}</div>
                <div className="ec-big-num">{fmtMoney(ventasEquipo)}</div>
                <div className="ec-sub" style={{ marginBottom: 10 }}>vendido entre todo el equipo sobre una meta conjunta de {fmtMoney(objetivoEquipo)}</div>
                <div className="ec-progress-track"><div className="ec-progress-fill" style={{ width: `${pctEquipo}%` }} /></div>
                <div className="ec-sub" style={{ marginTop: 8 }}>{pctEquipo}% cumplido{restanteEquipo > 0 ? ` · falta ${fmtMoney(restanteEquipo)}` : ""}</div>
              </div>
            );
          })()}
          {info.miembros.map((m, i) => {
          const ventasNum = typeof m.ventas === "number" ? m.ventas : 0;
          const objetivoNum = typeof m.objetivo === "number" ? m.objetivo : 0;
          const pct = objetivoNum > 0 ? Math.min(100, Math.round((ventasNum / objetivoNum) * 100)) : 0;
          return (
            <div className="ec-pedido-row" key={i}>
              <div className="ec-pedido-cliente">{m.nombre}</div>
              <div className="ec-summary-grid" style={{ marginTop: 10 }}>
                <div className="ec-summary-item"><div className="label">VENTAS DE {nombreSolapaSel.toUpperCase()}</div><div className="value">{valorEquipo(m.ventas)}</div></div>
                <div className="ec-summary-item"><div className="label">OBJETIVO</div><div className="value">{valorEquipo(m.objetivo)}</div></div>
              </div>
              {objetivoNum > 0 && <div className="ec-progress-track" style={{ marginTop: 10 }}><div className="ec-progress-fill" style={{ width: `${pct}%` }} /></div>}
              <div className="ec-sub" style={{ marginTop: 8 }}>Restante para el objetivo: {valorEquipo(m.restante)}</div>
              <div className="ec-sub">Rendiciones: {valorEquipo(m.rendiciones)}</div>
            </div>
          );
          })}
        </>
      )}
    </div>
  );
}

function StockTab({ vendor, products, stock, loadError, onChanged }) {
  const [fecha, setFecha] = useState(fechaHoy);
  const [productoId, setProductoId] = useState("");
  const [unidades, setUnidades] = useState("");
  const [observacion, setObservacion] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const productoSel = products.find((p) => p.id === productoId);

  const agregar = async () => {
    setError("");
    if (!productoSel || !unidades || Number(unidades) <= 0) { setError("Elegí un producto y una cantidad mayor a 0."); return; }
    setSaving(true);
    try {
      await sheets.addStockSheet(vendor.sheetUrl, { fecha, producto: productoSel.nombre, unidades: Number(unidades), observacion });
      setUnidades(""); setObservacion(""); setProductoId("");
      onChanged();
    } catch (e) { setError("No se pudo guardar: " + e.message); }
    setSaving(false);
  };
  const marcarVendido = async (fila) => {
    try { await sheets.updateStockEstadoSheet(vendor.sheetUrl, fila, "Vendido"); onChanged(); }
    catch (e) { setError(e.message); }
  };

  if (!vendor.sheetUrl) return null;

  return (
    <>
      <div className="ec-card">
        <h3><Package size={16} /> Registrar mercadería de más</h3>
        <div className="ec-sub" style={{ marginBottom: 12 }}>Si en un envío te llegó algo de más, registralo acá. Cuando lo vendas, marcalo como "Vendido".</div>
        <FechaField label="Fecha" value={fecha} onChange={setFecha} />
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "18px 0 10px" }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: TOKENS.textSoft }}>REGISTROS</span>
        <button className="ec-btn ec-btn-ghost" style={{ padding: "5px 9px" }} onClick={onChanged}><RefreshCw size={13} /></button>
      </div>
      {loadError && <div className="ec-error">{loadError}</div>}
      {stock === null ? <Spinner label="Cargando..." /> : stock.length === 0 ? (
        <div className="ec-empty">Todavía no registraste mercadería de más.</div>
      ) : (
        [...stock].reverse().map((s) => (
          <div className="ec-pedido-row" key={s.fila}>
            <div className="ec-pedido-top">
              <div><div className="ec-pedido-cliente">{s.producto} × {s.unidades}</div><div className="ec-pedido-meta">{s.fecha}</div></div>
              <span className={`ec-badge ${s.estado === "Vendido" ? "ec-badge-desp" : "ec-badge-pend"}`}>{s.estado}</span>
            </div>
            {s.observacion && <div className="ec-note">{s.observacion}</div>}
            {s.estado !== "Vendido" && <button className="ec-btn ec-btn-ghost" style={{ marginTop: 8, padding: "6px 10px" }} onClick={() => marcarVendido(s.fila)}>Marcar como vendido</button>}
          </div>
        ))
      )}
    </>
  );
}

function RendicionesTab({ vendor, rendiciones, error, onChanged }) {
  if (!vendor.sheetUrl) return null;
  if (error) return <div className="ec-error">{error}</div>;
  if (rendiciones === null) return <Spinner label="Cargando rendiciones..." />;

  // Rendición pagada: un cuadradito de color según el estado de pago (A verde, B amarillo, C rojo).
  // Rendición impaga: la etiqueta PENDIENTE.
  const COLOR_PAGO = { A: "#2E9E5B", B: "#F2B01E", C: "#D64545" };
  const TITULO_PAGO = { A: "Pagada a término", B: "Pagada con demora intermedia", C: "Pagada fuera de término" };
  const estadoDePago = (r) => {
    const letra = String(r.estadoColor || "").trim().toUpperCase();
    if (COLOR_PAGO[letra]) return (
      <span title={TITULO_PAGO[letra]} aria-label={TITULO_PAGO[letra]} style={{ display: "inline-block", width: 18, height: 18, borderRadius: 4, background: COLOR_PAGO[letra], flexShrink: 0 }} />
    );
    if (String(r.montoPagado || "").trim() !== "") return null; // tiene un pago cargado pero todavía sin estado
    return <span className="ec-badge ec-badge-pend">PENDIENTE</span>;
  };

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: TOKENS.textSoft }}>HISTORIAL DE RENDICIONES</span>
        <button className="ec-btn ec-btn-ghost" style={{ padding: "5px 9px" }} onClick={onChanged}><RefreshCw size={13} /></button>
      </div>
      {rendiciones.length === 0 ? (
        <div className="ec-empty">Todavía no hay rendiciones cargadas.</div>
      ) : (
        rendiciones.map((r, i) => (
          <div className="ec-pedido-row" key={i}>
            <div className="ec-pedido-top">
              <div><div className="ec-pedido-cliente">{r.fecha}</div><div className="ec-pedido-meta">Vendido {r.totalVendido} · Comisión {r.comision}</div></div>
              {estadoDePago(r)}
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
        <div><div style={{ display: "flex", alignItems: "center", gap: 8 }}><img src="/logo.png" alt="El Castaño" style={{ height: 20 }} /><span className="ec-serif" style={{ fontSize: 14, color: TOKENS.textSoft }}>· Admin</span></div><div className="ec-sub" style={{ marginTop: 4 }}>Panel de gestión de vendedores</div></div>
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
  const [ok, setOk] = useState("");
  const [preparando, setPreparando] = useState(false);
  const [despachandoSemana, setDespachandoSemana] = useState(null);
  const [formSemana, setFormSemana] = useState(null);
  const [cajasInput, setCajasInput] = useState("");
  const [notaInput, setNotaInput] = useState("");
  const [editingRow, setEditingRow] = useState(null);
  const [editVals, setEditVals] = useState({});
  const [semanaAbierta, setSemanaAbierta] = useState(null);

  const vendor = vendors.find((v) => v.id === vendorId);
  const NOMBRES_MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  const referencia = new Date(new Date().getFullYear(), NOMBRES_MESES.indexOf(mes), 1);

  const cargar = useCallback(async () => {
    if (!vendor || !vendor.sheetUrl) { setPedidos([]); return; }
    setError("");
    try { setPedidos(await sheets.fetchPedidosSheet(vendor.sheetUrl, mes)); }
    catch (e) { setError(e.message); setPedidos([]); }
  }, [vendor, mes]);
  useEffect(() => { cargar(); }, [cargar]);

  // Lo despachado se agrupa por fecha de despacho; lo que sigue sin despachar,
  // por semana del pedido (clave "P:").
  const semanas = useMemo(() => {
    if (!pedidos) return null;
    const mapa = new Map();
    pedidos.forEach((p) => {
      const { key, label } = infoSemana(p.dia, referencia);
      let gk, glabel, sort;
      if (p.despachado) {
        gk = p.fechaDespacho ? "D:" + p.fechaDespacho : key;
        glabel = p.fechaDespacho ? etiquetaDespacho(p.fechaDespacho) : label;
        sort = "0" + (p.fechaDespacho || key);
      } else {
        gk = "P:" + key;
        glabel = `${label} · sin despachar`;
        sort = "1" + key; // los pendientes primero
      }
      if (!mapa.has(gk)) mapa.set(gk, { key: gk, label: glabel, sort, lineas: [] });
      mapa.get(gk).lineas.push(p);
    });
    return Array.from(mapa.values()).sort((a, b) => (a.sort[0] !== b.sort[0] ? b.sort[0].localeCompare(a.sort[0]) : b.sort.localeCompare(a.sort)));
  }, [pedidos, mes]);

  const prepararColumnas = async () => {
    if (!vendor || !vendor.sheetUrl) return;
    setError(""); setOk(""); setPreparando(true);
    try {
      await sheets.prepararColumnasSheet(vendor.sheetUrl, mes);
      setOk(`Listo — columnas Despachado/Faltante preparadas en ${mes} para ${vendor.nombre}.`);
      cargar();
    } catch (e) { setError("No se pudo preparar: " + e.message); }
    setPreparando(false);
  };

  const startEdit = (p) => { setEditingRow(p.fila); setEditVals({ estado: p.estado, faltante: p.faltante }); };
  const guardarFila = async (p) => {
    try {
      await sheets.updatePedidoSheet(vendor.sheetUrl, mes, p.fila, editVals);
      setEditingRow(null);
      setPedidos(await sheets.fetchPedidosSheet(vendor.sheetUrl, mes));
    } catch (e) { setError("No se pudo guardar: " + e.message); }
  };

  const despachoDe = (key) => ((pedidos && pedidos.despachos) || []).find((d) => d.semana === key && d.mes.toLowerCase() === mes.toLowerCase());

  const abrirDespacho = (semana) => {
    const d = despachoDe(semana.key);
    setCajasInput(d && d.cajas ? String(d.cajas) : "");
    setNotaInput(d ? d.nota : "");
    setFormSemana(semana.key);
  };

  // Guarda cajas y nota de la semana y, si corresponde, marca todas las
  // líneas como DESPACHADO. Los datos se guardan primero, así el aviso que
  // sale unos minutos después ya los incluye.
  const confirmarDespacho = async (semana, despachar) => {
    setError(""); setOk(""); setDespachandoSemana(semana.key);
    try {
      // Lo pendiente se despacha hoy: se marcan primero las líneas (la planilla les
      // pone la fecha de hoy) y después se guardan las cajas y la nota de ese despacho.
      const esPendiente = semana.key.indexOf("P:") === 0;
      if (despachar) {
        const pendientes = semana.lineas.filter((l) => l.estado !== "DESPACHADO");
        for (const linea of pendientes) {
          await sheets.updatePedidoSheet(vendor.sheetUrl, mes, linea.fila, { estado: "DESPACHADO" });
        }
      }
      await sheets.guardarDespachoSheet(vendor.sheetUrl, {
        mes, semana: esPendiente ? "D:" + hoyAR() : semana.key, cajas: cajasInput === "" ? "" : Number(cajasInput), nota: notaInput.trim(),
      });
      setPedidos(await sheets.fetchPedidosSheet(vendor.sheetUrl, mes));
      setFormSemana(null);
      setOk(despachar ? "Despachado. Al vendedor le llega el aviso en unos minutos." : "Datos del despacho guardados.");
    } catch (e) { setError("No se pudo guardar el despacho: " + e.message); }
    setDespachandoSemana(null);
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
            {NOMBRES_MESES.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>
      <div className="ec-row-actions" style={{ marginBottom: 10, flexWrap: "wrap" }}>
        <button className="ec-btn ec-btn-ghost" disabled={preparando || !vendor?.sheetUrl} onClick={prepararColumnas}>
          {preparando ? <Loader2 size={15} style={{ animation: "spin 0.9s linear infinite" }} /> : <Check size={15} />} Preparar columnas de esta solapa
        </button>
      </div>
      {vendor && !vendor.sheetUrl && <div className="ec-error">Este vendedor todavía no tiene planilla vinculada.</div>}
      {error && <div className="ec-error">{error}</div>}
      {ok && <div className="ec-ok">{ok}</div>}
      {semanas === null ? <Spinner label="Cargando..." /> : semanas.length === 0 ? (
        <div className="ec-empty">No hay pedidos cargados en {mes} para este vendedor.</div>
      ) : (
        semanas.map((sem) => {
          const total = sem.lineas.reduce((acc, l) => acc + Number(l.total || 0), 0);
          const estado = estadoAgregado(sem.lineas);
          const abierta = semanaAbierta === sem.key;
          return (
            <div className="ec-pedido-row" key={sem.key}>
              <div className="ec-pedido-top" style={{ cursor: "pointer" }} onClick={() => setSemanaAbierta(abierta ? null : sem.key)}>
                <div>
                  <div className="ec-pedido-cliente">{sem.label}</div>
                  <div className="ec-pedido-meta">{sem.lineas.length} línea(s) · {fmtMoney(total)}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className={`ec-badge ${claseBadgeEstado(estado)}`}>{etiquetaEstado(estado)}</span>
                  <ChevronRight size={16} style={{ transform: abierta ? "rotate(90deg)" : "none", transition: "transform 0.15s" }} />
                </div>
              </div>
              <ResumenDespacho faltantes={sem.key.indexOf("D:") === 0 ? faltantesDeDespacho(pedidos, sem.key.slice(2)) : faltantesDe(sem.lineas)} despacho={despachoDe(sem.key)} />
              {formSemana === sem.key ? (
                <div style={{ marginTop: 10 }}>
                  <div className="ec-row2">
                    <div className="ec-field"><label>Cajas</label><input type="number" min="0" value={cajasInput} onChange={(e) => setCajasInput(e.target.value)} placeholder="0" /></div>
                    <div className="ec-field"><label>Nota (opcional)</label><input value={notaInput} onChange={(e) => setNotaInput(e.target.value)} /></div>
                  </div>
                  <div className="ec-row-actions">
                    <button className="ec-btn ec-btn-primary" disabled={despachandoSemana === sem.key} onClick={() => confirmarDespacho(sem, estado !== "DESPACHADO")}>
                      {despachandoSemana === sem.key ? <Loader2 size={15} style={{ animation: "spin 0.9s linear infinite" }} /> : <Check size={15} />} {estado !== "DESPACHADO" ? "Confirmar despacho" : "Guardar datos"}
                    </button>
                    <button className="ec-btn ec-btn-ghost" onClick={() => setFormSemana(null)}>Cancelar</button>
                  </div>
                </div>
              ) : (
                <button className={estado !== "DESPACHADO" ? "ec-btn ec-btn-primary" : "ec-btn ec-btn-ghost"} style={{ marginTop: 10 }} onClick={() => abrirDespacho(sem)}>
                  {estado !== "DESPACHADO" ? <><Check size={15} /> Despachar lo pendiente</> : "Editar cajas y nota"}
                </button>
              )}
              {abierta && (
                <div style={{ marginTop: 10, borderTop: `1px solid ${TOKENS.border}`, paddingTop: 8 }}>
                  {sem.lineas.map((p) => (
                    <div key={p.fila} style={{ marginBottom: 10 }}>
                      <div className="ec-pedido-top">
                        <div><div className="ec-pedido-cliente">{p.cliente}</div><div className="ec-pedido-meta">{p.producto} · {p.unidades} u. · {p.categoria} · Día {p.dia} · {fmtMoney(p.total)}</div></div>
                        {editingRow !== p.fila && <span className={`ec-badge ${claseBadgeEstado(p.estado)}`}>{etiquetaEstado(p.estado)}</span>}
                      </div>
                      {editingRow === p.fila ? (
                        <div style={{ marginTop: 10 }}>
                          <div className="ec-field"><label>Estado</label>
                            <select className="ec-select-inline" value={editVals.estado} onChange={(e) => setEditVals({ ...editVals, estado: e.target.value })}>
                              <option value="PENDIENTE">Pendiente</option>
                              <option value="EN PROCESO">En proceso</option>
                              <option value="DESPACHADO">Despachado</option>
                            </select>
                          </div>
                          <div className="ec-field"><label>¿Faltante?</label>
                            <select className="ec-select-inline" value={editVals.faltante ? "si" : "no"} onChange={(e) => setEditVals({ ...editVals, faltante: e.target.value === "si" })}>
                              <option value="no">No</option><option value="si">Sí</option>
                            </select>
                          </div>
                          <div className="ec-row-actions">
                            <button className="ec-btn ec-btn-primary" onClick={() => guardarFila(p)}>Guardar</button>
                            <button className="ec-btn ec-btn-ghost" onClick={() => setEditingRow(null)}>Cancelar</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {unidadesFalt(p) > 0 && <div className="ec-note warn"><AlertTriangle size={12} style={{ marginRight: 5, verticalAlign: -2 }} />Faltan {unidadesFalt(p)} de {p.unidades} u.: {p.producto}</div>}
                          <button className="ec-btn ec-btn-ghost" style={{ marginTop: 8, padding: "6px 10px" }} onClick={() => startEdit(p)}>Editar estado <ChevronRight size={13} /></button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })
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
  // La sesión del vendedor queda guardada en el celular hasta que toque
  // "Salir". La del administrador no se guarda.
  const [session, setSession] = useState(() => {
    try {
      const guardado = localStorage.getItem("ec_vendor_id");
      return guardado ? { role: "vendor", vendorId: guardado } : null;
    } catch (e) { return null; }
  });
  const loginVendedor = (vendorId) => {
    try { localStorage.setItem("ec_vendor_id", vendorId); } catch (e) {}
    setSession({ role: "vendor", vendorId });
  };
  const cerrarSesion = () => {
    try { localStorage.removeItem("ec_vendor_id"); } catch (e) {}
    setSession(null);
  };

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
        <LoginScreen vendors={vendors} onVendorLogin={loginVendedor} onAdminLogin={() => setSession({ role: "admin" })} />
      ) : session.role === "admin" ? (
        <AdminApp vendors={vendors} products={products} onLogout={cerrarSesion} refreshVendors={refreshVendors} refreshProducts={refreshProducts} />
      ) : activeVendor ? (
        <VendorApp vendor={activeVendor} products={products} onLogout={cerrarSesion} />
      ) : (
        <div className="ec-shell"><div className="ec-empty">
          Tu usuario ya no existe. Contactá al administrador.
          <div style={{ marginTop: 12 }}><button className="ec-btn ec-btn-ghost" onClick={cerrarSesion}>Volver al inicio</button></div>
        </div></div>
      )}
    </>
  );
}

// Mantiene la app al día. Cuando hay una versión nueva:
//  - si no hay nada a medias (pedido en carga o edición), se actualiza sola al volver a abrirla;
//  - si hay algo a medias, muestra un cartel para actualizar cuando el vendedor quiera.
// Si no toca el cartel, la versión nueva se aplica igual la próxima vez que abra la app de cero.
function useActualizacionAutomatica() {
  const [hayNueva, setHayNueva] = useState(false);
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let nueva = false;
    const aplicarSiLibre = () => {
      if (nueva && !window.__ecOcupado) window.location.reload();
    };
    const alCambiarControlador = () => {
      if (!navigator.serviceWorker.controller || nueva) return;
      nueva = true;
      setHayNueva(true);
      if (document.visibilityState === "hidden") aplicarSiLibre();
    };
    navigator.serviceWorker.addEventListener("controllerchange", alCambiarControlador);
    const alVolver = () => {
      if (document.visibilityState !== "visible") return;
      aplicarSiLibre();
      navigator.serviceWorker.getRegistration().then((r) => r && r.update()).catch(() => {});
    };
    alVolver();
    document.addEventListener("visibilitychange", alVolver);
    const intervalo = setInterval(() => {
      if (document.visibilityState === "visible") navigator.serviceWorker.getRegistration().then((r) => r && r.update()).catch(() => {});
    }, 30 * 60 * 1000);
    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", alCambiarControlador);
      document.removeEventListener("visibilitychange", alVolver);
      clearInterval(intervalo);
    };
  }, []);
  return hayNueva;
}

function CartelActualizacion() {
  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 9999, background: TOKENS.primary || "#003C69", color: "#fff", padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, fontSize: 14, boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}>
      <span>Hay una versión nueva de la app</span>
      <button onClick={() => window.location.reload()} style={{ background: "#fff", color: TOKENS.primary || "#003C69", border: "none", borderRadius: 8, padding: "6px 12px", fontWeight: 600, cursor: "pointer" }}>Actualizar</button>
    </div>
  );
}

export default function App() {
  const hayNueva = useActualizacionAutomatica();
  return (<ErrorBoundary>{hayNueva && <CartelActualizacion />}<AppInner /></ErrorBoundary>);
}
