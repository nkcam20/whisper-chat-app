"use client";

import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Camera, Save, Palette, User, Trash2 } from "lucide-react";
import { useTheme, ThemeColor } from "@/context/ThemeProvider";
import { useAuth } from "@/context/AuthProvider";
import { updateProfile } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function SettingsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { themeColor, setThemeColor } = useTheme();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"profile" | "appearance">("profile");
  
  // Profile State
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [avatarPreview, setAvatarPreview] = useState(user?.photoURL || "");
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Convert to base64 for preview and simple saving (to avoid Storage Rules issues)
    const reader = new FileReader();
    reader.onload = (event) => {
      setAvatarPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateProfile(user, {
        displayName,
        photoURL: avatarPreview,
      });

      await updateDoc(doc(db, "users", user.uid), {
        name: displayName,
        photoURL: avatarPreview,
      });

      onClose();
    } catch (error) {
      console.error("Failed to update profile", error);
    } finally {
      setSaving(false);
    }
  };

  const themes: { id: ThemeColor; label: string; color: string }[] = [
    { id: "violet", label: "Violet", color: "bg-violet-500" },
    { id: "emerald", label: "Emerald", color: "bg-emerald-500" },
    { id: "blue", label: "Blue", color: "bg-blue-500" },
    { id: "rose", label: "Rose", color: "bg-rose-500" },
    { id: "amber", label: "Amber", color: "bg-amber-500" },
    { id: "slate", label: "Slate", color: "bg-slate-500" },
  ];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl flex overflow-hidden border border-zinc-200 dark:border-zinc-800 h-[500px]"
          >
            {/* Sidebar */}
            <div className="w-64 bg-zinc-50 dark:bg-zinc-950 p-6 border-r border-zinc-200 dark:border-zinc-800">
              <h2 className="text-xl font-bold mb-6 text-foreground">Settings</h2>
              <nav className="space-y-2">
                <button 
                  onClick={() => setActiveTab("profile")}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    activeTab === "profile" 
                      ? "bg-accent-primary text-white" 
                      : "text-text-muted hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 hover:text-foreground"
                  }`}
                >
                  <User className="w-4 h-4" /> My Account
                </button>
                <button 
                  onClick={() => setActiveTab("appearance")}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    activeTab === "appearance" 
                      ? "bg-accent-primary text-white" 
                      : "text-text-muted hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 hover:text-foreground"
                  }`}
                >
                  <Palette className="w-4 h-4" /> Appearance
                </button>
              </nav>
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col relative">
              <button 
                onClick={onClose}
                className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-foreground rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="p-8 flex-1 overflow-y-auto">
                {activeTab === "profile" && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div>
                      <h3 className="text-lg font-bold text-foreground mb-1">My Account</h3>
                      <p className="text-sm text-text-muted">Manage your profile details and display picture.</p>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                        <div className="w-24 h-24 rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 ring-4 ring-zinc-100 dark:ring-zinc-800 shadow-md">
                          {avatarPreview ? (
                            <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-12 h-12 text-zinc-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                          )}
                        </div>
                        <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Camera className="w-6 h-6 text-white" />
                        </div>
                        <input 
                          type="file" 
                          ref={fileInputRef} 
                          className="hidden" 
                          accept="image/*"
                          onChange={handleImageChange}
                        />
                      </div>
                      <div className="flex-1 space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Display Name</label>
                          <input 
                            type="text" 
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 transition-all text-foreground"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-6 mt-6 border-t border-zinc-200 dark:border-zinc-800 flex justify-end">
                      <button 
                        onClick={saveProfile}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-2.5 bg-accent-primary hover:bg-accent-primary-hover text-white rounded-xl text-sm font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50"
                      >
                        {saving ? "Saving..." : <><Save className="w-4 h-4" /> Save Changes</>}
                      </button>
                    </div>
                  </div>
                )}

                {activeTab === "appearance" && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div>
                      <h3 className="text-lg font-bold text-foreground mb-1">Appearance</h3>
                      <p className="text-sm text-text-muted">Customize the look and feel of your workspace.</p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-4">Theme Color</label>
                      <div className="grid grid-cols-3 gap-4">
                        {themes.map((t) => (
                          <button
                            key={t.id}
                            onClick={() => setThemeColor(t.id)}
                            className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                              themeColor === t.id 
                                ? "border-accent-primary bg-accent-primary/5" 
                                : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                            }`}
                          >
                            <span className={`w-6 h-6 rounded-full ${t.color} shadow-sm ring-2 ring-offset-2 ring-offset-white dark:ring-offset-zinc-900 ${themeColor === t.id ? "ring-accent-primary" : "ring-transparent"}`} />
                            <span className="text-sm font-bold text-foreground">{t.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
