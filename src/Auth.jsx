import { useState } from "react";
import { supabase } from "./supabase";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handle = async () => {
    setLoading(true);
    setMessage("");
    const { error } = isLogin
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });
    if (error) setMessage(error.message);
    else if (!isLogin) setMessage("Check your email to confirm your account.");
    setLoading(false);
  };

  const inp = "w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-indigo-500";

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-white">FriedSoda Music</h1>
          <p className="text-gray-500 text-sm mt-1">Sync Metadata Manager</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-gray-200">{isLogin ? "Sign in to your account" : "Create an account"}</h2>
          <input value={email} onChange={e => setEmail(e.target.value)}
            placeholder="Email" type="email" className={inp} />
          <input value={password} onChange={e => setPassword(e.target.value)}
            placeholder="Password" type="password" className={inp} />
          {message && <p className="text-xs text-indigo-400">{message}</p>}
          <button onClick={handle} disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-semibold transition-colors">
            {loading ? "Loading..." : isLogin ? "Sign In" : "Sign Up"}
          </button>
          <button onClick={() => { setIsLogin(!isLogin); setMessage(""); }}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}