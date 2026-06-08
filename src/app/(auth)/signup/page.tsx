"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Mail, Lock, User, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { motion } from "framer-motion";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(res.user, { displayName: name });
      
      // Store user info in Firestore
      await setDoc(doc(db, "users", res.user.uid), {
        uid: res.user.uid,
        name,
        email,
        photoURL: "",
        status: "online",
        lastSeen: new Date()
      });

      router.push("/");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6 font-sans selection:bg-accent-primary/30 overflow-hidden relative">
      {/* Soft Pastel Background Blobs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
         <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent-primary/20 dark:bg-accent-primary/5 blur-[120px] rounded-full"></div>
         <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent-primary/20 dark:bg-accent-primary/5 blur-[120px] rounded-full"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full z-10"
      >
        <div className="bg-white dark:bg-zinc-900/80 backdrop-blur-xl p-10 rounded-[32px] border border-zinc-200 dark:border-zinc-800 shadow-2xl shadow-zinc-200/50 dark:shadow-none">
          <div className="text-center mb-10">
            <motion.div 
              initial={{ rotate: -10, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center justify-center w-20 h-20 mb-6 bg-gradient-to-br from-accent-primary to-accent-primary rounded-[28px] text-white shadow-lg shadow-accent-primary/20"
            >
              <UserPlus className="w-10 h-10" />
            </motion.div>
            <h2 className="text-3xl font-black text-foreground tracking-tight mb-2">Create an account</h2>
            <p className="text-sm font-medium text-text-muted">Join Zenjoy and start collaborating</p>
          </div>

          <form className="space-y-5" onSubmit={handleSignup}>
            <div className="space-y-4">
              <div className="group relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-accent-primary text-zinc-400">
                  <User className="h-5 w-5" />
                </div>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full pl-12 pr-4 py-3.5 bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-foreground placeholder-zinc-400 focus:outline-none focus:border-accent-primary/50 focus:ring-4 focus:ring-accent-primary/10 transition-all font-medium text-sm"
                  placeholder="Full name"
                />
              </div>
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
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
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
              {loading ? "Creating account..." : "Sign up"}
            </button>
          </form>

          <p className="mt-8 text-center text-sm font-medium text-text-muted">
            Already have an account?{" "}
            <Link href="/login" className="text-accent-primary hover:text-accent-primary-hover font-bold transition-colors">
              Sign in
            </Link>
          </p>
        </div>
        
        {/* Security Footer */}
        <div className="mt-8 flex items-center justify-center gap-2 text-text-muted">
           <ShieldCheck className="w-4 h-4 text-accent-primary" />
           <span className="text-[11px] font-bold uppercase tracking-wider">Secure Team Registration</span>
        </div>
      </motion.div>
    </div>
  );
}
