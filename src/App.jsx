import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPA_URL = "https://nvcgayvbbfbvdkynnwvc.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im52Y2dheXZiYmZidmRreW5ud3ZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4NTQwNDgsImV4cCI6MjA5MTQzMDA0OH0.IXPdGzkC4w979YAUC93wWN5rOAMyDsEbFfEA1xxh274";
const sb = createClient(SUPA_URL, SUPA_KEY);
const CREDS = { operador: "cafe2026", admin: "epichon" };
const SESSION_KEY = "cafevending_role";
const BUCKET = "comprobantes";

const INSUMOS = [
  { id: "cafe",        label: "Café molido",  unit: "kg", emoji: "☕", step: 0.5 },
  { id: "cacao",       label: "Cacao",        unit: "kg", emoji: "🍫", step: 0.5 },
  { id: "azucar",      label: "Azúcar",       unit: "cj", emoji: "🍬", step: 0.5 },
  { id: "edulcorante", label: "Edulcorante",  unit: "cj", emoji: "💊", step: 0.5 },
  { id: "leche",       label: "Leche x800",   unit: "cj", emoji: "🥛", step: 1   },
  { id: "vasos",       label: "Vasos",        unit: "u",  emoji: "🥤", step: 100 },
  { id: "removedores", label: "Removedores",  unit: "u",  emoji: "🥄", step: 100 },
];

const ALERTAS_DEFAULT = { cafe: 20, cacao: 10, azucar: 10, edulcorante: 10, leche: 30, vasos: 3000, removedores: 3000 };
const DIAS_ALERTA_DEF = 12;
const COMISION_DEF    = 0;
const MEDIOS_PAGO     = [
  { id: "efectivo",      label: "Efectivo",      emoji: "💵" },
  { id: "transferencia", label: "Transferencia", emoji: "📲" },
];

