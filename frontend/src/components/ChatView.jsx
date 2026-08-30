import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRoom } from '../context/RoomContext';
import { useMusic } from '../context/MusicContext';
import { getSocket } from '../services/socket';
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
  UserPlus
} from 'lucide-react';
import { playSound } from '../utils/soundEffects';

const CHAT_THEMES = [
  { id: 'default', name: 'Emerald Wave (Default)', bg: 'bg-slate-950/95', bubbleMe: 'bg-emerald-600', bubbleOther: 'bg-slate-900' },
  { id: 'amoled', name: 'Pure AMOLED Black', bg: 'bg-black', bubbleMe: 'bg-slate-800', bubbleOther: 'bg-zinc-900' },
  { id: 'neon', name: 'Neon Cyber Glow', bg: 'bg-slate-950', bubbleMe: 'bg-pink-600', bubbleOther: 'bg-slate-900' },
  { id: 'minimal', name: 'Minimal Slate', bg: 'bg-slate-900', bubbleMe: 'bg-cyan-600', bubbleOther: 'bg-slate-800' }
];

// WhatsApp Style Voice Note Player
function AudioMemoPlayer({ fileUrl }) {
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
        <div className="flex justify-between text-[10px] font-mono text-slate-400">
          <span>{formatSecs(currentTime)}</span>
          <span>{formatSecs(duration)}</span>
        </div>
      </div>
    </div>
  );
}

