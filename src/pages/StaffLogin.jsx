import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiPost } from "../api";
import { useAuth } from "../context/AuthContext";

export default function StaffLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const data = await apiPost("/auth/login", { email, password });
      login(data.token, data.user);

      if (data.user.role === "WAITER") navigate("/staff/dashboard");
      else if (data.user.role === "OWNER") navigate("/app/panel");
      else if (data.user.role === "SUPER_ADMIN") navigate("/app/admin");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="bg-dark-card rounded-2xl p-8 w-full max-w-sm border border-white/5 space-y-6"
      >
        <div className="text-center">
          <h1 className="font-heading text-4xl text-white tracking-wide">
            Staff
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Iniciar sesión — Big Fat Burger
          </p>
        </div>

        {error && (
          <div className="bg-brand-red/20 text-brand-red text-sm px-4 py-2 rounded-lg text-center">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-dark-surface text-white px-4 py-3 rounded-xl border border-white/10 focus:outline-none focus:border-brand-yellow transition-colors placeholder:text-gray-500"
            autoFocus
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-dark-surface text-white px-4 py-3 rounded-xl border border-white/10 focus:outline-none focus:border-brand-yellow transition-colors placeholder:text-gray-500"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-brand-yellow text-black font-semibold py-3 rounded-xl hover:brightness-110 active:scale-[0.98] transition-all"
        >
          Ingresar
        </button>
      </form>
    </div>
  );
}
