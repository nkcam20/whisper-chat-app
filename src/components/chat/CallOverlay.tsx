"use client";

import React from "react";
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, Maximize2, ShieldCheck, RefreshCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface CallOverlayProps {
  status: "idle" | "incoming" | "outgoing" | "connected";
  type: "voice" | "video";
  onAccept: () => void;
  onReject: () => void;
  onEnd: () => void;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onSwitchCamera: () => void;
  isMuted: boolean;
  isCameraOff: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  remoteName: string;
}

export default function CallOverlay({
  status,
  type,
  onAccept,
  onReject,
  onEnd,
  onToggleMic,
  onToggleCamera,
  onSwitchCamera,
  isMuted,
  isCameraOff,
  localStream,
  remoteStream,
  remoteName
}: CallOverlayProps) {
  if (status === "idle") return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[999] flex items-center justify-center bg-black font-sans overflow-hidden"
      >
        <div className="relative w-full h-full bg-zinc-950 overflow-hidden">
          
          {/* Remote Video (Connected) */}
          {status === "connected" && type === "video" && (
            <div className="absolute inset-0 bg-zinc-900">
              {remoteStream && !isCameraOff ? (
                 <video
                   autoPlay
                   playsInline
                   ref={(el) => { if (el) el.srcObject = remoteStream; }}
                   className="w-full h-full object-cover"
                 />
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-white/40">
                  <div className="w-32 h-32 rounded-full bg-zinc-800 flex items-center justify-center border-4 border-white/5">
                     <Video className="w-12 h-12" />
                  </div>
                  <p className="text-sm font-black tracking-[0.3em] uppercase">Feed Suspended</p>
                </div>
              )}
            </div>
          )}

          {/* User Info / Overlay */}
          <div className="absolute inset-0 flex flex-col pointer-events-none p-6 md:p-10 z-40">
             <div className="flex justify-between items-start">
                <motion.div 
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-black/60 backdrop-blur-3xl border border-white/10 p-5 md:p-6 rounded-[32px] max-w-[200px] md:max-w-none"
                >
                   <p className="text-[9px] font-black text-green-500 uppercase tracking-widest mb-1">Encrypted Link</p>
                   <h2 className="text-xl md:text-3xl font-black text-white truncate">{remoteName}</h2>
                   <div className="flex items-center gap-2 mt-2">
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                      <span className="text-[9px] font-bold text-white/60 tracking-wider uppercase">
                        {status === "connected" ? "Live Feed" : status === "incoming" ? "Incoming Probe" : "Broadcasting"}
                      </span>
                   </div>
                </motion.div>
                
                <div className="bg-black/60 backdrop-blur-3xl border border-white/10 px-4 py-2 rounded-full hidden sm:block">
                   <div className="flex items-center gap-3">
                       <ShieldCheck className="w-4 h-4 text-green-500" />
                       <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">v2.3 Secure</span>
                   </div>
                </div>
             </div>
          </div>

          {/* Local Video Picture-in-Picture */}
          {type === "video" && localStream && (
             <motion.div 
               drag
               dragConstraints={{ left: -500, right: 500, top: -400, bottom: 400 }}
               className={`absolute ${status === "connected" ? "bottom-32 right-6 md:right-10 w-32 md:w-64" : "inset-0 w-full"} aspect-video bg-zinc-800 rounded-3xl overflow-hidden border-2 border-white/20 shadow-2xl cursor-move pointer-events-auto z-50 transition-all duration-500`}
             >
                <video
                  autoPlay
                  playsInline
                  muted
                  ref={(el) => { if (el) el.srcObject = localStream; }}
                  className={`w-full h-full object-cover scale-x-[-1] ${isCameraOff ? "hidden" : "block"}`}
                />
                {isCameraOff && (
                  <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                    <Video className="w-8 h-8 text-white/20" />
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                   <p className="text-[9px] font-black text-white uppercase tracking-widest">Self View</p>
                </div>
             </motion.div>
          )}

          {/* Controls Bar / Incoming Call UI */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-[60]">
             {status === "incoming" ? (
                <div className="flex flex-col items-center gap-12 pointer-events-auto">
                   {/* Pulsing Avatar */}
                   <div className="relative">
                      <motion.div 
                        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className="absolute inset-0 bg-green-500/20 rounded-full blur-3xl"
                      />
                      <div className="relative w-40 h-40 md:w-56 md:h-56 rounded-full bg-gradient-to-br from-zinc-800 to-black border-4 border-white/10 flex items-center justify-center text-6xl font-black text-white shadow-2xl overflow-hidden">
                         {remoteName[0]?.toUpperCase()}
                         <div className="absolute inset-0 bg-black/20" />
                      </div>
                   </div>

                   <div className="text-center space-y-4">
                      <h2 className="text-4xl md:text-6xl font-black text-white tracking-tighter">{remoteName}</h2>
                      <div className="flex items-center justify-center gap-3">
                         <div className="w-2 h-2 rounded-full bg-green-500 animate-ping" />
                         <p className="text-sm font-bold text-green-500 uppercase tracking-[0.4em]">{type === "video" ? "Incoming Video Feed" : "Secure Voice Link"}</p>
                      </div>
                   </div>

                   <div className="flex items-center gap-16 mt-8">
                      <div className="flex flex-col items-center gap-4">
                         <motion.button 
                           whileHover={{ scale: 1.1, rotate: -10 }}
                           whileTap={{ scale: 0.9 }}
                           onClick={onReject}
                           className="w-24 h-24 bg-red-600 text-white rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(220,38,38,0.3)] transition-all border-4 border-red-500/20"
                         >
                            <PhoneOff className="w-10 h-10" />
                         </motion.button>
                         <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Decline</span>
                      </div>

                      <div className="flex flex-col items-center gap-4">
                         <motion.button 
                           animate={{ scale: [1, 1.1, 1] }}
                           transition={{ repeat: Infinity, duration: 1.5 }}
                           whileHover={{ scale: 1.1, rotate: 10 }}
                           whileTap={{ scale: 0.9 }}
                           onClick={onAccept}
                           className="w-28 h-28 bg-green-500 text-white rounded-full flex items-center justify-center shadow-[0_0_60px_rgba(34,197,94,0.4)] transition-all border-8 border-green-500/20"
                         >
                            {type === "video" ? <Video className="w-12 h-12" /> : <Phone className="w-12 h-12" />}
                         </motion.button>
                         <span className="text-[10px] font-black text-green-500 uppercase tracking-widest">Establish Link</span>
                      </div>
                   </div>
                </div>
             ) : (
                /* Connected Controls (at bottom) */
                <div className="absolute inset-x-0 bottom-10 flex justify-center items-center pointer-events-auto">
                   <div className="bg-black/80 backdrop-blur-3xl border border-white/10 px-8 md:px-10 py-5 rounded-[40px] flex items-center gap-6 md:gap-8 shadow-2xl">
                      <button 
                        onClick={onToggleMic}
                        className={`p-4 ${isMuted ? "bg-red-500/20 text-red-500 border-red-500/20" : "bg-white/5 text-white border-white/5"} hover:bg-white/10 rounded-2xl transition-all border`}
                      >
                         {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                      </button>
                      <button 
                        onClick={onToggleCamera}
                        className={`p-4 ${isCameraOff ? "bg-red-500/20 text-red-500 border-red-500/20" : "bg-white/5 text-white border-white/5"} hover:bg-white/10 rounded-2xl transition-all border`}
                      >
                         {isCameraOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                      </button>
                      <button 
                        onClick={onSwitchCamera}
                        className="p-4 bg-white/5 text-white hover:bg-white/10 rounded-2xl transition-all border border-white/5"
                      >
                         <RefreshCcw className="w-6 h-6" />
                      </button>
                      <div className="w-px h-10 bg-white/10 mx-2"></div>
                      <motion.button 
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={onEnd}
                        className="w-20 h-20 bg-red-600 text-white rounded-full flex items-center justify-center shadow-2xl shadow-red-600/40 transition-all border-4 border-red-500/20"
                      >
                         <PhoneOff className="w-8 h-8" />
                      </motion.button>
                   </div>
                </div>
             )}
          </div>

        </div>
      </motion.div>
    </AnimatePresence>
  );
}
