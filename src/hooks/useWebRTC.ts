"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  doc, 
  updateDoc, 
  getDoc,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthProvider";

const servers = {
  iceServers: [
    {
      urls: [
        "stun:stun1.l.google.com:19302", 
        "stun:stun2.l.google.com:19302",
        "stun:stun3.l.google.com:19302",
        "stun:stun4.l.google.com:19302"
      ],
    },
  ],
  iceCandidatePoolSize: 10,
};

export const useWebRTC = (chatId: string) => {
  const { user } = useAuth();
  const pc = useRef<RTCPeerConnection | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [callStatus, setCallStatus] = useState<"idle" | "calling" | "incoming" | "active" | "ended">("idle");
  const [callType, setCallType] = useState<"voice" | "video">("voice");
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [incomingCallData, setIncomingCallData] = useState<any>(null);
  const currentCallId = useRef<string | null>(null);

  const cleanup = useCallback(() => {
    if (pc.current) {
      pc.current.close();
      pc.current = null;
    }
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    setRemoteStream(null);
    setCallStatus("idle");
    currentCallId.current = null;
  }, [localStream]);

  const lastHandledCallId = useRef<string | null>(null);

  useEffect(() => {
    if (!chatId || !user) return;

    const q = query(collection(db, "chats", chatId, "calls"), orderBy("timestamp", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) return;
      
      const callDoc = snapshot.docs[0];
      const data = callDoc.data();
      const callId = callDoc.id;

      // Only process calls created recently (last 2 minutes) to avoid stale "flickering"
      const createdAt = data.timestamp?.toMillis ? data.timestamp.toMillis() : 0;
      const isRecent = Date.now() - createdAt < 120000;
      if (!isRecent) return;

      // If there's a new call for me and we aren't already in a call state
      if (data.status === "offered" && data.callerId !== user.uid && callStatus === "idle" && lastHandledCallId.current !== callId) {
        lastHandledCallId.current = callId;
        setIncomingCallData({ id: callId, ...data });
        setCallType(data.type || "voice");
        setCallStatus("incoming");
      }
      
      // If the caller ended the call
      if (data.status === "ended" && callId === currentCallId.current) {
        cleanup();
      }
    });

    return () => unsubscribe();
  }, [chatId, user, cleanup]);

  const startCall = async (type: "voice" | "video") => {
    try {
      setCallType(type);
      setCallStatus("calling"); // Instant UI Feedback
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === "video" ? { facingMode: "user" } : false,
      });

      setLocalStream(stream);
      const peerConnection = new RTCPeerConnection(servers);
      pc.current = peerConnection;

      stream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, stream);
      });

      const remoteStreamInstance = new MediaStream();
      peerConnection.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) => {
          remoteStreamInstance.addTrack(track);
        });
        setRemoteStream(remoteStreamInstance);
        setCallStatus("active");
      };

      const callRef = collection(db, "chats", chatId, "calls");
      const callDoc = await addDoc(callRef, {
        callerId: user?.uid,
        type,
        status: "offered",
        timestamp: serverTimestamp(),
      });
      currentCallId.current = callDoc.id;

      const callerCandidatesCollection = collection(db, "chats", chatId, "calls", callDoc.id, "callerCandidates");
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          addDoc(callerCandidatesCollection, event.candidate.toJSON());
        }
      };

      const offerDescription = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offerDescription);

      await updateDoc(doc(db, "chats", chatId, "calls", callDoc.id), {
        offer: { sdp: offerDescription.sdp, type: offerDescription.type }
      });

      // Listen for Answer
      onSnapshot(doc(db, "chats", chatId, "calls", callDoc.id), (snapshot) => {
        const data = snapshot.data();
        if (peerConnection && !peerConnection.currentRemoteDescription && data?.answer) {
          const answerDescription = new RTCSessionDescription(data.answer);
          peerConnection.setRemoteDescription(answerDescription);
        }
      });

      // Listen for Remote ICE Candidates
      onSnapshot(collection(db, "chats", chatId, "calls", callDoc.id, "calleeCandidates"), (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            const data = change.doc.data();
            const candidate = new RTCIceCandidate(data);
            peerConnection.addIceCandidate(candidate).catch(e => console.warn("Candidate error:", e));
          }
        });
      });
    } catch (err) {
      console.error("Failed to start call:", err);
      cleanup();
    }
  };

  const joinCall = async () => {
    if (!incomingCallData) return;

    try {
      const peerConnection = new RTCPeerConnection(servers);
      pc.current = peerConnection;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: incomingCallData.type === "video",
        audio: true,
      });

      stream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, stream);
      });

      setLocalStream(stream);
      setCallStatus("active");
      currentCallId.current = incomingCallData.id;

      const remoteStreamInstance = new MediaStream();
      peerConnection.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) => {
          remoteStreamInstance.addTrack(track);
        });
        setRemoteStream(remoteStreamInstance);
      };

      const calleeCandidatesCollection = collection(db, "chats", chatId, "calls", incomingCallData.id, "calleeCandidates");
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          addDoc(calleeCandidatesCollection, event.candidate.toJSON());
        }
      };

      const callDoc = doc(db, "chats", chatId, "calls", incomingCallData.id);
      const callSnapshot = await getDoc(callDoc);
      const callData = callSnapshot.data();

      if (!callData?.offer) throw new Error("No offer found");

      await peerConnection.setRemoteDescription(new RTCSessionDescription(callData.offer));

      const answerDescription = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answerDescription);

      await updateDoc(callDoc, { 
        answer: { type: answerDescription.type, sdp: answerDescription.sdp },
        status: "active" 
      });

      // Listen for Caller ICE Candidates
      onSnapshot(collection(db, "chats", chatId, "calls", incomingCallData.id, "callerCandidates"), (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            const data = change.doc.data();
            const candidate = new RTCIceCandidate(data);
            peerConnection.addIceCandidate(candidate).catch(e => console.warn("Candidate error:", e));
          }
        });
      });
    } catch (err) {
      console.error("Failed to join call:", err);
      cleanup();
    }
  };

  const endCall = async () => {
    if (currentCallId.current) {
      const callDoc = doc(db, "chats", chatId, "calls", currentCallId.current);
      await updateDoc(callDoc, { status: "ended" }).catch(() => {});
    }
    cleanup();
    setIsMuted(false);
    setIsCameraOff(false);
  };

  const toggleMic = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleCamera = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOff(!videoTrack.enabled);
      }
    }
  };

  const switchCamera = async () => {
    if (callType === "voice" || !localStream) return;
    
    const newMode = !isFrontCamera;
    setIsFrontCamera(newMode);

    // Stop current tracks
    localStream.getTracks().forEach(t => t.stop());

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newMode ? "user" : "environment" },
        audio: !isMuted
      });
      setLocalStream(newStream);
      
      if (pc.current) {
        const videoTrack = newStream.getVideoTracks()[0];
        const sender = pc.current.getSenders().find(s => s.track?.kind === "video");
        if (sender && videoTrack) {
          await sender.replaceTrack(videoTrack);
        }
      }
    } catch (e) {
      console.error("Camera switch failed", e);
    }
  };

  return { 
    callStatus, 
    callType,
    isMuted,
    isCameraOff,
    isFrontCamera,
    toggleMic,
    toggleCamera,
    switchCamera,
    startCall, 
    joinCall, 
    endCall, 
    localStream, 
    remoteStream, 
    incomingCallData,
    rejectCall: cleanup
  };
};
