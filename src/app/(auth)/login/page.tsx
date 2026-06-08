"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthProvider";
import { useRouter } from "next/navigation";
import { Mail, Lock, ShieldCheck, Sparkles } from "lucide-react";
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
    } catch (err: any) {
      setError(err.message.includes("auth/user-not-found") ? "Invalid email or password." : err.message);
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
      setError("Google sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6 font-sans selection:bg-accent-primary/30 overflow-hidden relative">
      {/* Soft Pastel Background Blobs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
         <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent-primary/20 dark:bg-accent-primary/5 blur-[120px] rounded-full"></div>
         <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent-primary/20 dark:bg-accent-primary/5 blur-[120px] rounded-full"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full z-10"
      >
        <div className="bg-white dark:bg-zinc-900/80 backdrop-blur-xl p-10 rounded-[32px] border border-zinc-200 dark:border-zinc-800 shadow-2xl shadow-zinc-200/50 dark:shadow-none">
          <div className="text-center mb-10">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center justify-center w-20 h-20 mb-6 bg-gradient-to-br from-accent-primary to-accent-primary rounded-[28px] text-white shadow-lg shadow-accent-primary/20 relative group"
            >
              <Sparkles className="w-10 h-10 group-hover:scale-110 transition-transform duration-500" />
            </motion.div>
            <h2 className="text-3xl font-black text-foreground tracking-tight mb-2">Welcome back</h2>
            <p className="text-sm font-medium text-text-muted">Sign in to continue to Zenjoy</p>
          </div>

          <form className="space-y-5" onSubmit={handleLogin}>
            <div className="space-y-4">
              <div className="group relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-accent-primary text-zinc-400">
                  <Mail className="h-5 w-5" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-12 pr-4 py-3.5 bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-foreground placeholder-zinc-400 focus:outline-none focus:border-accent-primary/50 focus:ring-4 focus:ring-accent-primary/10 transition-all font-medium text-sm"
                  placeholder="Email address"
                />
              </div>
              <div className="group relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-accent-primary text-zinc-400">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-12 pr-4 py-3.5 bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-foreground placeholder-zinc-400 focus:outline-none focus:border-accent-primary/50 focus:ring-4 focus:ring-accent-primary/10 transition-all font-medium text-sm"
                  placeholder="Password"
                />
              </div>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-red-600 dark:text-red-400 text-xs text-center font-bold bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 py-3 rounded-xl"
              >
                {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-3.5 px-6 rounded-2xl text-white bg-accent-primary hover:bg-accent-primary-hover font-black text-sm shadow-xl shadow-accent-primary/20 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-200 dark:border-zinc-800"></div>
              </div>
              <div className="relative flex justify-center text-[10px]">
                <span className="px-4 bg-white dark:bg-zinc-900 text-zinc-500 font-bold uppercase tracking-widest">Or continue with</span>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={onGoogleLogin}
                className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm text-sm font-bold text-foreground hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all active:scale-[0.98]"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="h-5 w-5" />
                <span>Google</span>
              </button>
            </div>
          </div>

          <p className="mt-8 text-center text-sm font-medium text-text-muted">
            Don't have an account?{" "}
            <Link href="/signup" className="text-accent-primary hover:text-accent-primary-hover font-bold transition-colors">
              Sign up
            </Link>
          </p>
        </div>
        
        {/* Security Footer */}
        <div className="mt-8 flex items-center justify-center gap-2 text-text-muted">
           <ShieldCheck className="w-4 h-4 text-accent-primary" />
           <span className="text-[11px] font-bold uppercase tracking-wider">End-to-End Encrypted Platform</span>
        </div>
      </motion.div>
    </div>
  );
}