function zeroIns()  { return Object.fromEntries(INSUMOS.map(i => [i.id, 0])); }
function emptyIns() { return Object.fromEntries(INSUMOS.map(i => [i.id, ""])); }
function sumar(lista) {
  const acc = zeroIns();
  lista.forEach(x => INSUMOS.forEach(i => { acc[i.id] += Number(x?.insumos?.[i.id]) || 0; }));
  return acc;
}
function costoIns(ins, precios) {
  return INSUMOS.reduce((t, i) => t + (Number(ins[i.id]) || 0) * (precios[i.id] || 0), 0);
}
function serviciosDeVisita(v) {
  if (v.serviciosManuales > 0) return v.serviciosManuales;
  return Math.max(0, (v.contador || 0) - (v.contadorAnterior || 0));
}
function P(n)  { return "$" + Math.round(n).toLocaleString("es-AR"); }
function FN(n) { return Number.isInteger(n) ? n.toLocaleString("es-AR") : n.toLocaleString("es-AR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }); }
function FF(f) { if (!f) return ""; const [y, m, d] = f.split("-"); return `${d}/${m}/${y}`; }
function DA(f) { const diff = Math.floor((new Date() - new Date(f)) / 86400000); return diff === 0 ? "hoy" : diff === 1 ? "ayer" : `hace ${diff} días`; }
function diasDesde(f) { return Math.floor((new Date() - new Date(f)) / 86400000); }
function hoy() { return new Date().toISOString().split("T")[0]; }
function horaActual() { return new Date().toTimeString().slice(0, 5); }

async function subirComprobante(file) {
  const ext = file.name.split(".").pop();
  const nombre = `cobro_${Date.now()}.${ext}`;
  const { error } = await sb.storage.from(BUCKET).upload(nombre, file, { contentType: file.type });
  if (error) throw error;
  const { data } = sb.storage.from(BUCKET).getPublicUrl(nombre);
  return data.publicUrl;
}

const AVC = ["#E6F1FB:#0C447C","#E1F5EE:#085041","#FAEEDA:#633806","#FBEAF0:#72243E","#EAF3DE:#27500A","#E6F1FB:#185FA5"];
function avc(id) { const [bg, c] = AVC[(id - 1) % AVC.length].split(":"); return { bg, c }; }

function Av({ nombre, size = 36, bg = "#E6F1FB", c = "#0C447C" }) {
  const iniciales = nombre.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase();
  return (
    <div style={{ width: size, height: size, minWidth: size, borderRadius: "50%", background: bg, color: c, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * .34, fontWeight: 700, flexShrink: 0, overflow: "hidden", userSelect: "none", lineHeight: 1 }}>
      {iniciales}
    </div>
  );
}
function Sec({ children, mt = 4 }) {
  return <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10, marginTop: mt }}>{children}</div>;
}
function Card({ children, style = {} }) {
  return <div style={{ background: "var(--color-background-primary)", borderRadius: 14, border: "0.5px solid var(--color-border-tertiary)", padding: "14px 16px", ...style }}>{children}</div>;
}
function Met({ label, value, sub, warn }) {
  return <div style={{ background: warn ? "#FCEBEB" : "var(--color-background-secondary)", borderRadius: 10, padding: "12px 14px" }}>
    <div style={{ fontSize: 12, color: warn ? "#A32D2D" : "var(--color-text-secondary)", marginBottom: 4 }}>{label}</div>
    <div style={{ fontSize: 20, fontWeight: 700, color: warn ? "#A32D2D" : "var(--color-text-primary)" }}>{value}</div>
    {sub && <div style={{ fontSize: 11, color: warn ? "#791F1F" : "var(--color-text-secondary)", marginTop: 2 }}>{sub}</div>}
  </div>;
}
function Pill({ children, bg = "#F1EFE8", c = "#2C2C2A" }) {
  return <span style={{ fontSize: 12, background: bg, color: c, padding: "4px 10px", borderRadius: 20, whiteSpace: "nowrap" }}>{children}</span>;
}
function Spinner() {
  return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
    <div style={{ width: 32, height: 32, border: "3px solid var(--color-border-tertiary)", borderTopColor: "#185FA5", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </div>;
}
function ConfirmModal({ title, msg, onConfirm, onCancel }) {
  return <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, padding: 20 }}>
    <div style={{ background: "var(--color-background-primary)", borderRadius: 16, padding: "24px 20px", maxWidth: 320, width: "100%" }}>
      <div style={{ fontSize: 16, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 14, color: "var(--color-text-secondary)", marginBottom: 20, lineHeight: 1.5 }}>{msg}</div>
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={onCancel} style={{ flex: 1, padding: 14, borderRadius: 10, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", cursor: "pointer", fontSize: 15 }}>Cancelar</button>
        <button onClick={onConfirm} style={{ flex: 1, padding: 14, borderRadius: 10, border: "none", background: "#E24B4A", cursor: "pointer", fontSize: 15, fontWeight: 600, color: "#fff" }}>Eliminar</button>
      </div>
    </div>
  </div>;
}
function OkScreen({ titulo, sub, onVolver, children }) {
  return <div style={{ minHeight: "100vh", background: "var(--color-background-tertiary)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, gap: 20 }}>
    <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#EAF3DE", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34 }}>✓</div>
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: "var(--color-text-primary)" }}>{titulo}</div>
      <div style={{ fontSize: 16, color: "var(--color-text-secondary)", marginTop: 6 }}>{sub}</div>
    </div>
    {children}
    <button onClick={onVolver} style={{ padding: "16px 36px", borderRadius: 14, border: "none", background: "#185FA5", color: "#fff", fontSize: 17, fontWeight: 600, cursor: "pointer" }}>Volver al inicio</button>
  </div>;
}

const MetaViewport = () => {
  useEffect(() => {
    let meta = document.querySelector('meta[name="viewport"]');
    if (!meta) { meta = document.createElement('meta'); meta.name = 'viewport'; document.head.appendChild(meta); }
    meta.content = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no';
  }, []);
  return null;
};

export default function App() {
  const [role, setRole] = useState(() => { try { return localStorage.getItem(SESSION_KEY) || null; } catch { return null; } });
  const [data, setData] = useState({ clientes: [], clientesPendientes: [], visitas: [], entregasOp: [], ingresosDepo: [], cobros: [], preciosIns: {}, precioServ: 800, comisionOp: COMISION_DEF, configId: null, alertasStock: ALERTAS_DEFAULT, diasAlerta: DIAS_ALERTA_DEF });
  const [loading, setLoading] = useState(false);

  function handleLogin(r) { try { localStorage.setItem(SESSION_KEY, r); } catch {} setRole(r); }
  function handleLogout() { try { localStorage.removeItem(SESSION_KEY); } catch {} setRole(null); }

  const reload = useCallback(async () => {
    setLoading(true);
    const [cl, clPend, vi, eo, id, co, cfg] = await Promise.all([
      sb.from("clientes").select("*").eq("activo", true).order("nombre"),
      sb.from("clientes").select("*").eq("activo", false).eq("pendiente_aprobacion", true).order("created_at", { ascending: false }),
      sb.from("visitas").select("*").order("created_at", { ascending: false }),
      sb.from("entregas_operador").select("*").order("created_at", { ascending: false }),
      sb.from("ingresos_deposito").select("*").order("created_at", { ascending: false }),
      sb.from("cobros").select("*").order("created_at", { ascending: false }),
      sb.from("configuracion").select("*").single(),
    ]);
    setData({
      clientes:           cl.data || [],
      clientesPendientes: clPend.data || [],
      visitas:            vi.data || [],
      entregasOp:         eo.data || [],
      ingresosDepo:       id.data || [],
      cobros:             co.data || [],
      preciosIns:         cfg.data?.precios_insumos || {},
      precioServ:         cfg.data?.precio_servicio || 800,
      comisionOp:         cfg.data?.comision_operador || COMISION_DEF,
      configId:           cfg.data?.id,
      alertasStock:       cfg.data?.alertas_stock || ALERTAS_DEFAULT,
      diasAlerta:         cfg.data?.dias_alerta_visita || DIAS_ALERTA_DEF,
    });
    setLoading(false);
  }, []);

  useEffect(() => { if (role) reload(); }, [role, reload]);

  const db = {
    ...data, reload,
    async addVisita(v) {
      await sb.from("visitas").insert({ cliente_id: v.clienteId, fecha: hoy(), hora: horaActual(), contador_anterior: v.contadorAnterior || 0, contador: v.contador || 0, servicios_manuales: v.serviciosManuales || 0, insumos: v.insumos, falla: v.falla, detalle_falla: v.detalleFalla, observaciones: v.observaciones });
      await reload();
    },
    async addCobro(c) {
      await sb.from("cobros").insert({ cliente_id: c.clienteId, fecha: hoy(), monto: c.monto, medio: c.medio, nota: c.nota, comprobante_url: c.comprobanteUrl || null });
      await reload();
    },
    async addEntregaOp(e) { await sb.from("entregas_operador").insert({ fecha: e.fecha || hoy(), insumos: e.insumos, nota: e.nota }); await reload(); },
    async addIngresoDepo(i) { await sb.from("ingresos_deposito").insert({ fecha: hoy(), insumos: i.insumos, nota: i.nota }); await reload(); },
    async updateCliente(c) { await sb.from("clientes").update({ nombre: c.nombre, direccion: c.direccion, maquinas: c.maquinas, minimo: c.minimo }).eq("id", c.id); await reload(); },
    async deleteCliente(id) { await sb.from("clientes").update({ activo: false, pendiente_aprobacion: false }).eq("id", id); await reload(); },
    async addCliente(c) { await sb.from("clientes").insert({ nombre: c.nombre, direccion: c.direccion, maquinas: c.maquinas, minimo: c.minimo }); await reload(); },
    async proponerCliente(c) { await sb.from("clientes").insert({ nombre: c.nombre, direccion: c.direccion, maquinas: c.maquinas, minimo: 250, activo: false, pendiente_aprobacion: true }); await reload(); },
    async aprobarCliente(id) { await sb.from("clientes").update({ activo: true, pendiente_aprobacion: false }).eq("id", id); await reload(); },
    async rechazarCliente(id) { await sb.from("clientes").update({ pendiente_aprobacion: false }).eq("id", id); await reload(); },
    async saveConfig(precioServ, preciosIns, alertasStock, diasAlerta, comisionOp) {
      await sb.from("configuracion").update({ precio_servicio: precioServ, precios_insumos: preciosIns, alertas_stock: alertasStock, dias_alerta_visita: diasAlerta, comision_operador: comisionOp, updated_at: new Date().toISOString() }).eq("id", data.configId);
      await reload();
    },
  };

  const visitas = data.visitas.map(v => ({ ...v, clienteId: v.cliente_id, contadorAnterior: v.contador_anterior, detalleFalla: v.detalle_falla, serviciosManuales: v.servicios_manuales || 0 }));
  const cobros  = data.cobros.map(c => ({ ...c, clienteId: c.cliente_id, comprobanteUrl: c.comprobante_url }));
  const dbNorm  = { ...db, visitas, cobros };

  if (!role) return <><MetaViewport /><Login onLogin={handleLogin} /></>;
  if (loading) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}><div style={{ fontSize: 40 }}>☕</div><Spinner /><div style={{ fontSize: 15, color: "var(--color-text-secondary)" }}>Cargando datos…</div></div>;
  if (role === "operador") return <><MetaViewport /><OpApp db={dbNorm} onLogout={handleLogout} /></>;
  return <AdminApp db={dbNorm} onLogout={handleLogout} />;
}

function Login({ onLogin }) {
  const [user, setUser] = useState(""); const [pass, setPass] = useState(""); const [err, setErr] = useState("");
  function handleSubmit(e) { e.preventDefault(); if (!user) { setErr("Seleccioná un rol primero."); return; } if (pass === CREDS[user]) { setErr(""); onLogin(user); } else { setErr("Contraseña incorrecta."); } }
  return <div style={{ minHeight: "100vh", background: "var(--color-background-tertiary)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
    <div style={{ width: "100%", maxWidth: 380 }}>
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <div style={{ fontSize: 52, marginBottom: 12 }}>☕</div>
        <div style={{ fontSize: 28, fontWeight: 700, color: "var(--color-text-primary)", letterSpacing: -.5 }}>CaféVending</div>
        <div style={{ fontSize: 16, color: "var(--color-text-secondary)", marginTop: 6 }}>Sistema de gestión</div>
      </div>
      <form onSubmit={handleSubmit} autoComplete="on">
        <div style={{ display: "flex", background: "var(--color-background-secondary)", borderRadius: 14, padding: 4, marginBottom: 20 }}>
          {[{ r: "operador", l: "Operador" }, { r: "admin", l: "Administrador" }].map(({ r, l }) => (
            <button type="button" key={r} onClick={() => { setUser(r); setErr(""); setPass(""); }} style={{ flex: 1, padding: "14px", borderRadius: 12, border: "none", cursor: "pointer", fontSize: 16, fontWeight: user === r ? 600 : 400, background: user === r ? "var(--color-background-primary)" : "transparent", color: user === r ? "var(--color-text-primary)" : "var(--color-text-secondary)" }}>{l}</button>
          ))}
        </div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 14, color: "var(--color-text-secondary)", marginBottom: 8 }}>Contraseña</div>
          <input type="password" name="password" autoComplete="current-password" placeholder="Ingresá tu contraseña" value={pass} onChange={e => setPass(e.target.value)} style={{ width: "100%", padding: "16px", borderRadius: 12, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontSize: 18, boxSizing: "border-box" }} />
        </div>
        {err && <div style={{ fontSize: 14, color: "#A32D2D", marginBottom: 12 }}>{err}</div>}
        <button type="submit" style={{ width: "100%", padding: 18, borderRadius: 14, border: "none", background: "#185FA5", color: "#fff", fontSize: 18, fontWeight: 600, cursor: "pointer" }}>Ingresar</button>
      </form>
    </div>
  </div>;
}

function OpApp({ db, onLogout }) {
  const [screen, setScreen] = useState("home"); const [clienteSel, setClienteSel] = useState(null);
  const [saved, setSaved] = useState(null); const [savedCobro, setSavedCobro] = useState(null);
  const [opTab, setOpTab] = useState("visitas"); const [saving, setSaving] = useState(false);
  const [showProponer, setShowProponer] = useState(false);
  const totalRecibido = sumar(db.entregasOp); const totalEntregado = sumar(db.visitas);
  const stockOp = Object.fromEntries(INSUMOS.map(i => [i.id, Math.max(0, (totalRecibido[i.id] || 0) - (totalEntregado[i.id] || 0))]));
  async function handleGuardarVisita(v) { setSaving(true); await db.addVisita(v); setSaving(false); setSaved(v); setScreen("ok-visita"); }
  async function handleGuardarCobro(c) { setSaving(true); await db.addCobro(c); setSaving(false); setSavedCobro(c); setScreen("ok-cobro"); }
  if (screen === "visita" && clienteSel) return <FormVisita cliente={clienteSel} stockOp={stockOp} precios={db.preciosIns} saving={saving} onGuardar={handleGuardarVisita} onBack={() => setScreen("home")} />;
  if (screen === "cobro" && clienteSel)  return <FormCobro  cliente={clienteSel} precioServ={db.precioServ} visitas={db.visitas.filter(v => v.clienteId === clienteSel.id)} cobros={db.cobros.filter(c => c.clienteId === clienteSel.id)} saving={saving} onGuardar={handleGuardarCobro} onBack={() => setScreen("home")} />;
  if (screen === "ok-visita") {
    const c = db.clientes.find(c => c.id === saved?.clienteId);
    return <OkScreen titulo="¡Visita guardada!" sub={c?.nombre} onVolver={() => setScreen("home")}>
      <Card style={{ width: "100%", maxWidth: 340 }}>
        {INSUMOS.filter(i => (saved?.insumos[i.id] || 0) > 0).map(i => <div key={i.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 15, padding: "6px 0", borderBottom: "0.5px solid var(--color-border-tertiary)", color: "var(--color-text-secondary)" }}><span>{i.emoji} {i.label}</span><span style={{ fontWeight: 600, color: "var(--color-text-primary)" }}>{FN(saved.insumos[i.id])} {i.unit}</span></div>)}
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--color-border-secondary)", display: "flex", justifyContent: "space-between", fontSize: 16, fontWeight: 700 }}><span>Costo insumos</span><span>{P(costoIns(saved?.insumos || {}, db.preciosIns))}</span></div>
      </Card>
    </OkScreen>;
  }
  if (screen === "ok-cobro") {
    const c = db.clientes.find(c => c.id === savedCobro?.clienteId); const mp = MEDIOS_PAGO.find(m => m.id === savedCobro?.medio);
    return <OkScreen titulo="¡Cobro registrado!" sub={c?.nombre} onVolver={() => setScreen("home")}>
      <Card style={{ width: "100%", maxWidth: 340, textAlign: "center" }}>
        <div style={{ fontSize: 32, fontWeight: 700, color: "#27500A", padding: "12px 0" }}>{P(savedCobro?.monto || 0)}</div>
        <div style={{ fontSize: 16, color: "var(--color-text-secondary)" }}>{mp?.emoji} {mp?.label}</div>
        {savedCobro?.comprobanteUrl && <div style={{ marginTop: 12, fontSize: 14, color: "#1D9E75" }}>✓ Comprobante adjunto</div>}
      </Card>
    </OkScreen>;
  }

  const hasStock = INSUMOS.some(i => stockOp[i.id] > 0);
  const diasAlerta = db.diasAlerta || DIAS_ALERTA_DEF;

  return <div style={{ minHeight: "100vh", background: "var(--color-background-tertiary)", maxWidth: 520, margin: "0 auto" }}>
    <div style={{ background: "var(--color-background-primary)", borderBottom: "0.5px solid var(--color-border-tertiary)", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 10 }}>
      <div>
        <div style={{ fontSize: 20, fontWeight: 700 }}>☕ CaféVending</div>
        <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 2 }}>Panel del operador</div>
      </div>
      <button onClick={onLogout} style={{ fontSize: 14, color: "var(--color-text-secondary)", background: "var(--color-background-secondary)", border: "none", cursor: "pointer", padding: "8px 16px", borderRadius: 10 }}>Salir</button>
    </div>

    <div style={{ padding: "16px 16px 32px" }}>
      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>📦 Insumos en mano</div>
          {hasStock && <div style={{ fontSize: 16, fontWeight: 700, color: "#185FA5" }}>{P(costoIns(stockOp, db.preciosIns))}</div>}
        </div>
        {!hasStock
          ? <div style={{ fontSize: 15, color: "var(--color-text-secondary)", fontStyle: "italic", padding: "8px 0" }}>No tenés insumos asignados aún.</div>
          : INSUMOS.map(i => <div key={i.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 15, padding: "8px 0", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
            <span style={{ color: "var(--color-text-secondary)" }}>{i.emoji} {i.label}</span>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>{P((stockOp[i.id] || 0) * (db.preciosIns[i.id] || 0))}</span>
              <span style={{ fontWeight: 600, color: stockOp[i.id] === 0 ? "var(--color-text-tertiary)" : "var(--color-text-primary)", minWidth: 70, textAlign: "right" }}>{FN(stockOp[i.id])} {i.unit}</span>
            </div>
          </div>)}
      </Card>

      <div style={{ display: "flex", background: "var(--color-background-secondary)", borderRadius: 14, padding: 4, marginBottom: 20 }}>
        {[{ id: "visitas", l: "📋 Registrar visita" }, { id: "cobros", l: "💰 Registrar cobro" }].map(t => (
          <button key={t.id} onClick={() => setOpTab(t.id)} style={{ flex: 1, padding: "14px 8px", borderRadius: 12, border: "none", cursor: "pointer", fontSize: 15, fontWeight: opTab === t.id ? 700 : 400, background: opTab === t.id ? "var(--color-background-primary)" : "transparent", color: opTab === t.id ? "var(--color-text-primary)" : "var(--color-text-secondary)" }}>{t.l}</button>
        ))}
      </div>

      <Sec mt={0}>{opTab === "visitas" ? "Seleccioná cliente para visita" : "Seleccioná cliente para cobro"}</Sec>

      {db.clientes.map(c => {
        const uv = db.visitas.find(v => v.clienteId === c.id);
        const uc = db.cobros.find(co => co.clienteId === c.id);
        const { bg, c: col } = avc(c.id);
        const dias = uv ? diasDesde(uv.fecha) : null;
        const enAlerta = dias === null || dias >= diasAlerta;
        return <div key={c.id}
          onClick={() => { setClienteSel(c); setScreen(opTab === "visitas" ? "visita" : "cobro"); }}
          style={{ background: "var(--color-background-primary)", borderRadius: 16, border: `2px solid ${enAlerta && opTab === "visitas" ? "#F09595" : "var(--color-border-tertiary)"}`, padding: "18px 16px", marginBottom: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 16, WebkitTapHighlightColor: "transparent" }}
          onTouchStart={e => e.currentTarget.style.background = "var(--color-background-secondary)"}
          onTouchEnd={e => e.currentTarget.style.background = "var(--color-background-primary)"}
        >
          <Av nombre={c.nombre} bg={bg} c={col} size={52} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: "var(--color-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.nombre}</div>
            <div style={{ fontSize: 14, color: enAlerta && opTab === "visitas" ? "#A32D2D" : "var(--color-text-secondary)", marginTop: 4 }}>
              {opTab === "visitas"
                ? (uv ? `Última visita ${DA(uv.fecha)}` : "Sin visitas aún")
                : (uc ? `Último cobro ${DA(uc.fecha)}` : "Sin cobros")}
            </div>
            <div style={{ fontSize: 13, color: "var(--color-text-tertiary)", marginTop: 2 }}>{c.maquinas} máquinas</div>
          </div>
          <div style={{ fontSize: 28, color: "#185FA5", flexShrink: 0 }}>›</div>
        </div>;
      })}

      <button onClick={() => setShowProponer(p => !p)} style={{ width: "100%", padding: 16, borderRadius: 14, border: "2px dashed var(--color-border-secondary)", background: "var(--color-background-primary)", color: "#1D9E75", fontSize: 16, fontWeight: 600, cursor: "pointer", marginTop: 4 }}>
        {showProponer ? "Cancelar" : "+ Proponer nuevo cliente"}
      </button>
      {showProponer && <ProponerCliente db={db} onDone={() => setShowProponer(false)} />}
    </div>
  </div>;
}

