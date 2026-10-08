import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuthStore } from "../../store/auth";
import { api } from "../../lib/api";

export default function Login() {
  const navigate = useNavigate();
  const { setUser } = useAuthStore();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.auth.login({ identifier, password });
      localStorage.setItem("noris_token", res.token);
      localStorage.setItem("noris_session", res.sessionToken);
      setUser(res.user);
      navigate("/");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full w-full items-center justify-center bg-noris-500 p-4">
      <div className="w-full max-w-sm bg-white dark:bg-[#17212b] rounded-2xl shadow-2xl p-8 animate-slide-up">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-noris-500 flex items-center justify-center mb-3">
            <svg viewBox="0 0 100 100" className="w-10 h-10">
              <path d="M50 22 C33 22 20 33 20 48 C20 54 22 60 26 64 L22 78 L38 74 C42 76 46 76 50 76 C67 76 80 65 80 50 C80 35 67 22 50 22 Z" fill="white"/>
              <circle cx="38" cy="48" r="4" fill="#0088cc"/>
              <circle cx="50" cy="48" r="4" fill="#0088cc"/>
              <circle cx="62" cy="48" r="4" fill="#0088cc"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Welcome back</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Sign in to your Noris account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              placeholder="Phone number or email"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-gray-100 dark:bg-[#0e1621] text-gray-900 dark:text-white border border-transparent focus:border-noris-500 transition"
              required
            />
          </div>
          <div>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-gray-100 dark:bg-[#0e1621] text-gray-900 dark:text-white border border-transparent focus:border-noris-500 transition"
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-noris-500 text-white font-semibold hover:bg-noris-600 transition disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
          Don't have an account?{" "}
          <Link to="/register" className="text-noris-500 font-semibold hover:underline">
            Sign up
          </Link>
        </p>

        <div className="mt-6 p-3 rounded-lg bg-gray-50 dark:bg-[#0e1621] text-xs text-gray-500 dark:text-gray-400">
          <p className="font-semibold mb-1">Demo accounts:</p>
          <p>demo@noris.app / demo123</p>
          <p>admin@noris.app / admin123</p>
        </div>
      </div>
    </div>
  );
}
