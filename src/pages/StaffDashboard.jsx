import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import { useAuth } from "../context/AuthContext";
import { api, apiPut } from "../api";
import { formatPrice } from "../lib/utils";

const SOCKET_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";

function timeAgo(iso) {
  if (!iso) return "";
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "ahora";
  const min = Math.floor(diff / 60);
  return `hace ${min} min`;
}

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("es-AR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function statusBadge(status) {
  const styles = {
    pendiente: "bg-brand-yellow text-black",
    atendida: "bg-blue-600 text-white",
    libre: "bg-green-600 text-white",
  };
  const labels = {
    pendiente: "Pendiente",
    atendida: "Atendiendo",
    libre: "Libre",
  };
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${styles[status] || "bg-gray-600 text-white"}`}>
      {labels[status] || status}
    </span>
  );
}

const statusConfig = {
  activo: { label: "Activo", color: "bg-green-500", textColor: "text-green-400" },
  break: { label: "Break", color: "bg-yellow-500", textColor: "text-yellow-400" },
  offline: { label: "Offline", color: "bg-gray-500", textColor: "text-gray-400" },
};

function EditOrderModal({ orderId, mesaNum, currentItems, menuItems, onSave, onClose }) {
  const [items, setItems] = useState(() =>
    currentItems.map((i) => ({ ...i }))
  );

  const addItem = (menuItem) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === menuItem.id);
      if (existing) return prev.map((i) => i.id === menuItem.id ? { ...i, cantidad: i.cantidad + 1 } : i);
      return [...prev, { id: menuItem.id, nombre: menuItem.nombre, precio: menuItem.precio, cantidad: 1 }];
    });
  };

  const removeItem = (itemId) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === itemId);
      if (!existing) return prev;
      if (existing.cantidad <= 1) return prev.filter((i) => i.id !== itemId);
      return prev.map((i) => i.id === itemId ? { ...i, cantidad: i.cantidad - 1 } : i);
    });
  };

  const total = items.reduce((s, i) => s + i.precio * i.cantidad, 0);

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/70" onClick={onClose}>
      <div className="bg-dark-card rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-6 max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading text-2xl text-white tracking-wide">Editar mesa #{mesaNum}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 mb-4">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between bg-dark-surface rounded-xl px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-semibold truncate">{item.nombre}</p>
                <p className="text-brand-yellow text-xs">{formatPrice(item.precio)} c/u</p>
              </div>
              <div className="flex items-center gap-3 ml-3">
                <button
                  onClick={() => removeItem(item.id)}
                  className="text-gray-400 hover:text-brand-red text-lg leading-none w-6 h-6 flex items-center justify-center rounded-full bg-white/5 active:scale-90 transition-transform"
                >−</button>
                <span className="text-white font-semibold text-sm w-5 text-center">{item.cantidad}</span>
                <button
                  onClick={() => addItem(item)}
                  className="text-gray-400 hover:text-brand-yellow text-lg leading-none w-6 h-6 flex items-center justify-center rounded-full bg-white/5 active:scale-90 transition-transform"
                >+</button>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-white/10 pt-3 mb-3">
          <p className="text-gray-400 text-xs mb-2">Agregar item del menú</p>
          <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
            {menuItems
              .filter((mi) => !items.find((i) => i.id === mi.id))
              .map((mi) => (
                <button
                  key={mi.id}
                  onClick={() => addItem(mi)}
                  className="bg-dark-surface hover:bg-brand-yellow/20 text-gray-300 hover:text-brand-yellow text-xs px-3 py-1.5 rounded-full border border-white/5 active:scale-95 transition-all"
                >
                  + {mi.nombre}
                </button>
              ))}
          </div>
        </div>

        <div className="border-t border-white/10 pt-3 flex items-center justify-between">
          <span className="text-gray-400 text-sm">Total</span>
          <span className="font-heading text-2xl text-brand-yellow">{formatPrice(total)}</span>
        </div>

        <button
          onClick={() => onSave(orderId, items)}
          className="mt-3 w-full bg-brand-yellow text-black py-3 rounded-xl font-semibold text-sm active:scale-95 transition-all"
        >
          Guardar cambios
        </button>
      </div>
    </div>
  );
}

function DerivarModal({ mesaNum, waiters, onDerivar, onClose }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/70" onClick={onClose}>
      <div className="bg-dark-card rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading text-2xl text-white tracking-wide">Derivar mesa #{mesaNum}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">✕</button>
        </div>
        <div className="space-y-2">
          {waiters.map((w) => (
            <button
              key={w.id}
              onClick={() => onDerivar(w.id)}
              className="w-full bg-dark-surface hover:bg-white/10 text-white text-left px-4 py-3 rounded-xl flex items-center gap-3 active:scale-95 transition-all"
            >
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${statusConfig[w.status]?.color || "bg-gray-500"}`} />
              <span className="font-semibold">{w.nombre}</span>
              <span className={`text-xs ml-auto ${statusConfig[w.status]?.textColor || "text-gray-400"}`}>
                {statusConfig[w.status]?.label || w.status}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function StaffDashboard() {
  const [mesas, setMesas] = useState({});
  const [socket, setSocket] = useState(null);
  const [tab, setTab] = useState("pendiente");
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [editOrder, setEditOrder] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [showMesas, setShowMesas] = useState(false);
  const [allMesas, setAllMesas] = useState([]);
  const [miStatus, setMiStatus] = useState("activo");
  const [waiters, setWaiters] = useState([]);
  const [derivar, setDerivar] = useState(null);
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && (!user || user.role !== "WAITER")) {
      navigate("/staff/login");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) return;

    api("/api/orders/menu-items").then(setMenuItems).catch(() => {});
    api("/api/mesas").then(setAllMesas).catch(() => {});
    api("/staff/status").then((d) => setMiStatus(d.status)).catch(() => {});
    api("/staff/list").then(setWaiters).catch(() => {});

    const s = io(SOCKET_URL, { auth: { token } });

    s.on("alertas-activas", (activas) => {
      const map = {};
      activas.forEach((a) => {
        const num = a.mesa;
        if (!map[num]) map[num] = { status: "pendiente", orders: [] };
        map[num].orders.push(a);
      });
      setMesas((prev) => {
        const merged = { ...prev };
        Object.entries(map).forEach(([num, data]) => {
          if (!merged[num] || merged[num].status === "libre") {
            merged[num] = data;
          } else {
            const existingIds = new Set(merged[num].orders.map((o) => o.id));
            data.orders.forEach((o) => { if (!existingIds.has(o.id)) merged[num].orders.push(o); });
          }
        });
        return merged;
      });
    });

    s.on("mesas-status", (lista) => {
      setMesas((prev) => {
        const next = { ...prev };
        lista.forEach((m) => {
          if (!next[m.numero]) next[m.numero] = { status: m.status, assignedTo: m.assignedTo, orders: [] };
          else next[m.numero] = { ...next[m.numero], status: m.status, assignedTo: m.assignedTo };
        });
        return next;
      });
      setAllMesas(lista);
    });

    s.on("nueva-alerta", (alerta) => {
      setMesas((prev) => {
        const num = alerta.mesa;
        const existing = prev[num];
        if (existing && existing.orders.find((o) => o.id === alerta.id)) return prev;
        return {
          ...prev,
          [num]: {
            status: existing?.status === "atendida" ? "atendida" : "pendiente",
            assignedTo: existing?.assignedTo || null,
            orders: existing ? [...existing.orders, alerta] : [alerta],
          },
        };
      });
    });

    s.on("mesa-status-update", ({ numero, status, assignedTo }) => {
      setMesas((prev) => {
        const m = prev[numero];
        if (!m) return { ...prev, [numero]: { status, assignedTo: assignedTo || null, orders: [] } };
        return { ...prev, [numero]: { ...m, status, assignedTo: assignedTo ?? m.assignedTo } };
      });
      setAllMesas((prev) => prev.map((m) => m.numero === numero ? { ...m, status, assignedTo: assignedTo ?? m.assignedTo } : m));
    });

    s.on("alertas-resueltas-por-mesa", ({ mesa }) => {
      setMesas((prev) => {
        const m = prev[mesa];
        if (!m) return prev;
        return { ...prev, [mesa]: { ...m, orders: [], status: "libre", assignedTo: null } };
      });
    });

    setSocket(s);
    return () => s.disconnect();
  }, [user, loading, navigate]);

  const atender = useCallback((mesa) => {
    socket?.emit("atender-mesa", { mesa: Number(mesa) });
  }, [socket]);

  const despachar = useCallback((mesa) => {
    socket?.emit("despachar-mesa", { mesa: Number(mesa) });
  }, [socket]);

  const derivarMesa = useCallback((mesa, toUserId) => {
    socket?.emit("derivar-mesa", { mesa: Number(mesa), toUserId });
    setDerivar(null);
  }, [socket]);

  const cambiarStatus = useCallback(async (status) => {
    try {
      await apiPut("/staff/status", { status });
      setMiStatus(status);
    } catch {}
  }, []);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const data = await api("/api/orders/history");
      setHistory(data);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "historial") loadHistory();
  }, [tab, loadHistory]);

  const handleEditSave = useCallback(async (orderId, items) => {
    try {
      await apiPut(`/api/orders/${orderId}`, { items });
      setEditOrder(null);
    } catch (err) {
      alert(err.message);
    }
  }, []);

  const mesasPendientes = Object.entries(mesas)
    .filter(([, m]) => m.status === "pendiente")
    .sort(([a], [b]) => Number(a) - Number(b));

  const mesasAtendiendo = Object.entries(mesas)
    .filter(([, m]) => m.status === "atendida")
    .sort(([a], [b]) => Number(a) - Number(b));

  if (loading) return <div className="min-h-screen bg-dark-bg flex items-center justify-center text-brand-yellow font-heading text-3xl animate-pulse">Cargando...</div>;

  return (
    <div className="min-h-screen bg-dark-bg pb-20">
      <header className="sticky top-0 z-50 bg-dark-bg/95 backdrop-blur-md border-b border-white/5 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl text-white tracking-wide">🛎️ Panel</h1>
          {user && <p className="text-xs text-gray-500">{user.nombre}</p>}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${statusConfig[miStatus]?.color || "bg-gray-500"}`} />
            <select
              value={miStatus}
              onChange={(e) => cambiarStatus(e.target.value)}
              className="bg-transparent text-gray-300 text-xs border border-white/10 rounded-lg px-2 py-1 focus:outline-none focus:border-brand-yellow"
            >
              {Object.entries(statusConfig).map(([key, cfg]) => (
                <option key={key} value={key} className="bg-dark-bg">{cfg.label}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => { logout(); navigate("/staff/login"); }}
            className="text-gray-400 text-sm hover:text-white transition-colors"
          >
            Salir
          </button>
        </div>
      </header>

      <div className="flex border-b border-white/5">
        <button
          onClick={() => setTab("pendiente")}
          className={`flex-1 py-3 text-sm font-semibold transition-colors ${tab === "pendiente" ? "text-brand-yellow border-b-2 border-brand-yellow" : "text-gray-500"}`}
        >
          Pendiente
          {mesasPendientes.length > 0 && (
            <span className="ml-2 bg-brand-red text-white text-xs px-2 py-0.5 rounded-full">{mesasPendientes.length}</span>
          )}
        </button>
        <button
          onClick={() => setTab("atendiendo")}
          className={`flex-1 py-3 text-sm font-semibold transition-colors ${tab === "atendiendo" ? "text-brand-yellow border-b-2 border-brand-yellow" : "text-gray-500"}`}
        >
          Atendiendo
          {mesasAtendiendo.length > 0 && (
            <span className="ml-2 bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">{mesasAtendiendo.length}</span>
          )}
        </button>
        <button
          onClick={() => setTab("historial")}
          className={`flex-1 py-3 text-sm font-semibold transition-colors ${tab === "historial" ? "text-brand-yellow border-b-2 border-brand-yellow" : "text-gray-500"}`}
        >
          Historial
        </button>
      </div>

      {tab === "pendiente" ? (
        mesasPendientes.length === 0 ? (
          <div className="flex flex-col items-center justify-center mt-32 text-gray-500">
            <span className="text-6xl mb-4">🕐</span>
            <p className="text-lg font-medium">Sin pendientes</p>
            <p className="text-sm">Las mesas pendientes aparecerán aquí</p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {mesasPendientes.map(([numero, mesa]) => {
              const orders = mesa.orders;
              const allItems = orders.flatMap((o) => {
                try { return JSON.parse(o.items || "[]"); } catch { return []; }
              });
              const total = allItems.reduce((s, i) => s + i.precio * i.cantidad, 0);
              const firstOrderId = orders.length > 0 ? orders[0].id : null;
              const lastOrder = orders[orders.length - 1];
              const assignedWaiter = waiters.find((w) => w.id === mesa.assignedTo);

              return (
                <div key={numero} className="bg-dark-card rounded-2xl border border-brand-yellow/30 p-5 animate-fade-in">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="font-heading text-4xl text-brand-yellow">#{numero}</span>
                      {statusBadge(mesa.status)}
                    </div>
                    <div className="flex gap-2">
                      {firstOrderId && allItems.length > 0 && (
                        <button
                          onClick={() => setEditOrder({ orderId: firstOrderId, mesaNum: numero, items: allItems })}
                          className="bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-xl font-semibold text-xs active:scale-95 transition-all"
                        >
                          Editar
                        </button>
                      )}
                      <button
                        onClick={() => atender(numero)}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl font-semibold text-sm active:scale-95 transition-all"
                      >
                        Atender
                      </button>
                    </div>
                  </div>

                  {allItems.length > 0 ? (
                    <div className="space-y-1.5">
                      {allItems.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm">
                          <span className="text-gray-300">
                            <span className="text-brand-yellow font-semibold mr-2">{item.cantidad}x</span>
                            {item.nombre}
                          </span>
                          <span className="text-gray-400">{formatPrice(item.precio)}</span>
                        </div>
                      ))}
                      <div className="border-t border-white/10 pt-1.5 mt-1.5 flex justify-between text-sm">
                        <span className="text-gray-400 font-medium">Total</span>
                        <span className="text-brand-yellow font-heading">{formatPrice(total)}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-400 text-sm">Mesa {numero} necesita asistencia</p>
                  )}

                  <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                    <span>Recibido: {formatDate(lastOrder?.createdAt || lastOrder?.created_at)} ({timeAgo(lastOrder?.createdAt || lastOrder?.created_at)})</span>
                    {assignedWaiter && <span>Asignado a: {assignedWaiter.nombre}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : tab === "atendiendo" ? (
        mesasAtendiendo.length === 0 ? (
          <div className="flex flex-col items-center justify-center mt-32 text-gray-500">
            <span className="text-6xl mb-4">👨‍🍳</span>
            <p className="text-lg font-medium">Sin mesas atendiendo</p>
            <p className="text-sm">Las mesas que estás atendiendo aparecerán aquí</p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {mesasAtendiendo.map(([numero, mesa]) => {
              const orders = mesa.orders;
              const allItems = orders.flatMap((o) => {
                try { return JSON.parse(o.items || "[]"); } catch { return []; }
              });
              const total = allItems.reduce((s, i) => s + i.precio * i.cantidad, 0);
              const firstOrderId = orders.length > 0 ? orders[0].id : null;
              const lastOrder = orders[orders.length - 1];
              const assignedWaiter = waiters.find((w) => w.id === mesa.assignedTo);
              const isMine = mesa.assignedTo === user?.id;

              return (
                <div key={numero} className="bg-dark-card rounded-2xl border border-blue-500/30 p-5 animate-fade-in">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="font-heading text-4xl text-brand-yellow">#{numero}</span>
                      {statusBadge(mesa.status)}
                      {isMine && <span className="text-xs bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded-full font-semibold">Tuyo</span>}
                    </div>
                    <div className="flex gap-2">
                      {firstOrderId && allItems.length > 0 && (
                        <button
                          onClick={() => setEditOrder({ orderId: firstOrderId, mesaNum: numero, items: allItems })}
                          className="bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-xl font-semibold text-xs active:scale-95 transition-all"
                        >
                          Editar
                        </button>
                      )}
                      <button
                        onClick={() => setDerivar(numero)}
                        className="bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-xl font-semibold text-xs active:scale-95 transition-all"
                      >
                        Derivar
                      </button>
                      <button
                        onClick={() => despachar(numero)}
                        className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-xl font-semibold text-sm active:scale-95 transition-all"
                      >
                        Despachar
                      </button>
                    </div>
                  </div>

                  {allItems.length > 0 ? (
                    <div className="space-y-1.5">
                      {allItems.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm">
                          <span className="text-gray-300">
                            <span className="text-brand-yellow font-semibold mr-2">{item.cantidad}x</span>
                            {item.nombre}
                          </span>
                          <span className="text-gray-400">{formatPrice(item.precio)}</span>
                        </div>
                      ))}
                      <div className="border-t border-white/10 pt-1.5 mt-1.5 flex justify-between text-sm">
                        <span className="text-gray-400 font-medium">Total</span>
                        <span className="text-brand-yellow font-heading">{formatPrice(total)}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-400 text-sm">Mesa {numero} — sin items</p>
                  )}

                  <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                    <span>Recibido: {formatDate(lastOrder?.createdAt || lastOrder?.created_at)} ({timeAgo(lastOrder?.createdAt || lastOrder?.created_at)})</span>
                    {assignedWaiter && !isMine && <span>Asignado a: {assignedWaiter.nombre}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        <div className="p-4">
          {historyLoading ? (
            <div className="flex justify-center mt-20">
              <div className="text-gray-500 animate-pulse">Cargando historial...</div>
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center mt-20 text-gray-500">
              <span className="text-6xl mb-4">📋</span>
              <p className="text-lg font-medium">Sin historial</p>
              <p className="text-sm">Los pedidos despachados aparecerán aquí</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((order) => {
                const items = (() => { try { return JSON.parse(order.items || "[]"); } catch { return []; } })();
                const total = items.reduce((s, i) => s + i.precio * i.cantidad, 0);

                return (
                  <div key={order.id} className="bg-dark-card rounded-2xl border border-white/5 p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="font-heading text-3xl text-brand-yellow">#{order.mesa}</span>
                        <span className="text-xs bg-green-600/20 text-green-400 px-2.5 py-1 rounded-full font-semibold">Despachado</span>
                      </div>
                      <span className="text-xs text-gray-500">{formatDate(order.resolvedAt)}</span>
                    </div>

                    {items.length > 0 && (
                      <div className="space-y-1.5">
                        {items.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between text-sm">
                            <span className="text-gray-300">
                              <span className="text-brand-yellow font-semibold mr-2">{item.cantidad}x</span>
                              {item.nombre}
                            </span>
                            <span className="text-gray-400">{formatPrice(item.precio)}</span>
                          </div>
                        ))}
                        <div className="border-t border-white/10 pt-1.5 mt-1.5 flex justify-between text-sm">
                          <span className="text-gray-400 font-medium">Total</span>
                          <span className="text-brand-yellow font-heading">{formatPrice(total)}</span>
                        </div>
                      </div>
                    )}

                    <div className="mt-2 text-xs text-gray-600">
                      Pedido: {formatDate(order.createdAt)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {editOrder && (
        <EditOrderModal
          orderId={editOrder.orderId}
          mesaNum={editOrder.mesaNum}
          currentItems={editOrder.items}
          menuItems={menuItems}
          onSave={handleEditSave}
          onClose={() => setEditOrder(null)}
        />
      )}

      {derivar !== null && (
        <DerivarModal
          mesaNum={derivar}
          waiters={waiters.filter((w) => w.id !== user?.id)}
          onDerivar={(toUserId) => derivarMesa(derivar, toUserId)}
          onClose={() => setDerivar(null)}
        />
      )}

      <button
        onClick={() => setShowMesas(true)}
        className="fixed bottom-6 left-6 z-50 bg-dark-card border border-white/10 text-white px-4 py-3 rounded-2xl shadow-2xl active:scale-95 transition-all flex items-center gap-2"
      >
        <span className="text-lg">🪑</span>
        <span className="text-sm font-semibold">Mesas</span>
        <span className="text-xs bg-green-600/20 text-green-400 px-2 py-0.5 rounded-full">{allMesas.filter((m) => m.status === "libre").length}</span>
      </button>

      {showMesas && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/70" onClick={() => setShowMesas(false)}>
          <div className="bg-dark-card rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-6 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-2xl text-white tracking-wide">🪑 Mesas</h3>
              <button onClick={() => setShowMesas(false)} className="text-gray-400 hover:text-white text-xl">✕</button>
            </div>

            {allMesas.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No hay mesas configuradas</p>
            ) : (
              <div className="grid grid-cols-5 gap-2">
                {allMesas.map((mesa) => {
                  const statusColors = {
                    libre: "bg-green-600/20 text-green-400 border-green-600/30",
                    pendiente: "bg-brand-yellow/20 text-brand-yellow border-brand-yellow/30",
                    atendida: "bg-blue-600/20 text-blue-400 border-blue-600/30",
                  };
                  const statusLabels = {
                    libre: "Libre",
                    pendiente: "Pendiente",
                    atendida: "Atendida",
                  };
                  return (
                    <div
                      key={mesa.numero}
                      className={`aspect-square rounded-xl border flex flex-col items-center justify-center text-sm font-semibold ${statusColors[mesa.status] || "bg-gray-600/20 text-gray-400 border-gray-600/30"}`}
                    >
                      <span className="text-lg">{mesa.numero}</span>
                      <span className="text-[10px] mt-0.5 opacity-80">{statusLabels[mesa.status]}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
