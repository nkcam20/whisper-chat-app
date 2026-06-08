"use client";

import React, { useEffect, useRef } from "react";
import { useMessages, Message, useSendMessage } from "@/hooks/useChat";
import { useAuth } from "@/context/AuthProvider";
import { format } from "date-fns";
import { Check, CheckCheck, Lock, Paperclip, Smile, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function MessageList({ chatId }: { chatId: string }) {
  const { messages, loading } = useMessages(chatId);
  const { deleteMessage, addReaction, removeReaction } = useSendMessage();
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
              <div className={`max-w-[85%] sm:max-w-[70%] px-4 py-2.5 rounded-2xl shadow-sm relative transition-all ${
                isMe 
                ? "bg-accent-primary text-white rounded-br-sm shadow-accent-primary/10" 
                : "bg-white dark:bg-zinc-800/80 backdrop-blur-sm text-foreground rounded-bl-sm border border-zinc-100 dark:border-zinc-700/50 shadow-sm dark:shadow-none"
              }`}>
                {/* Actions Hover Menu */}
                <div className={`absolute -top-3 ${isMe ? "-left-8" : "-right-8"} flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10`}>
                  {isMe && (
                    <button onClick={() => deleteMessage(chatId, msg.id)} className="p-1.5 bg-red-500 text-white rounded-full shadow-sm hover:scale-110 transition-transform">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button onClick={() => addReaction(chatId, msg.id, '👍')} className="p-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded-full shadow-sm border dark:border-zinc-700 hover:text-accent-primary hover:scale-110 transition-transform">
                    <Smile className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => addReaction(chatId, msg.id, '❤️')} className="p-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded-full shadow-sm border dark:border-zinc-700 hover:text-rose-500 hover:scale-110 transition-transform">
                    ❤️
                  </button>
                </div>
                {msg.text && (
                  <p className="text-[14px] leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>
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
                <div className={`flex items-center justify-end gap-1.5 mt-2 ${isMe ? "text-blue-100" : "text-text-muted"}`}>
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    {msg.timestamp && typeof msg.timestamp.toDate === "function" 
                      ? format(msg.timestamp.toDate(), "HH:mm") 
                      : "..."}
                  </span>
                  {isMe && (
                    <span className="shrink-0">
                      {msg.status === "seen" ? (
                        <CheckCheck className="w-3.5 h-3.5 text-white" />
                      ) : msg.status === "delivered" ? (
                        <CheckCheck className="w-3.5 h-3.5 text-white/70" />
                      ) : (
                        <Check className="w-3.5 h-3.5 text-white/50" />
                      )}
                    </span>
                  )}
                </div>

                {/* Reactions Display */}
                {msg.reactions && Object.entries(msg.reactions).some(([_, uids]) => uids.length > 0) && (
                  <div className={`flex flex-wrap gap-1 mt-2 ${isMe ? "justify-end" : "justify-start"}`}>
                    {Object.entries(msg.reactions).map(([emoji, uids]) => uids.length > 0 && (
                      <button 
                        key={emoji}
                        onClick={() => uids.includes(user?.uid || "") ? removeReaction(chatId, msg.id, emoji) : addReaction(chatId, msg.id, emoji)}
                        className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 border transition-all ${
                          uids.includes(user?.uid || "") 
                            ? (isMe ? 'bg-white/20 border-white/40 text-white' : 'bg-accent-primary/10 border-accent-primary/30 text-accent-primary') 
                            : (isMe ? 'bg-black/10 border-transparent text-white/80' : 'bg-zinc-100 dark:bg-zinc-800 border-transparent text-zinc-500')
                        }`}
                      >
                        <span>{emoji}</span> <span>{uids.length}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