function ProponerCliente({ db, onDone }) {
  const [form, setForm] = useState({ nombre: "", direccion: "", maquinas: 1 }); const [saving, setSaving] = useState(false); const [ok, setOk] = useState(false);
  async function proponer() { if (!form.nombre.trim()) return; setSaving(true); await db.proponerCliente(form); setSaving(false); setOk(true); setTimeout(() => { setOk(false); onDone(); }, 2000); }
  if (ok) return <div style={{ background: "#EAF3DE", borderRadius: 12, padding: "16px", marginTop: 12, fontSize: 15, color: "#27500A" }}>✓ Propuesta enviada. El admin la revisará pronto.</div>;
  return <Card style={{ marginTop: 12 }}>
    <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>Proponer nuevo cliente</div>
    <div style={{ fontSize: 14, color: "var(--color-text-secondary)", marginBottom: 14 }}>El admin deberá aprobarlo antes de que quede activo.</div>
    {[["Nombre del lugar", "nombre"], ["Dirección", "direccion"]].map(([ph, k]) => <input key={k} placeholder={ph} value={form[k]} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))} style={{ width: "100%", marginBottom: 10, padding: "14px", borderRadius: 10, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontSize: 16, boxSizing: "border-box" }} />)}
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
      <label style={{ fontSize: 15, color: "var(--color-text-secondary)" }}>Máquinas:</label>
      <input type="number" min="1" value={form.maquinas} onChange={e => setForm(p => ({ ...p, maquinas: e.target.value }))} style={{ width: 80, padding: "12px", borderRadius: 10, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontSize: 16, textAlign: "center" }} />
    </div>
    <button onClick={proponer} disabled={saving} style={{ width: "100%", padding: 16, borderRadius: 12, border: "none", background: saving ? "#888" : "#1D9E75", color: "#fff", fontSize: 16, fontWeight: 600, cursor: "pointer" }}>{saving ? "Enviando…" : "Enviar propuesta"}</button>
  </Card>;
}

function FormVisita({ cliente, stockOp, precios, saving, onGuardar, onBack }) {
  const [ins, setIns] = useState(emptyIns()); const [usaManual, setUsaManual] = useState(false);
  const [cAnt, setCAnt] = useState(""); const [cAct, setCAct] = useState(""); const [servManual, setServManual] = useState("");
  const [falla, setFalla] = useState(false); const [detF, setDetF] = useState(""); const [obs, setObs] = useState(""); const [err, setErr] = useState("");
  const insNum = Object.fromEntries(Object.entries(ins).map(([k, v]) => [k, parseFloat(v) || 0]));
  const costo = costoIns(insNum, precios); const cafesContador = Math.max(0, (parseFloat(cAct) || 0) - (parseFloat(cAnt) || 0));
  function guardar() {
    for (const i of INSUMOS) { if (insNum[i.id] > (stockOp[i.id] || 0)) { setErr(`No tenés suficiente ${i.label}`); return; } }
    setErr(""); onGuardar({ clienteId: cliente.id, contadorAnterior: parseFloat(cAnt) || 0, contador: parseFloat(cAct) || 0, serviciosManuales: usaManual ? parseInt(servManual) || 0 : 0, insumos: insNum, falla, detalleFalla: detF, observaciones: obs });
  }
  return <div style={{ minHeight: "100vh", background: "var(--color-background-tertiary)", maxWidth: 520, margin: "0 auto" }}>
    <div style={{ background: "var(--color-background-primary)", borderBottom: "0.5px solid var(--color-border-tertiary)", padding: "16px 20px", display: "flex", alignItems: "center", gap: 14, position: "sticky", top: 0, zIndex: 10 }}>
      <button onClick={onBack} style={{ fontSize: 28, background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", padding: "0 4px" }}>←</button>
      <div>
        <div style={{ fontSize: 18, fontWeight: 700 }}>{cliente.nombre}</div>
        <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 2 }}>Registrar visita · {FF(hoy())}</div>
      </div>
    </div>
    <div style={{ padding: "16px 16px 40px" }}>
      <Sec mt={0}>Servicios vendidos</Sec>
      <div style={{ display: "flex", background: "var(--color-background-secondary)", borderRadius: 14, padding: 4, marginBottom: 16 }}>
        <button onClick={() => setUsaManual(false)} style={{ flex: 1, padding: "14px", borderRadius: 12, border: "none", cursor: "pointer", fontSize: 15, fontWeight: !usaManual ? 700 : 400, background: !usaManual ? "var(--color-background-primary)" : "transparent", color: !usaManual ? "var(--color-text-primary)" : "var(--color-text-secondary)" }}>Por contador</button>
        <button onClick={() => setUsaManual(true)}  style={{ flex: 1, padding: "14px", borderRadius: 12, border: "none", cursor: "pointer", fontSize: 15, fontWeight: usaManual ? 700 : 400, background: usaManual ? "var(--color-background-primary)" : "transparent", color: usaManual ? "var(--color-text-primary)" : "var(--color-text-secondary)" }}>Manual</button>
      </div>
      {!usaManual && <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {[["Lectura anterior", cAnt, setCAnt], ["Lectura actual", cAct, setCAct]].map(([label, val, set]) => (
            <div key={label}>
              <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 6 }}>{label}</div>
              <input type="number" inputMode="numeric" min="0" placeholder="0" value={val} onChange={e => set(e.target.value)} style={{ width: "100%", padding: "14px 12px", borderRadius: 10, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontSize: 20, fontWeight: 600, boxSizing: "border-box", textAlign: "center" }} />
            </div>
          ))}
        </div>
        {cafesContador > 0 && <div style={{ marginTop: 14, background: "#E6F1FB", borderRadius: 10, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 14, color: "#0C447C" }}>Servicios registrados</span>
          <span style={{ fontSize: 22, fontWeight: 700, color: "#0C447C" }}>{cafesContador.toLocaleString("es-AR")}</span>
        </div>}
      </Card>}
      {usaManual && <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, color: "var(--color-text-secondary)", marginBottom: 8 }}>Cantidad de servicios vendidos</div>
        <input type="number" inputMode="numeric" min="0" placeholder="0" value={servManual} onChange={e => setServManual(e.target.value)} style={{ width: "100%", padding: "16px", borderRadius: 10, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontSize: 32, fontWeight: 700, boxSizing: "border-box", textAlign: "center" }} />
        {servManual > 0 && <div style={{ marginTop: 14, background: "#E6F1FB", borderRadius: 10, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 14, color: "#0C447C" }}>Servicios registrados</span>
          <span style={{ fontSize: 22, fontWeight: 700, color: "#0C447C" }}>{parseInt(servManual).toLocaleString("es-AR")}</span>
        </div>}
      </Card>}

      <Sec>Insumos a dejar</Sec>
      {INSUMOS.map(ins_i => {
        const disp = stockOp[ins_i.id] || 0, over = (parseFloat(ins[ins_i.id]) || 0) > disp;
        return <div key={ins_i.id} style={{ background: "var(--color-background-primary)", borderRadius: 14, border: `2px solid ${over ? "#F09595" : "var(--color-border-tertiary)"}`, padding: "14px 16px", marginBottom: 10, display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 24 }}>{ins_i.emoji}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 600 }}>{ins_i.label}</div>
            <div style={{ fontSize: 13, color: disp === 0 ? "#A32D2D" : "var(--color-text-secondary)", marginTop: 2 }}>En mano: {FN(disp)} {ins_i.unit}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={() => setIns(p => ({ ...p, [ins_i.id]: Math.max(0, (parseFloat(p[ins_i.id]) || 0) - ins_i.step).toString() }))}
              style={{ width: 44, height: 44, borderRadius: 10, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", cursor: "pointer", fontSize: 22, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
            <input type="number" inputMode="decimal" min="0" step={ins_i.step} placeholder="0" value={ins[ins_i.id]} onChange={e => setIns(p => ({ ...p, [ins_i.id]: e.target.value }))}
              style={{ width: 70, textAlign: "center", padding: "10px 4px", borderRadius: 10, border: `1.5px solid ${over ? "#F09595" : "var(--color-border-secondary)"}`, background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontSize: 18, fontWeight: 600 }} />
            <button onClick={() => setIns(p => ({ ...p, [ins_i.id]: Math.min(disp, (parseFloat(p[ins_i.id]) || 0) + ins_i.step).toString() }))}
              style={{ width: 44, height: 44, borderRadius: 10, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", cursor: "pointer", fontSize: 22, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
          </div>
        </div>;
      })}

      {costo > 0 && <div style={{ background: "#E6F1FB", borderRadius: 12, padding: "14px 18px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 15, color: "#0C447C" }}>Costo de esta entrega</span>
        <span style={{ fontSize: 20, fontWeight: 700, color: "#0C447C" }}>{P(costo)}</span>
      </div>}

      <Sec mt={8}>¿Hubo algún problema?</Sec>
      <div style={{ background: "var(--color-background-primary)", borderRadius: 14, border: `2px solid ${falla ? "#F09595" : "var(--color-border-tertiary)"}`, padding: "16px", marginBottom: falla ? 10 : 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: 24 }}>⚠️</span>
          <div style={{ flex: 1, fontSize: 16, fontWeight: 600 }}>Falla en la máquina</div>
          <button onClick={() => setFalla(p => !p)} style={{ padding: "10px 20px", borderRadius: 10, border: "none", cursor: "pointer", fontSize: 15, fontWeight: 600, background: falla ? "#FCEBEB" : "var(--color-background-secondary)", color: falla ? "#A32D2D" : "var(--color-text-secondary)" }}>{falla ? "Sí" : "No"}</button>
        </div>
      </div>
      {falla && <textarea placeholder="Describí el problema…" value={detF} onChange={e => setDetF(e.target.value)} style={{ width: "100%", borderRadius: 12, border: "2px solid #F09595", padding: "14px", fontSize: 16, color: "var(--color-text-primary)", background: "var(--color-background-primary)", resize: "none", height: 90, marginBottom: 20, boxSizing: "border-box" }} />}

      <Sec>Observaciones (opcional)</Sec>
      <textarea placeholder="Notas libres…" value={obs} onChange={e => setObs(e.target.value)} style={{ width: "100%", borderRadius: 12, border: "0.5px solid var(--color-border-tertiary)", padding: "14px", fontSize: 16, color: "var(--color-text-primary)", background: "var(--color-background-primary)", resize: "none", height: 90, marginBottom: 20, boxSizing: "border-box" }} />

      {err && <div style={{ background: "#FCEBEB", borderRadius: 12, padding: "14px 16px", marginBottom: 16, fontSize: 15, color: "#A32D2D" }}>{err}</div>}
      <button onClick={guardar} disabled={saving} style={{ width: "100%", padding: 18, borderRadius: 14, border: "none", background: saving ? "#888" : "#185FA5", color: "#fff", fontSize: 18, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}>
        {saving ? "Guardando…" : "✓ Guardar visita"}
      </button>
    </div>
  </div>;
}

function FormCobro({ cliente, precioServ, visitas, cobros, saving, onGuardar, onBack }) {
  const [monto, setMonto] = useState(""); const [medio, setMedio] = useState("transferencia");
  const [nota, setNota] = useState(""); const [err, setErr] = useState("");
  const [archivo, setArchivo] = useState(null); const [preview, setPreview] = useState(null);
  const [subiendo, setSubiendo] = useState(false);

  const servReales = visitas.reduce((s, v) => { const porContador = Math.max(0, (v.contador || 0) - (v.contadorAnterior || 0)); const porManual = v.serviciosManuales || 0; return s + (porManual > 0 ? porManual : porContador); }, 0);
  const servFact = Math.max(cliente.minimo, servReales), totalFact = servFact * precioServ;
  const totalCob = cobros.reduce((s, c) => s + c.monto, 0), saldo = totalFact - totalCob;

  function handleArchivo(e) {
    const f = e.target.files[0]; if (!f) return; setArchivo(f);
    const reader = new FileReader(); reader.onload = ev => setPreview(ev.target.result); reader.readAsDataURL(f);
  }
  async function guardar() {
    if (!monto || parseFloat(monto) <= 0) { setErr("Ingresá un monto válido."); return; }
    setErr(""); setSubiendo(true);
    let comprobanteUrl = null;
    if (archivo) { try { comprobanteUrl = await subirComprobante(archivo); } catch (e) { setErr("Error al subir el comprobante."); setSubiendo(false); return; } }
    setSubiendo(false);
    onGuardar({ clienteId: cliente.id, monto: parseFloat(monto), medio, nota, comprobanteUrl });
  }
  const isSaving = saving || subiendo;

  return <div style={{ minHeight: "100vh", background: "var(--color-background-tertiary)", maxWidth: 520, margin: "0 auto" }}>
    <div style={{ background: "var(--color-background-primary)", borderBottom: "0.5px solid var(--color-border-tertiary)", padding: "16px 20px", display: "flex", alignItems: "center", gap: 14, position: "sticky", top: 0, zIndex: 10 }}>
      <button onClick={onBack} style={{ fontSize: 28, background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", padding: "0 4px" }}>←</button>
      <div>
        <div style={{ fontSize: 18, fontWeight: 700 }}>{cliente.nombre}</div>
        <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 2 }}>Registrar cobro · {FF(hoy())}</div>
      </div>
    </div>
    <div style={{ padding: "16px 16px 40px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
        <Met label="A cobrar" value={P(totalFact)} sub={`${servFact} serv.`} />
        <Met label="Cobrado"  value={P(totalCob)}  sub={`${cobros.length} pagos`} />
        <Met label="Saldo"    value={P(saldo)}     sub="" warn={saldo > 0} />
      </div>

      {cobros.length > 0 && <><Sec>Cobros anteriores</Sec>
        {cobros.map(c => { const mp = MEDIOS_PAGO.find(m => m.id === c.medio);
          return <div key={c.id} style={{ background: "var(--color-background-primary)", borderRadius: 12, border: "0.5px solid var(--color-border-tertiary)", padding: "14px 16px", marginBottom: 8, display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 24 }}>{mp?.emoji}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{P(c.monto)}</div>
              <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 2 }}>{mp?.label} · {FF(c.fecha)}{c.nota ? ` · ${c.nota}` : ""}</div>
            </div>
            {c.comprobanteUrl && <a href={c.comprobanteUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: "#185FA5", textDecoration: "none", background: "#E6F1FB", padding: "6px 12px", borderRadius: 8 }}>📎 Ver</a>}
          </div>; })}
      </>}

      <Sec mt={8}>Nuevo cobro</Sec>
      <Card style={{ marginBottom: 16 }}>
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 14, color: "var(--color-text-secondary)", marginBottom: 8 }}>Monto cobrado</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 24, fontWeight: 700, color: "var(--color-text-secondary)" }}>$</span>
            <input type="number" inputMode="numeric" min="0" placeholder="0" value={monto} onChange={e => setMonto(e.target.value)} style={{ flex: 1, padding: "16px", borderRadius: 12, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontSize: 28, fontWeight: 700 }} />
          </div>
          {saldo > 0 && <button onClick={() => setMonto(saldo.toString())} style={{ marginTop: 10, fontSize: 14, color: "#185FA5", background: "#E6F1FB", border: "none", cursor: "pointer", padding: "8px 16px", borderRadius: 8, fontWeight: 500 }}>Cargar saldo pendiente ({P(saldo)})</button>}
        </div>

        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 14, color: "var(--color-text-secondary)", marginBottom: 10 }}>Medio de pago</div>
          <div style={{ display: "flex", gap: 12 }}>
            {MEDIOS_PAGO.map(m => <button key={m.id} onClick={() => setMedio(m.id)} style={{ flex: 1, padding: "16px", borderRadius: 12, border: `3px solid ${medio === m.id ? "#185FA5" : "var(--color-border-tertiary)"}`, background: medio === m.id ? "#E6F1FB" : "var(--color-background-primary)", color: medio === m.id ? "#0C447C" : "var(--color-text-secondary)", cursor: "pointer", fontSize: 16, fontWeight: medio === m.id ? 700 : 400, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <span style={{ fontSize: 24 }}>{m.emoji}</span>{m.label}
            </button>)}
          </div>
        </div>

        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 14, color: "var(--color-text-secondary)", marginBottom: 8 }}>Nota (opcional)</div>
          <input placeholder="Ej: número de transferencia…" value={nota} onChange={e => setNota(e.target.value)} style={{ width: "100%", padding: "14px", borderRadius: 10, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontSize: 16, boxSizing: "border-box" }} />
        </div>

        <div>
          <div style={{ fontSize: 14, color: "var(--color-text-secondary)", marginBottom: 10 }}>Comprobante (opcional)</div>
          {!preview
            ? <label style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px", borderRadius: 12, border: "2px dashed var(--color-border-secondary)", cursor: "pointer", background: "var(--color-background-secondary)" }}>
                <span style={{ fontSize: 28 }}>📎</span>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text-primary)" }}>Adjuntar imagen</div>
                  <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 2 }}>Foto del comprobante</div>
                </div>
                <input type="file" accept="image/*" capture="environment" onChange={handleArchivo} style={{ display: "none" }} />
              </label>
            : <div style={{ position: "relative" }}>
                <img src={preview} alt="comprobante" style={{ width: "100%", borderRadius: 12, maxHeight: 220, objectFit: "cover", border: "0.5px solid var(--color-border-tertiary)" }} />
                <button onClick={() => { setArchivo(null); setPreview(null); }} style={{ position: "absolute", top: 10, right: 10, width: 36, height: 36, borderRadius: "50%", border: "none", background: "rgba(0,0,0,0.6)", color: "#fff", cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
                <div style={{ marginTop: 8, fontSize: 13, color: "#1D9E75" }}>✓ {archivo?.name}</div>
              </div>}
        </div>
      </Card>

      {err && <div style={{ background: "#FCEBEB", borderRadius: 12, padding: "14px 16px", marginBottom: 16, fontSize: 15, color: "#A32D2D" }}>{err}</div>}
      <button onClick={guardar} disabled={isSaving} style={{ width: "100%", padding: 18, borderRadius: 14, border: "none", background: isSaving ? "#888" : "#1D9E75", color: "#fff", fontSize: 18, fontWeight: 700, cursor: isSaving ? "not-allowed" : "pointer" }}>
        {subiendo ? "Subiendo comprobante…" : saving ? "Guardando…" : "✓ Registrar cobro"}
      </button>
    </div>
  </div>;
}

