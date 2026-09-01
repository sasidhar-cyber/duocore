import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRoom } from '../context/RoomContext';
import { getSocket } from '../services/socket';
import {
  Mic,
  MicOff,
  PhoneOff,
  Volume2,
  VolumeX,
  Sparkles
} from 'lucide-react';
import { playSound } from '../utils/soundEffects';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' }
  ]
};

export function AudioCallModal({ isOpen, onClose, isInitiator = false }) {
  const { user } = useAuth();
  const { roomData, partner, members } = useRoom();

  const otherPartner = partner || members.find((m) => m.id !== user?.id) || {
    username: 'Duo Partner'
  };

  const [inCall, setInCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [callStatus, setCallStatus] = useState(isInitiator ? 'Calling...' : 'Connecting...');

  const localStreamRef = useRef(null);
  const peerConnections = useRef({}); // socketId -> RTCPeerConnection
  const remoteAudioRefs = useRef({});
  const pendingCandidates = useRef({});
  const timerRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      startAudioCall();
    }

    return () => {
      endAudioCall();
    };
  }, [isOpen]);

  const startAudioCall = async () => {
    if (!roomData) return;
    try {
      setCallStatus(isInitiator ? 'Ringing partner...' : 'Connecting audio...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;

      setInCall(true);
      playSound('quiz_correct');

      // Start elapsed timer
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);

      const s = getSocket();
      if (s) {
        s.emit('call:join', { roomId: roomData.id, isMuted: false, isVideoOff: true });
      }
    } catch (err) {
      console.error('[AudioCall] Mic access error:', err);
      alert('Microphone access is required for voice calls: ' + err.message);
      onClose();
    }
  };

  const endAudioCall = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    Object.values(peerConnections.current).forEach((pc) => pc.close());
    peerConnections.current = {};
    pendingCandidates.current = {};

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const s = getSocket();
    if (s && roomData) {
      s.emit('call:leave', { roomId: roomData.id });
    }

    setInCall(false);
    setCallDuration(0);
    setCallStatus('Ended');
  };

  const createPeerConnection = (remoteSocketId, remoteUser) => {
    if (peerConnections.current[remoteSocketId]) {
      return peerConnections.current[remoteSocketId];
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnections.current[remoteSocketId] = pc;

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const s = getSocket();
        if (s) {
          s.emit('call:ice_candidate', {
            toSocketId: remoteSocketId,
            candidate: event.candidate
          });
        }
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === 'connected') {
        setCallStatus('Connected');
      } else if (state === 'connecting') {
        setCallStatus('Connecting...');
      } else if (state === 'disconnected' || state === 'failed') {
        setCallStatus('Reconnecting...');
      } else if (state === 'closed') {
        setCallStatus('Ended');
      }
    };

    pc.ontrack = (event) => {
      const remoteStream = event.streams[0];
      const audioEl = remoteAudioRefs.current[remoteSocketId];
      if (audioEl && remoteStream) {
        audioEl.srcObject = remoteStream;
        setCallStatus('Connected');
      }
    };

    return pc;
  };

  // Socket signaling listeners
  useEffect(() => {
    const s = getSocket();
    if (!s) return;

    const handleExistingPeers = async ({ peers }) => {
      for (const peer of peers) {
        const pc = createPeerConnection(peer.socketId, peer);
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          s.emit('call:offer', {
            toSocketId: peer.socketId,
            offer,
            isVideoOff: true,
            isMuted
          });
        } catch (err) {
          console.error('[WebRTC Audio] Error creating offer:', err);
        }
      }
    };

    const handlePeerJoined = async ({ member }) => {
      playSound('message');
      const pc = createPeerConnection(member.socketId, member);
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        s.emit('call:offer', {
          toSocketId: member.socketId,
          offer,
          isVideoOff: true,
          isMuted
        });
      } catch (err) {
        console.error('[WebRTC Audio] Error offering new peer:', err);
      }
    };

    const handleOfferReceived = async ({ fromSocketId, fromUser, offer }) => {
      const pc = createPeerConnection(fromSocketId, fromUser);
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));

        if (pendingCandidates.current[fromSocketId]) {
          for (const cand of pendingCandidates.current[fromSocketId]) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(cand));
            } catch (e) {}
          }
          delete pendingCandidates.current[fromSocketId];
        }

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        s.emit('call:answer', {
          toSocketId: fromSocketId,
          answer
        });
      } catch (err) {
        console.error('[WebRTC Audio] Error handling offer:', err);
      }
    };

    const handleAnswerReceived = async ({ fromSocketId, answer }) => {
      const pc = peerConnections.current[fromSocketId];
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));

          if (pendingCandidates.current[fromSocketId]) {
            for (const cand of pendingCandidates.current[fromSocketId]) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(cand));
              } catch (e) {}
            }
            delete pendingCandidates.current[fromSocketId];
          }
        } catch (err) {
          console.error('[WebRTC Audio] Error setting remote description:', err);
        }
      }
    };

    const handleIceCandidate = async ({ fromSocketId, candidate }) => {
      const pc = peerConnections.current[fromSocketId];
      if (!pc || !pc.remoteDescription || !pc.remoteDescription.type) {
        if (!pendingCandidates.current[fromSocketId]) {
          pendingCandidates.current[fromSocketId] = [];
        }
        pendingCandidates.current[fromSocketId].push(candidate);
        return;
      }

      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error('[WebRTC Audio] Error adding ICE candidate:', err);
      }
    };

    const handlePeerLeft = ({ socketId }) => {
      if (peerConnections.current[socketId]) {
        peerConnections.current[socketId].close();
        delete peerConnections.current[socketId];
      }
    };

    s.on('call:existing_peers', handleExistingPeers);
    s.on('call:peer_joined', handlePeerJoined);
    s.on('call:offer_received', handleOfferReceived);
    s.on('call:answer_received', handleAnswerReceived);
    s.on('call:ice_candidate_received', handleIceCandidate);
    s.on('call:peer_left', handlePeerLeft);

    return () => {
      s.off('call:existing_peers', handleExistingPeers);
      s.off('call:peer_joined', handlePeerJoined);
      s.off('call:offer_received', handleOfferReceived);
      s.off('call:answer_received', handleAnswerReceived);
      s.off('call:ice_candidate_received', handleIceCandidate);
      s.off('call:peer_left', handlePeerLeft);
    };
  }, []);

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        const nextMuted = !audioTrack.enabled;
        setIsMuted(nextMuted);

        const s = getSocket();
        if (s && roomData) {
          s.emit('call:toggle_audio', { roomId: roomData.id, isMuted: nextMuted });
        }
      }
    }
  };

  const formatDuration = (sec) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in select-none">
      <div className="w-full max-w-sm glass-panel p-6 sm:p-8 rounded-3xl border border-emerald-500/50 shadow-2xl text-center space-y-6 bg-slate-950/95 relative overflow-hidden">
        {/* Hidden Audio Elements for Remote Audio */}
        {Object.keys(peerConnections.current).map((remoteId) => (
          <audio
            key={remoteId}
            ref={(el) => { remoteAudioRefs.current[remoteId] = el; }}
            autoPlay
            playsInline
          />
        ))}

        <div className="relative space-y-3">
          <div className="relative w-24 h-24 mx-auto">
            <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
            <img
              src={otherPartner.avatar_url || 'https://api.dicebear.com/7.x/bottts/svg?seed=partner'}
              alt={otherPartner.username}
              className="w-24 h-24 rounded-full object-cover ring-4 ring-emerald-500/60 shadow-2xl relative z-10"
            />
          </div>

          <div>
            <h3 className="text-lg font-black text-white">{otherPartner.username}</h3>
            <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
              callStatus === 'Connected'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 animate-pulse'
            }`}>
              {callStatus}
            </span>
            <p className="text-xs text-slate-400 font-mono mt-1">
              {callStatus === 'Connected' ? `Duration: ${formatDuration(callDuration)}` : '1v1 Encrypted HD Voice'}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-center gap-6 pt-2">
          {/* Mute Mic */}
          <div className="flex flex-col items-center gap-1.5">
            <button
              onClick={toggleMute}
              className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 ${
                isMuted ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </button>
            <span className="text-[11px] font-bold text-slate-400">{isMuted ? 'Muted' : 'Mute'}</span>
          </div>

          {/* End Call */}
          <div className="flex flex-col items-center gap-1.5">
            <button
              onClick={() => {
                endAudioCall();
                onClose();
              }}
              className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-lg shadow-red-600/40 transition-transform active:scale-95 hover:scale-105"
              title="End Call"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
            <span className="text-[11px] font-bold text-red-400">End</span>
          </div>
        </div>
      </div>
    </div>
  );
}
