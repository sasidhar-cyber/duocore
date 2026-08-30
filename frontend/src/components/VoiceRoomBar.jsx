import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getSocket } from '../services/socket';
import { useAuth } from '../context/AuthContext';
import { useRoom } from '../context/RoomContext';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  PhoneCall,
  PhoneOff,
  Radio,
  Users,
  Activity
} from 'lucide-react';
import { playSound } from '../utils/soundEffects';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

export function VoiceRoomBar() {
  const { user } = useAuth();
  const { roomData, hasPartner } = useRoom();

  const [inVoice, setInVoice] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [voiceMembers, setVoiceMembers] = useState([]);
  const [speakingUsers, setSpeakingUsers] = useState({});

  const localStreamRef = useRef(null);
  const peerConnectionsRef = useRef({}); // { [socketId]: RTCPeerConnection }
  const audioElementsRef = useRef({}); // { [socketId]: HTMLAudioElement }
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Clean up WebRTC peer connections
  const cleanupVoice = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }

    Object.values(peerConnectionsRef.current).forEach((pc) => pc.close());
    peerConnectionsRef.current = {};

    Object.values(audioElementsRef.current).forEach((audio) => {
      audio.pause();
      audio.srcObject = null;
    });
    audioElementsRef.current = {};

    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (audioContextRef.current) audioContextRef.current.close().catch(() => {});

    setInVoice(false);
    setVoiceMembers([]);
    setSpeakingUsers({});
  }, []);

  // Monitor speaking audio level
  const setupAudioMonitoring = (stream) => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = ctx;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let wasSpeaking = false;

      const checkVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const average = sum / dataArray.length;
        const isSpeaking = average > 15;

        if (isSpeaking !== wasSpeaking) {
          wasSpeaking = isSpeaking;
          const s = getSocket();
          if (s && roomData) {
            s.emit('voice:speaking', { roomId: roomData.id, isSpeaking });
          }
          setSpeakingUsers((prev) => ({ ...prev, [user.id]: isSpeaking }));
        }

        animationFrameRef.current = requestAnimationFrame(checkVolume);
      };

      checkVolume();
    } catch (e) {}
  };

  // Join WebRTC Voice Call
  const handleJoinVoice = async () => {
    if (!roomData) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
      setInVoice(true);
      playSound('quiz_correct');

      setupAudioMonitoring(stream);

      const s = getSocket();
      if (s) {
        s.emit('voice:join', { roomId: roomData.id });
      }
    } catch (err) {
      alert('Microphone access is required for real-time voice call: ' + err.message);
      playSound('quiz_wrong');
    }
  };

  // Leave Voice Call
  const handleLeaveVoice = () => {
    const s = getSocket();
    if (s && roomData) {
      s.emit('voice:leave', { roomId: roomData.id });
    }
    cleanupVoice();
    playSound('click');
  };

  // Toggle Mute
  const handleToggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        const newMuted = !audioTrack.enabled;
        setIsMuted(newMuted);

        const s = getSocket();
        if (s && roomData) {
          s.emit('voice:mute_status', { roomId: roomData.id, isMuted: newMuted });
        }
        playSound('click');
      }
    }
  };

  // Toggle Deafen
  const handleToggleDeafen = () => {
    const nextDeafen = !isDeafened;
    setIsDeafened(nextDeafen);
    Object.values(audioElementsRef.current).forEach((audio) => {
      audio.muted = nextDeafen;
    });
    playSound('click');
  };

  // WebRTC Signaling Handlers
  useEffect(() => {
    const s = getSocket();
    if (!s || !inVoice) return;

    // 1. Existing voice members
    const handleVoiceRoomMembers = async ({ members }) => {
      setVoiceMembers(members || []);
      const myStream = localStreamRef.current;
      if (!myStream) return;

      // Initiate WebRTC peer connection to all existing participants
      for (const m of members) {
        if (m.socketId === s.id) continue;

        const pc = new RTCPeerConnection(ICE_SERVERS);
        peerConnectionsRef.current[m.socketId] = pc;

        myStream.getTracks().forEach((track) => pc.addTrack(track, myStream));

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            s.emit('voice:ice_candidate', { targetSocketId: m.socketId, candidate: event.candidate });
          }
        };

        pc.ontrack = (event) => {
          let audio = audioElementsRef.current[m.socketId];
          if (!audio) {
            audio = new Audio();
            audio.autoplay = true;
            audioElementsRef.current[m.socketId] = audio;
          }
          audio.srcObject = event.streams[0];
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        s.emit('voice:offer', { targetSocketId: m.socketId, offer });
      }
    };

    // 2. New user joined voice
    const handleUserJoined = (newMember) => {
      setVoiceMembers((prev) => [...prev.filter((m) => m.socketId !== newMember.socketId), newMember]);
      playSound('message');
    };

    // 3. User left voice
    const handleUserLeft = ({ socketId, userId }) => {
      setVoiceMembers((prev) => prev.filter((m) => m.socketId !== socketId));
      if (peerConnectionsRef.current[socketId]) {
        peerConnectionsRef.current[socketId].close();
        delete peerConnectionsRef.current[socketId];
      }
      if (audioElementsRef.current[socketId]) {
        audioElementsRef.current[socketId].pause();
        delete audioElementsRef.current[socketId];
      }
      setSpeakingUsers((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    };

    // 4. Received WebRTC Offer
    const handleOffer = async ({ callerSocketId, offer }) => {
      const myStream = localStreamRef.current;
      if (!myStream) return;

      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnectionsRef.current[callerSocketId] = pc;

      myStream.getTracks().forEach((track) => pc.addTrack(track, myStream));

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          s.emit('voice:ice_candidate', { targetSocketId: callerSocketId, candidate: event.candidate });
        }
      };

      pc.ontrack = (event) => {
        let audio = audioElementsRef.current[callerSocketId];
        if (!audio) {
          audio = new Audio();
          audio.autoplay = true;
          audioElementsRef.current[callerSocketId] = audio;
        }
        audio.srcObject = event.streams[0];
      };

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      s.emit('voice:answer', { targetSocketId: callerSocketId, answer });
    };

    // 5. Received WebRTC Answer
    const handleAnswer = async ({ responderSocketId, answer }) => {
      const pc = peerConnectionsRef.current[responderSocketId];
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      }
    };

    // 6. Received ICE Candidate
    const handleCandidate = async ({ senderSocketId, candidate }) => {
      const pc = peerConnectionsRef.current[senderSocketId];
      if (pc && candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
      }
    };

    // 7. Speaking indicator
    const handleSpeaking = ({ userId, isSpeaking }) => {
      setSpeakingUsers((prev) => ({ ...prev, [userId]: isSpeaking }));
    };

    // 8. Mute status changed
    const handleMuteChange = ({ socketId, isMuted: mStatus }) => {
      setVoiceMembers((prev) =>
        prev.map((m) => (m.socketId === socketId ? { ...m, isMuted: mStatus } : m))
      );
    };

    s.on('voice:room_members', handleVoiceRoomMembers);
    s.on('voice:user_joined', handleUserJoined);
    s.on('voice:user_left', handleUserLeft);
    s.on('voice:offer', handleOffer);
    s.on('voice:answer', handleAnswer);
    s.on('voice:ice_candidate', handleCandidate);
    s.on('voice:user_speaking', handleSpeaking);
    s.on('voice:user_mute_changed', handleMuteChange);

    return () => {
      s.off('voice:room_members', handleVoiceRoomMembers);
      s.off('voice:user_joined', handleUserJoined);
      s.off('voice:user_left', handleUserLeft);
      s.off('voice:offer', handleOffer);
      s.off('voice:answer', handleAnswer);
      s.off('voice:ice_candidate', handleCandidate);
      s.off('voice:user_speaking', handleSpeaking);
      s.off('voice:user_mute_changed', handleMuteChange);
    };
  }, [inVoice, roomData]);

  if (!hasPartner && !roomData) return null;

  return (
    <div className="glass-card p-3 rounded-2xl border border-slate-800 bg-slate-950/80 flex flex-wrap items-center justify-between gap-3 shadow-lg">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${inVoice ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
          <span className="text-xs font-black text-white flex items-center gap-1.5">
            <Radio className={`w-3.5 h-3.5 ${inVoice ? 'text-pink-400 animate-bounce' : 'text-slate-500'}`} />
            <span>{inVoice ? 'Voice Room (Live)' : 'Squad Voice Call'}</span>
          </span>
        </div>

        {/* Avatars of active voice members */}
        {inVoice && voiceMembers.length > 0 && (
          <div className="flex items-center -space-x-2 pl-2">
            {voiceMembers.map((m) => {
              const isSpeaking = speakingUsers[m.userId];
              return (
                <div key={m.socketId} className="relative group/avatar" title={`${m.username} ${m.isMuted ? '(Muted)' : ''}`}>
                  <img
                    src={m.avatar_url || 'https://api.dicebear.com/7.x/bottts/svg?seed=voice'}
                    alt={m.username}
                    className={`w-7 h-7 rounded-full object-cover ring-2 transition-all ${
                      isSpeaking ? 'ring-emerald-400 scale-110 shadow-lg shadow-emerald-400/40' : 'ring-slate-800'
                    }`}
                  />
                  {m.isMuted && (
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-red-600 rounded-full flex items-center justify-center text-[7px] text-white">
                      ✕
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Voice Controls */}
      <div className="flex items-center gap-2">
        {inVoice ? (
          <>
            <button
              onClick={handleToggleMute}
              className={`p-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${
                isMuted
                  ? 'bg-red-950/80 border-red-500/40 text-red-300'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
              }`}
              title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
            >
              {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5 text-pink-400" />}
              <span>{isMuted ? 'Muted' : 'Mute'}</span>
            </button>

            <button
              onClick={handleToggleDeafen}
              className={`p-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${
                isDeafened
                  ? 'bg-amber-950/80 border-amber-500/40 text-amber-300'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
              }`}
              title={isDeafened ? 'Undeafen Speaker' : 'Deafen Speaker'}
            >
              {isDeafened ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-cyan-400" />}
            </button>

            <button
              onClick={handleLeaveVoice}
              className="px-3 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-red-600/30 transition-all"
              title="Disconnect from Voice Call"
            >
              <PhoneOff className="w-3.5 h-3.5" />
              <span>Leave</span>
            </button>
          </>
        ) : (
          <button
            onClick={handleJoinVoice}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/30 transition-all"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Join Voice Call 🎙️</span>
          </button>
        )}
      </div>
    </div>
  );
}
