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
  PhoneCall,
  Sparkles
} from 'lucide-react';
import { playSound } from '../utils/soundEffects';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

export function AudioCallModal({ isOpen, onClose, targetFriend }) {
  const { user } = useAuth();
  const { roomData } = useRoom();

  const [inCall, setInCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [callStatus, setCallStatus] = useState('Connecting...');

  const localStreamRef = useRef(null);
  const peerConnections = useRef({}); // socketId -> RTCPeerConnection
  const remoteAudioRefs = useRef({});
  const timerRef = useRef(null);

  useEffect(() => {
    if (isOpen && !inCall) {
      startAudioCall();
    }

    return () => {
      endAudioCall();
    };
  }, [isOpen]);

  const startAudioCall = async () => {
    if (!roomData) return;
    try {
      setCallStatus('Connecting audio...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;

      setInCall(true);
      setCallStatus('Connected');

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
  };

  const createPeerConnection = (remoteSocketId, remoteUser) => {
    if (peerConnections.current[remoteSocketId]) {
      return peerConnections.current[remoteSocketId];
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnections.current[remoteSocketId] = pc;

    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
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

    pc.ontrack = (event) => {
      const remoteStream = event.streams[0];
      let audioEl = remoteAudioRefs.current[remoteSocketId];
      if (!audioEl) {
        audioEl = document.createElement('audio');
        audioEl.autoplay = true;
        remoteAudioRefs.current[remoteSocketId] = audioEl;
      }
      audioEl.srcObject = remoteStream;
    };

    return pc;
  };

  // WebRTC signaling
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
          console.error('[AudioCall] Offer error:', err);
        }
      }
    };

    const handleOfferReceived = async ({ fromSocketId, fromUser, offer }) => {
      const pc = createPeerConnection(fromSocketId, fromUser);
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        s.emit('call:answer', {
          toSocketId: fromSocketId,
          answer
        });
      } catch (err) {
        console.error('[AudioCall] Answer error:', err);
      }
    };

    const handleAnswerReceived = async ({ fromSocketId, answer }) => {
      const pc = peerConnections.current[fromSocketId];
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
        } catch (err) {}
      }
    };

    const handleIceCandidate = async ({ fromSocketId, candidate }) => {
      const pc = peerConnections.current[fromSocketId];
      if (pc && candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {}
      }
    };

    const handlePeerLeft = ({ socketId }) => {
      if (peerConnections.current[socketId]) {
        peerConnections.current[socketId].close();
        delete peerConnections.current[socketId];
      }
    };

    s.on('call:existing_peers', handleExistingPeers);
    s.on('call:offer_received', handleOfferReceived);
    s.on('call:answer_received', handleAnswerReceived);
    s.on('call:ice_candidate_received', handleIceCandidate);
    s.on('call:peer_left', handlePeerLeft);

    return () => {
      s.off('call:existing_peers', handleExistingPeers);
      s.off('call:offer_received', handleOfferReceived);
      s.off('call:answer_received', handleAnswerReceived);
      s.off('call:ice_candidate_received', handleIceCandidate);
      s.off('call:peer_left', handlePeerLeft);
    };
  }, [isMuted]);

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
        const s = getSocket();
        if (s && roomData) {
          s.emit('call:toggle_audio', { roomId: roomData.id, isMuted: !audioTrack.enabled });
        }
      }
    }
  };

  const formatDuration = (sec) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-2xl animate-in fade-in select-none">
      <div className="w-full max-w-sm glass-panel p-6 sm:p-8 rounded-3xl border border-emerald-500/40 shadow-2xl text-center space-y-6 bg-slate-950/95 relative overflow-hidden">
        {/* Glowing Background Pulse */}
        <div className="absolute -top-16 -left-16 w-36 h-36 bg-emerald-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-16 -right-16 w-36 h-36 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" />

        {/* Header Title */}
        <div className="relative flex items-center justify-center gap-2 text-emerald-400 text-xs font-bold font-mono tracking-wider">
          <PhoneCall className="w-4 h-4 animate-bounce" />
          <span>DUOCORE VOICE CALL (ENCRYPTED)</span>
        </div>

        {/* Avatar with Soundwave Rings */}
        <div className="relative py-4">
          <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
            <div className="absolute -inset-3 rounded-full bg-emerald-500/10 animate-pulse delay-75" />
            <img
              src={targetFriend?.avatar_url || 'https://api.dicebear.com/7.x/bottts/svg?seed=friend'}
              alt={targetFriend?.username || 'Friend'}
              className="w-28 h-28 rounded-full object-cover ring-4 ring-emerald-500/50 shadow-2xl relative z-10"
            />
          </div>

          <div className="mt-4 space-y-1">
            <h3 className="text-lg font-black text-white">{targetFriend?.username || 'Squad Friend'}</h3>
            <p className="text-xs text-emerald-300 font-mono font-bold">
              {callStatus === 'Connected' ? formatDuration(callDuration) : callStatus}
            </p>
          </div>

          {/* Animated Audio Equalizer Waveform */}
          <div className="flex items-center justify-center gap-1.5 h-8 mt-4">
            {[40, 75, 30, 95, 60, 100, 50, 85, 40, 90, 35, 70].map((h, i) => (
              <div
                key={i}
                className="w-1.5 rounded-full bg-gradient-to-t from-emerald-500 to-cyan-400 animate-pulse"
                style={{
                  height: `${isMuted ? 10 : Math.max(20, (h * Math.random()).toFixed(0))}%`,
                  animationDelay: `${i * 80}ms`
                }}
              />
            ))}
          </div>
        </div>

        {/* Call Controls */}
        <div className="flex items-center justify-center gap-4 pt-2">
          {/* Mute Button */}
          <button
            onClick={toggleMute}
            className={`p-3.5 rounded-2xl border transition-all ${
              isMuted
                ? 'bg-red-950/60 border-red-500 text-red-400'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
            }`}
            title={isMuted ? 'Unmute Mic' : 'Mute Mic'}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* End Call Button */}
          <button
            onClick={() => {
              endAudioCall();
              onClose();
            }}
            className="p-4 rounded-full bg-red-600 hover:bg-red-500 text-white shadow-xl shadow-red-600/40 transition-transform active:scale-95 hover:scale-105"
            title="End Call"
          >
            <PhoneOff className="w-6 h-6" />
          </button>

          {/* Speaker Button */}
          <button
            onClick={() => setIsSpeakerOn(!isSpeakerOn)}
            className={`p-3.5 rounded-2xl border transition-all ${
              isSpeakerOn
                ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-400'
                : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}
            title={isSpeakerOn ? 'Speaker On' : 'Speaker Off'}
          >
            {isSpeakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
