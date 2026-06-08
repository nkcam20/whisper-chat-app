"use client";

import { useState, useEffect } from "react";
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  doc, 
  updateDoc, 
  deleteDoc,
  getDoc,
  getDocs,
  limit,
  where,
  arrayUnion,
  arrayRemove
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthProvider";

export interface Server {
  id: string;
  name: string;
  icon?: string;
  ownerId: string;
  inviteCode: string;
  members: string[];
  createdAt: any;
}

export interface Channel {
  id: string;
  serverId: string;
  name: string;
  type: "text" | "voice";
  category?: string;
  createdAt: any;
  activeVoiceUsers?: {
    uid: string;
    name: string;
    avatar?: string;
    isMuted?: boolean;
    isDeafened?: boolean;
  }[];
}

export interface ChannelMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  text: string;
  timestamp: any;
  type: "text" | "image" | "file";
  mediaUrl?: string;
  reactions?: Record<string, string[]>;
}

// Generate random 6 character alphanumeric invite code
const generateInviteCode = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export const useDiscord = () => {
  const { user } = useAuth();
  const [servers, setServers] = useState<Server[]>([]);
  const [loadingServers, setLoadingServers] = useState(true);

  // Fetch servers where user is a member
  useEffect(() => {
    if (!user) {
      setServers([]);
      setLoadingServers(false);
      return;
    }

    const q = query(
      collection(db, "servers"),
      where("members", "array-contains", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const serverList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Server));
      setServers(serverList);
      setLoadingServers(false);
    }, (err) => {
      console.error("Error fetching servers:", err);
      setLoadingServers(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Create a new server
  const createServer = async (name: string, iconGrad?: string) => {
    if (!user) throw new Error("Authentication required");

    const inviteCode = generateInviteCode();
    const serverData = {
      name,
      icon: iconGrad || `bg-gradient-to-br from-accent-primary to-accent-blue`,
      ownerId: user.uid,
      inviteCode,
      members: [user.uid],
      createdAt: serverTimestamp(),
    };

    // 1. Create Server Doc
    const serverRef = await addDoc(collection(db, "servers"), serverData);

    // 2. Create Default Channels
    const channelsRef = collection(db, "channels");
    
    // # general (text)
    await addDoc(channelsRef, {
      serverId: serverRef.id,
      name: "general",
      type: "text",
      category: "TEXT CHANNELS",
      createdAt: serverTimestamp(),
    });

    // # lounge (text)
    await addDoc(channelsRef, {
      serverId: serverRef.id,
      name: "lounge",
      type: "text",
      category: "TEXT CHANNELS",
      createdAt: serverTimestamp(),
    });

    // 🔊 General Voice (voice)
    await addDoc(channelsRef, {
      serverId: serverRef.id,
      name: "General Voice",
      type: "voice",
      category: "VOICE CHANNELS",
      createdAt: serverTimestamp(),
      activeVoiceUsers: []
    });

    return serverRef.id;
  };

  // Join server via Invite Code
  const joinServer = async (inviteCode: string) => {
    if (!user) throw new Error("Authentication required");

    const q = query(collection(db, "servers"), where("inviteCode", "==", inviteCode.trim()));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      throw new Error("Invalid invite code. Server not found.");
    }

    const serverDoc = snapshot.docs[0];
    const serverId = serverDoc.id;

    await updateDoc(doc(db, "servers", serverId), {
      members: arrayUnion(user.uid)
    });

    return serverId;
  };

  // Create a new channel
  const createChannel = async (serverId: string, name: string, type: "text" | "voice") => {
    if (!user) throw new Error("Authentication required");

    const cleanedName = name.toLowerCase().replace(/\s+/g, "-");
    const channelData = {
      serverId,
      name: type === "text" ? cleanedName : name,
      type,
      category: type === "text" ? "TEXT CHANNELS" : "VOICE CHANNELS",
      createdAt: serverTimestamp(),
      ...(type === "voice" ? { activeVoiceUsers: [] } : {})
    };

    const docRef = await addDoc(collection(db, "channels"), channelData);
    return docRef.id;
  };

  return {
    servers,
    loadingServers,
    createServer,
    joinServer,
    createChannel
  };
};

// Hook for fetching a server's channels
export const useChannels = (serverId: string | null) => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!serverId) {
      setChannels([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(
      collection(db, "channels"),
      where("serverId", "==", serverId),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const channelList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Channel));
      setChannels(channelList);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching channels:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [serverId]);

  return { channels, loading };
};

// Hook for channel messages
export const useChannelMessages = (channelId: string | null) => {
  const [messages, setMessages] = useState<ChannelMessage[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!channelId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(
      collection(db, "channels", channelId, "messages"),
      orderBy("timestamp", "asc"),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ChannelMessage));
      setMessages(msgList);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching channel messages:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [channelId]);

  return { messages, loading };
};

// Send message to channel
export const useSendChannelMessage = () => {
  const { user } = useAuth();

  const sendChannelMessage = async (
    channelId: string, 
    text: string, 
    type: "text" | "image" | "file" = "text", 
    mediaUrl?: string
  ) => {
    if (!user || !channelId) throw new Error("Missing user or channelId");

    const messageData = {
      senderId: user.uid,
      senderName: user.displayName || user.email?.split("@")[0] || "User",
      senderAvatar: user.photoURL || "",
      text,
      type,
      mediaUrl: mediaUrl || null,
      timestamp: serverTimestamp(),
      reactions: {}
    };

    const docRef = await addDoc(collection(db, "channels", channelId, "messages"), messageData);
    return docRef.id;
  };

  const deleteChannelMessage = async (channelId: string, messageId: string) => {
    if (!user || !channelId || !messageId) return;
    await deleteDoc(doc(db, "channels", channelId, "messages", messageId));
  };

  const addChannelReaction = async (channelId: string, messageId: string, emoji: string) => {
    if (!user || !channelId || !messageId) return;
    const msgRef = doc(db, "channels", channelId, "messages", messageId);
    await updateDoc(msgRef, {
      [`reactions.${emoji}`]: arrayUnion(user.uid)
    });
  };

  const removeChannelReaction = async (channelId: string, messageId: string, emoji: string) => {
    if (!user || !channelId || !messageId) return;
    const msgRef = doc(db, "channels", channelId, "messages", messageId);
    await updateDoc(msgRef, {
      [`reactions.${emoji}`]: arrayRemove(user.uid)
    });
  };

  return { sendChannelMessage, deleteChannelMessage, addChannelReaction, removeChannelReaction };
};

// Hook for voice states inside channels
export const useVoiceStates = () => {
  const { user } = useAuth();

  const joinVoiceChannel = async (channelId: string) => {
    if (!user) return;

    const userObj = {
      uid: user.uid,
      name: user.displayName || user.email?.split("@")[0] || "User",
      avatar: user.photoURL || ""
    };

    const channelRef = doc(db, "channels", channelId);
    await updateDoc(channelRef, {
      activeVoiceUsers: arrayUnion(userObj)
    });
  };

  const leaveVoiceChannel = async (channelId: string) => {
    if (!user) return;

    const channelRef = doc(db, "channels", channelId);
    
    // Fetch first to find the exact object to remove
    const snap = await getDoc(channelRef);
    if (snap.exists()) {
      const activeVoiceUsers = snap.data().activeVoiceUsers || [];
      const userObj = activeVoiceUsers.find((u: any) => u.uid === user.uid);
      if (userObj) {
        await updateDoc(channelRef, {
          activeVoiceUsers: arrayRemove(userObj)
        });
      }
    }
  };

  return { joinVoiceChannel, leaveVoiceChannel };
};
