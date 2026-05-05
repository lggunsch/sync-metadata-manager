import { useState, useEffect } from "react";
import { supabase } from "./supabase";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
  }, []);

const handleReset = async () => {
  if (password !== confirm) return setMessage("Passwords don't match.");
  if (password.length < 6) return setMessage("Password must be at least 6 characters.");
  setLoading(true);
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    setMessage(error.message);
    setLoading(false);
  } else {
    setMessage("Password updated successfully. Redirecting...");
    await supabase.auth.signOut();
    setTimeout(() => { window.location.href = '/'; }, 1500);
  }
};

  const inp = "w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-brand-yellow";

  if (!ready) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-400">
      Verifying reset link...
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-white">FriedSoda Music</h1>
          <p className="text-gray-500 text-sm mt-1">Reset your password</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 flex flex-col gap-4">
          <input value={password} onChange={e => setPassword(e.target.value)}
            placeholder="New password" type="password" className={inp} />
          <input value={confirm} onChange={e => setConfirm(e.target.value)}
            placeholder="Confirm new password" type="password" className={inp} />
          {message && <p className="text-xs text-brand-yellow/75">{message}</p>}
          <button onClick={handleReset} disabled={loading}
            className="bg-brand-yellow hover:bg-brand-yellow disabled:opacity-50 text-brand-navy py-2 rounded-lg text-sm font-semibold transition-colors">
            {loading ? "Updating..." : "Update Password"}
          </button>
        </div>
      </div>
    </div>
  );
}