import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import { useAuth } from "../context/AuthContext";
import { formatPrice } from "../lib/utils";

const SOCKET_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";

function timeAgo(iso) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "ahora";
  const min = Math.floor(diff / 60);
  return `hace ${min} min`;
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

export default function StaffDashboard() {
  const [mesas, setMesas] = useState({}); // { [numero]: { status, orders: [] } }
  const [socket, setSocket] = useState(null);
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && (!user || user.role !== "WAITER")) {
      navigate("/staff/login");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) return;

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
          if (!next[m.numero]) next[m.numero] = { status: m.status, orders: [] };
          else next[m.numero] = { ...next[m.numero], status: m.status };
        });
        return next;
      });
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
            orders: existing ? [...existing.orders, alerta] : [alerta],
          },
        };
      });
    });

    s.on("mesa-status-update", ({ numero, status }) => {
      setMesas((prev) => {
        const m = prev[numero];
        if (!m) return { ...prev, [numero]: { status, orders: [] } };
        return { ...prev, [numero]: { ...m, status } };
      });
    });

    s.on("alertas-resueltas-por-mesa", ({ mesa }) => {
      setMesas((prev) => {
        const m = prev[mesa];
        if (!m) return prev;
        return { ...prev, [mesa]: { ...m, orders: [], status: "libre" } };
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

  const mesasList = Object.entries(mesas)
    .filter(([, m]) => m.status !== "libre" || m.orders.length > 0)
    .sort(([a], [b]) => Number(a) - Number(b));

  if (loading) return <div className="min-h-screen bg-dark-bg flex items-center justify-center text-brand-yellow font-heading text-3xl animate-pulse">Cargando...</div>;

  return (
    <div className="min-h-screen bg-dark-bg">
      <header className="sticky top-0 z-50 bg-dark-bg/95 backdrop-blur-md border-b border-white/5 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl text-white tracking-wide">
            🛎️ Mesas
            {mesasList.length > 0 && (
              <span className="ml-2 text-sm font-body bg-brand-red text-white px-2 py-0.5 rounded-full align-middle">
                {mesasList.length}
              </span>
            )}
          </h1>
          {user && <p className="text-xs text-gray-500">{user.nombre}</p>}
        </div>
        <button
          onClick={() => { logout(); navigate("/staff/login"); }}
          className="text-gray-400 text-sm hover:text-white transition-colors"
        >
          Salir
        </button>
      </header>

      {mesasList.length === 0 ? (
        <div className="flex flex-col items-center justify-center mt-32 text-gray-500">
          <span className="text-6xl mb-4">🛎️</span>
          <p className="text-lg font-medium">Sin novedades</p>
          <p className="text-sm">Las mesas aparecerán aquí cuando llamen</p>
        </div>
      ) : (
        <div className="p-4 space-y-3">
          {mesasList.map(([numero, mesa]) => {
            const pendingOrders = mesa.orders;
            const allItems = pendingOrders.flatMap((o) => {
              try { return JSON.parse(o.items || "[]"); } catch { return []; }
            });
            const total = allItems.reduce((s, i) => s + i.precio * i.cantidad, 0);

            return (
              <div
                key={numero}
                className={`bg-dark-card rounded-2xl border p-5 animate-fade-in ${mesa.status === "pendiente" ? "border-brand-yellow/30" : "border-blue-500/30"}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="font-heading text-4xl text-brand-yellow">#{numero}</span>
                    {statusBadge(mesa.status)}
                  </div>
                  <div className="flex gap-2">
                    {mesa.status === "pendiente" && (
                      <button
                        onClick={() => atender(numero)}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl font-semibold text-sm active:scale-95 transition-all"
                      >
                        Atender
                      </button>
                    )}
                    {mesa.status === "atendida" && (
                      <button
                        onClick={() => despachar(numero)}
                        className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-xl font-semibold text-sm active:scale-95 transition-all"
                      >
                        Despachar
                      </button>
                    )}
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

                {pendingOrders.length > 0 && (
                  <div className="mt-2 text-xs text-gray-500">
                    Último pedido: {timeAgo(pendingOrders[pendingOrders.length - 1].createdAt || pendingOrders[pendingOrders.length - 1].created_at)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
