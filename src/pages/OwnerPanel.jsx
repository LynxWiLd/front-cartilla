import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, apiPost, apiPut, apiDelete } from "../api";
import { useAuth } from "../context/AuthContext";

export default function OwnerPanel() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("menu");
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [staff, setStaff] = useState([]);
  const [showCatForm, setShowCatForm] = useState(false);
  const [showItemForm, setShowItemForm] = useState(false);
  const [showStaffForm, setShowStaffForm] = useState(false);
  const [editCat, setEditCat] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [catForm, setCatForm] = useState({ nombre: "", emoji: "🍔" });
  const [itemForm, setItemForm] = useState({ nombre: "", descripcion: "", precio: "", imagen: "", tags: "", categoria_id: "" });
  const [staffForm, setStaffForm] = useState({ nombre: "", email: "", password: "" });

  useEffect(() => {
    if (!loading && (!user || user.role !== "OWNER")) navigate("/");
  }, [user, loading, navigate]);

  const loadData = async () => {
    try {
      const [c, i, s] = await Promise.all([
        api("/menu/categories"),
        api("/menu/items"),
        api("/staff"),
      ]);
      setCategories(c);
      setItems(i);
      setStaff(s);
    } catch {
      logout();
    }
  };

  useEffect(() => {
    if (user?.role === "OWNER") loadData();
  }, [user]);

  const saveCategory = async (e) => {
    e.preventDefault();
    try {
      if (editCat) await apiPut(`/menu/categories/${editCat.id}`, catForm);
      else await apiPost("/menu/categories", catForm);
      setShowCatForm(false);
      setEditCat(null);
      setCatForm({ nombre: "", emoji: "🍔" });
      loadData();
    } catch (err) { alert(err.message); }
  };

  const saveItem = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...itemForm, precio: parseFloat(itemForm.precio) };
      if (editItem) await apiPut(`/menu/items/${editItem.id}`, payload);
      else await apiPost("/menu/items", payload);
      setShowItemForm(false);
      setEditItem(null);
      setItemForm({ nombre: "", descripcion: "", precio: "", imagen: "", tags: "", categoria_id: "" });
      loadData();
    } catch (err) { alert(err.message); }
  };

  const saveStaff = async (e) => {
    e.preventDefault();
    try {
      await apiPost("/staff", staffForm);
      setShowStaffForm(false);
      setStaffForm({ nombre: "", email: "", password: "" });
      loadData();
    } catch (err) { alert(err.message); }
  };

  const deleteItem = async (id) => {
    if (!confirm("¿Eliminar ítem?")) return;
    await apiDelete(`/menu/items/${id}`);
    loadData();
  };

  const deleteCategory = async (id) => {
    if (!confirm("¿Eliminar categoría y todos sus ítems?")) return;
    await apiDelete(`/menu/categories/${id}`);
    loadData();
  };

  const deleteStaff = async (id) => {
    if (!confirm("¿Eliminar mozo?")) return;
    await apiDelete(`/staff/${id}`);
    loadData();
  };

  if (loading) return <div className="min-h-screen bg-dark-bg flex items-center justify-center text-brand-yellow font-heading text-3xl animate-pulse">Cargando...</div>;

  return (
    <div className="min-h-screen bg-dark-bg">
      <header className="sticky top-0 z-50 bg-dark-bg/95 backdrop-blur-md border-b border-white/5 px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <h1 className="font-heading text-2xl text-white tracking-wide">⚙️ Panel — {user?.nombre}</h1>
          <button onClick={() => { logout(); navigate("/"); }} className="text-gray-400 text-sm hover:text-white transition-colors">Salir</button>
        </div>
        <nav className="flex gap-2">
          {["menu", "staff"].map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${tab === t ? "bg-brand-yellow text-black" : "text-gray-400 hover:text-white"}`}
            >
              {t === "menu" ? "🍔 Menú" : "👥 Mozos"}
            </button>
          ))}
        </nav>
      </header>

      <div className="p-4">
        {tab === "menu" && (
          <>
            <div className="flex gap-2 mb-4">
              <button onClick={() => { setEditCat(null); setCatForm({ nombre: "", emoji: "🍔" }); setShowCatForm(true); }}
                className="bg-dark-surface text-white font-semibold px-4 py-2 rounded-xl text-sm active:scale-95 transition-all">+ Categoría</button>
              <button onClick={() => { setEditItem(null); setItemForm({ nombre: "", descripcion: "", precio: "", imagen: "", tags: "", categoria_id: categories[0]?.id || "" }); setShowItemForm(true); }}
                className="bg-brand-yellow text-black font-semibold px-4 py-2 rounded-xl text-sm active:scale-95 transition-all">+ Ítem</button>
            </div>

            {categories.map((cat) => {
              const catItems = items.filter((i) => i.categoria_id === cat.id);
              return (
                <div key={cat.id} className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="font-heading text-xl text-white tracking-wide">{cat.emoji} {cat.nombre}</h2>
                    <div className="flex gap-2">
                      <button onClick={() => { setEditCat(cat); setCatForm(cat); setShowCatForm(true); }}
                        className="text-gray-400 text-xs hover:text-white transition-colors">Editar</button>
                      <button onClick={() => deleteCategory(cat.id)}
                        className="text-brand-red text-xs hover:text-white transition-colors">Eliminar</button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {catItems.map((item) => (
                      <div key={item.id} className="bg-dark-card rounded-xl border border-white/5 p-3 flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-heading text-lg text-white tracking-wide">{item.nombre}</span>
                            <span className="font-heading text-brand-yellow">${Number(item.precio).toLocaleString("es-AR")}</span>
                          </div>
                          {item.descripcion && <p className="text-gray-500 text-xs truncate">{item.descripcion}</p>}
                        </div>
                        <div className="flex gap-2 shrink-0 ml-2">
                          <button onClick={() => { setEditItem(item); setItemForm({ ...item, precio: String(item.precio), categoria_id: item.categoriaId || "" }); setShowItemForm(true); }}
                            className="text-gray-400 text-xs hover:text-white transition-colors">Editar</button>
                          <button onClick={() => deleteItem(item.id)}
                            className="text-brand-red text-xs hover:text-white transition-colors">Eliminar</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </>
        )}

        {tab === "staff" && (
          <>
            <button onClick={() => { setStaffForm({ nombre: "", email: "", password: "" }); setShowStaffForm(true); }}
              className="bg-brand-yellow text-black font-semibold px-4 py-2 rounded-xl text-sm active:scale-95 transition-all mb-4">+ Nuevo Mozo</button>
            <div className="space-y-3">
              {staff.map((s) => (
                <div key={s.id} className="bg-dark-card rounded-xl border border-white/5 p-4 flex items-center justify-between">
                  <div>
                    <p className="text-white font-semibold">{s.nombre}</p>
                    <p className="text-gray-400 text-sm">{s.email}</p>
                  </div>
                  <button onClick={() => deleteStaff(s.id)}
                    className="text-brand-red text-xs hover:text-white transition-colors">Eliminar</button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {showCatForm && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/70" onClick={() => setShowCatForm(false)}>
          <form onSubmit={saveCategory} className="bg-dark-card rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-heading text-2xl text-white tracking-wide">{editCat ? "Editar" : "Nueva"} Categoría</h2>
            <input placeholder="Nombre" value={catForm.nombre} onChange={(e) => setCatForm({ ...catForm, nombre: e.target.value })} className="w-full bg-dark-surface text-white px-4 py-3 rounded-xl border border-white/10 focus:outline-none focus:border-brand-yellow" required />
            <input placeholder="Emoji (ej: 🍔)" value={catForm.emoji} onChange={(e) => setCatForm({ ...catForm, emoji: e.target.value })} className="w-full bg-dark-surface text-white px-4 py-3 rounded-xl border border-white/10 focus:outline-none focus:border-brand-yellow" />
            <div className="flex gap-3">
              <button type="submit" className="flex-1 bg-brand-yellow text-black font-semibold py-3 rounded-xl">Guardar</button>
              <button type="button" onClick={() => setShowCatForm(false)} className="flex-1 bg-dark-surface text-gray-300 font-semibold py-3 rounded-xl">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {showItemForm && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/70" onClick={() => setShowItemForm(false)}>
          <form onSubmit={saveItem} className="bg-dark-card rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-heading text-2xl text-white tracking-wide">{editItem ? "Editar" : "Nuevo"} Ítem</h2>
            <input placeholder="Nombre" value={itemForm.nombre} onChange={(e) => setItemForm({ ...itemForm, nombre: e.target.value })} className="w-full bg-dark-surface text-white px-4 py-3 rounded-xl border border-white/10 focus:outline-none focus:border-brand-yellow" required />
            <textarea placeholder="Descripción" value={itemForm.descripcion} onChange={(e) => setItemForm({ ...itemForm, descripcion: e.target.value })} className="w-full bg-dark-surface text-white px-4 py-3 rounded-xl border border-white/10 focus:outline-none focus:border-brand-yellow resize-none h-20" />
            <input placeholder="Precio (ej: 10000)" type="number" value={itemForm.precio} onChange={(e) => setItemForm({ ...itemForm, precio: e.target.value })} className="w-full bg-dark-surface text-white px-4 py-3 rounded-xl border border-white/10 focus:outline-none focus:border-brand-yellow" required />
            <input placeholder="URL de imagen (opcional)" value={itemForm.imagen} onChange={(e) => setItemForm({ ...itemForm, imagen: e.target.value })} className="w-full bg-dark-surface text-white px-4 py-3 rounded-xl border border-white/10 focus:outline-none focus:border-brand-yellow" />
            <input placeholder="Tags separados por coma (ej: Más vendido,Picante)" value={itemForm.tags} onChange={(e) => setItemForm({ ...itemForm, tags: e.target.value })} className="w-full bg-dark-surface text-white px-4 py-3 rounded-xl border border-white/10 focus:outline-none focus:border-brand-yellow" />
            <select value={itemForm.categoria_id} onChange={(e) => setItemForm({ ...itemForm, categoria_id: e.target.value })} className="w-full bg-dark-surface text-white px-4 py-3 rounded-xl border border-white/10 focus:outline-none focus:border-brand-yellow" required>
              <option value="">Seleccionar categoría</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.emoji} {c.nombre}</option>
              ))}
            </select>
            <div className="flex gap-3">
              <button type="submit" className="flex-1 bg-brand-yellow text-black font-semibold py-3 rounded-xl">Guardar</button>
              <button type="button" onClick={() => setShowItemForm(false)} className="flex-1 bg-dark-surface text-gray-300 font-semibold py-3 rounded-xl">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {showStaffForm && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/70" onClick={() => setShowStaffForm(false)}>
          <form onSubmit={saveStaff} className="bg-dark-card rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-heading text-2xl text-white tracking-wide">Nuevo Mozo</h2>
            <input placeholder="Nombre" value={staffForm.nombre} onChange={(e) => setStaffForm({ ...staffForm, nombre: e.target.value })} className="w-full bg-dark-surface text-white px-4 py-3 rounded-xl border border-white/10 focus:outline-none focus:border-brand-yellow" required />
            <input placeholder="Email" type="email" value={staffForm.email} onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })} className="w-full bg-dark-surface text-white px-4 py-3 rounded-xl border border-white/10 focus:outline-none focus:border-brand-yellow" required />
            <input placeholder="Contraseña" type="password" value={staffForm.password} onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })} className="w-full bg-dark-surface text-white px-4 py-3 rounded-xl border border-white/10 focus:outline-none focus:border-brand-yellow" required />
            <div className="flex gap-3">
              <button type="submit" className="flex-1 bg-brand-yellow text-black font-semibold py-3 rounded-xl">Crear</button>
              <button type="button" onClick={() => setShowStaffForm(false)} className="flex-1 bg-dark-surface text-gray-300 font-semibold py-3 rounded-xl">Cancelar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
