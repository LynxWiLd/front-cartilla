import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, apiPost, apiPut, apiDelete } from "../api";
import { useAuth } from "../context/AuthContext";

export default function SuperAdmin() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const [tenants, setTenants] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ nombre: "", slug: "", direccion: "", horario: "19:00 - 23:55", instagram: "", telefono: "" });

  useEffect(() => {
    if (!loading && (!user || user.role !== "SUPER_ADMIN")) navigate("/");
    else api("/tenants").then(setTenants).catch(() => logout());
  }, [user, loading, navigate, logout]);

  const save = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await apiPut(`/tenants/${editing.id}`, form);
      } else {
        await apiPost("/tenants", form);
      }
      setShowForm(false);
      setEditing(null);
      setForm({ nombre: "", slug: "", direccion: "", horario: "19:00 - 23:55", instagram: "", telefono: "" });
      setTenants(await api("/tenants"));
    } catch (err) {
      alert(err.message);
    }
  };

  const remove = async (id) => {
    if (!confirm("¿Eliminar este tenant?")) return;
    await apiDelete(`/tenants/${id}`);
    setTenants(await api("/tenants"));
  };

  const edit = (t) => {
    setEditing(t);
    setForm(t);
    setShowForm(true);
  };

  if (loading) return <div className="min-h-screen bg-dark-bg flex items-center justify-center text-brand-yellow font-heading text-3xl animate-pulse">Cargando...</div>;

  return (
    <div className="min-h-screen bg-dark-bg">
      <header className="sticky top-0 z-50 bg-dark-bg/95 backdrop-blur-md border-b border-white/5 px-4 py-3 flex items-center justify-between">
        <h1 className="font-heading text-2xl text-white tracking-wide">🏪 Admin — Tenants</h1>
        <button onClick={() => { logout(); navigate("/"); }} className="text-gray-400 text-sm hover:text-white transition-colors">Salir</button>
      </header>

      <div className="p-4">
        <button
          onClick={() => { setEditing(null); setForm({ nombre: "", slug: "", direccion: "", horario: "19:00 - 23:55", instagram: "", telefono: "" }); setShowForm(true); }}
          className="bg-brand-yellow text-black font-semibold px-5 py-2.5 rounded-xl text-sm active:scale-95 transition-all mb-4"
        >
          + Nuevo Tenant
        </button>

        <div className="space-y-3">
          {tenants.map((t) => (
            <div key={t.id} className="bg-dark-card rounded-2xl border border-white/5 p-4 flex items-center justify-between">
              <div>
                <h3 className="font-heading text-xl text-white tracking-wide">{t.nombre}</h3>
                <p className="text-gray-400 text-sm">/{t.slug}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => edit(t)} className="bg-dark-surface text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-brand-yellow hover:text-black transition-colors">Editar</button>
                <button onClick={() => remove(t.id)} className="bg-brand-red/20 text-brand-red px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-brand-red hover:text-white transition-colors">Eliminar</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/70" onClick={() => setShowForm(false)}>
          <form onSubmit={save} className="bg-dark-card rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-heading text-2xl text-white tracking-wide">{editing ? "Editar" : "Nuevo"} Tenant</h2>
            <input placeholder="Nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className="w-full bg-dark-surface text-white px-4 py-3 rounded-xl border border-white/10 focus:outline-none focus:border-brand-yellow placeholder:text-gray-500" required />
            <input placeholder="Slug (ej: big-fat-burger)" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="w-full bg-dark-surface text-white px-4 py-3 rounded-xl border border-white/10 focus:outline-none focus:border-brand-yellow placeholder:text-gray-500" required disabled={!!editing} />
            <input placeholder="Dirección" value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} className="w-full bg-dark-surface text-white px-4 py-3 rounded-xl border border-white/10 focus:outline-none focus:border-brand-yellow placeholder:text-gray-500" />
            <input placeholder="Horario (ej: 19:00 - 23:55)" value={form.horario} onChange={(e) => setForm({ ...form, horario: e.target.value })} className="w-full bg-dark-surface text-white px-4 py-3 rounded-xl border border-white/10 focus:outline-none focus:border-brand-yellow placeholder:text-gray-500" />
            <input placeholder="Instagram (ej: @bigfatburger)" value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value })} className="w-full bg-dark-surface text-white px-4 py-3 rounded-xl border border-white/10 focus:outline-none focus:border-brand-yellow placeholder:text-gray-500" />
            <input placeholder="Teléfono" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} className="w-full bg-dark-surface text-white px-4 py-3 rounded-xl border border-white/10 focus:outline-none focus:border-brand-yellow placeholder:text-gray-500" />
            <div className="flex gap-3">
              <button type="submit" className="flex-1 bg-brand-yellow text-black font-semibold py-3 rounded-xl active:scale-[0.98] transition-all">{editing ? "Guardar" : "Crear"}</button>
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-dark-surface text-gray-300 font-semibold py-3 rounded-xl active:scale-[0.98] transition-all">Cancelar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
