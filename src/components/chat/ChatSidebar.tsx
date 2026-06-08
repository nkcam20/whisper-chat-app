"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthProvider";
import { useChats, useAllUsers } from "@/hooks/useChat";
import { useChannels, useVoiceStates, Channel } from "@/hooks/useDiscord";
import { 
  Search, 
  Plus, 
  LogOut, 
  MessageCircle, 
  Clock, 
  Settings, 
  User, 
  Mic, 
  MicOff, 
  Headphones, 
  ChevronDown, 
  Hash, 
  Volume2, 
  UserPlus, 
  Copy, 
  Check, 
  Sparkles,
  ShieldCheck
} from "lucide-react";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  serverTimestamp,
  doc,
  getDoc
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { motion, AnimatePresence } from "framer-motion";
import SettingsModal from "./SettingsModal";

interface SidebarProps {
  activeServerId: string | null;
  activeChannelId: string | null;
  onChannelSelect: (channelId: string | null, type: "text" | "voice") => void;
  onChatSelect: (chatId: string) => void;
  activeChatId?: string;
  servers: any[];
}

export default function ChatSidebar({ 
  activeServerId, 
  activeChannelId, 
  onChannelSelect, 
  onChatSelect, 
  activeChatId,
  servers
}: SidebarProps) {
  const { user, logout } = useAuth();
  const { chats, loading: chatsLoading } = useChats();
  const { users: allUsers, presence } = useAllUsers();
  const { channels, loading: loadingChannels } = useChannels(activeServerId);
  const { joinVoiceChannel, leaveVoiceChannel } = useVoiceStates();
  
  const [search, setSearch] = useState("");
  const [activeVoiceChannel, setActiveVoiceChannel] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  
  // Mic & Deafen UI States
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [copiedServerInvite, setCopiedServerInvite] = useState(false);

  // Find active server object
  const currentServer = servers.find(s => s.id === activeServerId);

  // Group Chats by State for DMs
  const acceptedChats = chats.filter(c => !c.status || c.status === "accepted");
  const pendingRequests = chats.filter(c => c.status === "pending" && c.requestedBy !== user?.uid);
  const sentRequests = chats.filter(c => c.status === "pending" && c.requestedBy === user?.uid);

  // Create channel states
  const [showCreateChannelModal, setShowCreateChannelModal] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelType, setNewChannelType] = useState<"text" | "voice">("text");
  const { createChannel } = useChannels(activeServerId) as any;

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim() || !activeServerId) return;
    try {
      const { createChannel: makeChannel } = require("@/hooks/useDiscord");
      // Since it's imported at top, call it using our callback:
      const newChanId = await createChannel(activeServerId, newChannelName, newChannelType);
      setShowCreateChannelModal(false);
      setNewChannelName("");
      if (newChannelType === "text") {
        onChannelSelect(newChanId, "text");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const copyServerInviteCode = () => {
    if (!currentServer) return;
    navigator.clipboard.writeText(currentServer.inviteCode);
    setCopiedServerInvite(true);
    setTimeout(() => setCopiedServerInvite(false), 2000);
  };

  const startChat = async (recipient: any) => {
    if (!user) return;
    try {
      const q = query(collection(db, "chats"), where("members", "array-contains", user.uid));
      const snapshot = await getDocs(q);
      const existing = snapshot.docs.find(doc => doc.data().members.includes(recipient.uid));
      
      if (existing) {
        onChatSelect(existing.id);
      } else {
        const chatData = {
          members: [user.uid, recipient.uid],
          status: "pending",
          requestedBy: user.uid,
          lastMessage: "Chat Request Sent",
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        };
        const docRef = await addDoc(collection(db, "chats"), chatData);
        onChatSelect(docRef.id);
      }
    } catch (e) {
      console.error("Start chat failed", e);
    } finally {
      setSearch("");
    }
  };

  const handleVoiceChannelClick = async (channel: Channel) => {
    if (activeVoiceChannel === channel.id) {
      // Disconnect
      await leaveVoiceChannel(channel.id);
      setActiveVoiceChannel(null);
      onChannelSelect(null, "voice");
    } else {
      // Switch / Join
      if (activeVoiceChannel) {
        await leaveVoiceChannel(activeVoiceChannel);
      }
      await joinVoiceChannel(channel.id);
      setActiveVoiceChannel(channel.id);
      onChannelSelect(channel.id, "voice");
    }
  };

  const filteredUsers = allUsers.filter(u => 
    u.email?.toLowerCase().includes(search.toLowerCase()) || 
    u.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-sidebar font-sans border-r dark:border-zinc-900 select-none">
      
      {/* 1. Header (Dynamic depending on Server or DM selection) */}
      {activeServerId === null ? (
        // Direct Messages Sidebar Header
        <div className="p-4 bg-sidebar/50 backdrop-blur-md border-b dark:border-zinc-900/50">
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-accent-primary secure-pastel-pulse"></span>
              <h1 className="text-base font-black tracking-tight text-accent-primary leading-none">zenjoy</h1>
            </div>
            <div className="flex items-center gap-1 bg-accent-primary/10 border border-accent-primary/20 rounded-md px-1.5 py-0.5 text-[8px] text-accent-primary font-black tracking-wider uppercase">
              E2E Active
            </div>
          </div>
          
          <div className="relative group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 group-focus-within:text-accent-primary transition-colors" />
            <input
              type="text"
              placeholder="Search active users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-900/80 rounded-xl text-[11px] focus:outline-none focus:border-accent-primary/40 font-medium transition-all text-zinc-800 dark:text-zinc-200 placeholder-zinc-400"
            />
          </div>
        </div>
      ) : (
        // Server Sidebar Header
        <div className="p-4 bg-sidebar/50 border-b dark:border-zinc-900/50 flex items-center justify-between">
          <div className="min-w-0">
            <h2 className="text-sm font-black truncate text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              {currentServer?.name || "Server"}
              <ChevronDown className="w-4 h-4 text-zinc-400 shrink-0" />
            </h2>
            <p className="text-[9px] text-zinc-400 font-bold truncate tracking-wide uppercase mt-0.5">
              Code: {currentServer?.inviteCode}
            </p>
          </div>
          <button
            onClick={copyServerInviteCode}
            className={`p-2 rounded-xl text-zinc-400 hover:text-accent-primary hover:bg-white dark:hover:bg-zinc-950 shadow-sm border dark:border-zinc-900/80 flex items-center justify-center`}
            title="Copy Invite Code"
          >
            {copiedServerInvite ? <Check className="w-3.5 h-3.5 text-green-500" /> : <UserPlus className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}

      {/* 2. Scrollable Body */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-2.5 py-4 space-y-6">
        
        {activeServerId === null ? (
          // DIRECT MESSAGES BODY
          search ? (
            <SearchResultSection results={filteredUsers} onStartChat={startChat} />
          ) : (
            <>
              {/* Pending Invites */}
              {pendingRequests.length > 0 && (
                <div className="space-y-2">
                  <h2 className="px-2 text-[9px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-1.5">
                    <Clock className="w-3 h-3 animate-pulse" /> Pending Invites ({pendingRequests.length})
                  </h2>
                  <div className="grid gap-1">
                    {pendingRequests.map(chat => (
                      <ChatItem key={chat.id} chat={chat} currentUserId={user?.uid || ""} isActive={activeChatId === chat.id} onClick={() => onChatSelect(chat.id)} isRequest />
                    ))}
                  </div>
                </div>
              )}

              {/* Direct Messages List */}
              <div className="space-y-2">
                <h2 className="px-2 text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                  <MessageCircle className="w-3 h-3 text-accent-primary" /> Direct Messages
                </h2>
                <div className="grid gap-1">
                  {acceptedChats.length === 0 && sentRequests.length === 0 && (
                    <div className="py-6 px-3 text-center border border-dashed border-zinc-200 dark:border-zinc-900 rounded-2xl bg-white/30 dark:bg-zinc-950/20">
                      <p className="text-[10px] text-zinc-400">Search users above to establish a secure link.</p>
                    </div>
                  )}
                  {acceptedChats.map(chat => (
                    <ChatItem key={chat.id} chat={chat} currentUserId={user?.uid || ""} isActive={activeChatId === chat.id} onClick={() => onChatSelect(chat.id)} />
                  ))}
                  {sentRequests.map(chat => (
                    <ChatItem key={chat.id} chat={chat} currentUserId={user?.uid || ""} isActive={activeChatId === chat.id} onClick={() => onChatSelect(chat.id)} isPending />
                  ))}
                </div>
              </div>

              {/* Online Friends Shortcut Grid */}
              {allUsers.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h2 className="px-2 text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-accent-primary" /> Active Nodes
                  </h2>
                  <div className="grid grid-cols-4 gap-2.5 px-1">
                    {allUsers.slice(0, 8).map((u) => (
                      <button 
                        key={u.uid} 
                        onClick={() => startChat(u)} 
                        className="flex flex-col items-center gap-1 group relative"
                      >
                        <div className="relative">
                          <div className="w-9 h-9 rounded-xl bg-white dark:bg-zinc-950 flex items-center justify-center text-xs font-bold overflow-hidden shadow-sm border border-zinc-100 dark:border-zinc-900 group-hover:scale-105 group-hover:border-accent-primary/40 transition-all duration-300">
                            {u.avatar ? <img src={u.avatar} alt={u.name || "avatar"} className="w-full h-full object-cover" /> : u.name?.[0]?.toUpperCase() || u.email[0].toUpperCase()}
                          </div>
                          {presence[u.uid] && (
                            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 border border-white dark:border-zinc-950 rounded-full animate-pulse z-10"></span>
                          )}
                        </div>
                        <p className="text-[8px] font-bold text-zinc-500 truncate w-full text-center group-hover:text-accent-primary transition-colors">{u.name?.split(" ")[0] || "User"}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )
        ) : (
          // SERVER CHANNELS BODY
          <div className="space-y-6">
            {/* Text Channels Category */}
            <div className="space-y-1">
              <div className="flex items-center justify-between px-2 text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
                <span>Text Channels</span>
                <button 
                  onClick={() => {
                    setNewChannelType("text");
                    setShowCreateChannelModal(true);
                  }}
                  className="hover:text-accent-primary p-0.5 rounded transition-all"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
              <div className="grid gap-0.5">
                {channels
                  .filter(c => c.type === "text")
                  .map(channel => (
                    <button
                      key={channel.id}
                      onClick={() => onChannelSelect(channel.id, "text")}
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-bold w-full text-left transition-all ${
                        activeChannelId === channel.id
                          ? "bg-accent-primary text-white shadow-sm"
                          : "text-zinc-500 dark:text-zinc-400 hover:bg-white dark:hover:bg-zinc-950/40 hover:text-zinc-900 dark:hover:text-zinc-100"
                      }`}
                    >
                      <Hash className={`w-3.5 h-3.5 ${activeChannelId === channel.id ? "text-white" : "text-zinc-400"}`} />
                      <span className="truncate">{channel.name}</span>
                    </button>
                  ))}
              </div>
            </div>

            {/* Voice Channels Category */}
            <div className="space-y-1">
              <div className="flex items-center justify-between px-2 text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
                <span>Voice Channels</span>
                <button 
                  onClick={() => {
                    setNewChannelType("voice");
                    setShowCreateChannelModal(true);
                  }}
                  className="hover:text-accent-primary p-0.5 rounded transition-all"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
              <div className="grid gap-0.5">
                {channels
                  .filter(c => c.type === "voice")
                  .map(channel => {
                    const isConnected = activeVoiceChannel === channel.id;
                    const connectedUsers = channel.activeVoiceUsers || [];

                    return (
                      <div key={channel.id} className="space-y-1">
                        <button
                          onClick={() => handleVoiceChannelClick(channel)}
                          className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-bold w-full text-left transition-all ${
                            isConnected
                              ? "bg-accent-primary text-white shadow-sm"
                              : "text-zinc-500 dark:text-zinc-400 hover:bg-white dark:hover:bg-zinc-950/40 hover:text-zinc-900 dark:hover:text-zinc-100"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Volume2 className={`w-3.5 h-3.5 ${isConnected ? "text-white" : "text-zinc-400"}`} />
                            <span className="truncate">{channel.name}</span>
                          </div>
                          {isConnected && (
                            <span className="text-[8px] font-black bg-white/20 text-white px-1.5 py-0.5 rounded-md uppercase tracking-wide">
                              Connected
                            </span>
                          )}
                        </button>

                        {/* List connected members in voice channel */}
                        {connectedUsers.length > 0 && (
                          <div className="pl-6 space-y-1">
                            {connectedUsers.map((voiceUser) => (
                              <div key={voiceUser.uid} className="flex items-center gap-2 py-0.5">
                                <div className="w-5 h-5 rounded-md overflow-hidden bg-zinc-200 dark:bg-zinc-900 flex items-center justify-center text-[10px] font-bold">
                                  {voiceUser.avatar ? (
                                    <img src={voiceUser.avatar} alt={voiceUser.name} className="w-full h-full object-cover" />
                                  ) : (
                                    voiceUser.name[0].toUpperCase()
                                  )}
                                </div>
                                <span className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500 truncate">
                                  {voiceUser.name}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Account / User controls footer (Discord profile bar) */}
      <div className="p-3 bg-white/40 dark:bg-zinc-950/40 border-t dark:border-zinc-900 flex flex-col gap-2">
        {/* Dynamic Connected Voice Room Indicator (at the bottom of sidebar if in voice call) */}
        {activeVoiceChannel && (
          <div className="flex items-center justify-between p-2 bg-accent-primary/10 border border-accent-primary/20 rounded-xl">
            <div className="min-w-0">
              <p className="text-[9px] font-black text-accent-primary uppercase tracking-widest leading-none">Voice Connected</p>
              <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                {channels.find(c => c.id === activeVoiceChannel)?.name || "Voice"}
              </p>
            </div>
            <button
              onClick={async () => {
                await leaveVoiceChannel(activeVoiceChannel);
                setActiveVoiceChannel(null);
                onChannelSelect(null, "voice");
              }}
              className="px-2 py-1 bg-red-500 hover:bg-red-600 text-white rounded-lg text-[8px] font-black uppercase tracking-wider transition-all"
            >
              Disconnect
            </button>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 p-1.5 bg-white dark:bg-zinc-950 rounded-[16px] shadow-sm border dark:border-zinc-900/60">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative">
              <div className="w-8 h-8 rounded-xl bg-accent-primary flex items-center justify-center text-white font-bold text-xs shadow-inner overflow-hidden">
                {user?.photoURL ? <img src={user.photoURL} alt="profile" className="w-full h-full object-cover" /> : <User className="w-4 h-4" />}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border border-white dark:border-zinc-950 rounded-full shadow-sm"></div>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black leading-none truncate text-zinc-900 dark:text-zinc-100">{user?.displayName || "Me"}</p>
              <p className="text-[8px] text-zinc-400 font-bold uppercase tracking-wider mt-0.5 truncate">Online</p>
            </div>
          </div>
          
          <div className="flex items-center gap-0.5 shrink-0">
            <button 
              onClick={() => setIsMuted(prev => !prev)} 
              className={`p-1.5 rounded-lg transition-all ${isMuted ? "text-red-500 bg-red-500/10" : "text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"}`}
              title={isMuted ? "Unmute Mic" : "Mute Mic"}
            >
              {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            </button>
            <button 
              onClick={() => setIsDeafened(prev => !prev)} 
              className={`p-1.5 rounded-lg transition-all ${isDeafened ? "text-red-500 bg-red-500/10" : "text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"}`}
              title={isDeafened ? "Undeafen" : "Deafen"}
            >
              <Headphones className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={() => setShowSettings(true)}
              className="p-1.5 text-zinc-400 hover:text-accent-primary hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg transition-all" 
              title="Settings"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={logout} 
              className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg transition-all" 
              title="Logout"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Copy Personal Invite Code shortcut button */}
        <button 
          onClick={() => {
            navigator.clipboard.writeText(user?.uid || "");
            alert("✅ ZENJOY INVITE CODE COPIED: Share with a friend to DM!");
          }}
          className="w-full py-1.5 bg-accent-primary hover:bg-accent-primary-hover text-white rounded-xl text-[8px] font-black uppercase tracking-widest shadow-sm flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Copy Personal Invite
        </button>
      </div>

      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />

      {/* CREATE CHANNEL MODAL */}
      <AnimatePresence>
        {showCreateChannelModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] px-4">
            <motion.form 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onSubmit={handleCreateChannel}
              className="bg-white dark:bg-zinc-950 p-6 rounded-2xl w-full max-w-sm border dark:border-zinc-900 shadow-2xl space-y-4"
            >
              <h3 className="text-sm font-black uppercase tracking-wide">Create Channel</h3>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Channel Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewChannelType("text")}
                    className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all ${
                      newChannelType === "text"
                        ? "bg-accent-primary/10 border-accent-primary text-accent-primary shadow-inner"
                        : "bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 text-zinc-400"
                    }`}
                  >
                    <Hash className="w-3.5 h-3.5" /> Text
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewChannelType("voice")}
                    className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all ${
                      newChannelType === "voice"
                        ? "bg-accent-primary/10 border-accent-primary text-accent-primary shadow-inner"
                        : "bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 text-zinc-400"
                    }`}
                  >
                    <Volume2 className="w-3.5 h-3.5" /> Voice
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Channel Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. general"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border dark:border-zinc-800 text-xs font-medium focus:outline-none focus:border-accent-primary/40"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateChannelModal(false)}
                  className="px-4 py-2 text-xs font-bold text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider text-white shadow-md ${
                    newChannelType === "text" ? "bg-accent-primary shadow-accent-primary/20" : "bg-accent-primary shadow-accent-primary/20"
                  }`}
                >
                  Create
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SearchResultSection({ results, onStartChat }: { results: any[], onStartChat: (u: any) => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      <h2 className="px-2 text-[9px] font-black text-accent-primary uppercase tracking-widest flex items-center gap-1.5">
         Search Results ({results.length})
      </h2>
      <div className="grid gap-1.5">
        {results.length === 0 ? (
          <div className="py-8 text-center bg-white/20 dark:bg-zinc-950/20 rounded-2xl border border-dashed dark:border-zinc-900">
            <p className="text-[10px] text-zinc-400 font-bold uppercase">No nodes found.</p>
          </div>
        ) : (
          results.map(u => (
            <button
              key={u.uid}
              onClick={() => onStartChat(u)}
              className="flex items-center gap-2.5 p-2 bg-white dark:bg-zinc-950 hover:bg-accent-primary/5 hover:border-accent-primary/20 border border-zinc-100 dark:border-zinc-900 rounded-xl transition-all group"
            >
              <div className="w-8 h-8 rounded-lg bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center font-black text-xs text-zinc-500 overflow-hidden shadow-inner shrink-0">
                {u.avatar ? <img src={u.avatar} alt={u.name || "avatar"} className="w-full h-full object-cover" /> : (u.name?.[0] || u.email[0]).toUpperCase()}
              </div>
              <div className="text-left flex-1 min-w-0">
                <p className="text-[11px] font-black truncate group-hover:text-accent-primary transition-colors">{u.name || u.email}</p>
                <p className="text-[9px] text-zinc-400 truncate mt-0.5">{u.email}</p>
              </div>
              <Plus className="w-3.5 h-3.5 text-zinc-300 group-hover:text-accent-primary transition-all shrink-0" />
            </button>
          ))
        )}
      </div>
    </motion.div>
  );
}

function ChatItem({ chat, currentUserId, isActive, onClick, isRequest, isPending }: any) {
  const [partner, setPartner] = useState<any>(null);

  useEffect(() => {
    const fetchPartner = async () => {
      const otherId = chat.members?.find((id: string) => id !== currentUserId) || currentUserId;
      const snap = await getDoc(doc(db, "users", otherId));
      if (snap.exists()) setPartner(snap.data());
    };
    fetchPartner();
  }, [chat, currentUserId]);

  const name = partner?.name || partner?.email?.split("@")[0] || "User";
  const avatar = partner?.avatar;

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 p-2.5 rounded-xl transition-all relative group/item ${
        isActive 
          ? "bg-accent-primary text-white shadow-md shadow-accent-primary/25" 
          : isRequest 
            ? "bg-amber-500/10 dark:bg-amber-500/5 border border-amber-500/20 hover:border-amber-500" 
            : "hover:bg-white dark:hover:bg-zinc-950/60 border border-transparent dark:hover:border-zinc-900/60 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white"
      }`}
    >
      <div className="relative shrink-0">
        <div className={`w-8.5 h-8.5 rounded-xl flex items-center justify-center text-xs font-black overflow-hidden shadow-sm transition-transform group-hover/item:scale-105 ${isActive ? "bg-white/20" : "bg-white dark:bg-zinc-950 border dark:border-zinc-900"}`}>
          {avatar ? <img src={avatar} alt={name} className="w-full h-full object-cover" /> : name[0]}
        </div>
        {isRequest && <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-amber-500 rounded-full border-2 border-white dark:border-zinc-950 animate-bounce"></div>}
      </div>
      <div className="flex-1 text-left min-w-0">
        <div className="flex items-center justify-between gap-1 mb-0.5">
          <p className={`text-[12px] font-black truncate leading-none ${isActive ? "text-white" : "text-zinc-800 dark:text-zinc-200"}`}>{name}</p>
          {isRequest && <span className="text-[7px] font-black uppercase tracking-tighter bg-amber-500 text-white px-1 py-0.2 rounded-md">Invite</span>}
        </div>
        <p className={`text-[9px] font-bold truncate leading-tight uppercase tracking-tight opacity-75 ${isActive ? "text-pink-50" : "text-zinc-400"}`}>
          {isPending ? "Waiting for authorization..." : chat.lastMessage || "Establish connection"}
        </p>
      </div>
      {isActive && (
        <motion.div 
          layoutId="active-indicator"
          className="absolute right-2.5 w-1.5 h-1.5 bg-white rounded-full"
        />
      )}
    </button>
  );
}
