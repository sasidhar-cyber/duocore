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
  MonitorUp,
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
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

export function VideoCallModal({ isOpen, onClose }) {
  const { user } = useAuth();
  const { roomData, members } = useRoom();

  const [inCall, setInCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [facingMode, setFacingMode] = useState('user');

  const [callPeers, setCallPeers] = useState([]); // List of connected remote peer info
  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerConnections = useRef({}); // socketId -> RTCPeerConnection
  const remoteVideoRefs = useRef({}); // socketId -> HTMLVideoElement

  useEffect(() => {
    if (isOpen && !inCall) {
      startCall();
    }
  }, [isOpen]);

  const startCall = async () => {
    if (!roomData) return;
    try {
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

  const createPeerConnection = (remoteSocketId, remoteUser) => {
    if (peerConnections.current[remoteSocketId]) {
      return peerConnections.current[remoteSocketId];
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnections.current[remoteSocketId] = pc;

    // Add local tracks to peer connection
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

    // Remote Track Received
    pc.ontrack = (event) => {
      const remoteStream = event.streams[0];
      const videoEl = remoteVideoRefs.current[remoteSocketId];
      if (videoEl && remoteStream) {
        videoEl.srcObject = remoteStream;
      }
    };

    return pc;
  };

  // Socket signaling listeners
  useEffect(() => {
    const s = getSocket();
    if (!s) return;

    // 1. Existing peers list when we join
    const handleExistingPeers = async ({ peers, members: allCallMembers }) => {
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
    const handlePeerJoined = ({ member }) => {
      setCallPeers((prev) => {
        if (prev.some((p) => p.socketId === member.socketId)) return prev;
        return [...prev, member];
      });
      playSound('message');
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
        } catch (err) {
          console.error('[WebRTC] Error setting remote description:', err);
        }
      }
    };

    // 5. Receive ICE Candidate
    const handleIceCandidate = async ({ fromSocketId, candidate }) => {
      const pc = peerConnections.current[fromSocketId];
      if (pc && candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error('[WebRTC] Error adding ICE candidate:', err);
        }
      }
    };

    // 6. Peer state change (video/audio toggle)
    const handleMemberStateChange = ({ socketId, isVideoOff, isMuted, isScreenSharing }) => {
      setCallPeers((prev) =>
        prev.map((p) => (p.socketId === socketId ? { ...p, isVideoOff, isMuted, isScreenSharing } : p))
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
  }, [isVideoOff, isMuted]);

  // Toggle Mute
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        const newMuted = !audioTrack.enabled;
        setIsMuted(newMuted);

        const s = getSocket();
        if (s && roomData) {
          s.emit('call:toggle_audio', { roomId: roomData.id, isMuted: newMuted });
        }
        playSound('click');
      }
    }
  };

  // Toggle Video Camera
  const toggleVideo = async () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        const newVideoOff = !videoTrack.enabled;
        setIsVideoOff(newVideoOff);

        const s = getSocket();
        if (s && roomData) {
          s.emit('call:toggle_video', { roomId: roomData.id, isVideoOff: newVideoOff });
        }
        playSound('click');
      } else {
        // Need to request video track
        try {
          const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
          const newTrack = videoStream.getVideoTracks()[0];
          localStreamRef.current.addTrack(newTrack);
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = localStreamRef.current;
          }

          // Replace track in peer connections
          Object.values(peerConnections.current).forEach((pc) => {
            pc.addTrack(newTrack, localStreamRef.current);
          });

          setIsVideoOff(false);
          const s = getSocket();
          if (s && roomData) {
            s.emit('call:toggle_video', { roomId: roomData.id, isVideoOff: false });
          }
        } catch (e) {}
      }
    }
  };

  // Flip Mobile Camera (Front / Rear)
  const flipCamera = async () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: nextMode }, width: { ideal: 640 }, height: { ideal: 480 } }
      });
      const newTrack = stream.getVideoTracks()[0];

      if (localStreamRef.current) {
        const oldTrack = localStreamRef.current.getVideoTracks()[0];
        if (oldTrack) {
          oldTrack.stop();
          localStreamRef.current.removeTrack(oldTrack);
        }
        localStreamRef.current.addTrack(newTrack);
      }

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }

      Object.values(peerConnections.current).forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
        if (sender) sender.replaceTrack(newTrack);
      });
      playSound('click');
    } catch (e) {
      console.warn('Flip camera error:', e);
    }
  };

  // Toggle Screen Share
  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];

        // Replace track in peer connections
        Object.values(peerConnections.current).forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
          if (sender) sender.replaceTrack(screenTrack);
        });

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }

        setIsScreenSharing(true);
        const s = getSocket();
        if (s && roomData) {
          s.emit('call:toggle_screen', { roomId: roomData.id, isScreenSharing: true });
        }

        screenTrack.onended = () => {
          stopScreenSharing();
        };
      } catch (err) {}
    } else {
      stopScreenSharing();
    }
  };

  const stopScreenSharing = () => {
    if (localStreamRef.current) {
      const cameraTrack = localStreamRef.current.getVideoTracks()[0];
      Object.values(peerConnections.current).forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
        if (sender && cameraTrack) sender.replaceTrack(cameraTrack);
      });

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
    }
    setIsScreenSharing(false);
    const s = getSocket();
    if (s && roomData) {
      s.emit('call:toggle_screen', { roomId: roomData.id, isScreenSharing: false });
    }
  };

  // End Call
  const handleEndCall = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }

    Object.values(peerConnections.current).forEach((pc) => pc.close());
    peerConnections.current = {};

    const s = getSocket();
    if (s && roomData) {
      s.emit('call:leave', { roomId: roomData.id });
    }

    setInCall(false);
    playSound('quiz_wrong');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-black/90 backdrop-blur-xl animate-in fade-in duration-200">
      <div
        className={`w-full ${
          isFullscreen ? 'h-full max-w-none' : 'max-w-5xl h-[85vh]'
        } glass-panel rounded-3xl border border-cyan-500/40 shadow-2xl flex flex-col overflow-hidden bg-slate-950/95 relative`}
      >
        {/* Call Top Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/90 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 p-[1.5px] shadow-md shadow-cyan-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-base font-bold text-cyan-400">
                📹
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-white">Squad HD Video Call</h3>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              </div>
              <p className="text-[11px] text-slate-400">
                {callPeers.length + 1} participant{callPeers.length > 0 ? 's' : ''} connected
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={handleEndCall}
              className="p-2 rounded-xl bg-red-600 hover:bg-red-500 text-white shadow-md shadow-red-600/30"
              title="Leave Call"
            >
              <PhoneOff className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Video Mesh Grid */}
        <div className="flex-1 p-4 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 bg-slate-950">
          {/* Local User Video Tile */}
          <div className="relative rounded-2xl overflow-hidden border border-cyan-500/40 bg-slate-900 aspect-video flex items-center justify-center shadow-lg">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : 'block'}`}
            />

            {isVideoOff && (
              <div className="flex flex-col items-center gap-2">
                <img
                  src={user?.avatar_url || 'https://api.dicebear.com/7.x/bottts/svg?seed=user'}
                  alt={user?.username}
                  className="w-16 h-16 rounded-2xl object-cover ring-2 ring-cyan-500/50"
                />
                <span className="text-xs font-black text-white">{user?.username} (You)</span>
              </div>
            )}

            <div className="absolute bottom-2 left-2 px-2 py-1 rounded-lg bg-black/70 backdrop-blur-md text-[10px] font-bold text-white flex items-center gap-1.5 border border-white/10">
              <span>{user?.username} (You)</span>
              {isMuted && <MicOff className="w-3 h-3 text-red-400" />}
              {isVideoOff && <VideoOff className="w-3 h-3 text-amber-400" />}
            </div>
          </div>

          {/* Remote Peers Video Tiles */}
          {callPeers.map((peer) => (
            <div
              key={peer.socketId}
              className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 aspect-video flex items-center justify-center shadow-lg"
            >
              <video
                ref={(el) => {
                  if (el) remoteVideoRefs.current[peer.socketId] = el;
                }}
                autoPlay
                playsInline
                className={`w-full h-full object-cover ${peer.isVideoOff ? 'hidden' : 'block'}`}
              />

              {peer.isVideoOff && (
                <div className="flex flex-col items-center gap-2">
                  <img
                    src={peer.avatar_url || 'https://api.dicebear.com/7.x/bottts/svg?seed=peer'}
                    alt={peer.username}
                    className="w-16 h-16 rounded-2xl object-cover ring-2 ring-indigo-500/50"
                  />
                  <span className="text-xs font-black text-white">{peer.username}</span>
                </div>
              )}

              <div className="absolute bottom-2 left-2 px-2 py-1 rounded-lg bg-black/70 backdrop-blur-md text-[10px] font-bold text-white flex items-center gap-1.5 border border-white/10">
                <span>{peer.username}</span>
                {peer.isMuted && <MicOff className="w-3 h-3 text-red-400" />}
                {peer.isVideoOff && <VideoOff className="w-3 h-3 text-amber-400" />}
              </div>
            </div>
          ))}
        </div>

        {/* Floating Call Control Bar (Bottom) */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/95 flex items-center justify-center gap-4">
          <button
            onClick={toggleMute}
            className={`p-3.5 rounded-2xl font-bold text-xs flex items-center gap-2 transition-all shadow-md ${
              isMuted
                ? 'bg-red-600/30 border border-red-500/40 text-red-300 hover:bg-red-600/40'
                : 'bg-slate-900 border border-slate-800 text-slate-200 hover:bg-slate-800'
            }`}
            title={isMuted ? 'Unmute Mic' : 'Mute Mic'}
          >
            {isMuted ? <MicOff className="w-4 h-4 text-red-400" /> : <Mic className="w-4 h-4 text-emerald-400" />}
            <span className="hidden sm:inline">{isMuted ? 'Unmute' : 'Mute'}</span>
          </button>

          <button
            onClick={toggleVideo}
            className={`p-3.5 rounded-2xl font-bold text-xs flex items-center gap-2 transition-all shadow-md ${
              isVideoOff
                ? 'bg-amber-600/30 border border-amber-500/40 text-amber-300 hover:bg-amber-600/40'
                : 'bg-slate-900 border border-slate-800 text-slate-200 hover:bg-slate-800'
            }`}
            title={isVideoOff ? 'Start Camera' : 'Stop Camera'}
          >
            {isVideoOff ? <VideoOff className="w-4 h-4 text-amber-400" /> : <Video className="w-4 h-4 text-cyan-400" />}
            <span className="hidden sm:inline">{isVideoOff ? 'Camera On' : 'Camera Off'}</span>
          </button>

          {!isVideoOff && (
            <button
              onClick={flipCamera}
              className="p-3.5 rounded-2xl font-bold text-xs flex items-center gap-2 transition-all shadow-md bg-slate-900 border border-slate-800 text-slate-200 hover:bg-slate-800"
              title="Flip Camera (Front / Rear)"
            >
              <SwitchCamera className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Flip</span>
            </button>
          )}

          <button
            onClick={toggleScreenShare}
            className={`p-3.5 rounded-2xl font-bold text-xs flex items-center gap-2 transition-all shadow-md ${
              isScreenSharing
                ? 'bg-indigo-600 text-white shadow-indigo-600/30'
                : 'bg-slate-900 border border-slate-800 text-slate-200 hover:bg-slate-800'
            }`}
            title={isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}
          >
            <MonitorUp className="w-4 h-4 text-purple-400" />
            <span className="hidden sm:inline">{isScreenSharing ? 'Stop Share' : 'Share Screen'}</span>
          </button>

          <button
            onClick={handleEndCall}
            className="p-3.5 px-6 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-red-600/40 transition-all active:scale-95"
          >
            <PhoneOff className="w-4 h-4" />
            <span>End Call</span>
          </button>
        </div>
      </div>
    </div>
  );
}
