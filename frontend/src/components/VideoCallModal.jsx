import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRoom } from '../context/RoomContext';
import { getSocket } from '../services/socket';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  Maximize2,
  Minimize2,
  Users,
  Shield,
  Sparkles,
  SwitchCamera
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

export function VideoCallModal({ isOpen, onClose, isInitiator = false }) {
  const { user } = useAuth();
  const { roomData, members, partner } = useRoom();

  const otherPartner = partner || members.find((m) => m.id !== user?.id) || {
    username: 'Duo Partner'
  };

  const [inCall, setInCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [facingMode, setFacingMode] = useState('user');
  const [callDuration, setCallDuration] = useState(0);
  const [callStatus, setCallStatus] = useState(isInitiator ? 'Calling...' : 'Connecting...');

  const [callPeers, setCallPeers] = useState([]);
  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerConnections = useRef({}); // socketId -> RTCPeerConnection
  const remoteVideoRefs = useRef({}); // socketId -> HTMLVideoElement
  const pendingCandidates = useRef({}); // socketId -> Array<candidate>
  const timerRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      startCall();
    }

    return () => {
      endCall();
    };
  }, [isOpen]);

  const startCall = async () => {
    if (!roomData) return;
    try {
      setCallStatus(isInitiator ? 'Ringing partner...' : 'Connecting video...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: true
      });

      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      setInCall(true);
      playSound('quiz_correct');

      // Start elapsed timer
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);

      const s = getSocket();
      if (s) {
        s.emit('call:join', { roomId: roomData.id, isMuted: false, isVideoOff: false });
      }
    } catch (err) {
      console.warn('Video/Mic permission error:', err);
      // Fallback to audio only if camera fails
      try {
        const audioOnlyStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStreamRef.current = audioOnlyStream;
        setIsVideoOff(true);
        setInCall(true);
        const s = getSocket();
        if (s) {
          s.emit('call:join', { roomId: roomData.id, isMuted: false, isVideoOff: true });
        }
      } catch (audioErr) {
        alert('Could not access camera or microphone: ' + audioErr.message);
        onClose();
      }
    }
  };

  const endCall = () => {
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

    // Add local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    // ICE Candidate
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

    // Connection state changes
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

    // Remote Track Received
    pc.ontrack = (event) => {
      const remoteStream = event.streams[0];
      const videoEl = remoteVideoRefs.current[remoteSocketId];
      if (videoEl && remoteStream) {
        videoEl.srcObject = remoteStream;
        setCallStatus('Connected');
      }
    };

    return pc;
  };

  // Socket signaling listeners
  useEffect(() => {
    const s = getSocket();
    if (!s) return;

    // 1. Existing peers list when we join
    const handleExistingPeers = async ({ peers }) => {
      setCallPeers(peers);

      // Create offers to all existing peers
      for (const peer of peers) {
        const pc = createPeerConnection(peer.socketId, peer);
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          s.emit('call:offer', {
            toSocketId: peer.socketId,
            offer,
            isVideoOff,
            isMuted
          });
        } catch (err) {
          console.error('[WebRTC] Error creating offer:', err);
        }
      }
    };

    // 2. A new peer joined the call
    const handlePeerJoined = async ({ member }) => {
      setCallPeers((prev) => {
        if (prev.some((p) => p.socketId === member.socketId)) return prev;
        return [...prev, member];
      });
      playSound('message');

      // Create offer to newly joined peer
      const pc = createPeerConnection(member.socketId, member);
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        s.emit('call:offer', {
          toSocketId: member.socketId,
          offer,
          isVideoOff,
          isMuted
        });
      } catch (err) {
        console.error('[WebRTC] Error offering new peer:', err);
      }
    };

    // 3. Receive Offer from a peer
    const handleOfferReceived = async ({ fromSocketId, fromUser, offer }) => {
      const pc = createPeerConnection(fromSocketId, fromUser);
      setCallPeers((prev) => {
        if (prev.some((p) => p.socketId === fromSocketId)) return prev;
        return [...prev, { socketId: fromSocketId, ...fromUser }];
      });

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));

        // Flush pending candidates for this peer
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
        console.error('[WebRTC] Error handling offer:', err);
      }
    };

    // 4. Receive Answer
    const handleAnswerReceived = async ({ fromSocketId, answer }) => {
      const pc = peerConnections.current[fromSocketId];
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));

          // Flush pending candidates
          if (pendingCandidates.current[fromSocketId]) {
            for (const cand of pendingCandidates.current[fromSocketId]) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(cand));
              } catch (e) {}
            }
            delete pendingCandidates.current[fromSocketId];
          }
        } catch (err) {
          console.error('[WebRTC] Error setting remote description:', err);
        }
      }
    };

    // 5. Receive ICE Candidate
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
        console.error('[WebRTC] Error adding ICE candidate:', err);
      }
    };

    // 6. Peer state change (video/audio toggle)
    const handleMemberStateChange = ({ socketId, isVideoOff: vOff, isMuted: mOff }) => {
      setCallPeers((prev) =>
        prev.map((p) => (p.socketId === socketId ? { ...p, isVideoOff: vOff, isMuted: mOff } : p))
      );
    };

    // 7. Peer Left Call
    const handlePeerLeft = ({ socketId }) => {
      if (peerConnections.current[socketId]) {
        peerConnections.current[socketId].close();
        delete peerConnections.current[socketId];
      }
      setCallPeers((prev) => prev.filter((p) => p.socketId !== socketId));
    };

    s.on('call:existing_peers', handleExistingPeers);
    s.on('call:peer_joined', handlePeerJoined);
    s.on('call:offer_received', handleOfferReceived);
    s.on('call:answer_received', handleAnswerReceived);
    s.on('call:ice_candidate_received', handleIceCandidate);
    s.on('call:member_state_change', handleMemberStateChange);
    s.on('call:peer_left', handlePeerLeft);

    return () => {
      s.off('call:existing_peers', handleExistingPeers);
      s.off('call:peer_joined', handlePeerJoined);
      s.off('call:offer_received', handleOfferReceived);
      s.off('call:answer_received', handleAnswerReceived);
      s.off('call:ice_candidate_received', handleIceCandidate);
      s.off('call:member_state_change', handleMemberStateChange);
      s.off('call:peer_left', handlePeerLeft);
    };
  }, []);

  // Toggle Mute
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

  // Toggle Video
  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        const nextOff = !videoTrack.enabled;
        setIsVideoOff(nextOff);

        const s = getSocket();
        if (s && roomData) {
          s.emit('call:toggle_video', { roomId: roomData.id, isVideoOff: nextOff });
        }
      }
    }
  };

  // Flip Camera
  const switchCameraFacing = async () => {
    const nextFacing = facingMode === 'user' ? 'environment' : 'user';
    try {
      if (localStreamRef.current) {
        localStreamRef.current.getVideoTracks().forEach((t) => t.stop());
      }

      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: nextFacing },
        audio: false
      });

      const newVideoTrack = newStream.getVideoTracks()[0];

      // Replace track on all peer connections
      Object.values(peerConnections.current).forEach((pc) => {
        const senders = pc.getSenders();
        const videoSender = senders.find((s) => s.track && s.track.kind === 'video');
        if (videoSender) {
          videoSender.replaceTrack(newVideoTrack);
        }
      });

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = new MediaStream([
          newVideoTrack,
          localStreamRef.current.getAudioTracks()[0]
        ]);
      }

      setFacingMode(nextFacing);
    } catch (err) {
      console.warn('Could not switch camera:', err);
    }
  };

  const formatDuration = (sec) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-md animate-in fade-in select-none">
      <div className="w-full max-w-4xl h-[92vh] sm:h-[88vh] glass-panel rounded-3xl border border-emerald-500/40 shadow-2xl flex flex-col bg-slate-950/95 overflow-hidden relative">
        {/* Header */}
        <div className="p-3 sm:p-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between z-20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-pink-500/20 border border-pink-500/40 flex items-center justify-center text-pink-400 font-bold text-sm shadow-md">
              <Video className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-white flex items-center gap-2">
                <span>{otherPartner.username || '1v1 Video Call'}</span>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase ${
                  callStatus === 'Connected'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 animate-pulse'
                }`}>
                  {callStatus}
                </span>
              </h3>
              <p className="text-[10px] font-mono text-slate-400">
                {callStatus === 'Connected' ? `Duration: ${formatDuration(callDuration)}` : 'WebRTC Encrypted P2P'}
              </p>
            </div>
          </div>
        </div>

        {/* Video Grid */}
        <div className="flex-1 min-h-0 bg-slate-950 p-2 sm:p-3 relative overflow-hidden flex flex-col items-center justify-center">
          {/* Remote Video Container */}
          <div className="w-full h-full rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 relative flex items-center justify-center shadow-inner">
            {callPeers.length > 0 ? (
              callPeers.map((peer) => (
                <div key={peer.socketId} className="w-full h-full relative flex items-center justify-center">
                  <video
                    ref={(el) => { remoteVideoRefs.current[peer.socketId] = el; }}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  {peer.isVideoOff && (
                    <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center space-y-2">
                      <img
                        src={peer.avatar_url || 'https://api.dicebear.com/7.x/bottts/svg?seed=peer'}
                        alt={peer.username}
                        className="w-20 h-20 rounded-3xl ring-4 ring-pink-500/40"
                      />
                      <span className="text-xs font-bold text-slate-300">{peer.username} (Camera Off)</span>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center space-y-3 p-6 animate-pulse">
                <div className="w-16 h-16 rounded-3xl bg-pink-500/20 border border-pink-500/40 flex items-center justify-center text-3xl mx-auto shadow-lg">
                  📱
                </div>
                <div>
                  <h4 className="text-sm font-black text-white">{isInitiator ? 'Ringing Partner...' : 'Connecting Video Stream...'}</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs">
                    {isInitiator ? 'Waiting for partner to answer on their device' : 'Establishing encrypted P2P video stream'}
                  </p>
                </div>
              </div>
            )}

            {/* Local Video Picture-in-Picture */}
            <div className="absolute bottom-3 right-3 w-28 h-36 sm:w-36 sm:h-48 rounded-2xl overflow-hidden bg-black/80 border-2 border-emerald-500/60 shadow-2xl z-30">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${facingMode === 'user' ? '-scale-x-100' : ''}`}
              />
              {isVideoOff && (
                <div className="absolute inset-0 bg-slate-900 flex items-center justify-center text-xs text-slate-400 font-bold">
                  Camera Off
                </div>
              )}
              <span className="absolute bottom-1 left-2 text-[9px] font-mono text-white/80 drop-shadow">
                You
              </span>
            </div>
          </div>
        </div>

        {/* Call Controls Bar */}
        <div className="p-3 sm:p-4 bg-slate-900/95 border-t border-slate-800 flex items-center justify-center gap-3 sm:gap-4 shrink-0 z-20">
          {/* Mute Mic */}
          <button
            onClick={toggleMute}
            className={`p-3.5 sm:p-4 rounded-full font-bold transition-transform active:scale-95 shadow-lg ${
              isMuted ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
            }`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Toggle Video Camera */}
          <button
            onClick={toggleVideo}
            className={`p-3.5 sm:p-4 rounded-full font-bold transition-transform active:scale-95 shadow-lg ${
              isVideoOff ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
            }`}
            title={isVideoOff ? 'Turn Camera On' : 'Turn Camera Off'}
          >
            {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
          </button>

          {/* Switch Front/Back Camera */}
          <button
            onClick={switchCameraFacing}
            className="p-3.5 sm:p-4 rounded-full bg-slate-800 text-slate-200 hover:bg-slate-700 transition-transform active:scale-95 shadow-lg"
            title="Switch Camera"
          >
            <SwitchCamera className="w-5 h-5" />
          </button>

          {/* End Call */}
          <button
            onClick={() => {
              endCall();
              onClose();
            }}
            className="px-6 py-3.5 sm:px-8 sm:py-4 rounded-full bg-red-600 hover:bg-red-500 text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-xl shadow-red-600/40 transition-transform active:scale-95 hover:scale-105"
            title="End Call"
          >
            <PhoneOff className="w-5 h-5" />
            <span>End Call</span>
          </button>
        </div>
      </div>
    </div>
  );
}
