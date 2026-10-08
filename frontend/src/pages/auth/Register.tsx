import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../../lib/api";

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    phone: "",
    email: "",
    username: "",
    displayName: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.auth.register(form);
      // Store userId for verification flow
      sessionStorage.setItem("noris_reg_userId", res.userId);
      navigate("/verify-phone");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const update = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <div className="flex h-full w-full items-center justify-center bg-noris-500 p-4 overflow-y-auto">
      <div className="w-full max-w-sm bg-white dark:bg-[#17212b] rounded-2xl shadow-2xl p-8 my-8 animate-slide-up">
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-noris-500 flex items-center justify-center mb-3">
            <svg viewBox="0 0 100 100" className="w-10 h-10">
              <path d="M50 22 C33 22 20 33 20 48 C20 54 22 60 26 64 L22 78 L38 74 C42 76 46 76 50 76 C67 76 80 65 80 50 C80 35 67 22 50 22 Z" fill="white"/>
              <circle cx="38" cy="48" r="4" fill="#0088cc"/>
              <circle cx="50" cy="48" r="4" fill="#0088cc"/>
              <circle cx="62" cy="48" r="4" fill="#0088cc"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create account</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Join Noris messaging</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="tel"
            placeholder="Phone number (with country code)"
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-gray-100 dark:bg-[#0e1621] text-gray-900 dark:text-white border border-transparent focus:border-noris-500 transition"
            required
          />
          <input
            type="email"
            placeholder="Email address"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-gray-100 dark:bg-[#0e1621] text-gray-900 dark:text-white border border-transparent focus:border-noris-500 transition"
            required
          />
          <input
            type="text"
            placeholder="Username"
            value={form.username}
            onChange={(e) => update("username", e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-gray-100 dark:bg-[#0e1621] text-gray-900 dark:text-white border border-transparent focus:border-noris-500 transition"
            required
          />
          <input
            type="text"
            placeholder="Display name"
            value={form.displayName}
            onChange={(e) => update("displayName", e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-gray-100 dark:bg-[#0e1621] text-gray-900 dark:text-white border border-transparent focus:border-noris-500 transition"
            required
          />
          <input
            type="password"
            placeholder="Password (optional)"
            value={form.password}
            onChange={(e) => update("password", e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-gray-100 dark:bg-[#0e1621] text-gray-900 dark:text-white border border-transparent focus:border-noris-500 transition"
          />

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-noris-500 text-white font-semibold hover:bg-noris-600 transition disabled:opacity-50"
          >
            {loading ? "Creating..." : "Continue"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
          Already have an account?{" "}
          <Link to="/login" className="text-noris-500 font-semibold hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
