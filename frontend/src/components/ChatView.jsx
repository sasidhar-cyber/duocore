import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRoom } from '../context/RoomContext';
import { useMusic } from '../context/MusicContext';
import { getSocket } from '../services/socket';
import { Avatar } from './Avatar';
import { VideoCallModal } from './VideoCallModal';
import { AudioCallModal } from './AudioCallModal';
import { IncomingCallModal } from './IncomingCallModal';
import { CameraCaptureModal } from './CameraCaptureModal';
import { formatLastSeen } from '../utils/timeFormat';
import api from '../services/api';
import {
  Send,
  Reply,
  Paperclip,
  Image as ImageIcon,
  MapPin,
  X,
  Mic,
  Video,
  Phone,
  Check,
  CheckCheck,
  Trash2,
  Camera,
  CornerDownRight,
  MoreVertical,
  LogOut,
  Smile,
  Copy,
  Star,
  Pin,
  Search,
  FolderOpen,
  Palette,
  Play,
  Music2,
  Disc3,
  ExternalLink,
  ArrowLeft,
  Share2,
  UserPlus,
  Sparkles,
  Link as LinkIcon,
  Loader2
} from 'lucide-react';
import { playSound } from '../utils/soundEffects';

const CHAT_THEMES = [
  { id: 'default', name: 'Emerald Wave (Default)', bg: 'bg-slate-950/95', bubbleMe: 'bg-emerald-600', bubbleOther: 'bg-slate-900' },
  { id: 'amoled', name: 'Pure AMOLED Black', bg: 'bg-black', bubbleMe: 'bg-slate-800', bubbleOther: 'bg-zinc-900' },
  { id: 'neon', name: 'Neon Cyber Glow', bg: 'bg-slate-950', bubbleMe: 'bg-pink-600', bubbleOther: 'bg-slate-900' },
  { id: 'minimal', name: 'Minimal Slate', bg: 'bg-slate-900', bubbleMe: 'bg-cyan-600', bubbleOther: 'bg-slate-800' }
];

export function getMediaUrl(url) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }
  const apiBase = import.meta.env.VITE_API_BASE || '';
  if (apiBase.startsWith('http://') || apiBase.startsWith('https://')) {
    try {
      const origin = new URL(apiBase).origin;
      return `${origin}${url.startsWith('/') ? '' : '/'}${url}`;
    } catch {
      return url;
    }
  }
  return url;
}

// WhatsApp Style Voice Note Player
function AudioMemoPlayer({ fileUrl }) {
  const resolvedUrl = getMediaUrl(fileUrl);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(null);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const formatSecs = (sec) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="p-2 sm:p-2.5 rounded-2xl bg-black/30 border border-white/10 flex items-center gap-3 w-64 max-w-full">
      <audio
        ref={audioRef}
        src={fileUrl}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onEnded={() => { setIsPlaying(false); setCurrentTime(0); }}
      />
      <button
        onClick={togglePlay}
        className="w-9 h-9 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center font-bold text-sm shrink-0 transition-transform active:scale-95 shadow-md shadow-emerald-500/30"
      >
        {isPlaying ? '⏸' : '▶'}
      </button>

      <div className="flex-1 space-y-1">
        <div className="h-1.5 w-full bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-400 rounded-full transition-all duration-100"
            style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
          />
        </div>
        <div className="flex justify-between text-[9px] font-mono text-slate-400">
          <span>{formatSecs(currentTime)}</span>
          <span>{duration ? formatSecs(duration) : '0:00'}</span>
        </div>
      </div>
    </div>
  );
}

