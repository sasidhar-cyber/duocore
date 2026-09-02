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
  Loader2,
  ChevronDown,
  AlertTriangle
} from 'lucide-react';
import { playSound } from '../utils/soundEffects';
import { showBrowserNotification } from '../utils/notificationService';

const CHAT_THEMES = [
  {
    id: 'default',
    name: 'Blue + Pink Gradient (Default)',
    bg: 'bg-slate-950/95',
    bubbleMe: 'bg-gradient-to-r from-blue-600 via-indigo-600 to-pink-600 shadow-md shadow-pink-500/20 text-white',
    bubbleOther: 'bg-slate-900/90 border border-blue-500/25 shadow-sm text-slate-100'
  },
  {
    id: 'deep_blue_pink',
    name: 'Deep Midnight Pink',
    bg: 'bg-[#0b0f19]',
    bubbleMe: 'bg-gradient-to-r from-blue-500 to-pink-500 text-white shadow-lg shadow-pink-500/30',
    bubbleOther: 'bg-[#131b2e] border border-pink-500/20 text-slate-100'
  },
  {
    id: 'amoled',
    name: 'Pure AMOLED Black',
    bg: 'bg-black',
    bubbleMe: 'bg-gradient-to-r from-blue-600 to-pink-600 text-white',
    bubbleOther: 'bg-zinc-900 border border-zinc-800 text-slate-100'
  }
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

function formatMessageDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined });
}

