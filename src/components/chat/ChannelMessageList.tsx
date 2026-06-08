"use client";

import React, { useEffect, useRef } from "react";
import { useChannelMessages, ChannelMessage, useSendChannelMessage } from "@/hooks/useDiscord";
import { format } from "date-fns";
import { Hash, Sparkles, Smile, Trash2 } from "lucide-react";
import { useAuth } from "@/context/AuthProvider";
import { motion, AnimatePresence } from "framer-motion";

interface ChannelMessageListProps {
  channelId: string;
  channelName: string;
}

export default function ChannelMessageList({ channelId, channelName }: ChannelMessageListProps) {
  const { user } = useAuth();
  const { messages, loading } = useChannelMessages(channelId);
  const { deleteChannelMessage, addChannelReaction, removeChannelReaction } = useSendChannelMessage();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (loading) return (
    <div className="flex-1 flex items-center justify-center bg-chat">
        <div className="animate-pulse text-zinc-400 text-xs font-black uppercase tracking-wider">Tuning into frequency...</div>
    </div>
  );

  return (
    <div 
      ref={scrollRef}
      className="flex-1 overflow-y-auto p-5 space-y-4 bg-chat font-sans custom-scrollbar"
    >
      {/* Welcome Message at the very top of the channel */}
      <div className="py-8 border-b dark:border-zinc-900 mb-6 flex flex-col items-start text-left">
        <div className="w-12 h-12 rounded-2xl bg-accent-primary/10 flex items-center justify-center text-accent-primary mb-4">
          <Hash className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-black">Welcome to #{channelName}!</h2>
        <p className="text-xs text-zinc-500 mt-1 max-w-md">
          This is the start of the #{channelName} channel. Start posting messages, files, or emojis to your colleagues.
        </p>
      </div>

      <AnimatePresence initial={false}>
        {messages.map((msg: ChannelMessage) => (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={msg.id}
            className="flex items-start gap-3.5 group hover:bg-zinc-50/50 dark:hover:bg-zinc-900/10 p-2.5 -mx-2.5 rounded-xl transition-all relative"
          >
            {/* Actions Hover Menu */}
            <div className={`absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-white dark:bg-zinc-900 border dark:border-zinc-800 p-1 rounded-xl shadow-sm`}>
              <button onClick={() => addChannelReaction(channelId, msg.id, '👍')} className="p-1 text-zinc-500 hover:text-accent-primary hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors">
                <Smile className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => addChannelReaction(channelId, msg.id, '❤️')} className="p-1 text-zinc-500 hover:text-rose-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors text-xs">
                ❤️
              </button>
              {msg.senderId === user?.uid && (
                <button onClick={() => deleteChannelMessage(channelId, msg.id)} className="p-1 text-zinc-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* User Avatar */}
            <div className="w-9 h-9 rounded-xl bg-accent-primary flex items-center justify-center text-white font-bold text-xs shadow-sm overflow-hidden shrink-0">
              {msg.senderAvatar ? (
                <img src={msg.senderAvatar} alt={msg.senderName} className="w-full h-full object-cover" />
              ) : (
                msg.senderName[0].toUpperCase()
              )}
            </div>

            {/* Content Group */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-zinc-900 dark:text-zinc-100">{msg.senderName}</span>
                <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-tight">
                  {msg.timestamp && typeof msg.timestamp.toDate === "function" 
                    ? format(msg.timestamp.toDate(), "MM/dd HH:mm") 
                    : "..."}
                </span>
              </div>
              
              {msg.text && (
                <p className="text-[13px] leading-[1.5] text-zinc-700 dark:text-zinc-300 font-medium mt-1 whitespace-pre-wrap break-words">{msg.text}</p>
              )}

              {msg.mediaUrl && msg.type === "image" && (
                <div className="mt-2.5 overflow-hidden rounded-xl border dark:border-zinc-800 max-w-xs">
                  <img 
                    src={msg.mediaUrl} 
                    alt="shared" 
                    className="max-h-[220px] object-cover cursor-zoom-in hover:scale-[1.02] transition-all duration-300"
                    onClick={() => window.open(msg.mediaUrl, '_blank')}
                  />
                </div>
              )}

              {msg.mediaUrl && msg.type === "file" && (
                <a 
                  href={msg.mediaUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="mt-2 flex items-center gap-2 p-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border dark:border-zinc-900 text-xs text-zinc-600 dark:text-zinc-400 hover:text-accent-primary transition-all"
                >
                  <span className="font-bold underline truncate">Download Asset</span>
                </a>
              )}

              {/* Reactions Display */}
              {msg.reactions && Object.entries(msg.reactions).some(([_, uids]) => uids.length > 0) && (
                <div className={`flex flex-wrap gap-1 mt-2`}>
                  {Object.entries(msg.reactions).map(([emoji, uids]) => uids.length > 0 && (
                    <button 
                      key={emoji}
                      onClick={() => uids.includes(user?.uid || "") ? removeChannelReaction(channelId, msg.id, emoji) : addChannelReaction(channelId, msg.id, emoji)}
                      className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 border transition-all ${
                        uids.includes(user?.uid || "") 
                          ? 'bg-accent-primary/10 border-accent-primary/30 text-accent-primary' 
                          : 'bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-900'
                      }`}
                    >
                      <span>{emoji}</span> <span>{uids.length}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
