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
  getDoc,
  limit,
  where
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthProvider";
import { encryptMessage, decryptMessage } from "@/lib/crypto";

export interface Message {
  id: string;
  senderId: string;
  text: string;
  senderText?: string;
  timestamp: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  status: "sent" | "delivered" | "seen";
  type: "text" | "image" | "file";
  mediaUrl?: string;
}

export interface Chat {
  id: string;
  members: string[];
  status: "pending" | "accepted" | "declined";
  requestedBy: string;
  lastMessage?: string;
  updatedAt: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export const useChats = () => {
  const { user } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "chats"),
      where("members", "array-contains", user.uid),
      orderBy("updatedAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setChats(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chat)));
      setLoading(false);
    }, () => {
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const acceptChat = async (chatId: string) => {
    await updateDoc(doc(db, "chats", chatId), {
      status: "accepted",
      updatedAt: serverTimestamp()
    });
  };

  const declineChat = async (chatId: string) => {
    await updateDoc(doc(db, "chats", chatId), {
      status: "declined",
      updatedAt: serverTimestamp()
    });
  };

  return { chats, loading, acceptChat, declineChat };
};

import { ref as dbRef, onValue } from "firebase/database";
import { rtdb } from "@/lib/firebase";

export const useActivePresence = () => {
    const [presence, setPresence] = useState<Record<string, boolean>>({});

    useEffect(() => {
        const statusRef = dbRef(rtdb, "/status");
        const unsubscribe = onValue(statusRef, (snapshot) => {
            const data = snapshot.val() || {};
            const statuses: Record<string, boolean> = {};
            Object.keys(data).forEach(uid => {
                statuses[uid] = data[uid]?.state === "online";
            });
            setPresence(statuses);
        });
        return () => unsubscribe();
    }, []);

    return presence;
};

export const useAllUsers = () => {
    const { user } = useAuth();
    const [users, setUsers] = useState<any[]>([]); // eslint-disable-line @typescript-eslint/no-explicit-any
    const presence = useActivePresence();

    useEffect(() => {
        if (!user) return;
        const q = query(collection(db, "users"), limit(100));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs
                .map(doc => doc.data())
                .filter(u => u.uid !== user.uid);
            
            const sorted = list.sort((a, b) => {
                const aOnline = presence[a.uid] ? 1 : 0;
                const bOnline = presence[b.uid] ? 1 : 0;
                return bOnline - aOnline;
            });
            setUsers(sorted);
        });
        return () => unsubscribe();
    }, [user, presence]);

    return { users, presence };
};

export const useMessages = (chatId: string) => {
  const { user, privateKey } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!chatId || !user) return;

    const q = query(
      collection(db, "chats", chatId, "messages"),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      try {
        const msgList: Message[] = [];
        for (const snap of snapshot.docs) {
          const data = snap.data();
          let displayChatText = data.text;
          
          if (privateKey) {
            try {
              const isMe = data.senderId === user.uid;
              const encryptedTarget = isMe && data.senderText ? data.senderText : data.text;
              
              if (encryptedTarget && typeof encryptedTarget === 'string' && encryptedTarget.length > 20) {
                displayChatText = await decryptMessage(encryptedTarget, privateKey);
              }
            } catch (err) {
              console.warn("Message decryption failed. This usually happens if the sender used an old public key or you are on a new device.", err);
              displayChatText = data.text; 
            }
          }

          msgList.push({ id: snap.id, ...data, text: displayChatText } as Message);
        }
        
        const sorted = msgList.sort((a, b) => {
          const t1 = a.timestamp?.toMillis ? a.timestamp.toMillis() : (a.timestamp?.seconds * 1000 || 0);
          const t2 = b.timestamp?.toMillis ? b.timestamp.toMillis() : (b.timestamp?.seconds * 1000 || 0);
          return t1 - t2;
        });

        setMessages(sorted);
        setLoading(false);
      } catch {
        setLoading(false);
      }
    }, () => {
      setLoading(false);
    });

    return () => unsubscribe();
  }, [chatId, user, privateKey]);

  return { messages, loading };
};

export const useSendMessage = () => {
  const { user } = useAuth();

  const sendMessage = async (chatId: string, text: string, type: "text" | "image" | "file" = "text", mediaUrl?: string) => {
    if (!user || !chatId) throw new Error("Missing user or chatId");

    const chatRef = doc(db, "chats", chatId);
    const chatDoc = await getDoc(chatRef);
    if (chatDoc.data()?.status === "declined") throw new Error("Conversation declined");

    const members = (chatDoc.data()?.members || []) as string[];
    const recipientId = members.find(id => id !== user.uid) || user.uid;

    let encryptedForRecipient = text;
    let encryptedForSender = text;

    try {
        const recipientDoc = await getDoc(doc(db, "users", recipientId));
        const recipientPubKey = recipientDoc.data()?.publicKey;
        if (recipientPubKey) {
          encryptedForRecipient = await encryptMessage(text, recipientPubKey);
        }

        const senderDoc = await getDoc(doc(db, "users", user.uid));
        const senderPubKey = senderDoc.data()?.publicKey;
        if (senderPubKey) {
          encryptedForSender = await encryptMessage(text, senderPubKey);
        }
    } catch (e) {
        console.warn("Encryption fallback", e);
    }

    const msgData = {
      chatId,
      senderId: user.uid,
      text: encryptedForRecipient,
      senderText: encryptedForSender,
      timestamp: serverTimestamp(),
      status: "sent",
      type,
      mediaUrl: mediaUrl || null
    };

    const msgRef = await addDoc(collection(db, "chats", chatId, "messages"), msgData);

    await updateDoc(chatRef, {
      lastMessage: text.length > 40 ? text.slice(0, 40) + "..." : text,
      updatedAt: serverTimestamp()
    });

    return msgRef.id;
  };

  return { sendMessage };
};