export function ChatView({ onOpenInvite, onBack }) {
  const { user } = useAuth();
  const {
    roomData,
    members,
    partner,
    normalMessages,
    sendMessage,
    partnerTyping,
    sendTyping,
    refreshPartnerState
  } = useRoom();

  const { playTrack, openNowPlaying } = useMusic();

  const otherPartner = partner || (members && members.find((m) => m && m.id !== user?.id)) || {
    id: 'partner-default',
    username: 'Duo Partner',
    is_online: false,
    last_seen: null
  };

  const [messageText, setMessageText] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [cameraModalOpen, setCameraModalOpen] = useState(false);

  // Search in Chat
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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

  // Auto Scroll to Bottom on New Message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [normalMessages, partnerTyping]);

  // Load Pinned & Starred Messages on Mount
  useEffect(() => {
    if (roomData?.id) {
      api.getPinnedMessages(roomData.id)
        .then((res) => setPinnedList(res.pinned || []))
        .catch(() => {});
    }
  }, [roomData?.id]);

  // Handle Typing Indicator
  const handleTextChange = (e) => {
    setMessageText(e.target.value);
    sendTyping('normal', true);
  };

  // Send Message
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
    sendTyping('normal', false);
    playSound('send');
  };

  // Send Location
  const executeSendLocation = () => {
    setLocationConfirmOpen(false);
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        sendMessage({
          text: `📍 Shared Live Location: https://www.google.com/maps?q=${latitude},${longitude}`,
          channel: 'normal'
        });
        playSound('send');
      },
      () => alert('Unable to retrieve location.')
    );
  };

  // Send Camera / File Upload
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.uploadFile(formData);
      sendMessage({
        text: file.type.startsWith('image/') ? '📷 Photo' : '📎 Attachment',
        channel: 'normal',
        fileUrl: res.fileUrl,
        fileType: file.type
      });
      playSound('send');
    } catch (err) {
      alert('Failed to upload file.');
    }
  };

  // Send Voice Note
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
          const res = await api.uploadFile(formData);
          sendMessage({
            text: '🎤 Voice Note',
            channel: 'normal',
            fileUrl: res.fileUrl,
            fileType: 'audio/webm'
          });
          playSound('send');
        } catch (err) {
          console.warn('Voice upload failed:', err);
        }
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => setRecordingSeconds((s) => s + 1), 1000);
    } catch (err) {
      alert('Microphone access denied.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  // Star / Pin Actions
  const handleToggleStar = async (msg) => {
    if (!roomData?.id) return;
    try {
      if (msg.is_starred) {
        await api.unstarMessage(roomData.id, msg.id);
      } else {
        await api.starMessage(roomData.id, msg.id);
      }
      refreshPartnerState();
    } catch {}
  };

  const handleTogglePin = async (msg) => {
    if (!roomData?.id) return;
    try {
      if (msg.is_pinned) {
        await api.unpinMessage(roomData.id, msg.id);
      } else {
        await api.pinMessage(roomData.id, msg.id);
      }
      refreshPartnerState();
      api.getPinnedMessages(roomData.id).then((res) => setPinnedList(res.pinned || []));
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

  // Open Starred Messages
  const handleOpenStarred = async () => {
    if (!roomData?.id) return;
    try {
      const res = await api.getStarredMessages(roomData.id);
      setStarredList(res.starred || []);
      setStarredOpen(true);
    } catch {}
  };

  // Filter messages based on chat search query
  const displayedMessages = useMemo(() => {
    if (!searchQuery.trim()) return normalMessages;
    return normalMessages.filter((m) =>
      m.text?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.username?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [normalMessages, searchQuery]);

  // Unpair / Disconnect from Partner
  const handleUnpair = async () => {
    if (window.confirm('Are you sure you want to disconnect from this Duo room?')) {
      try {
        await api.leaveRoom(roomData?.id);
        await refreshPartnerState();
        playSound('quiz_wrong');
      } catch (err) {
        await refreshPartnerState();
      }
    }
  };

  const currentThemeObj = CHAT_THEMES.find((t) => t.id === chatTheme) || CHAT_THEMES[0];
  const isPartnerTyping = partnerTyping?.normal;
  const partnerAvatar = otherPartner?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(otherPartner?.username || 'partner')}`;

  return (
    <div className={`h-full w-full flex flex-col ${currentThemeObj.bg} rounded-3xl border border-emerald-500/30 overflow-hidden shadow-2xl relative select-none`}>
      {/* ========================================================================= */}
      {/* 1. WHATSAPP STYLE 1v1 HEADER                                              */}
      {/* ========================================================================= */}
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
            <img
              src={partnerAvatar}
              alt={otherPartner.username}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl object-cover ring-2 ring-emerald-500/40"
            />
            <div
              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-950 ${
                otherPartner.is_online ? 'bg-emerald-400' : 'bg-slate-600'
              }`}
            />
          </div>

          <div className="min-w-0">
            <h4 className="text-sm sm:text-base font-black text-white truncate flex items-center gap-2">
              <span>{otherPartner.username}</span>
            </h4>
            <p className="text-[11px] font-mono truncate">
              {isPartnerTyping ? (
                <span className="text-emerald-400 font-bold animate-pulse">typing...</span>
              ) : otherPartner.is_online ? (
                <span className="text-emerald-400 font-medium">Online</span>
              ) : (
                <span className="text-slate-400">{formatLastSeen(otherPartner.last_seen)}</span>
              )}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-transform active:scale-95"
            title="Search inside Chat"
          >
            <Search className="w-4 h-4" />
          </button>

          <button
            onClick={() => setAudioCallOpen(true)}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-400 border border-slate-700 transition-transform active:scale-95"
            title="Start Audio Call"
          >
            <Phone className="w-4 h-4" />
          </button>

          <button
            onClick={() => setVideoCallOpen(true)}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-400 border border-slate-700 transition-transform active:scale-95"
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
                  <Star className="w-4 h-4 text-yellow-400" />
                  <span>Starred Messages</span>
                </button>

                <button
                  onClick={() => { setThemePickerOpen(true); setMenuOpen(false); }}
                  className="w-full px-3 py-2 rounded-xl text-left text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2"
                >
                  <Palette className="w-4 h-4 text-emerald-400" />
                  <span>Chat Theme</span>
                </button>

                <button
                  onClick={() => {
                    navigator.clipboard.writeText(roomData?.code || '');
                    alert(`Room Code ${roomData?.code} copied!`);
                    setMenuOpen(false);
                  }}
                  className="w-full px-3 py-2 rounded-xl text-left text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2"
                >
                  <Copy className="w-4 h-4 text-emerald-400" />
                  <span>Copy Duo Code</span>
                </button>

                <div className="h-px bg-slate-800 my-1" />

                <button
                  onClick={() => {
                    setMenuOpen(false);
                    handleUnpair();
                  }}
                  className="w-full px-3 py-2 rounded-xl text-left text-xs font-bold text-red-400 hover:bg-red-950/40 flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Disconnect / Unpair</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Inline Search Bar */}
      {searchOpen && (
        <div className="p-2.5 bg-slate-900 border-b border-slate-800 flex items-center gap-2 animate-in slide-in-from-top-2">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search messages by text or sender..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-xs text-white placeholder:text-slate-500 focus:outline-none"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="p-1 text-slate-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button onClick={() => { setSearchOpen(false); setSearchQuery(''); }} className="text-xs text-emerald-400 font-bold px-1">
            Done
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

      {/* ========================================================================= */}
      {/* 2. CHAT MESSAGE STREAM                                                    */}
      {/* ========================================================================= */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]">
        {displayedMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 space-y-2 select-none">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-2xl text-emerald-400">
              💬
            </div>
            <h4 className="text-sm font-bold text-slate-300">Connected with {otherPartner.username}</h4>
            <p className="text-xs text-slate-500 max-w-xs">
              Say hello! Send text messages, voice notes, photos, or start a call.
            </p>
          </div>
        ) : (
          displayedMessages.map((msg, idx) => {
            const isMe = msg.sender_id === user?.id;

            let meta = {};
            if (msg.metadata) {
              if (typeof msg.metadata === 'object') {
                meta = msg.metadata;
              } else if (typeof msg.metadata === 'string') {
                try { meta = JSON.parse(msg.metadata); } catch (e) { meta = {}; }
              }
            }

            return (
              <div
                key={msg.id || idx}
                className={`flex items-end gap-2 group ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                {!isMe && (
                  <img
                    src={partnerAvatar}
                    alt={msg.username}
                    className="w-7 h-7 rounded-xl object-cover shrink-0 mb-1"
                  />
                )}

                <div
                  className={`max-w-[85%] sm:max-w-[70%] rounded-2xl p-3 sm:p-3.5 space-y-1.5 shadow-lg relative ${
                    isMe
                      ? `${currentThemeObj.bubbleMe} text-white rounded-br-none`
                      : `${currentThemeObj.bubbleOther} text-slate-100 border border-slate-800 rounded-bl-none`
                  }`}
                >
                  {/* Reply Quote Preview */}
                  {msg.replyTo && (
                    <div className="p-2 rounded-xl bg-black/20 border-l-2 border-emerald-300 text-xs text-slate-200 mb-1">
                      <span className="font-bold text-[10px] block opacity-80">{msg.replyTo.username}</span>
                      <p className="truncate text-[11px]">{msg.replyTo.text}</p>
                    </div>
                  )}

                  {/* 🎵 SHARED MUSIC CARD (Music ↔ Duo Integration) */}
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
                            SOUNDWAVE TRACK
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
                        <span>Play on SoundWave</span>
                      </button>
                    </div>
                  )}

                  {/* Photo / Image */}
                  {msg.fileUrl && msg.fileType?.startsWith('image/') && (
                    <div className="rounded-xl overflow-hidden max-h-72">
                      <img
                        src={msg.fileUrl}
                        alt="Photo"
                        className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                        onClick={() => window.open(msg.fileUrl, '_blank')}
                      />
                    </div>
                  )}

                  {/* Voice Note Player */}
                  {msg.fileUrl && msg.fileType?.startsWith('audio/') && (
                    <AudioMemoPlayer fileUrl={msg.fileUrl} />
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

                  {/* Timestamp & WhatsApp Blue Ticks & Star indicator */}
                  <div className="flex items-center justify-end gap-1 text-[10px] opacity-75 font-mono pt-0.5">
                    {msg.is_starred ? <Star className="w-3 h-3 text-yellow-300 fill-current" /> : null}
                    <span>
                      {msg.created_at
                        ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : ''}
                    </span>
                    {isMe && (
                      <span title={msg.status === 'read' ? 'Read' : 'Delivered'}>
                        {msg.status === 'read' ? (
                          <CheckCheck className="w-3.5 h-3.5 text-cyan-200 stroke-[2.5]" />
                        ) : (
                          <CheckCheck className="w-3.5 h-3.5 text-white/80" />
                        )}
                      </span>
                    )}
                  </div>
                </div>

                {/* Context Hover Actions (Reply, Star, Pin, Delete) */}
                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 bg-slate-900 border border-slate-800 rounded-xl p-1 shadow-lg transition-opacity shrink-0">
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
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply Preview Bar */}
      {replyTo && (
        <div className="px-4 py-2 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <CornerDownRight className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="min-w-0">
              <span className="font-bold text-emerald-400 text-[10px]">{replyTo.username}</span>
              <p className="text-slate-300 truncate text-[11px]">{replyTo.text}</p>
            </div>
          </div>
          <button onClick={() => setReplyTo(null)} className="p-1 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. WHATSAPP BOTTOM COMPOSER                                               */}
      {/* ========================================================================= */}
      <div className="p-2 sm:p-3 bg-slate-900/90 border-t border-slate-800 flex items-center gap-2 shrink-0">
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
          className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-400 transition-all active:scale-95 shrink-0"
          title="Share Location"
        >
          <MapPin className="w-4 h-4" />
        </button>

        <form onSubmit={handleSendMessage} className="flex-1 flex items-center gap-2">
          <input
            type="text"
            placeholder={isRecording ? `Recording... (${recordingSeconds}s)` : "Type a message..."}
            disabled={isRecording}
            value={messageText}
            onChange={handleTextChange}
            className="w-full glass-input rounded-2xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none border border-slate-800 focus:border-emerald-500/50"
          />

          {messageText.trim() ? (
            <button
              type="submit"
              className="p-2.5 sm:px-4 sm:py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/30 transition-transform active:scale-95 shrink-0"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Send</span>
            </button>
          ) : (
            <button
              type="button"
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              onTouchStart={startRecording}
              onTouchEnd={stopRecording}
              className={`p-2.5 rounded-2xl font-bold transition-all shrink-0 active:scale-95 ${
                isRecording
                  ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/50'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-emerald-400'
              }`}
              title="Hold to Record Voice Note"
            >
              <Mic className="w-4 h-4" />
            </button>
          )}
        </form>
      </div>

      {/* Location Sharing Confirmation Modal */}
      {locationConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-xs glass-panel p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mx-auto text-xl">
              📍
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Share Live Location?</h4>
              <p className="text-xs text-slate-400 mt-1">
                Your current GPS coordinates will be sent as a secure Google Maps link to your partner.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setLocationConfirmOpen(false)}
                className="flex-1 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400"
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
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 flex-1">
              <div>
                <span className="text-[10px] font-mono text-slate-500 uppercase font-bold block mb-2">PHOTOS & IMAGES ({mediaData.photos.length})</span>
                {mediaData.photos.length === 0 ? (
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
                <span className="text-[10px] font-mono text-slate-500 uppercase font-bold block mb-2">DOCUMENTS ({mediaData.documents.length})</span>
                {mediaData.documents.map((d) => (
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
                ))}
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
          partnerId={otherPartner.id}
          partnerName={otherPartner.username}
        />
      )}

      {audioCallOpen && (
        <AudioCallModal
          isOpen={audioCallOpen}
          onClose={() => setAudioCallOpen(false)}
          partnerId={otherPartner.id}
          partnerName={otherPartner.username}
        />
      )}

      {incomingCall && (
        <IncomingCallModal
          callData={incomingCall}
          onAccept={() => {
            if (incomingCall.type === 'video') setVideoCallOpen(true);
            else setAudioCallOpen(true);
            setIncomingCall(null);
          }}
          onReject={() => setIncomingCall(null)}
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
              const res = await api.uploadFile(formData);
              sendMessage({
                text: '📷 Live Camera Photo',
                channel: 'normal',
                fileUrl: res.fileUrl,
                fileType: 'image/jpeg'
              });
              playSound('send');
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