function AdminApp({ db, onLogout }) {
  const [tab, setTab] = useState("facturacion"); const [detalle, setDetalle] = useState(null);
  const tabs = [{ id: "facturacion", l: "Facturación" }, { id: "deposito", l: "Depósito" }, { id: "operador", l: "Operador" }, { id: "clientes", l: "Clientes" }, { id: "config", l: "Config" }];
  const totIng = sumar(db.ingresosDepo), totOp = sumar(db.entregasOp), totCli = sumar(db.visitas);
  const stockDepo = Object.fromEntries(INSUMOS.map(i => [i.id, Math.max(0, (totIng[i.id] || 0) - (totOp[i.id] || 0))]));
  const stockOp   = Object.fromEntries(INSUMOS.map(i => [i.id, Math.max(0, (totOp[i.id] || 0) - (totCli[i.id] || 0))]));
  const alertasStock = INSUMOS.filter(i => (db.alertasStock[i.id] || 0) > 0 && (stockDepo[i.id] || 0) <= (db.alertasStock[i.id] || 0));
  const diasAlerta = db.diasAlerta || DIAS_ALERTA_DEF;
  const clientesSinVisita = db.clientes.filter(c => { const uv = db.visitas.find(v => v.clienteId === c.id); return uv ? diasDesde(uv.fecha) >= diasAlerta : true; });
  const pendientes = db.clientesPendientes || [];
  return <div style={{ minHeight: "100vh", background: "var(--color-background-tertiary)" }}>
    <div style={{ background: "var(--color-background-primary)", borderBottom: "0.5px solid var(--color-border-tertiary)", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 10 }}>
      <div>
        <div style={{ fontSize: 15, fontWeight: 600 }}>☕ CaféVending · Admin
          {(alertasStock.length + clientesSinVisita.length + pendientes.length) > 0 && <span style={{ marginLeft: 8, fontSize: 11, background: "#E24B4A", color: "#fff", padding: "2px 8px", borderRadius: 20, fontWeight: 500 }}>⚠ {alertasStock.length + clientesSinVisita.length + pendientes.length}</span>}
        </div>
        <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{db.clientes.length} clientes · 60 máquinas</div>
      </div>
      <button onClick={onLogout} style={{ fontSize: 12, color: "var(--color-text-secondary)", background: "none", border: "none", cursor: "pointer" }}>Salir</button>
    </div>
    {pendientes.length > 0 && <div style={{ background: "#E1F5EE", borderBottom: "0.5px solid #1D9E75", padding: "10px 20px" }}>
      <div style={{ fontSize: 12, fontWeight: 500, color: "#085041", marginBottom: 8 }}>🆕 Clientes propuestos por el operador</div>
      {pendientes.map(c => <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, background: "#fff", borderRadius: 8, padding: "8px 12px" }}>
        <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 500 }}>{c.nombre}</div><div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{c.direccion} · {c.maquinas} máq.</div></div>
        <button onClick={() => db.aprobarCliente(c.id)} style={{ padding: "5px 12px", borderRadius: 8, border: "none", background: "#1D9E75", color: "#fff", fontSize: 12, fontWeight: 500, cursor: "pointer" }}>Aprobar</button>
        <button onClick={() => db.rechazarCliente(c.id)} style={{ padding: "5px 12px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", color: "var(--color-text-secondary)", fontSize: 12, cursor: "pointer" }}>Rechazar</button>
      </div>)}
    </div>}
    {alertasStock.length > 0 && <div style={{ background: "#FCEBEB", borderBottom: "0.5px solid var(--color-border-danger)", padding: "10px 20px" }}>
      <div style={{ fontSize: 12, fontWeight: 500, color: "#A32D2D", marginBottom: 6 }}>⚠ Stock bajo en depósito</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{alertasStock.map(i => <span key={i.id} style={{ fontSize: 11, background: "#fff", border: "0.5px solid var(--color-border-danger)", color: "#A32D2D", padding: "3px 10px", borderRadius: 20 }}>{i.emoji} {i.label}: {FN(stockDepo[i.id] || 0)} {i.unit}</span>)}</div>
    </div>}
    {clientesSinVisita.length > 0 && <div style={{ background: "#FAEEDA", borderBottom: "0.5px solid var(--color-border-warning)", padding: "10px 20px" }}>
      <div style={{ fontSize: 12, fontWeight: 500, color: "#633806", marginBottom: 6 }}>📅 Clientes sin visita hace +{diasAlerta} días</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{clientesSinVisita.map(c => { const uv = db.visitas.find(v => v.clienteId === c.id); return <span key={c.id} style={{ fontSize: 11, background: "#fff", border: "0.5px solid #BA7517", color: "#633806", padding: "3px 10px", borderRadius: 20 }}>{c.nombre} {uv ? `(${diasDesde(uv.fecha)}d)` : "(sin visitas)"}</span>; })}</div>
    </div>}
    <div style={{ display: "flex", borderBottom: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-primary)", overflowX: "auto" }}>
      {tabs.map(t => <button key={t.id} onClick={() => { setTab(t.id); setDetalle(null); }} style={{ padding: "10px 16px", border: "none", background: "none", cursor: "pointer", fontSize: 13, whiteSpace: "nowrap", color: tab === t.id ? "#185FA5" : "var(--color-text-secondary)", borderBottom: tab === t.id ? "2px solid #185FA5" : "2px solid transparent", fontWeight: tab === t.id ? 500 : 400 }}>{t.l}</button>)}
    </div>
    <div style={{ padding: 16, maxWidth: 900, margin: "0 auto" }}>
      {tab === "facturacion" && <TabFact db={db} />}
      {tab === "deposito"    && <TabDepo db={db} stockDepo={stockDepo} stockOp={stockOp} alertasStock={db.alertasStock} />}
      {tab === "operador"    && <TabOp   db={db} stockOp={stockOp} stockDepo={stockDepo} />}
      {tab === "clientes"    && !detalle && <TabCli db={db} onSelect={setDetalle} diasAlerta={diasAlerta} />}
      {tab === "clientes"    && detalle  && <DetalleCli cliente={detalle} db={db} onBack={() => setDetalle(null)} />}
      {tab === "config"      && <TabCfg  db={db} />}
    </div>
  </div>;
}

