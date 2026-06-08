"use client";

import React, { useState, useRef, useEffect } from "react";
import { useSendMessage } from "@/hooks/useChat";
import { Send, Smile, Paperclip, X, Loader2, ShieldAlert } from "lucide-react";
import EmojiPicker, { Theme } from "emoji-picker-react";
import { storage, legacyStorage } from "@/lib/firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { motion, AnimatePresence } from "framer-motion";

export default function MessageInput({ chatId }: { chatId: string }) {
  const [text, setText] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [filePreview, setFilePreview] = useState<{ url: string; file: File } | null>(null);
  const [error, setError] = useState("");
  const { sendMessage: postMessage } = useSendMessage();
  const inputRef = useRef<HTMLInputElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);

  // Close emoji picker on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
        setShowEmoji(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() && !filePreview) return;

    setUploading(true);
    setProgress(0);
    setError("");
    
    try {
      let mediaUrl = "";
      let type: "text" | "image" | "file" = "text";

      if (filePreview) {
        if (!storage) {
          alert("TECHNICAL ERROR: Storage was not initialized. Check your Firebase Project Config.");
          throw new Error("Storage Init Failed");
        }

        console.log("📤 Attempting upload to bucket:", storage.app.options.storageBucket);

        try {
          const fileName = `${Date.now()}_${filePreview.file.name}`;
          const fileRef = ref(storage, `chats/${chatId}/${fileName}`);
          const uploadTask = uploadBytesResumable(fileRef, filePreview.file);

          mediaUrl = await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error("Primary cluster timeout")), 15000); // 15s primary
            
            uploadTask.on('state_changed', 
              (snap) => setProgress((snap.bytesTransferred / snap.totalBytes) * 100), 
              (err) => { clearTimeout(timeout); reject(err); }, 
              async () => {
                clearTimeout(timeout);
                const url = await getDownloadURL(uploadTask.snapshot.ref);
                resolve(url);
              }
            );
          });
          type = filePreview.file.type.startsWith("image") ? "image" : "file";
        } catch (storageErr: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
          console.warn("⚠️ Primary cluster failed. Switching to Satellite Cluster...", storageErr);
          
          if (!legacyStorage) throw storageErr; 

          // SATELLITE RESCUE UPLOAD 🛰️
          try {
             const legacyRef = ref(legacyStorage, `chats/${chatId}/${Date.now()}_${filePreview.file.name}`);
             const legacyTask = uploadBytesResumable(legacyRef, filePreview.file);
             
             mediaUrl = await new Promise((resolve, reject) => {
                const t = setTimeout(() => reject(new Error("Storage Blocked")), 10000);
                legacyTask.on('state_changed', 
                   (s) => setProgress((s.bytesTransferred / s.totalBytes) * 100), 
                   (err) => { clearTimeout(t); reject(err); }, 
                   async () => {
                      clearTimeout(t);
                      const url = await getDownloadURL(legacyTask.snapshot.ref);
                      resolve(url);
                   });
             });
             type = filePreview.file.type.startsWith("image") ? "image" : "file";
          } catch (e: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
             console.warn("🛡️ ALL STORAGE BLOCKED. ACTIVATING BASE64 NUCLEAR OPTION...");
             
             // UNSTOPPABLE BASE64 FALLBACK 🚀
             if (filePreview.file.type.startsWith("image")) {
                const reader = new FileReader();
                mediaUrl = await new Promise((resolve) => {
                   reader.onload = (re) => resolve(re.target?.result as string);
                   reader.readAsDataURL(filePreview.file);
                });
                type = "image";
                alert("✨ FALLBACK ACTIVE: Your storage is locked, so I converted your image to text data. It worked!");
             } else {
                alert("🚨 STORAGE BUSY: Please enable Storage in your Firebase Console to send large files.");
                throw e;
             }
          }
        }
      }

      const msgText = text.trim() || (type === "image" ? "📷 Image" : "📎 File");
      await postMessage(chatId, msgText, type, mediaUrl);
      
      setText("");
      setFilePreview(null);
      setShowEmoji(false);
      setProgress(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    } catch (e: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      console.error("Send failed", e);
      setError(e.message || "Failed to send message. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError("File too large. Maximum size is 10MB.");
      return;
    }
    const url = URL.createObjectURL(file);
    setFilePreview({ url, file });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(e as unknown as React.FormEvent);
    }
  };

  return (
    <div className="shrink-0 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-t dark:border-zinc-800 relative font-sans z-20 pb-safe">
      {/* Upload Progress Bar */}
      {uploading && progress > 0 && progress < 100 && (
        <div className="absolute top-0 left-0 w-full h-[2px] bg-zinc-100 dark:bg-zinc-900 overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className="h-full bg-accent-blue shadow-[0_0_8px_rgba(96,165,250,0.6)]" 
          />
        </div>
      )}

      {/* Error Banner */}
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 py-2 bg-red-500/10 border-b border-red-500/20 flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
               <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
               <p className="text-[10px] font-black uppercase tracking-tighter text-red-500">{error}</p>
            </div>
            <button onClick={() => setError("")} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1">
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* File Preview */}
      <AnimatePresence>
        {filePreview && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-6 py-4 flex items-center gap-4 bg-zinc-50/50 dark:bg-zinc-900/30 border-b border-zinc-200/50 dark:border-zinc-800/50 backdrop-blur-sm"
          >
            <div className="relative group">
              {filePreview.file.type.startsWith("image") ? (
                <div className="w-20 h-20 rounded-[18px] overflow-hidden ring-2 ring-zinc-200 dark:ring-zinc-800 shadow-sm">
                   <img src={filePreview.url} alt="preview" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-20 h-20 bg-zinc-100 dark:bg-zinc-800 rounded-[18px] flex items-center justify-center ring-2 ring-zinc-200 dark:ring-zinc-700 shadow-sm">
                  <Paperclip className="w-8 h-8 text-zinc-400" />
                </div>
              )}
              <button
                onClick={() => setFilePreview(null)}
                className="absolute -top-2 -right-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-full p-1 shadow-md hover:scale-110 active:scale-90 transition-transform"
                disabled={uploading}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-foreground truncate max-w-[200px]">{filePreview.file.name}</p>
              <p className="text-[11px] font-medium text-text-muted mt-0.5">
                {(filePreview.file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Row */}
      <form onSubmit={handleSend} className="flex items-end gap-3 p-4 max-w-6xl mx-auto">
        <div className="flex gap-1 mb-1 bg-zinc-100 dark:bg-zinc-900 border dark:border-zinc-800 rounded-2xl p-1 shrink-0">
          {/* Emoji Button */}
          <div className="relative" ref={emojiRef}>
            <button
              type="button"
              disabled={uploading}
              onClick={() => setShowEmoji((v) => !v)}
              className={`p-2.5 rounded-xl transition-all ${showEmoji ? "bg-white text-green-600 dark:bg-zinc-800 shadow-sm" : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"}`}
              title="Emoji"
            >
              <Smile className="w-5 h-5" />
            </button>
            {showEmoji && (
              <div className="absolute bottom-14 left-0 shadow-2xl rounded-3xl overflow-hidden border border-zinc-200/50 dark:border-zinc-800/50 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <EmojiPicker
                  onEmojiClick={(e) => setText((prev) => prev + e.emoji)}
                  theme={Theme.AUTO}
                  lazyLoadEmojis
                  searchDisabled={false}
                  skinTonesDisabled
                  width={320}
                  height={400}
                />
              </div>
            )}
          </div>

          {/* Attach Button */}
          <label className={`p-2.5 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-white dark:hover:bg-zinc-800 cursor-pointer transition-all ${uploading ? 'opacity-50 pointer-events-none' : ''}`} title="Send Transmission">
            <Paperclip className="w-5 h-5" />
            <input type="file" className="hidden" onChange={onFileSelect} accept="image/*,video/*,.pdf,.doc,.docx,.zip" />
          </label>
        </div>

          {/* Text Input Container */}
        <div className="flex-1 relative flex items-center">
            <input
              ref={inputRef}
              type="text"
              disabled={uploading}
              className="w-full pl-5 pr-12 py-3 bg-zinc-100 dark:bg-zinc-900 border border-transparent focus:border-zinc-200 dark:focus:border-zinc-700 rounded-2xl text-sm font-medium transition-all text-foreground placeholder-zinc-500 outline-none"
              placeholder={uploading ? "Sending..." : "Message..."}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              autoComplete="off"
            />
            {/* Send Button integrated in input */}
            <button
              type="submit"
              disabled={uploading || (!text.trim() && !filePreview)}
              className={`absolute right-1.5 p-1.5 rounded-xl transition-all ${
                text.trim() || filePreview
                  ? "bg-accent-blue text-white shadow-sm scale-100 opacity-100"
                  : "bg-transparent text-zinc-400 scale-90 opacity-0 pointer-events-none"
              }`}
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
        </div>

        {/* Standalone Send for better mobile target if needed, but keeping integrated for desktop premium feel */}
      </form>
    </div>
  );
}
