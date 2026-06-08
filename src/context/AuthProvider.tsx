"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  User,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { generateKeyPair, exportPublicKey, exportPrivateKey, importPrivateKey } from "@/lib/crypto";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  privateKey: CryptoKey | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  loginWithGoogle: async () => {},
  logout: async () => {},
  privateKey: null,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [privateKey, setPrivateKey] = useState<CryptoKey | null>(null);

  const handleKeys = async (firebaseUser: User) => {
    const uid = firebaseUser.uid;
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);
    
    // 1. Check if we have a key locally
    const storedPrivKey = localStorage.getItem(`chat_priv_${uid}`);
    const storedPubKey = localStorage.getItem(`chat_pub_${uid}`);
    const firestorePubKey = userSnap.exists() ? userSnap.data().publicKey : null;

    if (storedPrivKey && storedPubKey && firestorePubKey === storedPubKey) {
      try {
        const jwk = JSON.parse(storedPrivKey);
        const priv = await importPrivateKey(jwk);
        setPrivateKey(priv);
        console.log("✅ Keys synchronized from localStorage");
        return;
      } catch (e) {
        console.error("Failed to import stored key", e);
      }
    }

    // 2. If we don't have it, or it mismatches Firestore, we must regenerate
    // Note: In a production app, you'd want a way to recover the old key.
    console.log("🔄 Regenerating keys (mismatch or missing)...");
    const { publicKey, privateKey: privKey } = await generateKeyPair();
    const pubPem = await exportPublicKey(publicKey);
    const privJwk = await exportPrivateKey(privKey);

    await setDoc(
      userRef,
      {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        name: firebaseUser.displayName || firebaseUser.email?.split("@")[0],
        avatar: firebaseUser.photoURL,
        publicKey: pubPem,
        updatedAt: serverTimestamp(),
        lastSeen: serverTimestamp(),
      },
      { merge: true }
    );

    localStorage.setItem(`chat_priv_${uid}`, JSON.stringify(privJwk));
    localStorage.setItem(`chat_pub_${uid}`, pubPem);
    setPrivateKey(privKey);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        await handleKeys(firebaseUser);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const logout = async () => {
    await signOut(auth);
    setPrivateKey(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginWithGoogle, logout, privateKey }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