function TabFact({ db }) {
  const px = db.precioServ;
  const resumen = db.clientes.map(c => {
    const vs = db.visitas.filter(v => v.clienteId === c.id), cs = db.cobros.filter(co => co.clienteId === c.id);
    const sR = vs.reduce((s, v) => s + serviciosDeVisita(v), 0), sF = Math.max(c.minimo, sR), fat = sF * px;
    const cI = vs.reduce((s, v) => s + costoIns(v.insumos, db.preciosIns), 0);
    const cob = cs.reduce((s, c) => s + c.monto, 0), gan = fat - cI, mar = fat > 0 ? (gan / fat) * 100 : 0;
    const costoPorCafe = sR > 0 ? cI / sR : null;
    return { ...c, sR, sF, fat, cI, cob, saldo: fat - cob, gan, mar, totalCafes: sR, costoPorCafe };
  }).sort((a, b) => b.gan - a.gan);
  const tF = resumen.reduce((s, r) => s + r.fat, 0), tC = resumen.reduce((s, r) => s + r.cI, 0);
  const tG = tF - tC, tCob = resumen.reduce((s, r) => s + r.cob, 0);
  const totalCafesGlobal = resumen.reduce((s, r) => s + r.totalCafes, 0);
  const costoPorCafeGlobal = totalCafesGlobal > 0 ? tC / totalCafesGlobal : null;
  const mejor = resumen[0], peor = resumen[resumen.length - 1];
  return <div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 10, marginBottom: 20 }}>
      <Met label="Facturación total" value={P(tF)} sub="a cobrar" />
      <Met label="Cobrado"           value={P(tCob)} sub={`${db.cobros.length} pagos`} />
      <Met label="Saldo pendiente"   value={P(tF - tCob)} sub="" warn={(tF - tCob) > 0} />
      <Met label="Ganancia bruta"    value={P(tG)} sub={`${tF > 0 ? ((tG / tF) * 100).toFixed(1) : 0}% margen`} />
    </div>
    {costoPorCafeGlobal !== null && <div style={{ background: "#E6F1FB", borderRadius: 12, padding: "12px 16px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div><div style={{ fontSize: 12, fontWeight: 500, color: "#0C447C" }}>☕ Costo promedio por café servido</div><div style={{ fontSize: 11, color: "#185FA5", marginTop: 2 }}>{totalCafesGlobal.toLocaleString()} servicios registrados</div></div>
      <div style={{ fontSize: 24, fontWeight: 700, color: "#0C447C" }}>{P(costoPorCafeGlobal)}</div>
    </div>}
    {resumen.length >= 2 && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
      <div style={{ background: "#EAF3DE", borderRadius: 12, padding: "12px 14px" }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: "#3B6D11", marginBottom: 6, textTransform: "uppercase" }}>Mejor cliente</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#27500A" }}>{mejor?.nombre}</div>
        <div style={{ fontSize: 13, color: "#3B6D11", marginTop: 4 }}>{P(mejor?.gan || 0)} · {mejor?.mar.toFixed(1)}%</div>
      </div>
      <div style={{ background: "#FCEBEB", borderRadius: 12, padding: "12px 14px" }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: "#A32D2D", marginBottom: 6, textTransform: "uppercase" }}>Peor cliente</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#791F1F" }}>{peor?.nombre}</div>
        <div style={{ fontSize: 13, color: "#A32D2D", marginTop: 4 }}>{P(peor?.gan || 0)} · {peor?.sR} servicios</div>
      </div>
    </div>}
    <Sec>Ranking de clientes</Sec>
    {resumen.map((r, idx) => {
      const isW = idx === 0, isL = idx === resumen.length - 1;
      return <div key={r.id} style={{ background: isW ? "#EAF3DE" : isL ? "#FCEBEB" : "var(--color-background-primary)", borderRadius: 12, border: "0.5px solid var(--color-border-tertiary)", padding: "12px 14px", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text-secondary)", width: 20, textAlign: "center" }}>{idx + 1}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 500 }}>{r.nombre}</div>
            <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>mín {r.minimo} · {r.maquinas} máq.{r.costoPorCafe !== null ? <span style={{ color: "#185FA5" }}> · {P(r.costoPorCafe)}/café</span> : ""}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: isW ? "#27500A" : isL ? "#A32D2D" : "var(--color-text-primary)" }}>{P(r.gan)}</div>
            <div style={{ fontSize: 11, color: r.mar > 60 ? "#27500A" : r.mar > 30 ? "#185FA5" : "#A32D2D" }}>{r.mar.toFixed(1)}% margen</div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 5 }}>
          {[["Servicios", r.sR.toLocaleString()], ["Facturar", r.sF.toLocaleString()], ["Facturado", P(r.fat)], ["Cobrado", P(r.cob)], ["Saldo", P(r.saldo)], ["$/café", r.costoPorCafe !== null ? P(r.costoPorCafe) : "—"]].map(([l, v], j) => (
            <div key={j} style={{ background: "rgba(0,0,0,0.04)", borderRadius: 7, padding: "5px 6px", textAlign: "center" }}>
              <div style={{ fontSize: 9, color: "var(--color-text-secondary)" }}>{l}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: l === "Saldo" && r.saldo > 0 ? "#A32D2D" : l === "$/café" ? "#185FA5" : "var(--color-text-primary)" }}>{v}</div>
            </div>
          ))}
        </div>
        {r.sR < r.minimo && <div style={{ marginTop: 6, background: "#FAEEDA", borderRadius: 7, padding: "5px 10px", fontSize: 11, color: "#633806" }}>⚠ Consumió {r.sR} de {r.minimo} mínimo — se factura el mínimo</div>}
        {r.saldo > 0 && <div style={{ marginTop: 4, background: "#FCEBEB", borderRadius: 7, padding: "5px 10px", fontSize: 11, color: "#A32D2D" }}>💰 Saldo pendiente: {P(r.saldo)}</div>}
      </div>;
    })}
  </div>;
}

