"use client";

import React, { useState, useRef, useEffect } from "react";
import { useSendChannelMessage } from "@/hooks/useDiscord";
import { Send, Smile, Paperclip, X, Loader2, ShieldAlert } from "lucide-react";
import EmojiPicker, { Theme } from "emoji-picker-react";
import { storage, legacyStorage } from "@/lib/firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { motion, AnimatePresence } from "framer-motion";

interface ChannelMessageInputProps {
  channelId: string;
  channelName: string;
}

export default function ChannelMessageInput({ channelId, channelName }: ChannelMessageInputProps) {
  const [text, setText] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [filePreview, setFilePreview] = useState<{ url: string; file: File } | null>(null);
  const [error, setError] = useState("");
  const { sendChannelMessage } = useSendChannelMessage();
  const inputRef = useRef<HTMLInputElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);

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
        if (!storage) throw new Error("Storage Init Failed");

        try {
          const fileName = `${Date.now()}_${filePreview.file.name}`;
          const fileRef = ref(storage, `channels/${channelId}/${fileName}`);
          const uploadTask = uploadBytesResumable(fileRef, filePreview.file);

          mediaUrl = await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error("Primary cluster timeout")), 15000);
            
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
        } catch (storageErr: any) {
          console.warn("Primary storage failure. Trying satellite rescue...", storageErr);
          if (legacyStorage) {
            try {
              const legacyRef = ref(legacyStorage, `channels/${channelId}/${Date.now()}_${filePreview.file.name}`);
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
            } catch (e: any) {
              if (filePreview.file.type.startsWith("image")) {
                const reader = new FileReader();
                mediaUrl = await new Promise((resolve) => {
                  reader.onload = (re) => resolve(re.target?.result as string);
                  reader.readAsDataURL(filePreview.file);
                });
                type = "image";
              } else {
                throw e;
              }
            }
          }
        }
      }

      const msgText = text.trim() || (type === "image" ? "📷 Image" : "📎 File");
      await sendChannelMessage(channelId, msgText, type, mediaUrl);
      
      setText("");
      setFilePreview(null);
      setShowEmoji(false);
      setProgress(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    } catch (e: any) {
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
    <div className="shrink-0 bg-white/70 dark:bg-zinc-950/70 border-t dark:border-zinc-900 relative font-sans z-20 pb-safe">
      {/* Upload Progress */}
      {uploading && progress > 0 && progress < 100 && (
        <div className="absolute top-0 left-0 w-full h-[2px] bg-zinc-100 dark:bg-zinc-900 overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className="h-full bg-accent-blue shadow-[0_0_8px_rgba(96,165,250,0.6)]" 
          />
        </div>
      )}

      {/* Error */}
      <AnimatePresence>
        {error && (
          <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/25 flex items-center justify-between">
            <div className="flex items-center gap-2">
               <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
               <p className="text-[10px] font-black uppercase text-red-500">{error}</p>
            </div>
            <button onClick={() => setError("")} className="text-zinc-400 hover:text-zinc-600 p-1">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </AnimatePresence>

      {/* File Preview */}
      <AnimatePresence>
        {filePreview && (
          <div className="px-5 py-3.5 flex items-center gap-3 bg-zinc-50 dark:bg-zinc-900/20 border-b dark:border-zinc-900">
            <div className="relative">
              {filePreview.file.type.startsWith("image") ? (
                <div className="w-16 h-16 rounded-xl overflow-hidden ring-4 ring-accent-blue/20">
                   <img src={filePreview.url} alt="preview" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-16 h-16 bg-zinc-200 dark:bg-zinc-900 rounded-xl flex items-center justify-center">
                  <Paperclip className="w-6 h-6 text-zinc-500" />
                </div>
              )}
              <button
                onClick={() => setFilePreview(null)}
                className="absolute -top-1.5 -right-1.5 bg-zinc-950 text-white rounded-full p-1"
                disabled={uploading}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black truncate max-w-[200px]">{filePreview.file.name}</p>
              <p className="text-[9px] text-accent-blue font-black uppercase tracking-wider mt-0.5">
                {(filePreview.file.size / 1024 / 1024).toFixed(2)} MB • Channel upload
              </p>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Text Area */}
      <form onSubmit={handleSend} className="flex items-center gap-2.5 p-3.5 max-w-6xl mx-auto">
        <div className="flex gap-0.5 bg-zinc-100 dark:bg-zinc-900 border dark:border-zinc-800 rounded-xl p-0.5 shrink-0">
          <div className="relative" ref={emojiRef}>
            <button
              type="button"
              disabled={uploading}
              onClick={() => setShowEmoji((v) => !v)}
              className={`p-2 rounded-lg transition-all ${showEmoji ? "bg-white text-accent-blue dark:bg-zinc-800 shadow-sm" : "text-zinc-400 hover:text-zinc-600"}`}
              title="Emoji"
            >
              <Smile className="w-4.5 h-4.5" />
            </button>
            {showEmoji && (
              <div className="absolute bottom-12 left-0 shadow-2xl rounded-2xl overflow-hidden border dark:border-zinc-800 z-50">
                <EmojiPicker
                  onEmojiClick={(e) => setText((prev) => prev + e.emoji)}
                  theme={Theme.AUTO}
                  width={290}
                  height={360}
                />
              </div>
            )}
          </div>

          <label className={`p-2 rounded-lg text-zinc-400 hover:text-zinc-600 cursor-pointer ${uploading ? 'opacity-50 pointer-events-none' : ''}`} title="Attach File">
            <Paperclip className="w-4.5 h-4.5" />
            <input type="file" className="hidden" onChange={onFileSelect} accept="image/*,video/*,.pdf,.doc,.docx,.zip" />
          </label>
        </div>

        <div className="flex-1 relative flex items-center">
          <input
            ref={inputRef}
            type="text"
            disabled={uploading}
            className="w-full pl-4 pr-11 py-3 bg-zinc-100 dark:bg-zinc-900 border dark:border-zinc-800 rounded-xl text-xs focus:ring-2 focus:ring-accent-blue/15 font-medium transition-all text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 outline-none"
            placeholder={uploading ? "Broadcasting signal..." : `Message #${channelName}`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={uploading || (!text.trim() && !filePreview)}
            className={`absolute right-1.5 p-1.5 rounded-lg transition-all ${
              text.trim() || filePreview
                ? "bg-accent-blue text-white shadow-md shadow-accent-blue/20 scale-100"
                : "bg-zinc-200 dark:bg-zinc-800 text-zinc-400 scale-95 opacity-0"
            }`}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
