import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <span className="text-8xl block mb-6">🍔</span>
        <h1 className="font-heading text-6xl text-white tracking-wide mb-2">404</h1>
        <p className="text-gray-400 text-lg mb-8">Esta página no está en el menú</p>
        <Link
          to="/"
          className="inline-block bg-brand-yellow text-black font-semibold px-8 py-3 rounded-xl active:scale-95 transition-all hover:bg-brand-yellow/90"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