function TabDepo({ db, stockDepo, stockOp, alertasStock }) {
  const [show, setShow] = useState(false), [form, setForm] = useState(emptyIns()), [nota, setNota] = useState(""), [saving, setSaving] = useState(false), [ok, setOk] = useState(false);
  const valorDepo = INSUMOS.reduce((t, i) => t + (stockDepo[i.id] || 0) * (db.preciosIns[i.id] || 0), 0);
  const valorOp   = INSUMOS.reduce((t, i) => t + (stockOp[i.id] || 0) * (db.preciosIns[i.id] || 0), 0);
  async function add() {
    setSaving(true); const ins = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, parseFloat(v) || 0]));
    await db.addIngresoDepo({ insumos: ins, nota }); setForm(emptyIns()); setNota(""); setShow(false); setSaving(false); setOk(true); setTimeout(() => setOk(false), 2500);
  }
  return <div>
    {ok && <div style={{ background: "#EAF3DE", borderRadius: 10, padding: "10px 14px", marginBottom: 12, fontSize: 13, color: "#27500A" }}>✓ Ingreso registrado.</div>}
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 10, marginBottom: 20 }}>
      <Met label="Valor en depósito"  value={P(valorDepo)} sub="disponible" />
      <Met label="Valor con operador" value={P(valorOp)}   sub="en calle" />
      <Met label="Inventario total"   value={P(valorDepo + valorOp)} sub="total" />
    </div>
    <Sec>Detalle del inventario</Sec>
    <Card style={{ marginBottom: 20 }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead><tr style={{ borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
            {["Insumo","Precio unit.","Depósito","Valor depo.","Operador","Valor op.","Total $"].map(h => <th key={h} style={{ padding: "6px 8px", textAlign: h==="Insumo"?"left":"right", fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>{h}</th>)}
          </tr></thead>
          <tbody>{INSUMOS.map(i => { const vd=(stockDepo[i.id]||0)*(db.preciosIns[i.id]||0),vo=(stockOp[i.id]||0)*(db.preciosIns[i.id]||0),alerta=(alertasStock[i.id]||0)>0&&(stockDepo[i.id]||0)<=(alertasStock[i.id]||0);
            return <tr key={i.id} style={{ borderBottom: "0.5px solid var(--color-border-tertiary)", background: alerta?"#FCEBEB":"transparent" }}>
              <td style={{ padding:"7px 8px" }}>{i.emoji} {i.label}{alerta?" ⚠":""}</td>
              <td style={{ padding:"7px 8px",textAlign:"right",color:"var(--color-text-secondary)" }}>{P(db.preciosIns[i.id]||0)}</td>
              <td style={{ padding:"7px 8px",textAlign:"right",color:alerta?"#A32D2D":"var(--color-text-primary)",fontWeight:alerta?600:400 }}>{FN(stockDepo[i.id]||0)} {i.unit}</td>
              <td style={{ padding:"7px 8px",textAlign:"right",color:"#185FA5" }}>{P(vd)}</td>
              <td style={{ padding:"7px 8px",textAlign:"right" }}>{FN(stockOp[i.id]||0)} {i.unit}</td>
              <td style={{ padding:"7px 8px",textAlign:"right",color:"#185FA5" }}>{P(vo)}</td>
              <td style={{ padding:"7px 8px",textAlign:"right",fontWeight:600 }}>{P(vd+vo)}</td>
            </tr>; })}</tbody>
          <tfoot><tr style={{ borderTop:"1px solid var(--color-border-primary)",background:"var(--color-background-secondary)" }}>
            <td colSpan={3} style={{ padding:"7px 8px",fontWeight:600 }}>TOTAL</td>
            <td style={{ padding:"7px 8px",textAlign:"right",fontWeight:700,color:"#185FA5" }}>{P(valorDepo)}</td><td></td>
            <td style={{ padding:"7px 8px",textAlign:"right",fontWeight:700,color:"#185FA5" }}>{P(valorOp)}</td>
            <td style={{ padding:"7px 8px",textAlign:"right",fontWeight:700,fontSize:14 }}>{P(valorDepo+valorOp)}</td>
          </tr></tfoot>
        </table>
      </div>
    </Card>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
      {[["🏭 Depósito", stockDepo], ["🚚 Operador", stockOp]].map(([label, stock]) => (
        <Card key={label}>
          <div style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 10, textTransform: "uppercase", letterSpacing: ".05em" }}>{label}</div>
          {INSUMOS.map(i => { const alerta = label.includes("Depósito") && (alertasStock[i.id]||0)>0 && (stock[i.id]||0)<=(alertasStock[i.id]||0);
            return <div key={i.id} style={{ display:"flex",justifyContent:"space-between",fontSize:13,padding:"4px 0",borderBottom:"0.5px solid var(--color-border-tertiary)" }}>
              <span style={{ color:"var(--color-text-secondary)" }}>{i.emoji} {i.label}</span>
              <span style={{ fontWeight:500,color:alerta?"#E24B4A":stock[i.id]===0?"var(--color-text-tertiary)":"var(--color-text-primary)" }}>{FN(stock[i.id])} {i.unit}{alerta?" ⚠":""}</span>
            </div>; })}
        </Card>
      ))}
    </div>
    <button onClick={() => setShow(p => !p)} style={{ width:"100%",padding:11,borderRadius:10,border:"0.5px solid var(--color-border-secondary)",background:"var(--color-background-primary)",color:"#185FA5",fontSize:13,fontWeight:500,cursor:"pointer",marginBottom:12 }}>{show?"Cancelar":"+ Registrar compra"}</button>
    {show && <Card style={{ marginBottom:16 }}>
      {INSUMOS.map(i => <div key={i.id} style={{ display:"flex",alignItems:"center",gap:10,marginBottom:8 }}>
        <span style={{ fontSize:14,width:20 }}>{i.emoji}</span><div style={{ flex:1,fontSize:13,color:"var(--color-text-secondary)" }}>{i.label}</div>
        <input type="number" min="0" step={i.step} placeholder="0" value={form[i.id]} onChange={e=>setForm(p=>({...p,[i.id]:e.target.value}))} style={{ width:90,textAlign:"right",padding:"6px 8px",borderRadius:8,border:"0.5px solid var(--color-border-secondary)",background:"var(--color-background-primary)",color:"var(--color-text-primary)",fontSize:13 }} />
        <span style={{ fontSize:11,color:"var(--color-text-secondary)",width:30 }}>{i.unit}</span>
      </div>)}
      <input placeholder="Nota" value={nota} onChange={e=>setNota(e.target.value)} style={{ width:"100%",padding:"8px 10px",borderRadius:8,border:"0.5px solid var(--color-border-secondary)",background:"var(--color-background-primary)",color:"var(--color-text-primary)",fontSize:13,marginTop:4,marginBottom:12,boxSizing:"border-box" }} />
      <button onClick={add} disabled={saving} style={{ padding:"10px 20px",borderRadius:9,border:"none",background:saving?"#888":"#185FA5",color:"#fff",fontSize:13,fontWeight:500,cursor:"pointer" }}>{saving?"Guardando…":"Registrar ingreso"}</button>
    </Card>}
    <Sec mt={20}>Historial de ingresos</Sec>
    {db.ingresosDepo.map(ing => <Card key={ing.id} style={{ marginBottom:8 }}>
      <div style={{ display:"flex",justifyContent:"space-between",marginBottom:6 }}><span style={{ fontSize:13,fontWeight:500 }}>{FF(ing.fecha)}</span>{ing.nota&&<span style={{ fontSize:12,color:"var(--color-text-secondary)" }}>{ing.nota}</span>}</div>
      <div style={{ display:"flex",flexWrap:"wrap",gap:6 }}>{INSUMOS.filter(i=>(ing.insumos[i.id]||0)>0).map(i=><Pill key={i.id}>{i.emoji} {FN(ing.insumos[i.id])} {i.unit}</Pill>)}</div>
    </Card>)}
  </div>;
}

function TabOp({ db, stockOp, stockDepo }) {
  const [show,setShow]=useState(false),[form,setForm]=useState(emptyIns()),[nota,setNota]=useState(""),[fechaEntrega,setFechaEntrega]=useState(hoy()),[saving,setSaving]=useState(false),[ok,setOk]=useState(false),[errs,setErrs]=useState({});
  const [editandoEntrega,setEditandoEntrega]=useState(null),[confirmElim,setConfirmElim]=useState(null),[savingEdit,setSavingEdit]=useState(false);
  const formNum=Object.fromEntries(Object.entries(form).map(([k,v])=>[k,parseFloat(v)||0]));
  const costoRetiro=costoIns(formNum,db.preciosIns);
  const comisionPorServ = db.comisionOp || 0;
  const totalServiciosGlobal = db.visitas.reduce((s, v) => s + serviciosDeVisita(v), 0);
  const totalComision = totalServiciosGlobal * comisionPorServ;

  async function entregar() {
    const ins=Object.fromEntries(Object.entries(form).map(([k,v])=>[k,parseFloat(v)||0]));
    const e={}; INSUMOS.forEach(i=>{if(ins[i.id]>(stockDepo[i.id]||0))e[i.id]=true;});
    if(Object.keys(e).length){setErrs(e);return;}
    setErrs({});setSaving(true);await db.addEntregaOp({insumos:ins,nota,fecha:fechaEntrega});
    setForm(emptyIns());setNota("");setFechaEntrega(hoy());setShow(false);setSaving(false);setOk(true);setTimeout(()=>setOk(false),2500);
  }

  async function guardarEdicion() {
    setSavingEdit(true);
    const ins=Object.fromEntries(Object.entries(editandoEntrega.insumos).map(([k,v])=>[k,parseFloat(v)||0]));
    await sb.from("entregas_operador").update({ insumos: ins, nota: editandoEntrega.nota }).eq("id", editandoEntrega.id);
    await db.reload(); setSavingEdit(false); setEditandoEntrega(null);
  }

  async function eliminarEntrega(id) {
    await sb.from("entregas_operador").delete().eq("id", id);
    await db.reload(); setConfirmElim(null);
  }

  const entregasOrdenadas = db.entregasOp.slice().sort((a,b) => b.fecha.localeCompare(a.fecha));

  return <div>
    {confirmElim && <ConfirmModal title="Eliminar entrega" msg={`¿Eliminar la entrega del ${FF(confirmElim.fecha)}? Esto afectará el stock del operador.`} onConfirm={() => eliminarEntrega(confirmElim.id)} onCancel={() => setConfirmElim(null)} />}
    {ok&&<div style={{ background:"#EAF3DE",borderRadius:10,padding:"10px 14px",marginBottom:12,fontSize:13,color:"#27500A" }}>✓ Entrega registrada.</div>}
    {comisionPorServ > 0 && <div style={{ background:"#E6F1FB",borderRadius:12,padding:"14px 16px",marginBottom:16 }}>
      <div style={{ fontSize:12,fontWeight:500,color:"#0C447C",marginBottom:10,textTransform:"uppercase",letterSpacing:".05em" }}>💰 Comisión del operador</div>
      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8 }}>
        <div style={{ background:"#fff",borderRadius:8,padding:"10px 12px",textAlign:"center" }}><div style={{ fontSize:10,color:"#185FA5" }}>Servicios totales</div><div style={{ fontSize:18,fontWeight:700,color:"#0C447C" }}>{totalServiciosGlobal.toLocaleString("es-AR")}</div></div>
        <div style={{ background:"#fff",borderRadius:8,padding:"10px 12px",textAlign:"center" }}><div style={{ fontSize:10,color:"#185FA5" }}>Por servicio</div><div style={{ fontSize:18,fontWeight:700,color:"#0C447C" }}>{P(comisionPorServ)}</div></div>
        <div style={{ background:"#fff",borderRadius:8,padding:"10px 12px",textAlign:"center" }}><div style={{ fontSize:10,color:"#185FA5" }}>Total a pagar</div><div style={{ fontSize:18,fontWeight:700,color:"#27500A" }}>{P(totalComision)}</div></div>
      </div>
    </div>}
    <Card style={{ marginBottom:16 }}>
      <div style={{ fontSize:11,fontWeight:500,color:"var(--color-text-secondary)",marginBottom:10,textTransform:"uppercase",letterSpacing:".05em" }}>🚚 Insumos del operador ahora</div>
      {INSUMOS.every(i=>stockOp[i.id]===0)?<div style={{ fontSize:12,color:"var(--color-text-secondary)",fontStyle:"italic" }}>Sin insumos actualmente.</div>
        :<>{INSUMOS.map(i=><div key={i.id} style={{ display:"flex",justifyContent:"space-between",fontSize:13,padding:"4px 0",borderBottom:"0.5px solid var(--color-border-tertiary)" }}>
          <span style={{ color:"var(--color-text-secondary)" }}>{i.emoji} {i.label}</span>
          <div style={{ display:"flex",gap:10 }}><span style={{ fontSize:11,color:"var(--color-text-tertiary)" }}>{P((stockOp[i.id]||0)*(db.preciosIns[i.id]||0))}</span><span style={{ fontWeight:500 }}>{FN(stockOp[i.id])} {i.unit}</span></div>
        </div>)}
        <div style={{ display:"flex",justifyContent:"space-between",fontSize:13,fontWeight:700,paddingTop:8,marginTop:4,borderTop:"0.5px solid var(--color-border-tertiary)" }}>
          <span>Valor total en mano</span><span style={{ color:"#185FA5" }}>{P(costoIns(stockOp,db.preciosIns))}</span>
        </div></>}
    </Card>
    <button onClick={()=>setShow(p=>!p)} style={{ width:"100%",padding:11,borderRadius:10,border:"0.5px solid var(--color-border-secondary)",background:"var(--color-background-primary)",color:"#185FA5",fontSize:13,fontWeight:500,cursor:"pointer",marginBottom:12 }}>{show?"Cancelar":"+ Registrar entrega al operador"}</button>
    {show&&<Card style={{ marginBottom:16 }}>
      <div style={{ fontSize:13,fontWeight:500,marginBottom:12 }}>Descuenta del depósito → pasa al operador.</div>
      <div style={{ marginBottom:12 }}>
        <div style={{ fontSize:13,color:"var(--color-text-secondary)",marginBottom:4 }}>Fecha de entrega</div>
        <input type="date" value={fechaEntrega} onChange={e=>setFechaEntrega(e.target.value)} style={{ width:"100%",padding:"8px 10px",borderRadius:8,border:"0.5px solid var(--color-border-secondary)",background:"var(--color-background-primary)",color:"var(--color-text-primary)",fontSize:13,boxSizing:"border-box" }} />
      </div>
      {INSUMOS.map(i=><div key={i.id} style={{ display:"flex",alignItems:"center",gap:10,marginBottom:8 }}>
        <span style={{ fontSize:14,width:20 }}>{i.emoji}</span>
        <div style={{ flex:1 }}><div style={{ fontSize:13,color:"var(--color-text-secondary)" }}>{i.label}</div><div style={{ fontSize:11,color:(stockDepo[i.id]||0)===0?"#A32D2D":"var(--color-text-tertiary)" }}>Depósito: {FN(stockDepo[i.id]||0)} {i.unit}</div></div>
        <input type="number" min="0" step={i.step} placeholder="0" value={form[i.id]} onChange={e=>setForm(p=>({...p,[i.id]:e.target.value}))} style={{ width:90,textAlign:"right",padding:"6px 8px",borderRadius:8,border:`0.5px solid ${errs[i.id]?"var(--color-border-danger)":"var(--color-border-secondary)"}`,background:"var(--color-background-primary)",color:"var(--color-text-primary)",fontSize:13 }} />
        <span style={{ fontSize:11,color:"var(--color-text-secondary)",width:30 }}>{i.unit}</span>
      </div>)}
      {costoRetiro>0&&<div style={{ background:"#E6F1FB",borderRadius:8,padding:"8px 12px",margin:"8px 0",display:"flex",justifyContent:"space-between" }}>
        <span style={{ fontSize:12,color:"#0C447C" }}>Costo de este retiro</span><span style={{ fontSize:15,fontWeight:700,color:"#0C447C" }}>{P(costoRetiro)}</span>
      </div>}
      {Object.keys(errs).length>0&&<div style={{ fontSize:12,color:"#A32D2D",marginBottom:10 }}>Algunas cantidades superan el stock disponible.</div>}
      <input placeholder="Nota opcional" value={nota} onChange={e=>setNota(e.target.value)} style={{ width:"100%",padding:"8px 10px",borderRadius:8,border:"0.5px solid var(--color-border-secondary)",background:"var(--color-background-primary)",color:"var(--color-text-primary)",fontSize:13,marginTop:4,marginBottom:12,boxSizing:"border-box" }} />
      <button onClick={entregar} disabled={saving} style={{ padding:"10px 20px",borderRadius:9,border:"none",background:saving?"#888":"#185FA5",color:"#fff",fontSize:13,fontWeight:500,cursor:"pointer" }}>{saving?"Guardando…":"Confirmar entrega"}</button>
    </Card>}
    <Sec mt={20}>Historial entregas al operador</Sec>
    {entregasOrdenadas.map((e) => {
      const costoE = costoIns(e.insumos, db.preciosIns);
      const estaEditando = editandoEntrega?.id === e.id;
      if (estaEditando) {
        return <Card key={e.id} style={{ marginBottom:8, border:"1.5px solid #185FA5" }}>
          <div style={{ fontSize:13,fontWeight:600,marginBottom:12 }}>✏️ Editando entrega del {FF(e.fecha)}</div>
          {INSUMOS.map(i => <div key={i.id} style={{ display:"flex",alignItems:"center",gap:10,marginBottom:8 }}>
            <span style={{ fontSize:14,width:20 }}>{i.emoji}</span>
            <div style={{ flex:1,fontSize:13,color:"var(--color-text-secondary)" }}>{i.label}</div>
            <input type="number" min="0" step={i.step} placeholder="0"
              value={editandoEntrega.insumos[i.id]||""}
              onChange={ev=>setEditandoEntrega(p=>({...p,insumos:{...p.insumos,[i.id]:ev.target.value}}))}
              style={{ width:90,textAlign:"right",padding:"6px 8px",borderRadius:8,border:"0.5px solid var(--color-border-secondary)",background:"var(--color-background-primary)",color:"var(--color-text-primary)",fontSize:13 }} />
            <span style={{ fontSize:11,color:"var(--color-text-secondary)",width:30 }}>{i.unit}</span>
          </div>)}
          <input placeholder="Nota" value={editandoEntrega.nota||""} onChange={ev=>setEditandoEntrega(p=>({...p,nota:ev.target.value}))} style={{ width:"100%",padding:"8px 10px",borderRadius:8,border:"0.5px solid var(--color-border-secondary)",background:"var(--color-background-primary)",color:"var(--color-text-primary)",fontSize:13,marginTop:4,marginBottom:12,boxSizing:"border-box" }} />
          <div style={{ display:"flex",gap:8 }}>
            <button onClick={guardarEdicion} disabled={savingEdit} style={{ flex:1,padding:9,borderRadius:9,border:"none",background:savingEdit?"#888":"#185FA5",color:"#fff",fontSize:13,fontWeight:500,cursor:"pointer" }}>{savingEdit?"Guardando…":"Guardar"}</button>
            <button onClick={()=>setEditandoEntrega(null)} style={{ padding:"9px 14px",borderRadius:9,border:"0.5px solid var(--color-border-secondary)",background:"var(--color-background-secondary)",color:"var(--color-text-secondary)",fontSize:13,cursor:"pointer" }}>Cancelar</button>
          </div>
        </Card>;
      }
      return <Card key={e.id} style={{ marginBottom:8 }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6 }}>
          <span style={{ fontSize:13,fontWeight:500 }}>{FF(e.fecha)}</span>
          <div style={{ display:"flex",gap:8,alignItems:"center" }}>
            {e.nota&&<span style={{ fontSize:12,color:"var(--color-text-secondary)" }}>{e.nota}</span>}
            <span style={{ fontSize:13,fontWeight:700,color:"#185FA5" }}>{P(costoE)}</span>
            <button onClick={()=>setEditandoEntrega({...e,insumos:{...e.insumos}})} style={{ padding:"4px 10px",borderRadius:7,border:"0.5px solid var(--color-border-secondary)",background:"var(--color-background-secondary)",color:"var(--color-text-secondary)",fontSize:12,cursor:"pointer" }}>Editar</button>
            <button onClick={()=>setConfirmElim(e)} style={{ padding:"4px 10px",borderRadius:7,border:"none",background:"#FCEBEB",color:"#A32D2D",fontSize:12,cursor:"pointer" }}>Eliminar</button>
          </div>
        </div>
        <div style={{ display:"flex",flexWrap:"wrap",gap:6 }}>{INSUMOS.filter(i=>(e.insumos[i.id]||0)>0).map(i=><Pill key={i.id}>{i.emoji} {FN(e.insumos[i.id])} {i.unit}</Pill>)}</div>
      </Card>;
    })}
  </div>;
}