// Voice Note Player
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
        src={resolvedUrl}
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
    clearChatMessages,
    panicClearMessages,
    deleteSingleMessage,
    startOutgoingCall
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
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [partnerInfoOpen, setPartnerInfoOpen] = useState(false);
  const [clearChatConfirmOpen, setClearChatConfirmOpen] = useState(false);
  const [deleteMsgConfirmId, setDeleteMsgConfirmId] = useState(null);

  // Dynamic visual viewport height tracker for Android & iOS soft keyboards
  const [viewportHeight, setViewportHeight] = useState(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;

    const handleResize = () => {
      setViewportHeight(window.visualViewport.height);
    };

    window.visualViewport.addEventListener('resize', handleResize);
    window.visualViewport.addEventListener('scroll', handleResize);

    return () => {
      window.visualViewport.removeEventListener('resize', handleResize);
      window.visualViewport.removeEventListener('scroll', handleResize);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  // Lobby Mode
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
  const chatScrollRef = useRef(null);
  const fileInputRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (!showScrollBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [normalMessages.length, partnerTyping]);

  // Handle scroll detection for floating scroll-to-bottom button
  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 120;
    setShowScrollBottom(!isNearBottom);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowScrollBottom(false);
  };

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
      if (localStorage.getItem('duocore_notif_calls') !== 'false') {
        playSound('message');
        if (document.hidden) {
          showBrowserNotification(`Incoming ${callData.callType === 'video' ? 'Video' : 'Audio'} Call`, {
            body: `${callData.caller?.username || 'Duo Partner'} is calling you...`,
            tag: 'duocore-call'
          });
        }
      }
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

  // Connect to Partner Code
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

  // Debounced input change for typing indicator
  const handleInputChange = (e) => {
    const val = e.target.value;
    setMessageText(val);

    if (val.length > 0) {
      sendTyping(true, 'normal');
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        sendTyping(false, 'normal');
      }, 2500);
    } else {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      sendTyping(false, 'normal');
    }
  };

  // Send Message
  const handleSendMessage = (e) => {
    e?.preventDefault();
    if (!messageText.trim()) return;

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    sendTyping(false, 'normal');

    sendMessage({
      text: messageText.trim(),
      channel: 'normal',
      replyTo: replyTo ? { id: replyTo.id, text: replyTo.text, username: replyTo.username } : null
    });

    setMessageText('');
    setReplyTo(null);
    try { playSound('send'); } catch {}
  };

  // Send File Upload
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

  // Star / Pin
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

  // Single Message Delete
  const confirmDeleteSingleMessage = async () => {
    if (!deleteMsgConfirmId) return;
    try {
      await deleteSingleMessage(deleteMsgConfirmId, 'normal');
      setDeleteMsgConfirmId(null);
    } catch (err) {
      alert('Failed to delete message: ' + (err.message || 'Error'));
    }
  };

  // Clear Entire Chat
  const confirmExecuteClearChat = async () => {
    setClearChatConfirmOpen(false);
    try {
      await clearChatMessages('normal');
      try { playSound('quiz_correct'); } catch {}
    } catch (err) {
      alert('Failed to clear chat: ' + (err.message || 'Error'));
    }
  };

  // Open Media Gallery & Starred
  const handleOpenMediaGallery = async () => {
    if (!roomData?.id) return;
    try {
      const res = await api.getMediaGallery(roomData.id);
      setMediaData(res);
      setMediaGalleryOpen(true);
    } catch {}
  };

  const handleOpenStarred = async () => {
    if (!roomData?.id) return;
    try {
      const res = await api.getStarredMessages(roomData.id);
      setStarredList(res.starred || []);
      setStarredOpen(true);
    } catch {}
  };

  const handleUnpair = async () => {
    if (window.confirm('Are you sure you want to disconnect from this 1v1 room?')) {
      try {
        await removePartner();
      } catch {}
    }
  };

  const handlePanicClear = async () => {
    if (window.confirm('🚨 EMERGENCY STEALTH CLEAR: Erase all messages from server database & partner screen immediately?')) {
      try {
        await panicClearMessages('normal');
        try { playSound('quiz_wrong'); } catch {}
      } catch {}
    }
  };

  // Calls
  const startVideoCall = () => {
    startOutgoingCall('video');
  };

  const startAudioCall = () => {
    startOutgoingCall('audio');
  };

  // Search Navigation
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
    <div
      style={viewportHeight ? { height: `${viewportHeight}px`, maxHeight: `${viewportHeight}px` } : undefined}
      className={`h-full max-h-[100dvh] w-full flex flex-col ${currentThemeObj.bg} rounded-none sm:rounded-3xl border-0 sm:border border-blue-500/30 overflow-hidden shadow-2xl relative select-none`}
    >
      {/* 1. HEADER (Blue + Pink Accent) */}
      <div className="px-3 py-2.5 sm:p-4 bg-slate-900/95 border-b border-blue-500/20 flex items-center justify-between gap-2 shrink-0 z-20">
        <div
          onClick={() => {
            if (hasPartner) setPartnerInfoOpen(true);
          }}
          className={`flex items-center gap-2.5 sm:gap-3 min-w-0 ${hasPartner ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''}`}
          title={hasPartner ? 'View Partner Profile & Room Options' : 'Duo Chat Lobby'}
        >
          {onBack && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onBack();
              }}
              className="p-1.5 sm:p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-white transition-all mr-0.5 shrink-0"
              title="Back to Music Player"
            >
              <ArrowLeft className="w-4 h-4 text-blue-400" />
            </button>
          )}

          <div className="relative shrink-0">
            {hasPartner ? (
              <>
                <Avatar
                  src={otherPartner?.avatar_url}
                  name={otherPartner?.username || 'Partner'}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl ring-2 ring-pink-500/50"
                />
                <div
                  className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border-2 border-slate-950 ${
                    otherPartner?.is_online ? 'bg-pink-400 shadow-sm shadow-pink-400/80' : 'bg-slate-600'
                  }`}
                />
              </>
            ) : (
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-blue-500/20 to-pink-500/20 border border-pink-500/40 flex items-center justify-center text-lg">
                🎮
              </div>
            )}
          </div>

          <div className="min-w-0">
            <h4 className="text-xs sm:text-sm font-black text-white truncate flex items-center gap-1.5">
              <span>{hasPartner ? (otherPartner?.username || 'Duo Partner') : '1v1 Duo Chat Lobby'}</span>
              {roomData?.code && (
                <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-gradient-to-r from-blue-500/20 to-pink-500/20 text-pink-300 font-bold border border-pink-500/30">
                  {roomData.code}
                </span>
              )}
            </h4>
            <p className="text-[10px] font-mono truncate">
              {hasPartner ? (
                partnerTyping?.normal ? (
                  <span className="text-pink-400 font-bold animate-pulse">typing...</span>
                ) : otherPartner?.is_online ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Active now
                  </span>
                ) : (
                  <span className="text-slate-400">{formatLastSeen(otherPartner?.last_seen)}</span>
                )
              ) : (
                <span className="text-pink-400 font-bold">⚠️ Unpaired • Enter Room Code</span>
              )}
            </p>
          </div>
        </div>

        {/* Header Action Controls */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {currentTrack && (
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-850 border border-pink-500/30 text-pink-300 max-w-[160px]">
              <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-ping shrink-0" />
              <span className="text-[10px] font-bold truncate text-slate-200">{currentTrack.title}</span>
              <button onClick={togglePlay} className="p-0.5 rounded-lg text-pink-300 text-xs">
                {isPlaying ? '⏸' : '▶'}
              </button>
            </div>
          )}

          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="p-1.5 sm:p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-pink-300 border border-slate-700 transition-transform active:scale-95"
            title="Search chat"
          >
            <Search className="w-4 h-4" />
          </button>

          <button
            onClick={startAudioCall}
            disabled={!hasPartner}
            className="p-1.5 sm:p-2 rounded-xl bg-slate-800/80 hover:bg-blue-500/20 text-slate-300 hover:text-blue-400 border border-slate-700 transition-transform active:scale-95 disabled:opacity-40"
            title="Audio Call"
          >
            <Phone className="w-4 h-4" />
          </button>

          <button
            onClick={startVideoCall}
            disabled={!hasPartner}
            className="p-1.5 sm:p-2 rounded-xl bg-slate-800/80 hover:bg-pink-500/20 text-slate-300 hover:text-pink-400 border border-slate-700 transition-transform active:scale-95 disabled:opacity-40"
            title="HD Video Call"
          >
            <Video className="w-4 h-4" />
          </button>

          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1.5 sm:p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-52 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-2 z-50 animate-in fade-in space-y-1">
                <button
                  onClick={() => { setPartnerInfoOpen(true); setMenuOpen(false); }}
                  className="w-full px-3 py-2 rounded-xl text-left text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2"
                >
                  <UserPlus className="w-4 h-4 text-emerald-400" />
                  <span>Partner Profile & Room</span>
                </button>

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
                    onClick={() => { setClearChatConfirmOpen(true); setMenuOpen(false); }}
                    className="w-full px-3 py-2 rounded-xl text-left text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4 text-slate-400" />
                    <span>Clear Chat</span>
                  </button>
                )}

                {hasPartner && (
                  <button
                    onClick={() => { handlePanicClear(); setMenuOpen(false); }}
                    className="w-full px-3 py-2 rounded-xl text-left text-xs font-bold text-yellow-400 hover:bg-yellow-500/20 flex items-center gap-2"
                  >
                    <span>🚨</span>
                    <span>Emergency Stealth Wipe</span>
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
        <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex items-center gap-2 text-xs shrink-0 animate-in slide-in-from-top duration-150 z-10">
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
          >
            ▲
          </button>
          <button
            onClick={handleNextSearch}
            disabled={searchResults.length === 0}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30"
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

      {/* Pinned Messages Banner */}
      {pinnedList.length > 0 && (
        <div className="px-4 py-1.5 bg-emerald-950/80 border-b border-emerald-500/30 flex items-center justify-between gap-2 text-xs shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Pin className="w-3.5 h-3.5 text-emerald-400 shrink-0 fill-current" />
            <span className="text-emerald-300 font-bold text-[10px] shrink-0">PINNED:</span>
            <p className="text-slate-200 truncate text-[11px]">{pinnedList[0].text}</p>
          </div>
        </div>
      )}

      {/* 2. CHAT STREAM (Natural top-down scrollable flex-1 message stream) */}
      <div
        ref={chatScrollRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 overflow-y-auto p-2.5 sm:p-4 space-y-1.5 flex flex-col justify-start bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] relative"
      >
        {!hasPartner && (
          <div className="p-4 sm:p-6 rounded-3xl bg-slate-900/95 border-2 border-emerald-500/40 shadow-2xl space-y-4 max-w-lg w-full mx-auto my-auto animate-in fade-in shrink-0">
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
              <div className="space-y-3 py-1">
                <p className="text-xs text-slate-300 text-center font-medium">
                  Connect with your partner to unlock private 1v1 chat, HD calls, and shared music!
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <button
                    onClick={handleCreateRoom}
                    disabled={createLoading}
                    className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border-2 border-emerald-500/50 hover:border-emerald-400 text-left transition-all active:scale-95 group shadow-lg flex flex-col justify-between space-y-2"
                  >
                    <div className="w-9 h-9 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black text-base group-hover:scale-110 transition-transform">
                      ➕
                    </div>
                    <div>
                      <h3 className="text-xs sm:text-sm font-black text-white group-hover:text-emerald-300">CREATE ROOM</h3>
                      <p className="text-[10px] text-slate-400 mt-0.5">Host a new room & get a code</p>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400 font-bold">
                      {createLoading ? 'Generating Code...' : 'HOST NOW ⚡'}
                    </span>
                  </button>

                  <button
                    onClick={() => setLobbyMode('join')}
                    className="p-4 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/10 border-2 border-cyan-500/50 hover:border-cyan-400 text-left transition-all active:scale-95 group shadow-lg flex flex-col justify-between space-y-2"
                  >
                    <div className="w-9 h-9 rounded-xl bg-cyan-500 text-slate-950 flex items-center justify-center font-black text-base group-hover:scale-110 transition-transform">
                      🚀
                    </div>
                    <div>
                      <h3 className="text-xs sm:text-sm font-black text-white group-hover:text-cyan-300">JOIN ROOM</h3>
                      <p className="text-[10px] text-slate-400 mt-0.5">Enter code shared by friend</p>
                    </div>
                    <span className="text-[10px] font-mono text-cyan-400 font-bold">
                      ENTER CODE 🔑
                    </span>
                  </button>
                </div>
              </div>
            )}

            {lobbyMode === 'create' && (
              <div className="space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                    Your Room Code
                  </span>
                  <button
                    onClick={() => setLobbyMode('select')}
                    className="text-[10px] font-mono text-slate-400 hover:text-white underline"
                  >
                    ↩ Back
                  </button>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-emerald-500/40 text-center space-y-1">
                  <div className="text-3xl font-black font-mono tracking-widest text-emerald-400 py-1">
                    {roomData?.code || '---'}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleCopyCode}
                    className="py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-1.5"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedCode ? 'Copied! ✅' : 'Copy Code'}</span>
                  </button>
                  <button
                    onClick={handleCopyWhatsApp}
                    className="py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </button>
                </div>
              </div>
            )}

            {lobbyMode === 'join' && (
              <form onSubmit={handleJoinByCode} className="space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                    Enter Room Code
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
                    placeholder="e.g. 503 or DUO-123"
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                    className="flex-1 glass-input rounded-2xl px-3.5 py-2.5 text-xs font-mono tracking-wider text-emerald-300 uppercase placeholder:normal-case placeholder:text-slate-500"
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={joinLoading || !inputCode.trim()}
                    className="px-4 py-2.5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-black text-xs shrink-0 active:scale-95 shadow-md"
                  >
                    {joinLoading ? '...' : 'Connect'}
                  </button>
                </div>
                {joinError && <p className="text-xs text-red-400 font-bold px-1">{joinError}</p>}
              </form>
            )}
          </div>
        )}

        {/* Empty State when Paired but No Messages Yet */}
        {hasPartner && normalMessages.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-3 my-auto animate-in fade-in">
            <div className="w-14 h-14 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-2xl shadow-inner">
              💬
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-black text-white">Private Duo Room Ready</h3>
              <p className="text-[11px] text-slate-400 max-w-xs">
                Messages are synchronized in real-time. Start chatting or share a song!
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <button
                onClick={() => sendMessage({ text: '👋 Hey there! Connected on DuoCore.' })}
                className="px-3 py-1 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500/40 text-xs font-bold text-slate-300 hover:text-emerald-400 transition-all active:scale-95"
              >
                👋 Say Hi
              </button>
              <button
                onClick={() => {
                  if (currentTrack) {
                    sendMessage({ text: '🎵 Listening to this track:', metadata: { song: currentTrack } });
                  } else {
                    sendMessage({ text: '🎵 What music are you listening to?' });
                  }
                }}
                className="px-3 py-1 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500/40 text-xs font-bold text-slate-300 hover:text-emerald-400 transition-all active:scale-95"
              >
                🎵 Share Music
              </button>
            </div>
          </div>
        )}

        {/* Message Stream with Date Separators and WhatsApp-like Consecutive Grouping */}
        {normalMessages.map((msg, idx) => {
          const isMe = String(msg.sender_id) === String(user?.id);
          const showDateHeader = idx === 0 || formatMessageDate(normalMessages[idx - 1]?.created_at) !== formatMessageDate(msg.created_at);

          const prevMsg = normalMessages[idx - 1];
          const nextMsg = normalMessages[idx + 1];
          const isFirstInGroup = !prevMsg || String(prevMsg.sender_id) !== String(msg.sender_id) || showDateHeader;
          const isLastInGroup = !nextMsg || String(nextMsg.sender_id) !== String(msg.sender_id);

          let meta = {};
          if (msg.metadata) {
            if (typeof msg.metadata === 'object') meta = msg.metadata;
            else if (typeof msg.metadata === 'string') {
              try { meta = JSON.parse(msg.metadata); } catch (e) { meta = {}; }
            }
          }

          return (
            <React.Fragment key={msg.id || idx}>
              {/* Date Separator Pill */}
              {showDateHeader && msg.created_at && (
                <div className="flex items-center justify-center my-2 shrink-0">
                  <span className="px-3 py-0.5 rounded-full bg-slate-900/90 border border-slate-800 text-[9px] font-mono text-slate-400 font-bold uppercase tracking-wider shadow-sm">
                    {formatMessageDate(msg.created_at)}
                  </span>
                </div>
              )}

              <div
                id={`msg-${msg.id}`}
                className={`w-full flex items-end gap-1.5 group transition-all animate-in fade-in duration-100 ${isFirstInGroup ? 'mt-2.5' : 'mt-0.5'} ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                {/* Receiver Avatar (Only on last message of group) */}
                {!isMe && (
                  isLastInGroup ? (
                    <img
                      src={partnerAvatar}
                      alt={msg.username}
                      className="w-6 h-6 rounded-xl object-cover shrink-0 mb-0.5 ring-1 ring-slate-700"
                    />
                  ) : (
                    <div className="w-6 shrink-0" />
                  )
                )}

                {/* Context Action Menu for Sent Messages (appears on the left of my bubble) */}
                {isMe && (
                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 bg-slate-900/90 border border-slate-800 rounded-xl p-0.5 shadow-lg transition-opacity shrink-0">
                    <button onClick={() => setReplyTo(msg)} className="p-1 text-slate-400 hover:text-white" title="Reply">
                      <Reply className="w-3 h-3" />
                    </button>
                    <button onClick={() => handleToggleStar(msg)} className={`p-1 ${msg.is_starred ? 'text-yellow-400' : 'text-slate-400 hover:text-yellow-400'}`} title="Star">
                      <Star className="w-3 h-3" />
                    </button>
                    <button onClick={() => handleTogglePin(msg)} className={`p-1 ${msg.is_pinned ? 'text-emerald-400' : 'text-slate-400 hover:text-emerald-400'}`} title="Pin">
                      <Pin className="w-3 h-3" />
                    </button>
                    <button onClick={() => setDeleteMsgConfirmId(msg.id)} className="p-1 text-slate-400 hover:text-red-400" title="Delete message">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}

                <div
                  className={`max-w-[85%] sm:max-w-[70%] rounded-2xl p-2.5 sm:p-3 space-y-1 shadow-md relative text-left break-words ${
                    isMe
                      ? `${currentThemeObj.bubbleMe} text-white ${isLastInGroup ? 'rounded-br-xs' : 'rounded-br-2xl'}`
                      : `${currentThemeObj.bubbleOther} text-slate-100 border border-slate-800 ${isLastInGroup ? 'rounded-bl-xs' : 'rounded-bl-2xl'}`
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
                            el.classList.add('ring-2', 'ring-pink-400', 'scale-[1.02]');
                            setTimeout(() => el.classList.remove('ring-2', 'ring-pink-400', 'scale-[1.02]'), 1500);
                          }
                        }
                      }}
                      className="p-1.5 rounded-xl bg-black/35 border-l-3 border-pink-400 text-xs text-slate-200 mb-1 cursor-pointer hover:bg-black/50 transition-colors"
                    >
                      <span className="font-bold text-[9px] text-pink-300 block">
                        {msg.reply_to_username || msg.replyTo?.username || 'Partner'}
                      </span>
                      <p className="truncate text-[10px] text-slate-200">
                        {msg.reply_to_text || msg.replyTo?.text}
                      </p>
                    </div>
                  )}

                  {/* Song Card Preview */}
                  {meta?.song && (
                    <div className="p-2 rounded-xl bg-black/40 border border-pink-500/30 flex items-center justify-between gap-2 max-w-xs">
                      <img
                        src={meta.song.thumbnail || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=100'}
                        alt={meta.song.title}
                        className="w-10 h-10 rounded-lg object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-white truncate">{meta.song.title}</h4>
                        <p className="text-[10px] text-slate-400 truncate">{meta.song.artist}</p>
                      </div>
                      <button
                        onClick={() => {
                          playTrack(meta.song);
                          openNowPlaying();
                        }}
                        className="p-1.5 rounded-lg bg-gradient-to-r from-blue-500 to-pink-500 hover:from-blue-400 hover:to-pink-400 text-white font-bold shrink-0 transition-transform active:scale-95 shadow-md shadow-pink-500/20"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                      </button>
                    </div>
                  )}

                  {/* Image Attachment Preview */}
                  {meta?.fileUrl && meta?.fileType?.startsWith('image/') && (
                    <div className="relative rounded-xl overflow-hidden border border-white/10 my-1 max-w-sm">
                      <img
                        src={getMediaUrl(meta.fileUrl)}
                        alt="Shared image"
                        className="max-h-60 w-full object-cover cursor-pointer hover:opacity-95 transition-opacity"
                        onClick={() => setPreviewImageModal(getMediaUrl(meta.fileUrl))}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400';
                        }}
                      />
                    </div>
                  )}

                  {/* Video Attachment Preview */}
                  {meta?.fileUrl && meta?.fileType?.startsWith('video/') && (
                    <div className="rounded-xl overflow-hidden border border-white/10 my-1 max-w-sm">
                      <video
                        src={getMediaUrl(meta.fileUrl)}
                        controls
                        playsInline
                        className="max-h-60 w-full rounded-xl bg-black"
                      />
                    </div>
                  )}

                  {/* Audio Voice Note Player */}
                  {meta?.fileUrl && (meta?.fileType?.startsWith('audio/') || meta?.fileType === 'audio/webm') && (
                    <AudioMemoPlayer fileUrl={getMediaUrl(meta.fileUrl)} />
                  )}

                  {/* File Download */}
                  {meta?.fileUrl && !meta?.fileType?.startsWith('image/') && !meta?.fileType?.startsWith('audio/') && (
                    <a
                      href={getMediaUrl(meta.fileUrl)}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 rounded-xl bg-black/30 border border-white/10 flex items-center justify-between text-xs text-slate-200 hover:text-white mt-0.5"
                    >
                      <span className="truncate font-bold text-[11px]">{meta.fileName || '📎 Download File'}</span>
                      <ExternalLink className="w-3 h-3 text-cyan-400 shrink-0 ml-2" />
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
                          <MapPin className="w-3.5 h-3.5" />
                          <span>View Google Maps Pin</span>
                        </a>
                      ) : (
                        msg.text
                      )}
                    </p>
                  )}

                  {/* Timestamp & Real Ticks inside bubble */}
                  <div className="flex items-center justify-end gap-1 text-[9px] opacity-75 font-mono pt-0.5">
                    {msg.is_starred ? <Star className="w-2.5 h-2.5 text-yellow-300 fill-current" /> : null}
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

                {/* Context Action Menu for Received Messages (appears on the right of received bubble) */}
                {!isMe && (
                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 bg-slate-900/90 border border-slate-800 rounded-xl p-0.5 shadow-lg transition-opacity shrink-0">
                    <button onClick={() => setReplyTo(msg)} className="p-1 text-slate-400 hover:text-white" title="Reply">
                      <Reply className="w-3 h-3" />
                    </button>
                    <button onClick={() => handleToggleStar(msg)} className={`p-1 ${msg.is_starred ? 'text-yellow-400' : 'text-slate-400 hover:text-yellow-400'}`} title="Star">
                      <Star className="w-3 h-3" />
                    </button>
                    <button onClick={() => handleTogglePin(msg)} className={`p-1 ${msg.is_pinned ? 'text-emerald-400' : 'text-slate-400 hover:text-emerald-400'}`} title="Pin">
                      <Pin className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </React.Fragment>
          );
        })}
        {/* Real-time In-Stream Partner Typing Bubble (Left / Receiver side) */}
        {partnerTyping?.normal && (
          <div className="w-full flex items-end gap-1.5 justify-start animate-in fade-in slide-in-from-bottom-1 duration-150 my-1">
            <img
              src={partnerAvatar}
              alt={otherPartner?.username || 'Partner'}
              className="w-6 h-6 rounded-xl object-cover shrink-0 mb-0.5 ring-1 ring-slate-700"
            />
            <div className="px-3.5 py-2.5 rounded-2xl rounded-bl-xs bg-slate-900/90 border border-blue-500/25 shadow-sm text-slate-100 flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-pink-300 mr-1">{otherPartner?.username || 'Partner'} is typing</span>
              <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-bounce" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Floating Scroll-to-Bottom Button */}
      {showScrollBottom && (
        <button
          onClick={scrollToBottom}
          className="absolute right-3.5 bottom-16 z-30 p-2.5 rounded-full bg-gradient-to-r from-blue-500 to-pink-500 hover:from-blue-400 hover:to-pink-400 text-white shadow-xl shadow-pink-500/30 transition-all animate-in fade-in zoom-in-95 active:scale-90"
          title="Scroll to bottom"
        >
          <ChevronDown className="w-4 h-4 stroke-[3]" />
        </button>
      )}

      {/* Uploading Progress Toast */}
      {uploadingMedia && (
        <div className="px-4 py-1.5 bg-slate-900 border-t border-pink-500/30 flex items-center justify-center gap-2 text-xs font-bold text-pink-400 animate-pulse shrink-0">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>Uploading attachment...</span>
        </div>
      )}

      {/* Reply Preview Bar */}
      {replyTo && (
        <div className="px-3 py-1.5 bg-slate-900/95 border-t border-blue-500/20 flex items-center justify-between text-xs shrink-0 animate-in slide-in-from-bottom-2 z-10">
          <div className="flex items-center gap-2 min-w-0">
            <CornerDownRight className="w-3.5 h-3.5 text-pink-400 shrink-0" />
            <div className="min-w-0">
              <span className="font-bold text-pink-400 text-[9px]">{replyTo.username || 'Partner'}</span>
              <p className="text-slate-300 truncate text-[10px]">{replyTo.text}</p>
            </div>
          </div>
          <button onClick={() => setReplyTo(null)} className="p-1 text-slate-400 hover:text-pink-400">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 3. CLEAN BOTTOM COMPOSER (Organized single-row mobile layout) */}
      {hasPartner && (
        <div className="p-2 sm:p-2.5 bg-slate-900/95 border-t border-blue-500/20 flex items-center gap-1.5 sm:gap-2 shrink-0 z-30 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
          />

          <button
            type="button"
            onClick={() => setCameraModalOpen(true)}
            className="p-2 sm:p-2.5 rounded-full text-blue-400 hover:text-pink-400 hover:bg-blue-500/10 transition-transform active:scale-95 shrink-0"
            title="Take photo"
          >
            <Camera className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 sm:p-2.5 rounded-full text-blue-400 hover:text-pink-400 hover:bg-blue-500/10 transition-transform active:scale-95 shrink-0"
            title="Attach file"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          {isRecording ? (
            <div className="flex-1 flex items-center justify-between bg-red-950/60 border border-red-500/40 rounded-2xl px-3.5 py-1.5 animate-pulse min-w-0">
              <div className="flex items-center gap-2 text-red-400 font-mono text-xs font-bold truncate">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                <span>Recording: {recordingSeconds}s</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button onClick={cancelRecording} className="px-2 py-1 rounded-lg bg-slate-900 text-slate-400 text-xs font-bold">
                  Cancel
                </button>
                <button onClick={stopRecording} className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-blue-500 to-pink-500 text-white text-xs font-black">
                  Send 🎙️
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSendMessage} className="flex-1 flex items-center gap-1.5 min-w-0">
              <input
                type="text"
                placeholder="Type a message..."
                value={messageText}
                onChange={handleInputChange}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-full px-4 py-2 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-pink-500/60 focus:ring-1 focus:ring-blue-500/40 shadow-inner min-w-0"
              />

              {messageText.trim() ? (
                <button
                  type="submit"
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-r from-blue-500 to-pink-500 hover:from-blue-400 hover:to-pink-400 text-white flex items-center justify-center font-black transition-transform active:scale-90 shrink-0 shadow-md shadow-pink-500/30"
                  title="Send message"
                >
                  <Send className="w-4 h-4 fill-current ml-0.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startRecording}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-800 hover:bg-pink-500/20 text-slate-300 hover:text-pink-400 border border-slate-700 flex items-center justify-center transition-transform active:scale-90 shrink-0"
                  title="Record audio note"
                >
                  <Mic className="w-4 h-4" />
                </button>
              )}
            </form>
          )}
        </div>
      )}

      {/* Clear Chat Confirmation Modal */}
      {clearChatConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 animate-in fade-in select-none backdrop-blur-sm">
          <div className="w-full max-w-sm glass-panel p-6 rounded-3xl bg-slate-950 border border-slate-800 space-y-4 text-center shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center text-xl mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-black text-white">Clear this chat?</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                This will remove the conversation history from this private chat.
              </p>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                onClick={() => setClearChatConfirmOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmExecuteClearChat}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs transition-transform active:scale-95 shadow-lg shadow-red-600/30"
              >
                Clear Chat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Single Message Delete Confirmation */}
      {deleteMsgConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 animate-in fade-in select-none backdrop-blur-sm">
          <div className="w-full max-w-xs glass-panel p-5 rounded-3xl bg-slate-950 border border-slate-800 space-y-4 text-center shadow-2xl">
            <h4 className="text-sm font-black text-white">Delete message for everyone?</h4>
            <p className="text-xs text-slate-400">This message will be removed from both devices.</p>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setDeleteMsgConfirmId(null)}
                className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteSingleMessage}
                className="flex-1 py-2 rounded-xl bg-red-600 text-white font-black text-xs"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Partner Profile Modal */}
      {partnerInfoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 animate-in fade-in select-none backdrop-blur-md">
          <div className="w-full max-w-sm glass-panel p-6 rounded-3xl bg-slate-950/95 border border-emerald-500/40 shadow-2xl space-y-5 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setPartnerInfoOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-3 pt-2">
              <div className="relative w-20 h-20 mx-auto">
                <Avatar
                  src={otherPartner?.avatar_url}
                  name={otherPartner?.username || 'Partner'}
                  className="w-20 h-20 rounded-3xl ring-4 ring-emerald-500/40 shadow-xl"
                />
                <div
                  className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-slate-950 ${
                    otherPartner?.is_online ? 'bg-emerald-400 ring-2 ring-emerald-400/50' : 'bg-slate-600'
                  }`}
                />
              </div>

              <div>
                <h3 className="text-base sm:text-lg font-black text-white">{otherPartner?.username || 'Duo Partner'}</h3>
                <p className="text-xs text-emerald-400 font-mono font-bold">
                  {otherPartner?.is_online ? 'Active Now (Online)' : `Last seen ${formatLastSeen(otherPartner?.last_seen)}`}
                </p>
              </div>
            </div>

            {/* Room Info */}
            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 text-center">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block">
                PAIRED 1v1 ROOM CODE
              </span>
              <div className="text-2xl font-black font-mono text-emerald-400 tracking-wider">
                {roomData?.code || '---'}
              </div>
              <div className="flex gap-2 justify-center pt-1">
                <button
                  onClick={handleCopyCode}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 text-xs font-bold text-slate-200 hover:text-white flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedCode ? 'Copied!' : 'Copy'}</span>
                </button>
                <button
                  onClick={handleCopyWhatsApp}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600/30 text-emerald-300 text-xs font-bold hover:bg-emerald-600/50 flex items-center gap-1.5"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </button>
              </div>
            </div>

            {/* Call Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setPartnerInfoOpen(false);
                  startAudioCall();
                }}
                className="py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-md active:scale-95"
              >
                <Phone className="w-4 h-4" />
                <span>Audio Call</span>
              </button>

              <button
                onClick={() => {
                  setPartnerInfoOpen(false);
                  startVideoCall();
                }}
                className="py-2.5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-md active:scale-95"
              >
                <Video className="w-4 h-4" />
                <span>HD Video</span>
              </button>
            </div>

            {/* Quick Media & Starred Links */}
            <div className="space-y-1.5 pt-1">
              <button
                onClick={() => {
                  setPartnerInfoOpen(false);
                  handleOpenMediaGallery();
                }}
                className="w-full p-2.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-xs font-bold text-slate-300 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-cyan-400" />
                  <span>Shared Media, Links & Docs</span>
                </div>
                <span className="text-slate-500 text-xs">›</span>
              </button>

              <button
                onClick={() => {
                  setPartnerInfoOpen(false);
                  handleOpenStarred();
                }}
                className="w-full p-2.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-xs font-bold text-slate-300 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-400 fill-current" />
                  <span>Starred Messages</span>
                </div>
                <span className="text-slate-500 text-xs">›</span>
              </button>
            </div>

            {/* Clear Chat & Emergency Actions */}
            <div className="flex flex-col gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => {
                  setPartnerInfoOpen(false);
                  setClearChatConfirmOpen(true);
                }}
                className="w-full py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs font-bold flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4 text-slate-400" />
                <span>Clear Chat History</span>
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setPartnerInfoOpen(false);
                    handlePanicClear();
                  }}
                  className="flex-1 py-2 rounded-xl bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 text-xs font-bold hover:bg-yellow-500/20"
                >
                  🚨 Stealth Wipe
                </button>

                <button
                  onClick={() => {
                    setPartnerInfoOpen(false);
                    handleUnpair();
                  }}
                  className="flex-1 py-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/30 text-xs font-bold hover:bg-red-500/20"
                >
                  Disconnect
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Image Preview */}
      {previewImageModal && (
        <div
          onClick={() => setPreviewImageModal(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 animate-in fade-in cursor-pointer backdrop-blur-md"
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-3xl border border-slate-800 shadow-2xl">
            <img src={previewImageModal} alt="Enlarged view" className="w-full h-full object-contain" />
            <button
              onClick={() => setPreviewImageModal(null)}
              className="absolute top-3 right-3 p-2 rounded-full bg-slate-950/80 text-white hover:bg-slate-900 border border-slate-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Modals for Camera, Theme & Media */}

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

      {/* Theme Picker Modal */}
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
                        src={getMediaUrl(p.url)}
                        alt="Photo"
                        className="aspect-square object-cover rounded-xl cursor-pointer hover:scale-105 transition-transform"
                        onClick={() => setPreviewImageModal(getMediaUrl(p.url))}
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
                      href={getMediaUrl(d.url)}
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
    </div>
  );
}