export function ChatView({ onBack, onOpenInvite }) {
  const { user } = useAuth();
  const {
    roomData,
    members,
    normalMessages,
    sendMessage,
    partnerTyping,
    sendTyping,
    hasPartner,
    partner,
    refreshPartnerState,
    removePartner,
    panicClearMessages
  } = useRoom();

  const { playTrack, openNowPlaying, currentTrack, isPlaying, togglePlay } = useMusic();

  const otherPartner = partner || members.find((m) => m.id !== user?.id) || {
    id: 'partner-default',
    username: 'Duo Partner',
    is_online: false,
    last_seen: null
  };

  const [messageText, setMessageText] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [previewImageModal, setPreviewImageModal] = useState(null);

  // Invite & Pairing Form State
  const [lobbyMode, setLobbyMode] = useState('select'); // 'select' | 'create' | 'join'
  const [createLoading, setCreateLoading] = useState(false);
  const [inputCode, setInputCode] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCreateRoom = async () => {
    setCreateLoading(true);
    try {
      let token = localStorage.getItem('duocore_token');
      if (!token) {
        const guestRes = await api.guestLogin();
        localStorage.setItem('duocore_token', guestRes.token);
      }
      await api.createDuoRoom();
      await refreshPartnerState();
      setLobbyMode('create');
      try { playSound('quiz_correct'); } catch (e) {}
    } catch (err) {
      alert(err.message || 'Failed to create room');
    } finally {
      setCreateLoading(false);
    }
  };

  // Search in Chat
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchIndex, setSearchIndex] = useState(0);

  // Media Gallery & Starred Drawers
  const [mediaGalleryOpen, setMediaGalleryOpen] = useState(false);
  const [mediaData, setMediaData] = useState(null);
  const [starredOpen, setStarredOpen] = useState(false);
  const [starredList, setStarredList] = useState([]);
  const [pinnedList, setPinnedList] = useState([]);

  // Chat Theme
  const [chatTheme, setChatTheme] = useState(() => localStorage.getItem('soundwave_chat_theme') || 'default');
  const [themePickerOpen, setThemePickerOpen] = useState(false);

  // Location Modal Confirmation
  const [locationConfirmOpen, setLocationConfirmOpen] = useState(false);

  // Calls
  const [videoCallOpen, setVideoCallOpen] = useState(false);
  const [audioCallOpen, setAudioCallOpen] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);

  // Voice Note Recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [normalMessages.length, partnerTyping]);

  // Mark messages as read when chat is active
  useEffect(() => {
    if (roomData?.id) {
      api.markMessagesRead(roomData.id, { channel: 'normal' }).catch(() => {});
    }
  }, [roomData?.id, normalMessages.length]);

  // WebRTC Incoming Call Listener
  useEffect(() => {
    const s = getSocket();
    if (!s) return;

    const handleIncomingRing = (callData) => {
      setIncomingCall(callData);
    };

    const handleCallDeclined = () => {
      alert('Call was declined');
      setVideoCallOpen(false);
      setAudioCallOpen(false);
    };

    s.on('call:incoming_ring', handleIncomingRing);
    s.on('call:declined', handleCallDeclined);

    return () => {
      s.off('call:incoming_ring', handleIncomingRing);
      s.off('call:declined', handleCallDeclined);
    };
  }, []);

  // Load Pinned & Starred Messages on Mount
  useEffect(() => {
    if (roomData?.id) {
      api.getPinnedMessages(roomData.id)
        .then((res) => setPinnedList(res.pinned || []))
        .catch(() => {});
    }
  }, [roomData?.id]);

  // Handle Connect to Partner Code
  const handleJoinByCode = async (e) => {
    e?.preventDefault();
    if (!inputCode.trim()) return;

    setJoinLoading(true);
    setJoinError('');

    try {
      let token = localStorage.getItem('duocore_token');
      if (!token) {
        const guestRes = await api.guestLogin();
        localStorage.setItem('duocore_token', guestRes.token);
      }

      await api.joinDuoRoom(inputCode.trim());
      await refreshPartnerState();
      setInputCode('');
      setLobbyMode('create');
      try { playSound('quiz_correct'); } catch (err) {}
    } catch (err) {
      setJoinError(err.message || 'Room not found. Please check code and try again.');
      try { playSound('quiz_wrong'); } catch (e) {}
    } finally {
      setJoinLoading(false);
    }
  };

  // Copy Code & WhatsApp Link Helpers
  const handleCopyCode = () => {
    if (!roomData?.code) return;
    navigator.clipboard.writeText(roomData.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyWhatsApp = () => {
    if (!roomData?.code) return;
    const url = `${window.location.origin}/?invite=${roomData.code}`;
    const text = `Hey! Join my private 1v1 Duo Chat on DuoCore here: ${url}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleCopyLinkOnly = () => {
    if (!roomData?.code) return;
    const url = `${window.location.origin}/?invite=${roomData.code}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Send Text Message
  const handleSendMessage = (e) => {
    e?.preventDefault();
    if (!messageText.trim()) return;

    sendMessage({
      text: messageText.trim(),
      channel: 'normal',
      replyTo: replyTo ? { id: replyTo.id, text: replyTo.text, username: replyTo.username } : null
    });

    setMessageText('');
    setReplyTo(null);
    sendTyping(false, 'normal');
    try { playSound('send'); } catch {}
  };

  // Send File Upload with guaranteed progress & error handling
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      alert('File size exceeds 25MB limit. Please choose a smaller file.');
      return;
    }

    setUploadingMedia(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.uploadFile(roomData?.id, formData);
      const isImg = file.type.startsWith('image/');
      const isVid = file.type.startsWith('video/');
      const isAud = file.type.startsWith('audio/');

      await sendMessage({
        text: isImg ? '📷 Photo' : isVid ? '🎥 Video' : isAud ? '🎵 Audio' : `📎 ${file.name}`,
        channel: 'normal',
        replyTo: replyTo ? { id: replyTo.id, text: replyTo.text, username: replyTo.username } : null,
        metadata: {
          fileUrl: res.fileUrl,
          fileType: file.type,
          fileName: file.name,
          fileSize: file.size
        }
      });

      setReplyTo(null);
      try { playSound('send'); } catch {}
    } catch (err) {
      alert(err.message || 'Failed to upload file.');
    } finally {
      setUploadingMedia(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Voice Note Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('file', audioBlob, 'voicenote.webm');

        try {
          const res = await api.uploadFile(roomData?.id, formData);
          await sendMessage({
            text: '🎤 Voice Note',
            channel: 'normal',
            metadata: { fileUrl: res.fileUrl, fileType: 'audio/webm' }
          });
          try { playSound('send'); } catch {}
        } catch (err) {
          alert('Failed to send voice note.');
        }

        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    } catch (err) {
      alert('Microphone access denied or unavailable.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  // Star / Pin / Delete
  const handleToggleStar = async (msg) => {
    if (!roomData?.id) return;
    try {
      if (msg.is_starred) await api.unstarMessage(roomData.id, msg.id);
      else await api.starMessage(roomData.id, msg.id);
      refreshPartnerState();
    } catch {}
  };

  const handleTogglePin = async (msg) => {
    if (!roomData?.id) return;
    try {
      if (msg.is_pinned) await api.unpinMessage(roomData.id, msg.id);
      else await api.pinMessage(roomData.id, msg.id);
      const res = await api.getPinnedMessages(roomData.id);
      setPinnedList(res.pinned || []);
    } catch {}
  };

  const handleDeleteMessage = async (msgId) => {
    if (window.confirm('Delete this message for everyone?')) {
      try {
        await api.deleteMessage(roomData?.id, msgId);
        refreshPartnerState();
      } catch {}
    }
  };

  // Open Media Gallery
  const handleOpenMediaGallery = async () => {
    if (!roomData?.id) return;
    try {
      const res = await api.getMediaGallery(roomData.id);
      setMediaData(res);
      setMediaGalleryOpen(true);
    } catch {}
  };

  // Open Starred
  const handleOpenStarred = async () => {
    if (!roomData?.id) return;
    try {
      const res = await api.getStarredMessages(roomData.id);
      setStarredList(res.starred || []);
      setStarredOpen(true);
    } catch {}
  };

  // Unpair
  const handleUnpair = async () => {
    if (window.confirm('Are you sure you want to disconnect from this 1v1 room?')) {
      try {
        await removePartner();
      } catch {}
    }
  };

  // Panic Clear
  const handlePanicClear = async () => {
    if (window.confirm('🚨 EMERGENCY CLEAR: Erase all messages from server & partner screen immediately?')) {
      try {
        await panicClearMessages('normal');
        try { playSound('quiz_wrong'); } catch {}
      } catch {}
    }
  };

  // Share Live Location
  const executeSendLocation = () => {
    setLocationConfirmOpen(false);
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
        sendMessage({
          text: `📍 Shared Live Location: ${mapsUrl}`,
          channel: 'normal',
          metadata: { latitude, longitude, mapsUrl }
        });
        try { playSound('send'); } catch {}
      },
      (err) => {
        alert('Could not retrieve GPS location: ' + err.message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Call triggers with signaling
  const startVideoCall = () => {
    const s = getSocket();
    if (s && roomData?.id) {
      s.emit('call:start_call', {
        targetUserId: otherPartner?.id,
        roomId: roomData.id,
        callType: 'video'
      });
    }
    setVideoCallOpen(true);
  };

  const startAudioCall = () => {
    const s = getSocket();
    if (s && roomData?.id) {
      s.emit('call:start_call', {
        targetUserId: otherPartner?.id,
        roomId: roomData.id,
        callType: 'audio'
      });
    }
    setAudioCallOpen(true);
  };

  // In-Chat Search Navigation
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return normalMessages.filter((m) =>
      (m.text && m.text.toLowerCase().includes(q)) ||
      (m.username && m.username.toLowerCase().includes(q))
    );
  }, [searchQuery, normalMessages]);

  const handleNextSearch = () => {
    if (searchResults.length === 0) return;
    const nextIdx = (searchIndex + 1) % searchResults.length;
    setSearchIndex(nextIdx);
    const target = searchResults[nextIdx];
    if (target) {
      const el = document.getElementById(`msg-${target.id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-2', 'ring-yellow-400');
        setTimeout(() => el.classList.remove('ring-2', 'ring-yellow-400'), 1500);
      }
    }
  };

  const handlePrevSearch = () => {
    if (searchResults.length === 0) return;
    const prevIdx = (searchIndex - 1 + searchResults.length) % searchResults.length;
    setSearchIndex(prevIdx);
    const target = searchResults[prevIdx];
    if (target) {
      const el = document.getElementById(`msg-${target.id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-2', 'ring-yellow-400');
        setTimeout(() => el.classList.remove('ring-2', 'ring-yellow-400'), 1500);
      }
    }
  };

  const currentThemeObj = CHAT_THEMES.find((t) => t.id === chatTheme) || CHAT_THEMES[0];
  const partnerAvatar = otherPartner?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(otherPartner?.username || 'partner')}`;

  return (
    <div className={`h-full w-full flex flex-col ${currentThemeObj.bg} rounded-3xl border border-emerald-500/30 overflow-hidden shadow-2xl relative select-none`}>
      {/* 1. WHATSAPP STYLE 1v1 HEADER */}
      <div className="p-3 sm:p-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all mr-1 shrink-0"
              title="Back to Music Player"
            >
              <ArrowLeft className="w-4 h-4 text-emerald-400" />
            </button>
          )}

          <div className="relative shrink-0">
            {hasPartner ? (
              <>
                <Avatar
                  src={otherPartner?.avatar_url}
                  name={otherPartner?.username || 'Partner'}
                  className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl ring-2 ring-emerald-500/40"
                />
                <div
                  className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-950 ${
                    otherPartner?.is_online ? 'bg-emerald-400' : 'bg-slate-600'
                  }`}
                />
              </>
            ) : (
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-xl">
                🎮
              </div>
            )}
          </div>

          <div className="min-w-0">
            <h4 className="text-sm sm:text-base font-black text-white truncate flex items-center gap-2">
              <span>{hasPartner ? (otherPartner?.username || 'Duo Partner') : '1v1 Duo Chat Lobby'}</span>
              {roomData?.code && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                  {roomData.code}
                </span>
              )}
            </h4>
            <p className="text-[11px] font-mono truncate">
              {hasPartner ? (
                partnerTyping?.normal ? (
                  <span className="text-emerald-400 font-bold animate-pulse">typing...</span>
                ) : otherPartner?.is_online ? (
                  <span className="text-emerald-400 font-medium">Online</span>
                ) : (
                  <span className="text-slate-400">{formatLastSeen(otherPartner?.last_seen)}</span>
                )
              ) : (
                <span className="text-yellow-400 font-bold">⚠️ Unpaired • Enter Room Code to Connect</span>
              )}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {currentTrack && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-850 border border-emerald-500/30 text-emerald-400 max-w-[130px] sm:max-w-[190px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
              <span className="text-[10px] sm:text-[11px] font-bold truncate text-slate-200">{currentTrack.title}</span>
              <button
                onClick={togglePlay}
                className="p-0.5 rounded-lg text-emerald-300 hover:text-emerald-200 shrink-0 text-xs"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? '⏸' : '▶'}
              </button>
            </div>
          )}

          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-transform active:scale-95"
            title="Search inside Chat"
          >
            <Search className="w-4 h-4" />
          </button>

          <button
            onClick={startAudioCall}
            disabled={!hasPartner}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-400 border border-slate-700 transition-transform active:scale-95 disabled:opacity-40"
            title="Start Audio Call"
          >
            <Phone className="w-4 h-4" />
          </button>

          <button
            onClick={startVideoCall}
            disabled={!hasPartner}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-400 border border-slate-700 transition-transform active:scale-95 disabled:opacity-40"
            title="Start HD Video Call"
          >
            <Video className="w-4 h-4" />
          </button>

          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-52 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-2 z-50 animate-in fade-in space-y-1">
                <button
                  onClick={() => { handleOpenMediaGallery(); setMenuOpen(false); }}
                  className="w-full px-3 py-2 rounded-xl text-left text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2"
                >
                  <FolderOpen className="w-4 h-4 text-cyan-400" />
                  <span>Media, Links & Docs</span>
                </button>

                <button
                  onClick={() => { handleOpenStarred(); setMenuOpen(false); }}
                  className="w-full px-3 py-2 rounded-xl text-left text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2"
                >
                  <Star className="w-4 h-4 text-yellow-400 fill-current" />
                  <span>Starred Messages</span>
                </button>

                <button
                  onClick={() => { setThemePickerOpen(true); setMenuOpen(false); }}
                  className="w-full px-3 py-2 rounded-xl text-left text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2"
                >
                  <Palette className="w-4 h-4 text-pink-400" />
                  <span>Change Theme</span>
                </button>

                {hasPartner && (
                  <button
                    onClick={() => { handlePanicClear(); setMenuOpen(false); }}
                    className="w-full px-3 py-2 rounded-xl text-left text-xs font-bold text-yellow-400 hover:bg-yellow-500/20 flex items-center gap-2"
                  >
                    <span>🚨</span>
                    <span>Emergency Clear Chat</span>
                  </button>
                )}

                {hasPartner && (
                  <button
                    onClick={() => { handleUnpair(); setMenuOpen(false); }}
                    className="w-full px-3 py-2 rounded-xl text-left text-xs font-bold text-red-400 hover:bg-red-500/20 flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Unpair Room</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* In-Chat Search Bar */}
      {searchOpen && (
        <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex items-center gap-2 text-xs shrink-0 animate-in slide-in-from-top duration-150">
          <Search className="w-4 h-4 text-emerald-400 shrink-0" />
          <input
            type="text"
            placeholder="Search messages in this chat..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSearchIndex(0);
            }}
            className="flex-1 bg-transparent border-none text-white placeholder:text-slate-500 text-xs focus:outline-none"
            autoFocus
          />
          {searchResults.length > 0 && (
            <span className="text-[10px] font-mono text-slate-400 shrink-0">
              {searchIndex + 1} of {searchResults.length}
            </span>
          )}
          {searchQuery && searchResults.length === 0 && (
            <span className="text-[10px] font-mono text-red-400 shrink-0">
              No matches
            </span>
          )}
          <button
            onClick={handlePrevSearch}
            disabled={searchResults.length === 0}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30"
            title="Previous match"
          >
            ▲
          </button>
          <button
            onClick={handleNextSearch}
            disabled={searchResults.length === 0}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30"
            title="Next match"
          >
            ▼
          </button>
          <button
            onClick={() => {
              setSearchOpen(false);
              setSearchQuery('');
            }}
            className="p-1 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Pinned Messages Top Banner */}
      {pinnedList.length > 0 && (
        <div className="px-4 py-2 bg-emerald-950/80 border-b border-emerald-500/30 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <Pin className="w-3.5 h-3.5 text-emerald-400 shrink-0 fill-current" />
            <span className="text-emerald-300 font-bold text-[10px] shrink-0">PINNED:</span>
            <p className="text-slate-200 truncate text-[11px]">{pinnedList[0].text}</p>
          </div>
        </div>
      )}

      {/* 2. CHAT STREAM (Natural top-down growth, sender right, receiver left) */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 flex flex-col justify-start bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]">
        {hasPartner ? (
          /* PAIRED ACTIVE BANNER */
          <div className="p-3 sm:p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 flex items-center justify-between gap-2 max-w-lg w-full mx-auto mb-2 animate-in fade-in shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-sm font-bold shrink-0">
                🔒
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider block">
                  1v1 PRIVATE DUO ROOM (ACTIVE ✅)
                </span>
                <p className="text-xs text-slate-200 font-bold truncate">
                  Connected with <span className="text-emerald-300 font-extrabold">{otherPartner?.username}</span> (Room: {roomData?.code})
                </p>
              </div>
            </div>

            <button
              onClick={handleUnpair}
              className="px-2.5 py-1.5 rounded-xl bg-red-950/60 border border-red-500/30 text-red-300 hover:bg-red-900/60 text-[10px] font-bold shrink-0 transition-all active:scale-95"
              title="Disconnect / Split Room"
            >
              Unpair
            </button>
          </div>
        ) : (
          /* 2-PLAYER ROOM LOBBY (CREATE OR JOIN) */
          <div className="p-4 sm:p-6 rounded-3xl bg-slate-900/95 border-2 border-emerald-500/40 shadow-2xl space-y-5 max-w-lg w-full mx-auto mb-2 animate-in fade-in shrink-0">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-emerald-400 font-black text-xs sm:text-sm tracking-wider uppercase">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>1v1 Duo Chat Lobby 🎮</span>
              </div>
              <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-yellow-500/20 text-yellow-300 font-bold border border-yellow-500/30 animate-pulse">
                WAITING TO PAIR ⏳
              </span>
            </div>

            {lobbyMode === 'select' && (
              <div className="space-y-4 py-2">
                <p className="text-xs text-slate-300 text-center font-medium">
                  Connect with your friend to unlock private real-time chat, HD calls, and music sharing!
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={handleCreateRoom}
                    disabled={createLoading}
                    className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border-2 border-emerald-500/50 hover:border-emerald-400 text-left transition-all active:scale-95 group shadow-lg flex flex-col justify-between space-y-3"
                  >
                    <div className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black text-lg group-hover:scale-110 transition-transform">
                      ➕
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white group-hover:text-emerald-300">CREATE ROOM</h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">Host a new room & get a code for your friend</p>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400 font-bold">
                      {createLoading ? 'Generating Code...' : 'HOST NOW ⚡'}
                    </span>
                  </button>

                  <button
                    onClick={() => setLobbyMode('join')}
                    className="p-5 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/10 border-2 border-cyan-500/50 hover:border-cyan-400 text-left transition-all active:scale-95 group shadow-lg flex flex-col justify-between space-y-3"
                  >
                    <div className="w-10 h-10 rounded-xl bg-cyan-500 text-slate-950 flex items-center justify-center font-black text-lg group-hover:scale-110 transition-transform">
                      🚀
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white group-hover:text-cyan-300">JOIN ROOM</h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">Enter the code shared by your friend</p>
                    </div>
                    <span className="text-[10px] font-mono text-cyan-400 font-bold">
                      ENTER CODE 🔑
                    </span>
                  </button>
                </div>
              </div>
            )}

            {lobbyMode === 'create' && (
              <div className="space-y-4 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                    Share your Room Code
                  </span>
                  <button
                    onClick={() => setLobbyMode('select')}
                    className="text-[10px] font-mono text-slate-400 hover:text-white underline"
                  >
                    ↩ Change Mode
                  </button>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/90 border border-emerald-500/40 text-center space-y-2">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block">
                    YOUR UNIQUE DUO ROOM CODE
                  </span>
                  <div className="text-3xl sm:text-4xl font-black font-mono tracking-widest text-emerald-400 py-1">
                    {roomData?.code || '---'}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleCopyCode}
                    className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedCode ? 'Copied! ✅' : 'Copy Code'}</span>
                  </button>

                  <button
                    onClick={handleCopyLinkOnly}
                    className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                  >
                    <LinkIcon className="w-3.5 h-3.5" />
                    <span>{copiedLink ? 'Copied! ✅' : 'Copy Link'}</span>
                  </button>
                </div>

                <button
                  onClick={handleCopyWhatsApp}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 active:scale-95 transition-transform"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Share Code on WhatsApp 📲</span>
                </button>

                <p className="text-[11px] font-mono text-center text-yellow-300/90 animate-pulse pt-1">
                  ⏳ Waiting for friend to enter code {roomData?.code}...
                </p>
              </div>
            )}

            {lobbyMode === 'join' && (
              <form onSubmit={handleJoinByCode} className="space-y-4 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                    Enter your friend's code
                  </span>
                  <button
                    type="button"
                    onClick={() => setLobbyMode('select')}
                    className="text-[10px] font-mono text-slate-400 hover:text-white underline"
                  >
                    ↩ Back
                  </button>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter Code (e.g. 503) or Custom Word (e.g. sasi)"
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                    className="flex-1 glass-input rounded-2xl px-4 py-3 text-sm font-mono tracking-wider text-emerald-300 uppercase placeholder:normal-case placeholder:text-slate-500 border border-slate-700 focus:border-cyan-400"
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={joinLoading || !inputCode.trim()}
                    className="px-5 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-slate-950 font-black text-xs shrink-0 transition-transform active:scale-95 shadow-lg shadow-cyan-500/30"
                  >
                    {joinLoading ? 'Connecting...' : 'CONNECT 🚀'}
                  </button>
                </div>
                {joinError && <p className="text-xs text-red-400 font-bold px-1">{joinError}</p>}
              </form>
            )}
          </div>
        )}

        {/* Message Stream */}
        {normalMessages.map((msg, idx) => {
          const isMe = String(msg.sender_id) === String(user?.id);

          let meta = {};
          if (msg.metadata) {
            if (typeof msg.metadata === 'object') meta = msg.metadata;
            else if (typeof msg.metadata === 'string') {
              try { meta = JSON.parse(msg.metadata); } catch (e) { meta = {}; }
            }
          }

          return (
            <div
              key={msg.id || idx}
              id={`msg-${msg.id}`}
              className={`flex items-end gap-2 group transition-all ${isMe ? 'justify-end' : 'justify-start'}`}
            >
              {!isMe && (
                <img
                  src={partnerAvatar}
                  alt={msg.username}
                  className="w-7 h-7 rounded-xl object-cover shrink-0 mb-1 ring-1 ring-slate-700"
                />
              )}

              <div
                className={`max-w-[85%] sm:max-w-[70%] rounded-2xl p-3 sm:p-3.5 space-y-1.5 shadow-lg relative ${
                  isMe
                    ? `${currentThemeObj.bubbleMe} text-white rounded-br-none ml-auto`
                    : `${currentThemeObj.bubbleOther} text-slate-100 border border-slate-800 rounded-bl-none mr-auto`
                }`}
              >
                {/* Reply Quote Preview */}
                {(msg.reply_to_text || msg.replyTo?.text) && (
                  <div
                    onClick={() => {
                      const targetId = msg.reply_to_id || msg.replyTo?.id;
                      if (targetId) {
                        const el = document.getElementById(`msg-${targetId}`);
                        if (el) {
                          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          el.classList.add('ring-2', 'ring-emerald-400', 'scale-[1.02]');
                          setTimeout(() => el.classList.remove('ring-2', 'ring-emerald-400', 'scale-[1.02]'), 1500);
                        }
                      }
                    }}
                    className="p-2 rounded-xl bg-black/30 border-l-3 border-emerald-400 text-xs text-slate-200 mb-1.5 cursor-pointer hover:bg-black/40 transition-colors"
                  >
                    <span className="font-bold text-[10px] text-emerald-300 block">
                      {msg.reply_to_username || msg.replyTo?.username || 'Partner'}
                    </span>
                    <p className="truncate text-[11px] text-slate-300">
                      {msg.reply_to_text || msg.replyTo?.text}
                    </p>
                  </div>
                )}

                {/* Shared Music Card */}
                {meta?.song && (
                  <div className="p-3 rounded-2xl bg-black/40 border border-white/20 space-y-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={meta.song.thumbnail}
                        alt={meta.song.title}
                        className="w-14 h-14 rounded-xl object-cover ring-1 ring-emerald-400/50 shrink-0"
                      />
                      <div className="min-w-0">
                        <span className="text-[9px] font-mono font-bold text-emerald-400 uppercase tracking-widest block">
                          DUOCORE MUSIC TRACK
                        </span>
                        <h4 className="text-xs sm:text-sm font-black text-white truncate">{meta.song.title}</h4>
                        <p className="text-[11px] text-slate-300 truncate">{meta.song.artist}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        playTrack(meta.song);
                        openNowPlaying();
                      }}
                      className="w-full py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-500/30 transition-transform active:scale-95"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>Play on DuoCore</span>
                    </button>
                  </div>
                )}

                {/* Photo / Image */}
                {meta?.fileUrl && meta?.fileType?.startsWith('image/') && (
                  <div className="rounded-2xl overflow-hidden max-h-80 border border-white/10 relative group/img mt-1">
                    <img
                      src={getMediaUrl(meta.fileUrl)}
                      alt="Photo"
                      loading="lazy"
                      className="w-full h-auto max-h-80 object-cover cursor-pointer hover:opacity-95 transition-opacity"
                      onClick={() => setPreviewImageModal(getMediaUrl(meta.fileUrl))}
                    />
                  </div>
                )}

                {/* Voice Note Player */}
                {meta?.fileUrl && meta?.fileType?.startsWith('audio/') && (
                  <AudioMemoPlayer fileUrl={getMediaUrl(meta.fileUrl)} />
                )}

                {/* Generic File Download */}
                {meta?.fileUrl && !meta?.fileType?.startsWith('image/') && !meta?.fileType?.startsWith('audio/') && (
                  <a
                    href={getMediaUrl(meta.fileUrl)}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2.5 rounded-xl bg-black/30 border border-white/10 flex items-center justify-between text-xs text-slate-200 hover:text-white mt-1"
                  >
                    <span className="truncate font-bold">{meta.fileName || '📎 Download Attachment'}</span>
                    <ExternalLink className="w-3.5 h-3.5 text-cyan-400 shrink-0 ml-2" />
                  </a>
                )}

                {/* Message Text */}
                {msg.text && !meta?.song && (
                  <p className="text-xs sm:text-sm whitespace-pre-wrap break-words leading-relaxed">
                    {msg.text.startsWith('📍 Shared Live Location:') ? (
                      <a
                        href={msg.text.replace('📍 Shared Live Location: ', '')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline text-cyan-300 font-bold flex items-center gap-1"
                      >
                        <MapPin className="w-4 h-4" />
                        <span>View Live Google Maps Location</span>
                      </a>
                    ) : (
                      msg.text
                    )}
                  </p>
                )}

                {/* Timestamp & Real Ticks */}
                <div className="flex items-center justify-end gap-1.5 text-[10px] opacity-80 font-mono pt-0.5">
                  {msg.is_starred ? <Star className="w-3 h-3 text-yellow-300 fill-current" /> : null}
                  <span>
                    {msg.created_at
                      ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : ''}
                  </span>
                  {isMe && (
                    <span className="flex items-center" title={msg.is_read ? 'Read (Blue Double Tick)' : otherPartner?.is_online ? 'Delivered' : 'Sent'}>
                      {msg.is_read ? (
                        <CheckCheck className="w-3.5 h-3.5 text-cyan-300 stroke-[2.5]" />
                      ) : otherPartner?.is_online ? (
                        <CheckCheck className="w-3.5 h-3.5 text-slate-300 stroke-[2]" />
                      ) : (
                        <Check className="w-3.5 h-3.5 text-slate-400 stroke-[2]" />
                      )}
                    </span>
                  )}
                </div>
              </div>

              {/* Context Actions (Reply, Star, Pin, Delete) */}
              <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 bg-slate-900/90 border border-slate-800 rounded-xl p-1 shadow-lg transition-opacity shrink-0">
                <button
                  onClick={() => setReplyTo(msg)}
                  className="p-1 text-slate-400 hover:text-white"
                  title="Reply"
                >
                  <Reply className="w-3 h-3" />
                </button>

                <button
                  onClick={() => handleToggleStar(msg)}
                  className={`p-1 ${msg.is_starred ? 'text-yellow-400' : 'text-slate-400 hover:text-yellow-400'}`}
                  title="Star message"
                >
                  <Star className="w-3 h-3" />
                </button>

                <button
                  onClick={() => handleTogglePin(msg)}
                  className={`p-1 ${msg.is_pinned ? 'text-emerald-400' : 'text-slate-400 hover:text-emerald-400'}`}
                  title="Pin message"
                >
                  <Pin className="w-3 h-3" />
                </button>

                {isMe && (
                  <button
                    onClick={() => handleDeleteMessage(msg.id)}
                    className="p-1 text-slate-400 hover:text-red-400"
                    title="Delete message"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Uploading Progress Toast */}
      {uploadingMedia && (
        <div className="px-4 py-2 bg-slate-900 border-t border-emerald-500/30 flex items-center justify-center gap-2 text-xs font-bold text-emerald-400 animate-pulse shrink-0">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Uploading attachment securely...</span>
        </div>
      )}

      {/* Reply Preview Bar */}
      {replyTo && (
        <div className="px-4 py-2 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <CornerDownRight className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="min-w-0">
              <span className="font-bold text-emerald-400 text-[10px]">{replyTo.username || 'Partner'}</span>
              <p className="text-slate-300 truncate text-[11px]">{replyTo.text}</p>
            </div>
          </div>
          <button onClick={() => setReplyTo(null)} className="p-1 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 3. WHATSAPP BOTTOM COMPOSER */}
      {hasPartner && (
        <div className="p-2 sm:p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2 shrink-0 z-30 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
          />

          <button
            onClick={() => setCameraModalOpen(true)}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all active:scale-95 shrink-0"
            title="Take Photo with Camera"
          >
            <Camera className="w-4 h-4" />
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all active:scale-95 shrink-0"
            title="Attach Photo / Document"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          <button
            onClick={() => setLocationConfirmOpen(true)}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all active:scale-95 shrink-0 hidden sm:block"
            title="Share Live GPS Location"
          >
            <MapPin className="w-4 h-4" />
          </button>

          {isRecording ? (
            <div className="flex-1 flex items-center justify-between bg-red-950/60 border border-red-500/40 rounded-2xl px-4 py-2 animate-pulse">
              <div className="flex items-center gap-2 text-red-400 font-mono text-xs font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                <span>Recording Voice Note: {recordingSeconds}s</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={cancelRecording}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 text-slate-400 hover:text-white text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  onClick={stopRecording}
                  className="px-3 py-1 rounded-lg bg-emerald-500 text-slate-950 text-xs font-black"
                >
                  Send 🎙️
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSendMessage} className="flex-1 flex items-center gap-2">
              <input
                type="text"
                placeholder="Type a secret message..."
                value={messageText}
                onChange={(e) => {
                  setMessageText(e.target.value);
                  sendTyping(e.target.value.length > 0, 'normal');
                }}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50 shadow-inner"
              />

              {messageText.trim() ? (
                <button
                  type="submit"
                  className="p-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center font-black transition-transform active:scale-95 shrink-0 shadow-lg shadow-emerald-500/30"
                  title="Send Message"
                >
                  <Send className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startRecording}
                  className="p-2.5 rounded-2xl bg-slate-800 hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-400 border border-slate-700 transition-all active:scale-95 shrink-0"
                  title="Hold to record voice note"
                >
                  <Mic className="w-4 h-4" />
                </button>
              )}
            </form>
          )}
        </div>
      )}

      {/* Image Fullscreen Preview Modal */}
      {previewImageModal && (
        <div
          onClick={() => setPreviewImageModal(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 animate-in fade-in cursor-pointer"
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl border border-slate-800">
            <img src={previewImageModal} alt="Enlarged view" className="w-full h-full object-contain" />
            <button
              onClick={() => setPreviewImageModal(null)}
              className="absolute top-3 right-3 p-2 rounded-full bg-slate-950/80 text-white hover:bg-slate-900"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* GPS Location Confirmation Modal */}
      {locationConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-xs glass-panel p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-2xl mx-auto">
              📍
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Share GPS Location?</h4>
              <p className="text-xs text-slate-400 mt-1">
                Your exact Google Maps location pin will be shared with your duo partner.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setLocationConfirmOpen(false)}
                className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={executeSendLocation}
                className="flex-1 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs"
              >
                Share Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Theme Picker Modal */}
      {themePickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-xs glass-panel p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Palette className="w-4 h-4 text-emerald-400" />
                <span>Chat Themes</span>
              </h4>
              <button onClick={() => setThemePickerOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              {CHAT_THEMES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setChatTheme(t.id);
                    localStorage.setItem('soundwave_chat_theme', t.id);
                    setThemePickerOpen(false);
                  }}
                  className={`w-full p-2.5 rounded-xl text-left text-xs font-bold border transition-all flex items-center justify-between ${
                    chatTheme === t.id
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850'
                  }`}
                >
                  <span>{t.name}</span>
                  {chatTheme === t.id && <Check className="w-3.5 h-3.5" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Media Gallery Drawer */}
      {mediaGalleryOpen && mediaData && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/80 p-0">
          <div className="w-full max-w-md bg-slate-950 border-l border-slate-800 h-full p-5 flex flex-col space-y-4 overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-cyan-400" />
                <span>Media, Links & Docs</span>
              </h3>
              <button onClick={() => setMediaGalleryOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 flex-1">
              <div>
                <span className="text-[10px] font-mono text-slate-500 uppercase font-bold block mb-2">PHOTOS & IMAGES ({mediaData.photos?.length || 0})</span>
                {(!mediaData.photos || mediaData.photos.length === 0) ? (
                  <p className="text-xs text-slate-600">No photos shared yet.</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {mediaData.photos.map((p) => (
                      <img
                        key={p.id}
                        src={p.url}
                        alt="Photo"
                        className="aspect-square object-cover rounded-xl cursor-pointer hover:scale-105 transition-transform"
                        onClick={() => window.open(p.url, '_blank')}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div>
                <span className="text-[10px] font-mono text-slate-500 uppercase font-bold block mb-2">DOCUMENTS ({mediaData.documents?.length || 0})</span>
                {(!mediaData.documents || mediaData.documents.length === 0) ? (
                  <p className="text-xs text-slate-600">No documents shared yet.</p>
                ) : (
                  mediaData.documents.map((d) => (
                    <a
                      key={d.id}
                      href={d.url}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs text-slate-300 hover:text-white mb-2"
                    >
                      <span className="truncate">{d.fileName}</span>
                      <ExternalLink className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    </a>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Starred Messages Modal */}
      {starredOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md glass-panel p-5 rounded-3xl bg-slate-950 border border-slate-800 space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-400 fill-current" />
                <span>Starred Messages ({starredList.length})</span>
              </h4>
              <button onClick={() => setStarredOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {starredList.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">No starred messages yet.</p>
            ) : (
              <div className="space-y-2">
                {starredList.map((m) => (
                  <div key={m.id} className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span className="font-bold text-emerald-400">{m.username}</span>
                      <span>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-xs text-white">{m.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modals for Calling & Camera */}
      {videoCallOpen && (
        <VideoCallModal
          isOpen={videoCallOpen}
          onClose={() => setVideoCallOpen(false)}
        />
      )}

      {audioCallOpen && (
        <AudioCallModal
          isOpen={audioCallOpen}
          onClose={() => setAudioCallOpen(false)}
        />
      )}

      {incomingCall && (
        <IncomingCallModal
          incomingCall={incomingCall}
          onAccept={() => {
            if (incomingCall.callType === 'video') setVideoCallOpen(true);
            else setAudioCallOpen(true);
            setIncomingCall(null);
          }}
          onDecline={() => {
            const s = getSocket();
            if (s) {
              s.emit('call:decline_call', {
                callerSocketId: incomingCall.caller?.socketId,
                roomId: roomData?.id
              });
            }
            setIncomingCall(null);
          }}
        />
      )}

      {cameraModalOpen && (
        <CameraCaptureModal
          isOpen={cameraModalOpen}
          onClose={() => setCameraModalOpen(false)}
          onCapture={async (blob) => {
            const formData = new FormData();
            formData.append('file', blob, 'camera_capture.jpg');
            try {
              const res = await api.uploadFile(roomData?.id, formData);
              await sendMessage({
                text: '📷 Live Camera Photo',
                channel: 'normal',
                metadata: { fileUrl: res.fileUrl, fileType: 'image/jpeg' }
              });
              try { playSound('send'); } catch {}
            } catch (err) {
              alert('Failed to send photo.');
            }
            setCameraModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