function TabCli({ db, onSelect, diasAlerta }) {
  return <div><Sec>Todos los clientes</Sec>
    {db.clientes.map(c => {
      const vs=db.visitas.filter(v=>v.clienteId===c.id),cbs=db.cobros.filter(co=>co.clienteId===c.id);
      const sR=vs.reduce((s,v)=>s+serviciosDeVisita(v),0),fat=Math.max(c.minimo,sR)*db.precioServ,cob=cbs.reduce((s,c)=>s+c.monto,0);
      const uv=vs[0],dias=uv?diasDesde(uv.fecha):null,enAlerta=dias===null||dias>=diasAlerta;
      const semaforo=dias===null?"🔴":dias>=diasAlerta?"🔴":dias>=Math.floor(diasAlerta*0.6)?"🟡":"🟢";
      const {bg,c:col}=avc(c.id);
      return <div key={c.id} onClick={()=>onSelect(c)} style={{ background:"var(--color-background-primary)",borderRadius:12,border:`0.5px solid ${enAlerta?"var(--color-border-danger)":"var(--color-border-tertiary)"}`,padding:"12px 14px",marginBottom:8,cursor:"pointer",display:"flex",alignItems:"center",gap:12 }}
        onMouseEnter={e=>e.currentTarget.style.borderColor="#378ADD"} onMouseLeave={e=>e.currentTarget.style.borderColor=enAlerta?"var(--color-border-danger)":"var(--color-border-tertiary)"}>
        <Av nombre={c.nombre} bg={bg} c={col} size={40} />
        <div style={{ flex:1,minWidth:0 }}><div style={{ fontSize:14,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{c.nombre}</div><div style={{ fontSize:12,color:enAlerta?"#A32D2D":"var(--color-text-secondary)",marginTop:2 }}>{semaforo} {dias===null?"Sin visitas":`Última visita ${DA(uv.fecha)}`} · {c.maquinas} máq.</div></div>
        <div style={{ textAlign:"right",flexShrink:0 }}><div style={{ fontSize:13,fontWeight:600,color:"#185FA5" }}>{P(fat)}</div>{(fat-cob)>0&&<div style={{ fontSize:11,color:"#A32D2D" }}>saldo {P(fat-cob)}</div>}</div>
      </div>;
    })}
  </div>;
}

function DetalleCli({ cliente, db, onBack }) {
  const vs=db.visitas.filter(v=>v.clienteId===cliente.id),cobs=db.cobros.filter(c=>c.clienteId===cliente.id);
  const sR=vs.reduce((s,v)=>s+serviciosDeVisita(v),0),sF=Math.max(cliente.minimo,sR),fat=sF*db.precioServ;
  const cI=vs.reduce((s,v)=>s+costoIns(v.insumos,db.preciosIns),0),cob=cobs.reduce((s,c)=>s+c.monto,0),gan=fat-cI;
  const insT=sumar(vs),costoPorCafe=sR>0?cI/sR:null;
  const [dTab,setDTab]=useState("visitas");
  return <div>
    <button onClick={onBack} style={{ fontSize:13,color:"#185FA5",background:"none",border:"none",cursor:"pointer",marginBottom:14,padding:0 }}>← Volver</button>
    <Card style={{ marginBottom:16 }}>
      <div style={{ fontSize:16,fontWeight:600,marginBottom:2 }}>{cliente.nombre}</div>
      <div style={{ fontSize:12,color:"var(--color-text-secondary)",marginBottom:12 }}>{cliente.direccion} · {cliente.maquinas} máquinas · mínimo {cliente.minimo}</div>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8,marginBottom:12 }}>
        <Met label="Facturación" value={P(fat)} sub={`${sF} serv.`} />
        <Met label="Cobrado"     value={P(cob)} sub={`${cobs.length} pagos`} />
        <Met label="Saldo"       value={P(fat-cob)} sub="" warn={(fat-cob)>0} />
        <Met label="Ganancia"    value={P(gan)} sub={`${fat>0?((gan/fat)*100).toFixed(1):0}%`} warn={gan<0} />
      </div>
      {costoPorCafe!==null&&<div style={{ background:"#E6F1FB",borderRadius:8,padding:"8px 12px",marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
        <div><div style={{ fontSize:12,fontWeight:500,color:"#0C447C" }}>☕ Costo por café servido</div><div style={{ fontSize:11,color:"#185FA5" }}>{sR.toLocaleString()} servicios</div></div>
        <div style={{ fontSize:20,fontWeight:700,color:"#0C447C" }}>{P(costoPorCafe)}</div>
      </div>}
      <div style={{ fontSize:11,fontWeight:500,color:"var(--color-text-secondary)",marginBottom:6,textTransform:"uppercase",letterSpacing:".05em" }}>Total insumos recibidos</div>
      <div style={{ display:"flex",flexWrap:"wrap",gap:6 }}>{INSUMOS.filter(i=>insT[i.id]>0).map(i=><Pill key={i.id}>{i.emoji} {FN(insT[i.id])} {i.unit}</Pill>)}</div>
    </Card>
    <div style={{ display:"flex",background:"var(--color-background-secondary)",borderRadius:10,padding:3,marginBottom:14 }}>
      {[{id:"visitas",l:`Visitas (${vs.length})`},{id:"cobros",l:`Cobros (${cobs.length})`}].map(t=>(
        <button key={t.id} onClick={()=>setDTab(t.id)} style={{ flex:1,padding:"8px",borderRadius:8,border:"none",cursor:"pointer",fontSize:13,fontWeight:dTab===t.id?500:400,background:dTab===t.id?"var(--color-background-primary)":"transparent",color:dTab===t.id?"var(--color-text-primary)":"var(--color-text-secondary)" }}>{t.l}</button>
      ))}
    </div>
    {dTab==="visitas"&&<>
      {vs.length===0&&<div style={{ fontSize:13,color:"var(--color-text-secondary)" }}>Sin visitas.</div>}
      {vs.map(v=>{const cafes=serviciosDeVisita(v),esManual=v.serviciosManuales>0,cV=costoIns(v.insumos,db.preciosIns),cpC=cafes>0?cV/cafes:null;
        return <Card key={v.id} style={{ marginBottom:8 }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8 }}>
            <div><div style={{ fontSize:13,fontWeight:500 }}>{FF(v.fecha)} · {v.hora}</div>
              {cafes>0&&<div style={{ fontSize:11,color:"var(--color-text-secondary)",marginTop:2 }}>
                {esManual?"Manual:":`${v.contadorAnterior?.toLocaleString()} → ${v.contador?.toLocaleString()}:`} <span style={{ color:"#185FA5",fontWeight:500 }}>{cafes.toLocaleString()} servicios</span>
                {cpC&&<span style={{ color:"#0C447C",fontWeight:500 }}> · {P(cpC)}/café</span>}
              </div>}
            </div>
            <div style={{ display:"flex",flexDirection:"column",alignItems:"flex-end",gap:3 }}>
              <span style={{ fontSize:14,fontWeight:600,color:"#185FA5" }}>{P(cV)}</span>
              {v.falla&&<span style={{ fontSize:10,background:"#FCEBEB",color:"#A32D2D",padding:"2px 6px",borderRadius:20 }}>Falla</span>}
            </div>
          </div>
          <div style={{ display:"flex",flexWrap:"wrap",gap:5 }}>{INSUMOS.filter(i=>(v.insumos[i.id]||0)>0).map(i=><Pill key={i.id}>{i.emoji} {FN(v.insumos[i.id])} {i.unit}</Pill>)}</div>
          {v.observaciones&&<div style={{ fontSize:12,color:"var(--color-text-secondary)",marginTop:8,fontStyle:"italic" }}>{v.observaciones}</div>}
          {v.falla&&v.detalleFalla&&<div style={{ fontSize:12,color:"#A32D2D",marginTop:6,background:"#FCEBEB",padding:"6px 10px",borderRadius:8 }}>{v.detalleFalla}</div>}
        </Card>;})}
    </>}
    {dTab==="cobros"&&<>
      {cobs.length===0&&<div style={{ fontSize:13,color:"var(--color-text-secondary)" }}>Sin cobros registrados.</div>}
      {cobs.map(c=>{const mp=MEDIOS_PAGO.find(m=>m.id===c.medio);
        return <Card key={c.id} style={{ marginBottom:8 }}>
          <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom: c.comprobanteUrl ? 10 : 0 }}>
            <span style={{ fontSize:22 }}>{mp?.emoji}</span>
            <div style={{ flex:1 }}><div style={{ fontSize:15,fontWeight:700,color:"#27500A" }}>{P(c.monto)}</div><div style={{ fontSize:12,color:"var(--color-text-secondary)" }}>{mp?.label} · {FF(c.fecha)}{c.nota?` · ${c.nota}`:""}</div></div>
            {c.comprobanteUrl && <a href={c.comprobanteUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize:11,color:"#185FA5",textDecoration:"none",background:"#E6F1FB",padding:"4px 10px",borderRadius:6,whiteSpace:"nowrap" }}>📎 Ver</a>}
          </div>
          {c.comprobanteUrl && <img src={c.comprobanteUrl} alt="comprobante" style={{ width:"100%",borderRadius:8,maxHeight:160,objectFit:"cover",border:"0.5px solid var(--color-border-tertiary)" }} />}
        </Card>;})}
    </>}
  </div>;
}

