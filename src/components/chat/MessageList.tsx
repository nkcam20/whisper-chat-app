"use client";

import React, { useEffect, useRef } from "react";
import { useMessages, Message } from "@/hooks/useChat";
import { useAuth } from "@/context/AuthProvider";
import { format } from "date-fns";
import { Check, CheckCheck, Lock, Paperclip } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function MessageList({ chatId }: { chatId: string }) {
  const { messages, loading } = useMessages(chatId);
  const { user } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (loading) return (
    <div className="flex-1 flex items-center justify-center bg-zinc-50 dark:bg-zinc-900/30">
        <div className="animate-pulse text-zinc-400">Loading messages...</div>
    </div>
  );

  return (
    <div 
      ref={scrollRef}
      className="h-full overflow-y-auto p-4 space-y-4 bg-zinc-50 dark:bg-zinc-900/30 font-sans custom-scrollbar"
    >
      <div className="flex justify-center mb-6">
        <div className="bg-amber-50 dark:bg-amber-950/30 px-3 py-1.5 rounded-lg border border-amber-100 dark:border-amber-900/50 flex items-center gap-2 text-[10px] text-amber-700 dark:text-amber-400 font-medium">
          <Lock className="w-3 h-3" />
          Messages are end-to-end encrypted. No one else can read them.
        </div>
      </div>

      <AnimatePresence initial={false}>
        {messages.map((msg: Message) => {
          const isMe = msg.senderId === user?.uid;
          return (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              key={msg.id}
              className={`flex ${isMe ? "justify-end" : "justify-start"} group mb-2 last:mb-0`}
            >
              <div className={`max-w-[85%] sm:max-w-[70%] px-4 py-2.5 rounded-[22px] shadow-sm relative transition-all ${
                isMe 
                ? "bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-tr-none shadow-green-500/10" 
                : "bg-white dark:bg-zinc-800/80 backdrop-blur-sm text-zinc-900 dark:text-zinc-100 rounded-tl-none border border-zinc-100 dark:border-zinc-700/50 shadow-zinc-200/50 dark:shadow-none"
              }`}>
                {msg.text && (
                  <p className="text-[14px] leading-[1.5] whitespace-pre-wrap break-words font-medium">{msg.text}</p>
                )}
                {msg.mediaUrl && msg.type === "image" && (
                  <div className="mt-3 group/img relative overflow-hidden rounded-[18px]">
                    <img 
                      src={msg.mediaUrl} 
                      alt="Shared content" 
                      className="max-w-full max-h-[350px] object-cover cursor-zoom-in hover:scale-[1.03] transition-all duration-500 rounded-[18px]"
                      onClick={() => window.open(msg.mediaUrl, '_blank')}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity flex items-end justify-center p-3 pointer-events-none">
                       <span className="text-[9px] text-white font-black uppercase tracking-widest bg-black/20 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">Full Resolution</span>
                    </div>
                  </div>
                )}
                {msg.mediaUrl && msg.type === "file" && (
                  <a 
                    href={msg.mediaUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={`mt-2.5 flex items-center gap-3 p-3 rounded-xl transition-all border ${
                      isMe ? "bg-white/10 border-white/10 hover:bg-white/20" : "bg-zinc-50 dark:bg-zinc-900/50 border-zinc-100 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isMe ? "bg-white/20 text-white" : "bg-green-500/10 text-green-500"}`}>
                       <Paperclip className="w-4.5 h-4.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-black truncate leading-tight">Attachment</p>
                      <p className="text-[9px] font-bold opacity-60 uppercase tracking-tighter">Verified Node Asset</p>
                    </div>
                  </a>
                )}
                <div className={`flex items-center justify-end gap-1.5 mt-1.5 ${isMe ? "text-green-100/70" : "text-zinc-400"}`}>
                  <span className="text-[9px] font-black uppercase tracking-tighter">
                    {msg.timestamp && typeof msg.timestamp.toDate === "function" 
                      ? format(msg.timestamp.toDate(), "HH:mm") 
                      : "..."}
                  </span>
                  {isMe && (
                    <span className="shrink-0">
                      {msg.status === "seen" ? (
                        <CheckCheck className="w-3.5 h-3.5 text-blue-200" />
                      ) : msg.status === "delivered" ? (
                        <CheckCheck className="w-3.5 h-3.5 text-white/60" />
                      ) : (
                        <Check className="w-3.5 h-3.5 text-white/50" />
                      )}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
