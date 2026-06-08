"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthProvider";
import { useRouter } from "next/navigation";
import { Mail, Lock, ShieldCheck, Fingerprint } from "lucide-react";
import Link from "next/link";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { motion } from "framer-motion";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { loginWithGoogle } = useAuth();
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/");
    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      setError(err.message.includes("auth/user-not-found") ? "Node identification failed. Credentials mismatch." : err.message);
    } finally {
      setLoading(false);
    }
  };

  const onGoogleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      await loginWithGoogle();
      router.push("/");
    } catch {
      setError("External relay failed. Please try manual entry.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-6 font-sans selection:bg-accent-pink/30 overflow-hidden relative">
      {/* Dynamic Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
         <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent-pink/10 blur-[120px] rounded-full"></div>
         <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent-blue/10 blur-[120px] rounded-full"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full z-10"
      >
        <div className="bg-zinc-900/40 backdrop-blur-3xl p-10 rounded-[32px] border border-white/5 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)]">
          <div className="text-center mb-10">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center justify-center w-20 h-20 mb-6 bg-gradient-to-br from-accent-pink to-accent-blue rounded-[28px] text-white shadow-lg shadow-accent-pink/20 relative group"
            >
              <Fingerprint className="w-10 h-10 group-hover:scale-110 transition-transform duration-500" />
              <div className="absolute -inset-1 bg-accent-pink/20 rounded-[30px] blur opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </motion.div>
            <h2 className="text-4xl font-black text-white tracking-tight mb-2">Zenjoy <span className="text-accent-pink">v3.0</span></h2>
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">SECURE COMMUNICATION NODE</p>
          </div>

          <form className="space-y-5" onSubmit={handleLogin}>
            <div className="space-y-4">
              <div className="group relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-accent-pink text-zinc-500">
                  <Mail className="h-5 w-5" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-12 pr-4 py-4 bg-zinc-950/50 border border-white/10 rounded-[20px] text-white placeholder-zinc-600 focus:outline-none focus:border-accent-pink/50 focus:ring-4 focus:ring-accent-pink/10 transition-all font-medium text-sm"
                  placeholder="Relay Handle (Email)"
                />
              </div>
              <div className="group relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-accent-pink text-zinc-500">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-12 pr-4 py-4 bg-zinc-950/50 border border-white/10 rounded-[20px] text-white placeholder-zinc-600 focus:outline-none focus:border-accent-pink/50 focus:ring-4 focus:ring-accent-pink/10 transition-all font-medium text-sm"
                  placeholder="Access Fragment (Password)"
                />
              </div>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-red-400 text-[11px] text-center font-bold bg-red-500/10 border border-red-500/20 py-2.5 rounded-xl uppercase tracking-wider"
              >
                {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-4 px-6 rounded-[22px] text-white bg-accent-pink hover:bg-accent-pink-hover font-black text-xs uppercase tracking-widest shadow-xl shadow-accent-pink/20 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {loading ? "Authenticating..." : "Establish Connection"}
            </button>
          </form>

          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/5"></div>
              </div>
              <div className="relative flex justify-center text-[10px]">
                <span className="px-4 bg-transparent text-zinc-600 font-bold uppercase tracking-widest">External Relay</span>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={onGoogleLogin}
                className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-[20px] bg-white/5 border border-white/5 text-sm font-black text-white hover:bg-white/10 transition-all active:scale-[0.98]"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="h-5 w-5" />
                <span className="uppercase tracking-widest text-[10px]">Google Protocol</span>
              </button>
            </div>
          </div>

          <p className="mt-10 text-center text-xs font-bold text-zinc-500">
            Node NOT registered?{" "}
            <Link href="/signup" className="text-accent-pink hover:text-accent-pink-hover underline underline-offset-4 decoration-2 decoration-accent-pink/30">
              Generate New ID
            </Link>
          </p>
        </div>
        
        {/* Security Footer */}
        <div className="mt-8 flex items-center justify-center gap-2 text-zinc-700">
           <ShieldCheck className="w-4 h-4 text-accent-pink" />
           <span className="text-[10px] font-black uppercase tracking-[0.2em]">End-to-End Encrypted Relay</span>
        </div>
      </motion.div>
    </div>
  );
}
