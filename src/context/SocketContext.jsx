import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";

const SocketContext = createContext(null);

export function SocketProvider({ tipo = "cliente", slug, children }) {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const opts = {};

    if (tipo === "cliente" && slug) {
      opts.query = { slug };
    }

    if (tipo === "staff") {
      const token = localStorage.getItem("token");
      if (token) opts.auth = { token };
    }

    const s = io(SOCKET_URL, opts);
    setSocket(s);
    return () => s.disconnect();
  }, [tipo, slug]);

  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
