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
    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-6 font-sans selection:bg-accent-pink/30 overflow-hidden relative">
      {/* Dynamic Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
         <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent-pink/10 blur-[120px] rounded-full"></div>
         <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent-blue/10 blur-[120px] rounded-full"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full z-10"
      >
        <div className="bg-zinc-900/40 backdrop-blur-3xl p-10 rounded-[32px] border border-white/5 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)]">
          <div className="text-center mb-10">
            <motion.div 
              initial={{ rotate: -10, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center justify-center w-20 h-20 mb-6 bg-gradient-to-br from-accent-pink to-accent-blue rounded-[28px] text-white shadow-lg shadow-accent-pink/20"
            >
              <UserPlus className="w-10 h-10" />
            </motion.div>
            <h2 className="text-4xl font-black text-white tracking-tight mb-2">Initialize <span className="text-accent-pink">Node</span></h2>
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">SECURE IDENTITY REGISTRATION</p>
          </div>

          <form className="space-y-4" onSubmit={handleSignup}>
            <div className="space-y-4">
              <div className="group relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-accent-pink text-zinc-500">
                  <User className="h-5 w-5" />
                </div>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full pl-12 pr-4 py-4 bg-zinc-950/50 border border-white/10 rounded-[20px] text-white placeholder-zinc-600 focus:outline-none focus:border-accent-pink/50 focus:ring-4 focus:ring-accent-pink/10 transition-all font-medium text-sm"
                  placeholder="Identity Label (Name)"
                />
              </div>
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
                  placeholder="Secret Fragment (Password)"
                />
              </div>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
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
              {loading ? "Initializing..." : "Create Security Node"}
            </button>
          </form>

          <p className="mt-10 text-center text-xs font-bold text-zinc-500">
            Already have a Node?{" "}
            <Link href="/login" className="text-accent-pink hover:text-accent-pink-hover underline underline-offset-4 decoration-2 decoration-accent-pink/30">
              Access Existing Hub
            </Link>
          </p>
        </div>
        
        {/* Security Footer */}
        <div className="mt-8 flex items-center justify-center gap-2 text-zinc-700">
           <ShieldCheck className="w-4 h-4 text-accent-pink" />
           <span className="text-[10px] font-black uppercase tracking-[0.2em]">Quantum-Ready Security Layer</span>
        </div>
      </motion.div>
    </div>
  );
}
