"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthProvider";
import { getRtdb } from "@/lib/firebase";

export const usePresence = (uid?: string) => {
  const { user } = useAuth();
  const [onlineStatus, setOnlineStatus] = useState<boolean>(false);
  const [lastSeen, setLastSeen] = useState<number | null>(null);

  useEffect(() => {
    if (!user || !uid) return;
    let unsubscribe: (() => void) | undefined;

    const setup = async () => {
      const db = await getRtdb();
      if (!db) return;
      const { ref, onValue, set, onDisconnect, serverTimestamp } = await import("firebase/database");

      const presenceRef = ref(db, `presence/${uid}`);
      const unsub = onValue(presenceRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          setOnlineStatus(data.status === "online");
          setLastSeen(data.last_changed);
        }
      });
      unsubscribe = unsub;

      if (user.uid === uid) {
        const userRef = ref(db, `presence/${user.uid}`);
        const connectedRef = ref(db, ".info/connected");
        onValue(connectedRef, (snapshot) => {
          if (snapshot.val() === true) {
            set(userRef, { status: "online", last_changed: serverTimestamp() });
            onDisconnect(userRef).set({ status: "offline", last_changed: serverTimestamp() });
          }
        });
      }
    };

    setup();
    return () => { if (unsubscribe) unsubscribe(); };
  }, [user, uid]);

  return { onlineStatus, lastSeen };
};

export const useTyping = (chatId: string) => {
  const { user } = useAuth();
  const [isTyping, setIsTyping] = useState<boolean>(false);

  useEffect(() => {
    if (!chatId) return;
    let unsubscribe: (() => void) | undefined;

    const setup = async () => {
      const db = await getRtdb();
      if (!db) return;
      const { ref, onValue, set } = await import("firebase/database");

      const typingRef = ref(db, `typing/${chatId}`);
      const unsub = onValue(typingRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const typingUsers = Object.keys(data).filter(
            (uid) => uid !== user?.uid && data[uid] === true
          );
          setIsTyping(typingUsers.length > 0);
        } else {
          setIsTyping(false);
        }
      });
      unsubscribe = unsub;
    };

    setup();
    return () => { if (unsubscribe) unsubscribe(); };
  }, [chatId, user?.uid]);

  const setTyping = async (typing: boolean) => {
    if (!user || !chatId) return;
    const db = await getRtdb();
    if (!db) return;
    const { ref, set } = await import("firebase/database");
    const userTypingRef = ref(db, `typing/${chatId}/${user.uid}`);
    set(userTypingRef, typing);
  };

  return { isTyping, setTyping };
};
