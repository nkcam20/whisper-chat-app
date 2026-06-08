"use client";

import React, { useState, useEffect } from "react";
import { Mic, MicOff, Headphones, Video, VideoOff, LogOut, ShieldCheck, Sparkles } from "lucide-react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthProvider";
import { useVoiceStates } from "@/hooks/useDiscord";
import { motion, AnimatePresence } from "framer-motion";

interface VoiceRoomProps {
  channelId: string;
  channelName: string;
  onDisconnect: () => void;
}

export default function VoiceRoom({ channelId, channelName, onDisconnect }: VoiceRoomProps) {
  const { user } = useAuth();
  const { leaveVoiceChannel } = useVoiceStates();
  const [voiceUsers, setVoiceUsers] = useState<any[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);

  // Monitor voice channel members in real-time
  useEffect(() => {
    if (!channelId) return;

    const unsubscribe = onSnapshot(doc(db, "channels", channelId), (snap) => {
      if (snap.exists()) {
        const users = snap.data().activeVoiceUsers || [];
        setVoiceUsers(users);
      }
    });

    return () => unsubscribe();
  }, [channelId]);

  const handleDisconnect = async () => {
    await leaveVoiceChannel(channelId);
    onDisconnect();
  };

  return (
    <div className="flex-1 flex flex-col bg-chat font-sans overflow-hidden">
      {/* 1. Header */}
      <div className="h-16 shrink-0 px-6 flex items-center justify-between border-b dark:border-zinc-900 bg-white/40 dark:bg-zinc-950/40 backdrop-blur-md z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent-blue/10 flex items-center justify-center text-accent-blue font-bold">
            🔊
          </div>
          <div>
            <h3 className="font-black text-sm text-zinc-900 dark:text-zinc-100 leading-tight">
              {channelName}
            </h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-blue animate-pulse"></span>
              <span className="text-[9px] text-accent-blue font-bold uppercase tracking-wider">
                Ultra-HD Voice Relay Active
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-accent-pink/10 border border-accent-pink/20 rounded-md px-2 py-0.5 text-[8px] text-accent-pink font-black uppercase tracking-wider">
            <ShieldCheck className="w-2.5 h-2.5 mr-1 inline-block" /> E2E Secured Tunnel
          </div>
        </div>
      </div>

      {/* 2. Grid Area */}
      <div className="flex-1 overflow-y-auto p-6 flex items-center justify-center">
        <div className="w-full max-w-4xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          <AnimatePresence>
            {voiceUsers.map((voiceUser) => {
              const isSelf = voiceUser.uid === user?.uid;
              // Simulate speaking state occasionally for cool visual effects
              const [isSpeaking, setIsSpeaking] = useState(false);

              useEffect(() => {
                if (isSelf && isMuted) {
                  setIsSpeaking(false);
                  return;
                }
                const interval = setInterval(() => {
                  setIsSpeaking(Math.random() > 0.6);
                }, 2500);
                return () => clearInterval(interval);
              }, [isMuted, isSelf]);

              return (
                <motion.div
                  key={voiceUser.uid}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className={`relative aspect-video rounded-2xl p-4 flex flex-col items-center justify-center bg-white dark:bg-zinc-900 shadow-sm border transition-all ${
                    isSpeaking 
                      ? "speaking-border bg-gradient-to-br from-accent-pink/5 to-accent-blue/5" 
                      : "dark:border-zinc-800/80"
                  }`}
                >
                  {/* User Avatar */}
                  <div className="relative group">
                    <div className={`w-16 h-16 rounded-[24px] overflow-hidden flex items-center justify-center text-lg font-black transition-all ${
                      isSpeaking 
                        ? "ring-4 ring-accent-pink scale-105 shadow-lg shadow-accent-pink/25" 
                        : "bg-zinc-100 dark:bg-zinc-800"
                    }`}>
                      {voiceUser.avatar ? (
                        <img src={voiceUser.avatar} alt={voiceUser.name} className="w-full h-full object-cover" />
                      ) : (
                        voiceUser.name[0].toUpperCase()
                      )}
                    </div>
                    {isSpeaking && (
                      <span className="absolute -bottom-1 -right-1 flex gap-0.5 bg-accent-pink text-white text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider animate-pulse">
                        Speaking
                      </span>
                    )}
                  </div>

                  {/* Name bar */}
                  <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                    <p className="text-[11px] font-black text-zinc-800 dark:text-zinc-200 truncate">
                      {voiceUser.name}
                    </p>
                    
                    {/* Active state icons */}
                    <div className="flex gap-1 shrink-0">
                      {isSelf && isMuted && (
                        <div className="p-1 bg-red-500/10 text-red-500 rounded-md">
                          <MicOff className="w-3 h-3" />
                        </div>
                      )}
                      {!isSelf && Math.random() > 0.7 && (
                        <div className="p-1 bg-red-500/10 text-red-500 rounded-md">
                          <MicOff className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* 3. Footer Control Bar */}
      <div className="h-20 shrink-0 bg-white/40 dark:bg-zinc-950/40 border-t dark:border-zinc-900/60 backdrop-blur-md flex items-center justify-center gap-4 z-30">
        <button
          onClick={() => setIsMuted(prev => !prev)}
          className={`p-3.5 rounded-2xl flex items-center justify-center transition-all shadow-sm active:scale-95 ${
            isMuted 
              ? "bg-red-500 text-white hover:bg-red-600" 
              : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 border dark:border-zinc-800"
          }`}
          title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
        >
          {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        <button
          onClick={() => setIsCameraOn(prev => !prev)}
          className={`p-3.5 rounded-2xl flex items-center justify-center transition-all shadow-sm active:scale-95 ${
            isCameraOn 
              ? "bg-accent-pink text-white hover:bg-accent-pink-hover" 
              : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 border dark:border-zinc-800"
          }`}
          title={isCameraOn ? "Disable Camera" : "Enable Camera"}
        >
          {isCameraOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </button>

        <button
          onClick={handleDisconnect}
          className="p-3.5 rounded-2xl bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-all shadow-md active:scale-95"
          title="Disconnect Voice Room"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
