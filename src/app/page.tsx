"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthProvider";
import { useRouter } from "next/navigation";
import GuildBar from "@/components/chat/GuildBar";
import ChatSidebar from "@/components/chat/ChatSidebar";
import MessageList from "@/components/chat/MessageList";
import MessageInput from "@/components/chat/MessageInput";
import CallOverlay from "@/components/chat/CallOverlay";
import ChannelMessageList from "@/components/chat/ChannelMessageList";
import ChannelMessageInput from "@/components/chat/ChannelMessageInput";
import VoiceRoom from "@/components/chat/VoiceRoom";
import { useWebRTC } from "@/hooks/useWebRTC";
import { useChats } from "@/hooks/useChat";
import { useDiscord, useChannels } from "@/hooks/useDiscord";
import { 
  Phone, 
  Video, 
  MessageSquare, 
  ShieldCheck, 
  ArrowLeft, 
  ShieldAlert, 
  Menu, 
  Plus, 
  Compass, 
  Hash, 
  Sparkles 
} from "lucide-react";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { motion, AnimatePresence } from "framer-motion";

interface ChatPartner {
  uid: string;
  name?: string;
  email: string;
  avatar?: string;
}

export default function Home() {
  const { user, loading } = useAuth();
  const { acceptChat, declineChat } = useChats();
  const { servers, createServer, joinServer } = useDiscord();
  const router = useRouter();
  
  const currentServer = servers.find((s) => s.id === activeServerId);
  
  // Navigation State
  const [activeServerId, setActiveServerId] = useState<string | null>(null);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [activeChannelType, setActiveChannelType] = useState<"text" | "voice">("text");
  
  // DM selection State
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [currentChatDoc, setCurrentChatDoc] = useState<any>(null);
  const [chatPartner, setChatPartner] = useState<ChatPartner | null>(null);
  
  // Responsive sidebar toggles
  const [showSidebar, setShowSidebar] = useState(true);

  // Modals state
  const [showCreateServerModal, setShowCreateServerModal] = useState(false);
  const [showJoinServerModal, setShowJoinServerModal] = useState(false);
  
  const [serverName, setServerName] = useState("");
  const [serverInviteCode, setServerInviteCode] = useState("");
  const [serverError, setServerError] = useState("");
  const [serverLoading, setServerLoading] = useState(false);

  // Fetch channels for active server
  const { channels } = useChannels(activeServerId);

  // WebRTC hook for 1-to-1 DMs
  const {
    callStatus,
    callType,
    isMuted,
    isCameraOff,
    toggleMic,
    toggleCamera,
    switchCamera,
    startCall,
    joinCall,
    endCall,
    localStream,
    remoteStream,
  } = useWebRTC(selectedChatId || "");

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  // Handle active server selection and auto-select first text channel
  useEffect(() => {
    if (activeServerId && channels.length > 0) {
      const firstTextChan = channels.find(c => c.type === "text");
      if (firstTextChan) {
        setActiveChannelId(firstTextChan.id);
        setActiveChannelType("text");
      }
    } else {
      setActiveChannelId(null);
    }
  }, [activeServerId, channels]);

  // Load chat document for active DM selection
  useEffect(() => {
    if (!selectedChatId) {
      setCurrentChatDoc(null);
      return;
    }
    const unsubscribe = onSnapshot(doc(db, "chats", selectedChatId), (snap) => {
      if (snap.exists()) {
        setCurrentChatDoc({ id: snap.id, ...snap.data() });
      }
    });
    return () => unsubscribe();
  }, [selectedChatId]);

  // Fetch DM chat partner information
  useEffect(() => {
    if (!selectedChatId || !user) {
      setChatPartner(null);
      return;
    }
    const fetchPartner = async () => {
      try {
        const chatDoc = await getDoc(doc(db, "chats", selectedChatId));
        if (chatDoc.exists()) {
          const members: string[] = chatDoc.data().members || [];
          const otherId = members.find((id) => id !== user.uid) || user.uid;
          const partnerDoc = await getDoc(doc(db, "users", otherId));
          if (partnerDoc.exists()) setChatPartner(partnerDoc.data() as ChatPartner);
        }
      } catch (e) { console.error("Partner fetch failed", e); }
    };
    fetchPartner();
  }, [selectedChatId, user]);

  const handleServerSelect = (serverId: string | null) => {
    setActiveServerId(serverId);
    setSelectedChatId(null);
    setShowSidebar(true);
  };

  const handleChannelSelect = (channelId: string | null, type: "text" | "voice") => {
    setActiveChannelId(channelId);
    setActiveChannelType(type);
    setShowSidebar(false);
  };

  const handleChatSelect = (id: string) => {
    setSelectedChatId(id);
    setActiveServerId(null);
    setActiveChannelId(null);
    setShowSidebar(false);
  };

  const handleCreateServerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serverName.trim()) return;
    setServerLoading(true);
    setServerError("");
    try {
      const serverId = await createServer(serverName);
      setShowCreateServerModal(false);
      setServerName("");
      handleServerSelect(serverId);
    } catch (err: any) {
      setServerError(err.message || "Failed to create server");
    } finally {
      setServerLoading(false);
    }
  };

  const handleJoinServerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serverInviteCode.trim()) return;
    setServerLoading(true);
    setServerError("");
    try {
      const serverId = await joinServer(serverInviteCode);
      setShowJoinServerModal(false);
      setServerInviteCode("");
      handleServerSelect(serverId);
    } catch (err: any) {
      setServerError(err.message || "Invalid invite code");
    } finally {
      setServerLoading(false);
    }
  };

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-background">
      <div className="w-10 h-10 border-4 border-zinc-200 dark:border-zinc-800 border-t-accent-primary rounded-full animate-spin"></div>
      <p className="mt-4 text-xs font-black uppercase text-accent-primary tracking-widest">Waking up Zenjoy...</p>
    </div>
  );
  
  if (!user) return null;

  const partnerName = chatPartner?.name || chatPartner?.email?.split("@")[0] || "Chat";
  const chatStatus = currentChatDoc?.status || "accepted";
  const amInitiator = currentChatDoc?.requestedBy === user.uid;

  const activeChannelName = channels.find(c => c.id === activeChannelId)?.name || "channel";

  return (
    <main className="fixed inset-0 flex bg-background overflow-hidden select-none">
      
      {/* 1. Leftmost Guild / Server Column */}
      <GuildBar 
        servers={servers}
        activeServerId={activeServerId}
        onServerSelect={handleServerSelect}
        onCreateServerClick={() => {
          setServerError("");
          setShowCreateServerModal(true);
        }}
        onJoinServerClick={() => {
          setServerError("");
          setShowJoinServerModal(true);
        }}
      />

      {/* 2. Middle Sidebar & Right Chat Views inside a flex container */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Sidebar */}
        <div className={`${showSidebar ? "flex" : "hidden"} md:flex flex-col h-full w-full md:w-[240px] shrink-0`}>
          <ChatSidebar 
            activeServerId={activeServerId}
            activeChannelId={activeChannelId}
            onChannelSelect={handleChannelSelect}
            onChatSelect={handleChatSelect}
            activeChatId={selectedChatId || undefined}
            servers={servers}
          />
        </div>

        {/* Right Active View Pane (Direct Messages OR Server Channels) */}
        <div className={`${!showSidebar ? "flex" : "hidden"} md:flex flex-1 flex-col h-full relative bg-chat overflow-hidden`}>
          
          {activeServerId === null ? (
            // DIRECT MESSAGES ROUTE
            selectedChatId ? (
              <>
                {/* DM Header */}
                <div className="h-16 shrink-0 px-6 flex items-center justify-between border-b dark:border-zinc-900 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-md z-30">
                  <div className="flex items-center gap-3.5">
                    <button onClick={() => setShowSidebar(true)} className="md:hidden p-2 -ml-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-xl"><ArrowLeft className="w-5 h-5" /></button>
                    <div className="relative">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-pink to-accent-blue flex items-center justify-center text-white font-black text-base shadow-sm">
                        {partnerName[0]?.toUpperCase()}
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border border-white dark:border-zinc-950 rounded-full shadow-sm"></div>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                         <h3 className="font-black text-sm text-zinc-900 dark:text-zinc-100 leading-tight">{partnerName}</h3>
                         {chatStatus === "accepted" && <ShieldCheck className="w-3.5 h-3.5 text-accent-pink" />}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent-pink secure-pastel-pulse"></span>
                        <span className="text-[8px] text-accent-pink font-black uppercase tracking-wider">
                          {chatStatus === "accepted" ? "E2EE Secured" : "Establishing Link"}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {chatStatus === "accepted" && (
                    <div className="flex items-center gap-1 bg-white/40 dark:bg-zinc-900/40 p-0.5 rounded-xl border dark:border-zinc-900">
                      <button onClick={() => startCall("voice")} className="p-2 text-zinc-500 hover:text-accent-pink rounded-lg hover:bg-white dark:hover:bg-zinc-950 transition-all cursor-pointer"><Phone className="w-4 h-4" /></button>
                      <button onClick={() => startCall("video")} className="p-2 text-zinc-500 hover:text-accent-blue rounded-lg hover:bg-white dark:hover:bg-zinc-950 transition-all cursor-pointer"><Video className="w-4 h-4" /></button>
                    </div>
                  )}
                </div>

                {/* DM Body */}
                <div className="flex-1 flex flex-col min-h-0 relative">
                  {chatStatus === "accepted" ? (
                    <>
                      <div className="flex-1 overflow-hidden relative">
                        <MessageList chatId={selectedChatId} />
                      </div>
                      <MessageInput chatId={selectedChatId} />
                    </>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white/50 dark:bg-zinc-950/20">
                      <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center mb-6 border border-amber-500/20">
                         <ShieldAlert className="w-8 h-8 text-amber-500" />
                      </div>
                      {amInitiator ? (
                        <div>
                          <h2 className="text-base font-black">Link pending authorization...</h2>
                          <p className="text-xs text-zinc-500 mt-1">Waiting for the recipient to verify your invitation fragment.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <h2 className="text-base font-black">Secure Link request from {partnerName}</h2>
                          <p className="text-xs text-zinc-500">Decrypting this channel requires secure validation. Accept below to exchange encryption keys.</p>
                          <div className="flex gap-2.5 justify-center">
                            <button onClick={() => acceptChat(selectedChatId)} className="px-5 py-2 bg-accent-pink hover:bg-accent-pink-hover text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md shadow-accent-pink/15">Accept</button>
                            <button onClick={() => declineChat(selectedChatId)} className="px-5 py-2 bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-zinc-300 dark:hover:bg-zinc-700">Decline</button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {/* DM Call overlays */}
                <CallOverlay 
                  status={callStatus === "active" ? "connected" : callStatus === "calling" ? "outgoing" : (callStatus === "ended" ? "idle" : callStatus)} 
                  type={callType} 
                  onAccept={joinCall} 
                  onReject={endCall} 
                  onEnd={endCall} 
                  onToggleMic={toggleMic}
                  onToggleCamera={toggleCamera}
                  onSwitchCamera={switchCamera}
                  isMuted={isMuted}
                  isCameraOff={isCameraOff}
                  localStream={localStream} 
                  remoteStream={remoteStream} 
                  remoteName={partnerName} 
                />
              </>
            ) : (
              // Zenjoy Direct Messages landing view
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-background">
                <div className="w-16 h-16 rounded-[24px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-accent-blue shadow-sm mb-6">
                  <MessageSquare className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-foreground">Welcome to Zenjoy</h2>
                <p className="text-sm text-text-muted mt-2 max-w-sm">
                  A high-security, custom chat experience. Search a user or invite colleagues to collaborate securely.
                </p>
                
                <div className="grid grid-cols-2 gap-4 max-w-md mt-10 w-full">
                  <div className="p-5 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 flex flex-col items-center hover:shadow-md transition-shadow">
                    <ShieldCheck className="w-6 h-6 text-accent-pink mb-3" />
                    <h4 className="text-sm font-bold text-foreground">E2E Secure</h4>
                    <p className="text-xs text-text-muted mt-1">DMs are fully encrypted.</p>
                  </div>
                  <div className="p-5 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 flex flex-col items-center hover:shadow-md transition-shadow">
                    <Hash className="w-6 h-6 text-accent-blue mb-3" />
                    <h4 className="text-sm font-bold text-foreground">Channels</h4>
                    <p className="text-xs text-text-muted mt-1">Create server rooms for teamwork.</p>
                  </div>
                </div>
              </div>
            )
          ) : (
            // SERVER CHANNELS ROUTE
            activeChannelId ? (
              activeChannelType === "text" ? (
                <>
                  {/* Server Channel Header */}
                  <div className="h-16 shrink-0 px-6 flex items-center justify-between border-b dark:border-zinc-900 bg-white/40 dark:bg-zinc-950/40 backdrop-blur-md z-30">
                    <div className="flex items-center gap-3">
                      <button onClick={() => setShowSidebar(true)} className="md:hidden p-2 -ml-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-xl"><ArrowLeft className="w-5 h-5" /></button>
                      <Hash className="w-5 h-5 text-zinc-400 shrink-0" />
                      <h3 className="font-black text-sm text-zinc-900 dark:text-zinc-100 truncate">
                        {activeChannelName}
                      </h3>
                    </div>
                  </div>

                  {/* Server Channel Body */}
                  <div className="flex-1 flex flex-col min-h-0 relative bg-chat">
                    <ChannelMessageList channelId={activeChannelId} channelName={activeChannelName} />
                    <ChannelMessageInput channelId={activeChannelId} channelName={activeChannelName} />
                  </div>
                </>
              ) : (
                // Voice Room view
                <VoiceRoom 
                  channelId={activeChannelId} 
                  channelName={activeChannelName} 
                  onDisconnect={() => handleChannelSelect(null, "text")} 
                />
              )
            ) : (
              // Server general dashboard view
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-background">
                <div className="w-16 h-16 rounded-[24px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-accent-blue shadow-sm mb-6">
                  <Compass className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-foreground">Welcome to {currentServer?.name}</h2>
                <p className="text-sm text-text-muted mt-2 max-w-md">
                  Select a text channel on the sidebar to chat, or jump into a voice channel to collaborate live.
                </p>
              </div>
            )
          )}
        </div>
      </div>

      {/* CREATE SERVER MODAL */}
      <AnimatePresence>
        {showCreateServerModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] px-4">
            <motion.form 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onSubmit={handleCreateServerSubmit}
              className="bg-white dark:bg-zinc-950 p-6 rounded-2xl w-full max-w-sm border dark:border-zinc-900 shadow-2xl space-y-4 font-sans"
            >
              <div>
                <h3 className="text-base font-black">Create a Server</h3>
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mt-0.5">Start a new team space</p>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Server Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Zenjoy HQ"
                  value={serverName}
                  onChange={(e) => setServerName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border dark:border-zinc-800 text-xs font-medium focus:outline-none focus:border-accent-pink/40 text-zinc-800 dark:text-zinc-200"
                />
              </div>

              {serverError && (
                <p className="text-[10px] font-bold text-red-500 uppercase tracking-wide bg-red-500/5 py-1 px-2.5 rounded-md border border-red-500/15">
                  {serverError}
                </p>
              )}

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateServerModal(false)}
                  className="px-4 py-2 text-xs font-bold text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                  disabled={serverLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider text-white bg-accent-pink hover:bg-accent-pink-hover shadow-md shadow-accent-pink/20 transition-all disabled:opacity-50"
                  disabled={serverLoading}
                >
                  {serverLoading ? "Creating..." : "Create"}
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      {/* JOIN SERVER MODAL */}
      <AnimatePresence>
        {showJoinServerModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] px-4">
            <motion.form 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onSubmit={handleJoinServerSubmit}
              className="bg-white dark:bg-zinc-950 p-6 rounded-2xl w-full max-w-sm border dark:border-zinc-900 shadow-2xl space-y-4 font-sans"
            >
              <div>
                <h3 className="text-base font-black">Join a Server</h3>
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mt-0.5">Enter invite code to connect</p>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Invite Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. hJ8Kla"
                  value={serverInviteCode}
                  onChange={(e) => setServerInviteCode(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border dark:border-zinc-800 text-xs font-medium focus:outline-none focus:border-accent-blue/40 text-zinc-800 dark:text-zinc-200"
                />
              </div>

              {serverError && (
                <p className="text-[10px] font-bold text-red-500 uppercase tracking-wide bg-red-500/5 py-1 px-2.5 rounded-md border border-red-500/15">
                  {serverError}
                </p>
              )}

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowJoinServerModal(false)}
                  className="px-4 py-2 text-xs font-bold text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                  disabled={serverLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider text-white bg-accent-blue hover:bg-accent-blue-hover shadow-md shadow-accent-blue/20 transition-all disabled:opacity-50"
                  disabled={serverLoading}
                >
                  {serverLoading ? "Joining..." : "Join"}
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

    </main>
  );
}
