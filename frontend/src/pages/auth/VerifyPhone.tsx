import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api";

export default function VerifyPhone() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const userId = sessionStorage.getItem("noris_reg_userId");

  if (!userId) {
    navigate("/register");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.auth.verifyPhone({ userId, code });
      sessionStorage.setItem("noris_email_otp", res.devOtp || "");
      navigate("/verify-email");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await api.auth.resendOtp({ userId, type: "phone" });
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="flex h-full w-full items-center justify-center bg-noris-500 p-4">
      <div className="w-full max-w-sm bg-white dark:bg-[#17212b] rounded-2xl shadow-2xl p-8 animate-slide-up">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Verify phone</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Enter the 6-digit code sent to your phone number.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            className="w-full px-4 py-4 rounded-xl bg-gray-100 dark:bg-[#0e1621] text-gray-900 dark:text-white text-center text-2xl tracking-[0.5em] font-bold border border-transparent focus:border-noris-500 transition"
            required
          />

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="w-full py-3 rounded-xl bg-noris-500 text-white font-semibold hover:bg-noris-600 transition disabled:opacity-50"
          >
            {loading ? "Verifying..." : "Verify"}
          </button>
        </form>

        <button onClick={handleResend} className="w-full mt-4 text-sm text-noris-500 hover:underline">
          Resend code
        </button>
      </div>
    </div>
  );
}
