import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api";
import { formatPrice } from "../lib/utils";
import { SocketProvider, useSocket } from "../context/SocketContext";
import Toast from "../components/Toast";

const badgeStyles = {
  "Más vendido": "bg-brand-yellow text-black",
  Picante: "bg-brand-red text-white",
  Veggie: "bg-green-600 text-white",
};

const gradients = {
  hamburguesas: "from-orange-600 to-red-700",
  papas: "from-yellow-600 to-orange-600",
  pizzas: "from-green-700 to-yellow-700",
  bebidas: "from-cyan-600 to-blue-700",
  adicionales: "from-purple-600 to-pink-700",
  default: "from-gray-600 to-gray-800",
};

function getTableFromURL() {
  const params = new URLSearchParams(window.location.search);
  const t = params.get("mesa");
  return t ? parseInt(t, 10) : null;
}

function MenuContent() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [showAllergens, setShowAllergens] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const COOLDOWN_SECONDS = 30;
  const CART_KEY = `cart:${slug}`;

  const [cart, setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch { return []; }
  });
  const [showCart, setShowCart] = useState(false);
  const [mesaBloqueada, setMesaBloqueada] = useState(false);
  const socket = useSocket();

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }, [cart, CART_KEY]);

  const cartCount = cart.reduce((s, i) => s + i.cantidad, 0);
  const cartTotal = cart.reduce((s, i) => s + i.precio * i.cantidad, 0);

  const addToCart = useCallback((item) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) return prev.map((i) => i.id === item.id ? { ...i, cantidad: i.cantidad + 1 } : i);
      return [...prev, { id: item.id, nombre: item.nombre, precio: item.precio, cantidad: 1 }];
    });
  }, []);

  const removeFromCart = useCallback((itemId) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === itemId);
      if (!existing) return prev;
      if (existing.cantidad <= 1) return prev.filter((i) => i.id !== itemId);
      return prev.map((i) => i.id === itemId ? { ...i, cantidad: i.cantidad - 1 } : i);
    });
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  useEffect(() => {
    api(`/api/public/${slug}/menu`)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [slug]);

  const llamarMozo = () => {
    const mesa = getTableFromURL();
    if (!mesa) {
      setToast({ message: "Escanea el QR desde la mesa para usar esta función", type: "error" });
      return;
    }

    if (mesaBloqueada) {
      setToast({ message: "El mozo ya está atendiendo tu mesa, aguarda un momento", type: "error" });
      return;
    }

    if (cart.length === 0) {
      setToast({ message: "Agregá productos al carrito antes de llamar al mozo", type: "error" });
      return;
    }

    if (socket?.connected) {
      const items = cart.map((i) => ({ id: i.id, nombre: i.nombre, precio: i.precio, cantidad: i.cantidad }));
      socket.emit("llamar-mozo", { mesa, tenant_id: data.tenant.id, items });
      socket.once("llamada-recibida", () => {
        setToast({ message: "Pedido enviado, aguarde un momento", type: "success" });
        clearCart();
        setShowCart(false);
      });
      setCooldown(COOLDOWN_SECONDS);
    } else {
      setToast({ message: "Error de conexión", type: "error" });
    }
  };

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  useEffect(() => {
    if (!socket) return;
    const mesa = getTableFromURL();
    if (!mesa) return;

    const onStatus = ({ numero, status }) => {
      if (numero === mesa) setMesaBloqueada(status !== "libre");
    };
    const onError = ({ message }) => setToast({ message, type: "error" });

    socket.on("mesa-status-update", onStatus);
    socket.on("error", onError);
    return () => {
      socket.off("mesa-status-update", onStatus);
      socket.off("error", onError);
    };
  }, [socket]);

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-brand-yellow font-heading text-3xl animate-pulse">Cargando...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center px-4">
        <div className="text-center">
          <span className="text-6xl mb-4 block">🍔</span>
          <p className="text-gray-400">{error || "Menú no encontrado"}</p>
        </div>
      </div>
    );
  }

  const { tenant, categories, items } = data;

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen max-w-lg mx-auto bg-dark-bg">
      <header className="px-4 pt-6 pb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <img
              src="/media/logo/logo.jpg"
              alt={tenant.nombre}
              className="h-14 w-14 rounded-2xl object-cover shadow-lg ring-2 ring-brand-yellow/30"
            />
            <div>
              <h1 className="font-heading text-3xl sm:text-4xl tracking-wide text-white leading-tight">
                {tenant.nombre}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {tenant.instagram && (
              <a
                href={`https://instagram.com/${tenant.instagram.replace("@", "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 bg-gradient-to-r from-purple-600 to-pink-500 px-3 py-2 rounded-full text-white text-xs font-semibold shadow-lg active:scale-95 transition-transform"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                </svg>
                <span>Compartinos</span>
              </a>
            )}
            <button
              onClick={llamarMozo}
              disabled={cooldown > 0}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full font-semibold text-xs shadow-lg transition-all active:scale-95 ${cooldown > 0 ? "bg-gray-500 text-gray-300 cursor-not-allowed opacity-60" : "bg-brand-yellow text-black"}`}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
              </svg>
              <span>{cooldown > 0 ? `Espera (${cooldown}s)` : "Llamar mozo"}</span>
            </button>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-400 flex-wrap">
          {tenant.horario && (
            <div className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-brand-yellow" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
              <span>{tenant.horario}</span>
            </div>
          )}
          {tenant.direccion && (
            <div className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-brand-yellow" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
              <span className="truncate">{tenant.direccion}</span>
            </div>
          )}
        </div>
      </header>

      {mesaBloqueada && (
        <div className="mx-4 mb-2 bg-blue-600/20 border border-blue-500/30 rounded-xl px-4 py-3 flex items-center gap-3 text-sm">
          <span className="text-2xl">👨‍🍳</span>
          <div>
            <p className="text-blue-300 font-semibold">Mozo en camino</p>
            <p className="text-blue-400/70 text-xs">Estamos preparando tu pedido, en un momento podrás pedir de nuevo</p>
          </div>
        </div>
      )}

      <nav className="sticky top-0 z-50 bg-dark-bg/95 backdrop-blur-md border-b border-white/5">
        <div className="flex overflow-x-auto gap-1 px-4 py-3 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => scrollTo(cat.id)}
              className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full bg-dark-surface text-white font-body font-medium text-sm whitespace-nowrap hover:bg-brand-yellow hover:text-black active:scale-95 transition-all"
            >
              <span>{cat.emoji}</span>
              <span>{cat.nombre}</span>
            </button>
          ))}
        </div>
      </nav>

      <main className="px-4 py-6 space-y-10">
        {categories.map((cat) => {
          const catItems = items.filter((i) => i.categoriaId === cat.id);
          if (catItems.length === 0) return null;

          return (
            <section key={cat.id} id={cat.id}>
              <h2 className="font-heading text-3xl text-white tracking-wide mb-4 flex items-center gap-2">
                <span>{cat.emoji}</span>
                <span>{cat.nombre}</span>
                <span className="text-sm font-body text-gray-500 font-normal">({catItems.length})</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {catItems.map((item) => {
                  const tags = item.tags ? item.tags.split(",").map((t) => t.trim()).filter(Boolean) : [];
                  const grad = gradients[cat.nombre.toLowerCase()] || gradients.default;

                  return (
                    <article key={item.id} className="bg-dark-card rounded-2xl overflow-hidden border border-white/5 shadow-lg">
                      {item.imagen ? (
                        <img src={item.imagen} alt={item.nombre} className="w-full h-40 object-cover" loading="lazy" />
                      ) : (
                        <div className={`relative h-40 bg-gradient-to-br ${grad} flex items-center justify-center`}>
                          <span className="text-6xl opacity-40 select-none">{cat.emoji}</span>
                          <span className="absolute bottom-2 right-3 text-white/20 font-heading text-2xl tracking-wider">
                            {item.nombre.split(" ").map((w) => w[0]).join("")}
                          </span>
                        </div>
                      )}
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className="font-heading text-xl text-white tracking-wide leading-tight">{item.nombre}</h3>
                          <span className="font-heading text-xl text-brand-yellow whitespace-nowrap">{formatPrice(item.precio)}</span>
                        </div>
                        {item.descripcion && (
                          <p className="text-gray-400 text-sm leading-relaxed mb-3">{item.descripcion}</p>
                        )}
                        {tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            {tags.map((tag) => (
                              <span key={tag} className={`text-xs font-semibold px-2.5 py-1 rounded-full ${badgeStyles[tag] || "bg-gray-600 text-white"}`}>
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        <button
                          onClick={() => addToCart(item)}
                          className="w-full mt-1 bg-brand-yellow/10 hover:bg-brand-yellow/20 text-brand-yellow font-semibold py-2 rounded-xl text-sm active:scale-95 transition-all border border-brand-yellow/30"
                        >
                          + Agregar
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </main>

      {cartCount > 0 && (
        <button
          onClick={() => setShowCart(true)}
          className="fixed bottom-6 right-6 z-50 bg-brand-yellow text-black px-5 py-3 rounded-full font-bold text-sm shadow-2xl active:scale-95 transition-all flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
          </svg>
          <span>{cartCount} {cartCount === 1 ? "item" : "items"}</span>
          <span className="text-black/60">·</span>
          <span>{formatPrice(cartTotal)}</span>
        </button>
      )}

      {showCart && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/70" onClick={() => setShowCart(false)}>
          <div className="bg-dark-card rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-6 max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-2xl text-white tracking-wide">Tu pedido</h3>
              <button onClick={() => setShowCart(false)} className="text-gray-400 hover:text-white text-xl">✕</button>
            </div>

            {cart.length === 0 ? (
              <p className="text-gray-500 text-center py-8">El carrito está vacío</p>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                {cart.map((item) => (
                  <div key={item.id} className="flex items-center justify-between bg-dark-surface rounded-xl px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-semibold truncate">{item.nombre}</p>
                      <p className="text-brand-yellow text-xs">{formatPrice(item.precio)} c/u</p>
                    </div>
                    <div className="flex items-center gap-3 ml-3">
                      <button onClick={() => removeFromCart(item.id)} className="text-gray-400 hover:text-brand-red text-lg leading-none w-6 h-6 flex items-center justify-center rounded-full bg-white/5 active:scale-90 transition-transform">−</button>
                      <span className="text-white font-semibold text-sm w-5 text-center">{item.cantidad}</span>
                      <button onClick={() => addToCart({ id: item.id, nombre: item.nombre, precio: item.precio })} className="text-gray-400 hover:text-brand-yellow text-lg leading-none w-6 h-6 flex items-center justify-center rounded-full bg-white/5 active:scale-90 transition-transform">+</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {cart.length > 0 && (
              <div className="border-t border-white/10 pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Total</span>
                  <span className="font-heading text-2xl text-brand-yellow">{formatPrice(cartTotal)}</span>
                </div>
                <button
                  onClick={llamarMozo}
                  disabled={cooldown > 0}
                  className={`w-full py-3 rounded-xl font-semibold text-sm active:scale-95 transition-all ${cooldown > 0 ? "bg-gray-500 text-gray-300 cursor-not-allowed opacity-60" : "bg-brand-yellow text-black"}`}
                >
                  {cooldown > 0 ? `Espera (${cooldown}s)` : "Llamar mozo"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <footer className="border-t border-white/5 mt-6">
        <div className="px-4 py-6 space-y-5">
          <div className="text-center">
            <button onClick={() => setShowAllergens(true)} className="text-gray-400 text-sm underline underline-offset-2 hover:text-brand-yellow transition-colors">
              Ver alérgenos
            </button>
          </div>

          <p className="text-center text-gray-600 text-xs">
            &copy; {new Date().getFullYear()} {tenant.nombre}. Todos los derechos reservados.
          </p>
        </div>

        {showAllergens && (
          <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/70" onClick={() => setShowAllergens(false)}>
            <div className="bg-dark-card rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-6 max-h-[70vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-heading text-2xl text-white tracking-wide">Alérgenos</h3>
                <button onClick={() => setShowAllergens(false)} className="text-gray-400 hover:text-white text-xl">✕</button>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">
                Consultá con nuestro personal sobre alérgenos e ingredientes específicos de cada producto.
                Trabajamos con trigo, lácteos, huevos, mostaza y soja en nuestra cocina.
              </p>
            </div>
          </div>
        )}

        {toast && (
          <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
        )}
      </footer>
    </div>
  );
}

export default function TenantMenu() {
  const { slug } = useParams();

  return (
    <SocketProvider tipo="cliente" slug={slug}>
      <MenuContent />
    </SocketProvider>
  );
}