function TabCfg({ db }) {
  const [nuevo,setNuevo]=useState({nombre:"",direccion:"",maquinas:1,minimo:250});
  const [editando,setEditando]=useState(null),[confirmar,setConfirmar]=useState(null);
  const [localPrecios,setLocalPrecios]=useState(db.preciosIns),[localPxServ,setLocalPxServ]=useState(db.precioServ);
  const [localAlertas,setLocalAlertas]=useState(db.alertasStock||ALERTAS_DEFAULT),[localDias,setLocalDias]=useState(db.diasAlerta||DIAS_ALERTA_DEF);
  const [localComision,setLocalComision]=useState(db.comisionOp||COMISION_DEF);
  const [saving,setSaving]=useState(false),[saved,setSaved]=useState(false);
  async function guardarConfig(){setSaving(true);await db.saveConfig(localPxServ,localPrecios,localAlertas,localDias,localComision);setSaving(false);setSaved(true);setTimeout(()=>setSaved(false),2000);}
  async function agregar(){if(!nuevo.nombre.trim())return;await db.addCliente({...nuevo,maquinas:parseInt(nuevo.maquinas)||1,minimo:parseInt(nuevo.minimo)||250});setNuevo({nombre:"",direccion:"",maquinas:1,minimo:250});}
  async function guardarEdicion(){await db.updateCliente({...editando,maquinas:parseInt(editando.maquinas)||1,minimo:parseInt(editando.minimo)||0});setEditando(null);}
  async function confirmarEliminar(){await db.deleteCliente(confirmar.cliente.id);setConfirmar(null);setEditando(null);}
  return <div>
    {confirmar&&<ConfirmModal title={`Eliminar "${confirmar.cliente.nombre}"`} msg={confirmar.tieneVisitas?"Este cliente tiene visitas registradas.":"Este cliente no tiene registros."} onConfirm={confirmarEliminar} onCancel={()=>setConfirmar(null)} />}
    <Sec>Precio por servicio</Sec>
    <Card style={{ marginBottom:20,display:"flex",alignItems:"center",gap:12 }}>
      <div style={{ flex:1 }}><div style={{ fontSize:13,fontWeight:500 }}>Precio unitario</div><div style={{ fontSize:11,color:"var(--color-text-secondary)" }}>Igual para todos los clientes</div></div>
      <span style={{ fontSize:13,color:"var(--color-text-secondary)" }}>$</span>
      <input type="number" value={localPxServ} onChange={e=>setLocalPxServ(parseFloat(e.target.value)||0)} style={{ width:100,textAlign:"right",padding:8,borderRadius:8,border:"0.5px solid var(--color-border-secondary)",background:"var(--color-background-primary)",color:"var(--color-text-primary)",fontSize:16,fontWeight:600 }} />
    </Card>
    <Sec>Comisión del operador</Sec>
    <Card style={{ marginBottom:20,display:"flex",alignItems:"center",gap:12 }}>
      <div style={{ flex:1 }}><div style={{ fontSize:13,fontWeight:500 }}>Monto por servicio vendido</div><div style={{ fontSize:11,color:"var(--color-text-secondary)" }}>Se calcula sobre todos los servicios reales</div></div>
      <span style={{ fontSize:13,color:"var(--color-text-secondary)" }}>$</span>
      <input type="number" min="0" value={localComision} onChange={e=>setLocalComision(parseFloat(e.target.value)||0)} style={{ width:100,textAlign:"right",padding:8,borderRadius:8,border:"0.5px solid var(--color-border-secondary)",background:"var(--color-background-primary)",color:"var(--color-text-primary)",fontSize:16,fontWeight:600 }} />
    </Card>
    <Sec>Alerta de visitas pendientes</Sec>
    <Card style={{ marginBottom:20,display:"flex",alignItems:"center",gap:12 }}>
      <div style={{ flex:1 }}><div style={{ fontSize:13,fontWeight:500 }}>Días sin visita para alertar</div><div style={{ fontSize:11,color:"var(--color-text-secondary)" }}>Alerta roja si hace más de N días</div></div>
      <input type="number" min="1" value={localDias} onChange={e=>setLocalDias(parseInt(e.target.value)||1)} style={{ width:70,textAlign:"right",padding:8,borderRadius:8,border:"0.5px solid var(--color-border-secondary)",background:"var(--color-background-primary)",color:"var(--color-text-primary)",fontSize:16,fontWeight:600 }} />
      <span style={{ fontSize:12,color:"var(--color-text-secondary)" }}>días</span>
    </Card>
    <Sec>Alertas de stock mínimo</Sec>
    <Card style={{ marginBottom:20 }}>
      {INSUMOS.map(i=><div key={i.id} style={{ display:"flex",alignItems:"center",gap:12,marginBottom:10 }}>
        <span style={{ fontSize:16 }}>{i.emoji}</span>
        <div style={{ flex:1 }}><div style={{ fontSize:13,fontWeight:500 }}>{i.label}</div><div style={{ fontSize:11,color:"var(--color-text-secondary)" }}>Alerta si baja de N {i.unit}</div></div>
        <input type="number" min="0" step={i.step} value={localAlertas[i.id]||0} onChange={e=>setLocalAlertas(p=>({...p,[i.id]:parseFloat(e.target.value)||0}))} style={{ width:90,textAlign:"right",padding:"6px 8px",borderRadius:8,border:"0.5px solid var(--color-border-secondary)",background:"var(--color-background-primary)",color:"var(--color-text-primary)",fontSize:13 }} />
        <span style={{ fontSize:11,color:"var(--color-text-secondary)",width:30 }}>{i.unit}</span>
      </div>)}
    </Card>
    <Sec>Clientes ({db.clientes.length})</Sec>
    {db.clientes.map(c=>(
      editando?.id===c.id
        ?<Card key={c.id} style={{ marginBottom:8,border:"1.5px solid var(--color-border-info)" }}>
          <div style={{ fontSize:12,fontWeight:500,color:"var(--color-text-secondary)",marginBottom:10 }}>Editando cliente</div>
          {[["Nombre","nombre"],["Dirección","direccion"]].map(([ph,k])=><input key={k} placeholder={ph} value={editando[k]||""} onChange={e=>setEditando(p=>({...p,[k]:e.target.value}))} style={{ width:"100%",marginBottom:8,padding:"8px 10px",borderRadius:8,border:"0.5px solid var(--color-border-secondary)",background:"var(--color-background-primary)",color:"var(--color-text-primary)",fontSize:13,boxSizing:"border-box" }} />)}
          <div style={{ display:"flex",gap:12,marginBottom:12 }}>
            {[["Máquinas","maquinas"],["Mínimo","minimo"]].map(([label,k])=><div key={k} style={{ flex:1 }}><div style={{ fontSize:11,color:"var(--color-text-secondary)",marginBottom:4 }}>{label}</div><input type="number" min="1" value={editando[k]||""} onChange={e=>setEditando(p=>({...p,[k]:e.target.value}))} style={{ width:"100%",padding:"6px 8px",borderRadius:8,border:"0.5px solid var(--color-border-secondary)",background:"var(--color-background-primary)",color:"var(--color-text-primary)",fontSize:13,boxSizing:"border-box" }} /></div>)}
          </div>
          <div style={{ display:"flex",gap:8 }}>
            <button onClick={guardarEdicion} style={{ flex:1,padding:9,borderRadius:9,border:"none",background:"#185FA5",color:"#fff",fontSize:13,fontWeight:500,cursor:"pointer" }}>Guardar</button>
            <button onClick={()=>setEditando(null)} style={{ padding:"9px 14px",borderRadius:9,border:"0.5px solid var(--color-border-secondary)",background:"var(--color-background-secondary)",color:"var(--color-text-secondary)",fontSize:13,cursor:"pointer" }}>Cancelar</button>
            <button onClick={()=>setConfirmar({cliente:c,tieneVisitas:db.visitas.some(v=>v.clienteId===c.id)})} style={{ padding:"9px 14px",borderRadius:9,border:"none",background:"#FCEBEB",color:"#A32D2D",fontSize:13,cursor:"pointer" }}>Eliminar</button>
          </div>
        </Card>
        :<div key={c.id} style={{ background:"var(--color-background-primary)",borderRadius:10,border:"0.5px solid var(--color-border-tertiary)",padding:"10px 14px",marginBottom:8,display:"flex",alignItems:"center",gap:12 }}>
          <div style={{ flex:1 }}><div style={{ fontSize:13,fontWeight:500 }}>{c.nombre}</div><div style={{ fontSize:11,color:"var(--color-text-secondary)" }}>{c.direccion} · {c.maquinas} máq. · mín {c.minimo}</div></div>
          <button onClick={()=>setEditando({...c})} style={{ padding:"5px 12px",borderRadius:8,border:"0.5px solid var(--color-border-secondary)",background:"var(--color-background-secondary)",color:"var(--color-text-secondary)",fontSize:12,cursor:"pointer" }}>Editar</button>
        </div>
    ))}
    <Sec mt={20}>Agregar cliente</Sec>
    <Card style={{ marginBottom:20 }}>
      {[["Nombre","nombre"],["Dirección","direccion"]].map(([ph,k])=><input key={k} placeholder={ph} value={nuevo[k]} onChange={e=>setNuevo(p=>({...p,[k]:e.target.value}))} style={{ width:"100%",marginBottom:8,padding:"8px 10px",borderRadius:8,border:"0.5px solid var(--color-border-secondary)",background:"var(--color-background-primary)",color:"var(--color-text-primary)",fontSize:13,boxSizing:"border-box" }} />)}
      <div style={{ display:"flex",gap:12,marginBottom:12 }}>
        {[["Máquinas","maquinas"],["Mínimo pactado","minimo"]].map(([label,k])=><div key={k} style={{ flex:1 }}><div style={{ fontSize:11,color:"var(--color-text-secondary)",marginBottom:4 }}>{label}</div><input type="number" min="0" value={nuevo[k]} onChange={e=>setNuevo(p=>({...p,[k]:e.target.value}))} style={{ width:"100%",padding:"6px 8px",borderRadius:8,border:"0.5px solid var(--color-border-secondary)",background:"var(--color-background-primary)",color:"var(--color-text-primary)",fontSize:13,boxSizing:"border-box" }} /></div>)}
      </div>
      <button onClick={agregar} style={{ padding:"9px 18px",borderRadius:9,border:"none",background:"#185FA5",color:"#fff",fontSize:13,fontWeight:500,cursor:"pointer" }}>+ Agregar cliente</button>
    </Card>
    <Sec>Precio de insumos</Sec>
    {INSUMOS.map(i=><div key={i.id} style={{ background:"var(--color-background-primary)",borderRadius:10,border:"0.5px solid var(--color-border-tertiary)",padding:"10px 14px",marginBottom:8,display:"flex",alignItems:"center",gap:12 }}>
      <span style={{ fontSize:16 }}>{i.emoji}</span>
      <div style={{ flex:1 }}><div style={{ fontSize:13,fontWeight:500 }}>{i.label}</div><div style={{ fontSize:11,color:"var(--color-text-secondary)" }}>por {i.unit}</div></div>
      <span style={{ fontSize:13,color:"var(--color-text-secondary)" }}>$</span>
      <input type="number" value={localPrecios[i.id]||0} onChange={e=>setLocalPrecios(p=>({...p,[i.id]:parseFloat(e.target.value)||0}))} style={{ width:90,textAlign:"right",padding:"6px 8px",borderRadius:8,border:"0.5px solid var(--color-border-secondary)",background:"var(--color-background-primary)",color:"var(--color-text-primary)",fontSize:13 }} />
    </div>)}
    <button onClick={guardarConfig} disabled={saving} style={{ padding:"10px 20px",borderRadius:10,border:"none",background:saved?"#1D9E75":saving?"#888":"#185FA5",color:"#fff",fontSize:13,fontWeight:500,cursor:"pointer",marginBottom:24 }}>{saved?"✓ Guardado":saving?"Guardando…":"Guardar cambios"}</button>
  </div>;
}