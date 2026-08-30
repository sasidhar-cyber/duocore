import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRoom } from '../context/RoomContext';
import { getSocket } from '../services/socket';
import { getHackerRank } from '../utils/hackerTitles';
import { VideoCallModal } from './VideoCallModal';
import { IncomingCallModal } from './IncomingCallModal';
import api from '../services/api';
import {
  Send,
  Reply,
  Shield,
  Lock,
  Unlock,
  MessageSquare,
  Sparkles,
  Paperclip,
  Image as ImageIcon,
  FileText,
  Video as VideoIcon,
  MapPin,
  Download,
  ExternalLink,
  X,
  UserPlus,
  ArrowLeft,
  Mic,
  Search,
  Users,
  Swords,
  Radio,
  Clock,
  Video,
  Phone,
  CheckCheck,
  Bell
} from 'lucide-react';
import { playSound } from '../utils/soundEffects';

const QUICK_EMOJIS = ['🔥', '🛡️', '⚡', '💯', '🧠', '🐧'];

// Audio Memo Custom Player
function AudioMemoPlayer({ fileUrl, duration }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
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
    <div className="p-3 rounded-2xl bg-black/40 border border-white/10 flex items-center gap-3 w-64 max-w-full">
      <audio
        ref={audioRef}
        src={fileUrl}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
        onEnded={() => { setIsPlaying(false); setCurrentTime(0); }}
      />
      <button
        onClick={togglePlay}
        type="button"
        className="w-9 h-9 rounded-xl bg-pink-600 hover:bg-pink-500 text-white flex items-center justify-center shadow-md shrink-0 transition-transform active:scale-95"
      >
        {isPlaying ? <span className="font-bold">⏸</span> : <span className="font-bold text-xs pl-0.5">▶</span>}
      </button>

      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-1 h-4">
          {[40, 70, 30, 90, 60, 100, 45, 80, 50, 95, 30, 60].map((h, i) => (
            <div
              key={i}
              className={`w-1 rounded-full transition-all ${
                isPlaying ? 'bg-pink-400 animate-pulse' : 'bg-slate-600'
              }`}
              style={{ height: `${isPlaying ? Math.max(20, (h * Math.random()).toFixed(0)) : h}%` }}
            />
          ))}
        </div>
        <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
          <span>{formatSecs(currentTime)}</span>
          <span>Voice Memo</span>
        </div>
      </div>
    </div>
  );
}

export function ChatView({ onOpenInvite }) {
  const { user } = useAuth();
  const {
    hasRoom,
    members,
    partner,
    roomData,
    sendTyping,
    reactToMessage
  } = useRoom();

  const [input, setInput] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Friend in WhatsApp style list
  const otherMembers = useMemo(() => members.filter((m) => m.id !== user?.id), [members, user?.id]);
  const [selectedFriend, setSelectedFriend] = useState(null);

  // Unread badge counts map: userId -> count
  const [unreadCounts, setUnreadCounts] = useState({});

  // Typing status map: userId -> boolean
  const [typingMap, setTypingMap] = useState({});

  // In-App Toast Notification
  const [toastNotification, setToastNotification] = useState(null);

  // Video Call State
  const [videoCallOpen, setVideoCallOpen] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null); // { caller, callType, roomId }

  // Mode: 'direct' (standard 1v1 WhatsApp chat) or 'vault' (PIN-protected 1v1 vault)
  const [chatMode, setChatMode] = useState('direct');
  const [messages, setMessages] = useState([]);

  // Vault Unlock State
  const [isPrivateUnlocked, setIsPrivateUnlocked] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [showPinSetting, setShowPinSetting] = useState(false);
  const [customPinInput, setCustomPinInput] = useState('');

  // Media attachment states
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [lightboxImage, setLightboxImage] = useState(null);

  // Voice Note Recording
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);

  const fileInputRef = useRef(null);
  const [fileInputAccept, setFileInputAccept] = useState('*');
  const [pendingUploadType, setPendingUploadType] = useState('file');

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const savedPin = localStorage.getItem('duocore_vault_pin') || '1234';

  // Auto-select first friend if none selected
  useEffect(() => {
    if (!selectedFriend && otherMembers.length > 0) {
      setSelectedFriend(otherMembers[0]);
    }
  }, [otherMembers, selectedFriend]);

  // Compute active channel ID for current friend & mode
  const currentChannelId = useMemo(() => {
    if (!selectedFriend || !user) return 'normal';
    const ids = [user.id, selectedFriend.id].sort();
    return chatMode === 'vault' ? `private:${ids[0]}:${ids[1]}` : `dm:${ids[0]}:${ids[1]}`;
  }, [selectedFriend, user, chatMode]);

  // Fetch message history for active conversation
  const loadActiveMessages = useCallback(async () => {
    if (!roomData || !currentChannelId) return;
    try {
      const res = await api.getRoomMessages(roomData.id, currentChannelId);
      setMessages(res.messages || []);
    } catch (err) {
      console.error('[ChatView] Failed to load messages:', err);
    }
  }, [currentChannelId, roomData]);

  useEffect(() => {
    loadActiveMessages();
  }, [loadActiveMessages]);

  // Real-time socket message & call listeners
  useEffect(() => {
    const s = getSocket();
    if (!s) return;

    // 1. Incoming Message Handler
    const handleNewMessage = (msg) => {
      if (msg.room_id === roomData?.id) {
        if (msg.channel_type === currentChannelId) {
          // If active chat is open, append directly
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        } else if (msg.sender_id !== user?.id) {
          // Inactive chat: increment unread badge counter
          setUnreadCounts((prev) => ({
            ...prev,
            [msg.sender_id]: (prev[msg.sender_id] || 0) + 1
          }));

          // Show floating in-app notification toast
          setToastNotification({
            senderId: msg.sender_id,
            username: msg.username,
            avatar_url: msg.avatar_url,
            text: msg.text || (msg.type === 'audio' ? '🎤 Voice Note' : '📷 Media attachment'),
            channel: msg.channel_type
          });

          // Auto-hide toast after 4.5s
          setTimeout(() => {
            setToastNotification(null);
          }, 4500);
        }

        if (msg.sender_id !== user?.id) {
          playSound('message');
        }
      }
    };

    // 2. Typing indicator listener
    const handleTypingEvent = ({ channel, isTyping: partnerIsTyping, userId }) => {
      setTypingMap((prev) => ({
        ...prev,
        [userId]: partnerIsTyping
      }));
    };

    // 3. Incoming Call Ringing listener
    const handleIncomingCall = (data) => {
      setIncomingCall(data);
      playSound('message');
    };

    // 4. Call Declined listener
    const handleCallDeclined = ({ username }) => {
      alert(`${username || 'User'} declined the call.`);
      setVideoCallOpen(false);
    };

    s.on('chat:new_message', handleNewMessage);
    s.on('chat:partner_typing', handleTypingEvent);
    s.on('call:incoming_ring', handleIncomingCall);
    s.on('call:declined', handleCallDeclined);

    return () => {
      s.off('chat:new_message', handleNewMessage);
      s.off('chat:partner_typing', handleTypingEvent);
      s.off('call:incoming_ring', handleIncomingCall);
      s.off('call:declined', handleCallDeclined);
    };
  }, [roomData?.id, currentChannelId, user?.id, selectedFriend?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isPrivateUnlocked, selectedFriend, chatMode, typingMap]);

  const handleSelectFriend = (friend) => {
    setSelectedFriend(friend);
    setChatMode('direct');
    setIsPrivateUnlocked(false);

    // Clear unread count for this friend
    setUnreadCounts((prev) => ({
      ...prev,
      [friend.id]: 0
    }));

    playSound('click');
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    const s = getSocket();
    if (s && roomData) {
      s.emit('chat:typing', { roomId: roomData.id, channel: currentChannelId, isTyping: true });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      if (s && roomData) {
        s.emit('chat:typing', { roomId: roomData.id, channel: currentChannelId, isTyping: false });
      }
    }, 1500);
  };

  // Start Outbound Video or Audio Call
  const handleStartCall = (callType = 'video') => {
    if (!selectedFriend || !roomData) return;
    const s = getSocket();
    if (s) {
      s.emit('call:start_call', {
        targetUserId: selectedFriend.id,
        roomId: roomData.id,
        callType
      });
    }
    setVideoCallOpen(true);
    playSound('click');
  };

  // Accept Incoming Call
  const handleAcceptIncomingCall = () => {
    const call = incomingCall;
    setIncomingCall(null);
    if (call) {
      const friend = otherMembers.find((m) => m.id === call.caller.id);
      if (friend) setSelectedFriend(friend);
      setVideoCallOpen(true);
      playSound('quiz_correct');
    }
  };

  // Decline Incoming Call
  const handleDeclineIncomingCall = () => {
    const call = incomingCall;
    setIncomingCall(null);
    const s = getSocket();
    if (s && call) {
      s.emit('call:decline_call', {
        callerSocketId: call.caller.socketId,
        targetUserId: call.caller.id,
        roomId: call.roomId
      });
    }
    playSound('quiz_wrong');
  };

  // Robust Message Sender with Socket + HTTP Fallback
  const handleSend = async (e) => {
    if (e) e.preventDefault();
    const cleanText = input.trim();
    if (!cleanText || !roomData || !selectedFriend) return;

    setInput('');
    const rep = replyTo;
    setReplyTo(null);

    const s = getSocket();
    if (s && roomData) {
      s.emit('chat:typing', { roomId: roomData.id, channel: currentChannelId, isTyping: false });
    }
    playSound('click');

    try {
      if (s && s.connected) {
        s.emit('chat:send_message', {
          roomId: roomData.id,
          text: cleanText,
          channel: currentChannelId,
          metadata: {},
          replyToId: rep?.id || null
        });
      } else {
        const res = await api.sendRoomMessage(roomData.id, {
          text: cleanText,
          channel: currentChannelId,
          replyToId: rep?.id || null,
          metadata: {}
        });
        if (res.data) {
          setMessages((prev) => [...prev, res.data]);
        }
      }
    } catch (err) {
      alert('Failed to send message: ' + err.message);
    }
  };

  // Voice Note Recording
  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (audioBlob.size > 100) {
          uploadAndSendVoiceNote(audioBlob);
        }
      };

      mediaRecorder.start();
      setIsRecordingVoice(true);
      setRecordingSeconds(0);
      playSound('click');

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      alert('Microphone access is needed for recording voice notes: ' + err.message);
    }
  };

  const stopAndSendVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecordingVoice) {
      mediaRecorderRef.current.stop();
      setIsRecordingVoice(false);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    }
  };

  const cancelVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecordingVoice) {
      audioChunksRef.current = [];
      mediaRecorderRef.current.stop();
      setIsRecordingVoice(false);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      playSound('click');
    }
  };

  const uploadAndSendVoiceNote = async (audioBlob) => {
    if (!roomData) return;
    setUploading(true);
    setUploadProgress('Sending Voice Note...');

    try {
      const formData = new FormData();
      formData.append('file', audioBlob, `voice-note-${Date.now()}.webm`);

      const uploadRes = await api.uploadFile(roomData.id, formData);
      playSound('quiz_correct');

      const s = getSocket();
      const meta = {
        fileUrl: uploadRes.fileUrl,
        fileName: uploadRes.fileName,
        duration: recordingSeconds,
        mimeType: 'audio/webm'
      };

      if (s && s.connected) {
        s.emit('chat:send_message', {
          roomId: roomData.id,
          text: '🎤 Voice Note',
          type: 'audio',
          channel: currentChannelId,
          metadata: meta,
          replyToId: replyTo?.id || null
        });
      } else {
        const res = await api.sendRoomMessage(roomData.id, {
          text: '🎤 Voice Note',
          type: 'audio',
          channel: currentChannelId,
          metadata: meta,
          replyToId: replyTo?.id || null
        });
        if (res.data) setMessages((prev) => [...prev, res.data]);
      }
    } catch (err) {
      alert('Failed to send voice note: ' + err.message);
    } finally {
      setUploading(false);
      setUploadProgress('');
    }
  };

  const triggerFileUpload = (acceptType, category) => {
    setFileInputAccept(acceptType);
    setPendingUploadType(category);
    setAttachmentMenuOpen(false);
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 100);
  };

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !roomData) return;

    setUploading(true);
    setUploadProgress(`Uploading ${file.name}...`);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const uploadRes = await api.uploadFile(roomData.id, formData);
      playSound('quiz_correct');

      const s = getSocket();
      const meta = {
        fileUrl: uploadRes.fileUrl,
        fileName: uploadRes.fileName,
        fileSize: uploadRes.fileSize,
        mimeType: uploadRes.mimeType
      };

      const msgText = input.trim() || `Shared a ${uploadRes.type}: ${uploadRes.fileName}`;

      if (s && s.connected) {
        s.emit('chat:send_message', {
          roomId: roomData.id,
          text: msgText,
          type: uploadRes.type,
          channel: currentChannelId,
          metadata: meta,
          replyToId: replyTo?.id || null
        });
      } else {
        const res = await api.sendRoomMessage(roomData.id, {
          text: msgText,
          type: uploadRes.type,
          channel: currentChannelId,
          metadata: meta,
          replyToId: replyTo?.id || null
        });
        if (res.data) setMessages((prev) => [...prev, res.data]);
      }

      setInput('');
      setReplyTo(null);
    } catch (err) {
      alert('Upload failed: ' + (err.message || 'File too large'));
      playSound('quiz_wrong');
    } finally {
      setUploading(false);
      setUploadProgress('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleShareLiveLocation = () => {
    setAttachmentMenuOpen(false);
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setUploading(true);
    setUploadProgress('Detecting GPS location...');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUploading(false);
        setUploadProgress('');

        const meta = {
          latitude,
          longitude,
          address: `Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`
        };

        const s = getSocket();
        if (s && s.connected) {
          s.emit('chat:send_message', {
            roomId: roomData.id,
            text: input.trim() || '📍 Shared Live Location',
            channel: currentChannelId,
            metadata: meta,
            replyToId: replyTo?.id || null
          });
        }
        setInput('');
        setReplyTo(null);
        playSound('quiz_correct');
      },
      (err) => {
        setUploading(false);
        setUploadProgress('');
        const meta = {
          latitude: 17.3850,
          longitude: 78.4867,
          address: 'Cyber Security Lab, Hyderabad'
        };
        const s = getSocket();
        if (s && s.connected) {
          s.emit('chat:send_message', {
            roomId: roomData.id,
            text: input.trim() || '📍 Shared Location: Cyber Security Lab',
            channel: currentChannelId,
            metadata: meta,
            replyToId: replyTo?.id || null
          });
        }
        setInput('');
        setReplyTo(null);
        playSound('quiz_correct');
      },
      { timeout: 10000 }
    );
  };

  // Open Vault from Attachment Menu (Placed last next to Location)
  const handleOpenVaultFromMenu = () => {
    setAttachmentMenuOpen(false);
    setChatMode('vault');
    playSound('click');
  };

  const handleUnlockVault = (e) => {
    e.preventDefault();
    setPinError('');

    if (enteredPin === savedPin) {
      setIsPrivateUnlocked(true);
      setEnteredPin('');
      playSound('quiz_correct');
    } else {
      setPinError('Incorrect Passkey PIN. Try again.');
      playSound('quiz_wrong');
      setEnteredPin('');
    }
  };

  const handleSaveCustomPin = (e) => {
    e.preventDefault();
    if (customPinInput.length < 4) {
      setPinError('PIN must be at least 4 digits.');
      return;
    }
    localStorage.setItem('duocore_vault_pin', customPinInput);
    setShowPinSetting(false);
    setCustomPinInput('');
    playSound('quiz_correct');
  };

  const selectedRank = selectedFriend ? getHackerRank(selectedFriend.level || 1, selectedFriend.xp || 0) : null;
  const isSelectedFriendTyping = selectedFriend && typingMap[selectedFriend.id];

  return (
    <div className="flex h-full glass-panel rounded-3xl border border-slate-800 shadow-2xl overflow-hidden bg-slate-950/95 relative">
      <input
        type="file"
        ref={fileInputRef}
        accept={fileInputAccept}
        onChange={handleFileSelected}
        className="hidden"
      />

      {/* Floating In-App Toast Notification */}
      {toastNotification && (
        <div
          onClick={() => {
            const friend = otherMembers.find((m) => m.id === toastNotification.senderId);
            if (friend) handleSelectFriend(friend);
            setToastNotification(null);
          }}
          className="absolute top-4 right-4 z-50 p-3.5 rounded-2xl bg-slate-900/95 border border-pink-500/50 shadow-2xl flex items-center gap-3 cursor-pointer animate-in slide-in-from-top-4 duration-200 max-w-sm"
        >
          <img
            src={toastNotification.avatar_url || 'https://api.dicebear.com/7.x/bottts/svg?seed=user'}
            alt={toastNotification.username}
            className="w-10 h-10 rounded-xl object-cover ring-2 ring-pink-500/50"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-black text-white truncate">{toastNotification.username}</h5>
              <span className="text-[9px] text-pink-400 font-bold">New Message</span>
            </div>
            <p className="text-[11px] text-slate-300 truncate mt-0.5">{toastNotification.text}</p>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. LEFT SIDEBAR: WHATSAPP-STYLE CHATS / FRIENDS LIST (280px)              */}
      {/* ========================================================================= */}
      <div className="w-72 sm:w-80 border-r border-slate-800 bg-slate-950/90 flex flex-col shrink-0">
        {/* User Header + Invite CTA */}
        <div className="p-3.5 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative shrink-0">
              <img
                src={user?.avatar_url || 'https://api.dicebear.com/7.x/bottts/svg?seed=duocore'}
                alt={user?.username}
                className="w-9 h-9 rounded-xl object-cover ring-1 ring-pink-500/50"
              />
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-slate-950" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-black text-white truncate">{user?.username}</h4>
              <p className="text-[10px] text-pink-300 font-mono">Chats & Friends</p>
            </div>
          </div>

          <button
            onClick={onOpenInvite}
            className="px-2.5 py-1.5 rounded-xl bg-pink-600/30 hover:bg-pink-600/50 border border-pink-500/40 text-pink-300 text-[11px] font-bold flex items-center gap-1 transition-all shrink-0"
            title="Add More Friends to Chat List"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>+ Add</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="p-3 border-b border-slate-800/80">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search chats or friends..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-pink-500/40"
            />
          </div>
        </div>

        {/* Chats List (Each Friend listed separately with live typing & unread bubble) */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {otherMembers.length > 0 ? (
            otherMembers
              .filter((m) => m.username.toLowerCase().includes(searchQuery.toLowerCase()))
              .map((m) => {
                const isSelected = selectedFriend?.id === m.id;
                const mRank = getHackerRank(m.level || 1, m.xp || 0);
                const unreadCount = unreadCounts[m.id] || 0;
                const isFriendTyping = typingMap[m.id] || false;

                return (
                  <button
                    key={m.id}
                    onClick={() => handleSelectFriend(m)}
                    className={`w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-all relative ${
                      isSelected
                        ? 'bg-slate-900/90 border border-pink-500/50 shadow-md shadow-pink-900/10 scale-[1.01]'
                        : 'hover:bg-slate-900/50 border border-transparent'
                    }`}
                  >
                    <div className="relative shrink-0">
                      <img
                        src={m.avatar_url || 'https://api.dicebear.com/7.x/bottts/svg?seed=user'}
                        alt={m.username}
                        className="w-11 h-11 rounded-2xl object-cover ring-1 ring-slate-700 bg-slate-900"
                      />
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-slate-950" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="text-xs font-black text-white truncate">{m.username}</h4>
                        <span className="text-[9px] text-slate-500 font-mono shrink-0">Lv.{m.level || 1}</span>
                      </div>

                      <div className="flex items-center justify-between gap-1 mt-0.5">
                        {isFriendTyping ? (
                          <div className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 animate-pulse">
                            <span>typing</span>
                            <span className="animate-bounce">.</span>
                            <span className="animate-bounce delay-100">.</span>
                            <span className="animate-bounce delay-200">.</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 truncate">
                            <span className={`text-[8px] px-1 rounded font-bold border ${mRank.badgeColor}`}>
                              {mRank.icon} {mRank.title.split(' ')[0]}
                            </span>
                            <p className="text-[10px] text-slate-400 truncate">
                              {m.current_topic ? m.current_topic.split(':')[0] : 'Online'}
                            </p>
                          </div>
                        )}

                        {/* Green Unread Count Bubble Badge */}
                        {unreadCount > 0 && (
                          <span className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 font-black text-[10px] flex items-center justify-center shadow-md shadow-emerald-500/40 shrink-0 animate-bounce">
                            {unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
          ) : (
            <div className="p-6 text-center text-slate-500 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 mx-auto flex items-center justify-center text-xl">
                👥
              </div>
              <div>
                <h5 className="text-xs font-bold text-slate-300">No chats yet</h5>
                <p className="text-[11px] text-slate-500 mt-1">Invite your friends to chat with them individually!</p>
              </div>
              <button
                onClick={onOpenInvite}
                className="px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs shadow-md shadow-pink-600/30"
              >
                + Invite Friends 🚀
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. RIGHT SIDE: ACTIVE 1v1 DIRECT CHAT (WHATSAPP STYLE)                    */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-950">
        {selectedFriend ? (
          <>
            {/* 1v1 Active Chat Header with Call & Video Actions */}
            <div className="p-3.5 border-b border-slate-800 bg-slate-950/90 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative shrink-0">
                  <img
                    src={selectedFriend.avatar_url || 'https://api.dicebear.com/7.x/bottts/svg?seed=user'}
                    alt={selectedFriend.username}
                    className="w-10 h-10 rounded-2xl object-cover ring-2 ring-indigo-500/50"
                  />
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-slate-950" />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-black text-white truncate">{selectedFriend.username}</h3>
                    {selectedRank && (
                      <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold border ${selectedRank.badgeColor}`}>
                        {selectedRank.icon} {selectedRank.title}
                      </span>
                    )}
                  </div>
                  {isSelectedFriendTyping ? (
                    <p className="text-[11px] text-emerald-400 font-bold animate-pulse">
                      typing a message...
                    </p>
                  ) : (
                    <p className="text-[11px] text-cyan-300 font-medium truncate mt-0.5 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>{selectedFriend.current_topic || 'Cybersecurity & Linux Labs'}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Header Right Actions: Audio Call, Video Call, and Vault Exit */}
              <div className="flex items-center gap-2">
                {/* Audio Voice Call Button */}
                <button
                  onClick={() => handleStartCall('audio')}
                  className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500/40 text-emerald-400 hover:text-white transition-all shadow-sm"
                  title="Start Audio Call"
                >
                  <Phone className="w-4 h-4" />
                </button>

                {/* HD Video Call Button */}
                <button
                  onClick={() => handleStartCall('video')}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-cyan-600/30 transition-all"
                  title="Start HD Video Call"
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>Video Call</span>
                </button>

                {chatMode === 'vault' ? (
                  <button
                    onClick={() => { setChatMode('direct'); playSound('click'); }}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-all"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Exit Vault</span>
                  </button>
                ) : (
                  <button
                    onClick={onOpenInvite}
                    className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-all"
                    title="Add Friends to Squad"
                  >
                    <UserPlus className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Chat Content: Vault PIN Screen OR Active Messages Stream */}
            {chatMode === 'vault' && !isPrivateUnlocked ? (
              /* PASSKEY PIN LOCK SCREEN FOR VAULT */
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-5 animate-in fade-in">
                <div className="w-16 h-16 rounded-3xl bg-purple-950/80 border border-purple-500/40 flex items-center justify-center text-3xl shadow-xl shadow-purple-900/30">
                  🔒
                </div>

                <div className="space-y-1 max-w-sm">
                  <h3 className="text-base font-black text-white">Private Vault with {selectedFriend.username}</h3>
                  <p className="text-xs text-slate-400">
                    Enter your 4-digit Passkey PIN to unlock private messages, photos, and voice notes.
                  </p>
                </div>

                {pinError && (
                  <div className="p-2.5 px-4 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs">
                    {pinError}
                  </div>
                )}

                {!showPinSetting ? (
                  <form onSubmit={handleUnlockVault} className="w-full max-w-xs space-y-3">
                    <input
                      type="password"
                      maxLength={6}
                      required
                      placeholder="Enter Passkey PIN (Default: 1234)"
                      value={enteredPin}
                      onChange={(e) => setEnteredPin(e.target.value)}
                      className="w-full glass-input rounded-2xl px-4 py-3 text-center text-sm font-mono tracking-widest text-purple-300 placeholder:text-slate-600"
                      autoFocus
                    />

                    <button
                      type="submit"
                      disabled={!enteredPin}
                      className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs shadow-lg shadow-purple-600/30 transition-all disabled:opacity-40"
                    >
                      Unlock Vault 🔑
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowPinSetting(true)}
                      className="text-[11px] text-slate-500 hover:text-purple-300 font-semibold"
                    >
                      Change Passkey PIN
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleSaveCustomPin} className="w-full max-w-xs space-y-3">
                    <input
                      type="password"
                      maxLength={6}
                      required
                      placeholder="Set New 4-Digit PIN"
                      value={customPinInput}
                      onChange={(e) => setCustomPinInput(e.target.value)}
                      className="w-full glass-input rounded-2xl px-4 py-2.5 text-center text-sm font-mono tracking-widest text-purple-300"
                      autoFocus
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="submit"
                        className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs"
                      >
                        Save PIN
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowPinSetting(false)}
                        className="py-2.5 px-3 rounded-xl bg-slate-800 text-slate-400 text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ) : (
              <>
                {/* Message Stream */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                  {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-3">
                      <div className="w-14 h-14 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center text-2xl">
                        💬
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-300">
                          Chatting with {selectedFriend.username}
                        </h4>
                        <p className="text-xs text-slate-500 mt-1 max-w-xs">
                          Send a message, voice note, photo, or PDF to get the conversation started!
                        </p>
                      </div>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isMe = msg.sender_id === user?.id;
                      const meta = typeof msg.metadata === 'string' ? JSON.parse(msg.metadata || '{}') : (msg.metadata || {});

                      return (
                        <div
                          key={msg.id}
                          className={`flex gap-3 group animate-in fade-in ${
                            isMe ? 'flex-row-reverse' : 'flex-row'
                          }`}
                        >
                          <img
                            src={msg.avatar_url || 'https://api.dicebear.com/7.x/bottts/svg?seed=user'}
                            alt={msg.username}
                            className="w-8 h-8 rounded-xl object-cover ring-1 ring-slate-800 shrink-0 self-end mb-1"
                          />

                          <div className={`max-w-[85%] sm:max-w-[75%] space-y-1 ${isMe ? 'items-end' : 'items-start'}`}>
                            <div className="flex items-center gap-2 px-1">
                              <span className="text-[10px] font-bold text-slate-400">{msg.username}</span>
                              <span className="text-[9px] text-slate-600 font-mono">
                                {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                              </span>
                            </div>

                            <div
                              className={`p-3.5 rounded-2xl text-xs leading-relaxed break-words relative shadow-md ${
                                isMe
                                  ? chatMode === 'vault'
                                    ? 'bg-gradient-to-tr from-purple-600 to-indigo-600 text-white rounded-br-none shadow-purple-900/20'
                                    : 'bg-gradient-to-tr from-pink-600 to-indigo-600 text-white rounded-br-none shadow-pink-900/20'
                                  : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-none'
                              }`}
                            >
                              {msg.reply_to_id && (
                                <div className="mb-2 p-2 rounded-lg bg-black/20 text-[10px] text-slate-300 border-l-2 border-pink-400">
                                  Replying to previous message...
                                </div>
                              )}

                              {msg.text && <p className="whitespace-pre-wrap font-medium mb-2">{msg.text}</p>}

                              {/* Media Renderers */}
                              {(meta.fileUrl && (meta.mimeType?.startsWith('audio/') || msg.type === 'audio' || meta.fileName?.includes('voice-note'))) && (
                                <AudioMemoPlayer fileUrl={meta.fileUrl} duration={meta.duration} />
                              )}

                              {meta.fileUrl && (meta.mimeType?.startsWith('image/') || msg.type === 'image') && (
                                <div className="mt-1 rounded-xl overflow-hidden border border-white/20 relative group/img cursor-pointer">
                                  <img
                                    src={meta.fileUrl}
                                    alt={meta.fileName || 'Shared Photo'}
                                    onClick={() => setLightboxImage(meta.fileUrl)}
                                    className="max-h-72 w-auto object-cover rounded-xl hover:opacity-90 transition-opacity"
                                  />
                                  <a
                                    href={meta.fileUrl}
                                    download={meta.fileName || 'photo'}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-black/70 hover:bg-black text-white text-[10px] flex items-center gap-1 opacity-0 group-hover/img:opacity-100 transition-opacity"
                                  >
                                    <Download className="w-3 h-3" />
                                    <span>Download</span>
                                  </a>
                                </div>
                              )}

                              {meta.fileUrl && (meta.mimeType?.startsWith('video/') || msg.type === 'video') && (
                                <div className="mt-1 rounded-xl overflow-hidden border border-white/20 bg-black/40 p-1">
                                  <video src={meta.fileUrl} controls className="max-h-64 w-full rounded-lg" />
                                </div>
                              )}

                              {meta.fileUrl && (meta.mimeType === 'application/pdf' || msg.type === 'file' || meta.fileName?.endsWith('.pdf')) && (
                                <div className="mt-1 p-3 rounded-xl bg-black/30 border border-white/10 flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="w-9 h-9 rounded-lg bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 font-bold text-sm shrink-0">
                                      📄
                                    </div>
                                    <div className="min-w-0">
                                      <h5 className="font-bold text-xs text-white truncate">{meta.fileName || 'Document.pdf'}</h5>
                                      <span className="text-[10px] text-slate-400 block">
                                        {meta.fileSize ? `${Math.round(meta.fileSize / 1024)} KB` : 'PDF Document'}
                                      </span>
                                    </div>
                                  </div>
                                  <a
                                    href={meta.fileUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    download={meta.fileName || 'document.pdf'}
                                    className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-[11px] flex items-center gap-1 shrink-0"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                    <span>Open</span>
                                  </a>
                                </div>
                              )}

                              {meta.latitude && meta.longitude && (
                                <div className="mt-1 p-3 rounded-xl bg-slate-950/80 border border-cyan-500/30 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="flex items-center gap-1.5 text-xs font-bold text-cyan-300">
                                      <MapPin className="w-4 h-4 text-pink-400 animate-bounce" />
                                      <span>{meta.address || 'Shared Location'}</span>
                                    </span>
                                  </div>
                                  <a
                                    href={`https://www.google.com/maps?q=${meta.latitude},${meta.longitude}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="w-full py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    <span>Open in Google Maps</span>
                                  </a>
                                </div>
                              )}
                            </div>

                            {/* Hover reactions */}
                            <div className={`flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity px-1 ${
                              isMe ? 'justify-end' : 'justify-start'
                            }`}>
                              {QUICK_EMOJIS.slice(0, 3).map((emoji) => (
                                <button
                                  key={emoji}
                                  onClick={() => { reactToMessage(msg.id, emoji); playSound('click'); }}
                                  className="p-1 rounded hover:bg-slate-800 text-xs transition-transform hover:scale-125"
                                >
                                  {emoji}
                                </button>
                              ))}
                              <button
                                onClick={() => setReplyTo(msg)}
                                className="p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-slate-300 text-xs"
                              >
                                <Reply className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Upload Progress */}
                {uploading && (
                  <div className="px-4 py-2 bg-indigo-950/80 border-t border-indigo-500/40 text-xs text-cyan-300 flex items-center gap-2 animate-pulse">
                    <div className="w-3.5 h-3.5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                    <span>{uploadProgress || 'Processing media attachment...'}</span>
                  </div>
                )}

                {/* Attachment Menu Popup (With Vault placed last next to location) */}
                {attachmentMenuOpen && (
                  <div className="p-3 mx-4 mb-2 rounded-2xl bg-slate-900/95 border border-pink-500/40 shadow-2xl grid grid-cols-5 gap-2 animate-in slide-in-from-bottom-2 duration-150">
                    <button
                      type="button"
                      onClick={() => triggerFileUpload('image/*', 'image')}
                      className="p-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-pink-500 flex flex-col items-center gap-1 text-xs text-slate-200 transition-all hover:scale-105"
                    >
                      <div className="w-7 h-7 rounded-lg bg-pink-500/20 text-pink-400 flex items-center justify-center">
                        <ImageIcon className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[10px] font-bold">Photo</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => triggerFileUpload('application/pdf,.doc,.docx,.txt', 'file')}
                      className="p-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-red-500 flex flex-col items-center gap-1 text-xs text-slate-200 transition-all hover:scale-105"
                    >
                      <div className="w-7 h-7 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center">
                        <FileText className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[10px] font-bold">PDF</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => triggerFileUpload('video/*', 'video')}
                      className="p-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-purple-500 flex flex-col items-center gap-1 text-xs text-slate-200 transition-all hover:scale-105"
                    >
                      <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center">
                        <VideoIcon className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[10px] font-bold">Video</span>
                    </button>

                    {/* Location */}
                    <button
                      type="button"
                      onClick={handleShareLiveLocation}
                      className="p-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-cyan-500 flex flex-col items-center gap-1 text-xs text-slate-200 transition-all hover:scale-105"
                    >
                      <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                        <MapPin className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[10px] font-bold">Location</span>
                    </button>

                    {/* Private Vault (Placed next to location as requested) */}
                    <button
                      type="button"
                      onClick={handleOpenVaultFromMenu}
                      className="p-2 rounded-xl bg-purple-950/60 border border-purple-800/60 hover:border-purple-500 flex flex-col items-center gap-1 text-xs text-purple-300 transition-all hover:scale-105"
                      title="Open Private Vault"
                    >
                      <div className="w-7 h-7 rounded-lg bg-purple-500/30 text-pink-300 flex items-center justify-center shadow-sm">
                        <Lock className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[10px] font-bold">Vault</span>
                    </button>
                  </div>
                )}

                {/* Voice Recording Active Bar */}
                {isRecordingVoice ? (
                  <div className="p-3 sm:p-4 border-t border-red-500/40 bg-slate-950 flex items-center justify-between gap-3 animate-pulse">
                    <div className="flex items-center gap-2 text-red-400 text-xs font-bold font-mono">
                      <span className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
                      <span>Recording: {Math.floor(recordingSeconds / 60)}:{(recordingSeconds % 60).toString().padStart(2, '0')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={cancelVoiceRecording}
                        className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-xs font-bold"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={stopAndSendVoiceRecording}
                        className="px-4 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold shadow-md shadow-pink-600/30"
                      >
                        Send Memo 🚀
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Input Bar */
                  <form onSubmit={handleSend} className="p-3 sm:p-4 border-t border-slate-800 bg-slate-950">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setAttachmentMenuOpen(!attachmentMenuOpen)}
                        className={`p-3 rounded-2xl border transition-all ${
                          attachmentMenuOpen
                            ? 'bg-pink-600 text-white border-pink-500'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-pink-500/40'
                        }`}
                        title="Attach Photo, PDF, Video, Location, or Open Vault"
                      >
                        <Paperclip className="w-4 h-4" />
                      </button>

                      <input
                        type="text"
                        placeholder={`Message ${selectedFriend.username}...`}
                        value={input}
                        onChange={handleInputChange}
                        className="flex-1 glass-input rounded-2xl px-4 py-3 text-xs text-white placeholder:text-slate-500"
                      />

                      <button
                        type="button"
                        onClick={startVoiceRecording}
                        className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-pink-400 hover:bg-pink-950/40 hover:border-pink-500/40 transition-all shadow-md"
                        title="Record Voice Note"
                      >
                        <Mic className="w-4 h-4" />
                      </button>

                      <button
                        type="submit"
                        disabled={!input.trim()}
                        className="p-3 rounded-2xl bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white font-bold transition-all shadow-lg disabled:opacity-40"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </form>
                )}
              </>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-500 space-y-3">
            <div className="w-16 h-16 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center text-2xl">
              💬
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-300">Select a friend to start chatting</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-xs">
                Pick any friend from your chat list on the left to send messages, voice notes, and media.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Incoming Call Ringing Modal */}
      <IncomingCallModal
        incomingCall={incomingCall}
        onAccept={handleAcceptIncomingCall}
        onDecline={handleDeclineIncomingCall}
      />

      {/* Outgoing / Active Video Call Modal */}
      <VideoCallModal
        isOpen={videoCallOpen}
        onClose={() => setVideoCallOpen(false)}
      />

      {/* Lightbox Modal for Photos */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 cursor-pointer animate-in fade-in"
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={lightboxImage}
              alt="Enlarged view"
              className="max-h-[85vh] max-w-full rounded-2xl object-contain shadow-2xl"
            />
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute -top-4 -right-4 p-2 rounded-full bg-slate-900 text-white border border-slate-700 hover:bg-red-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
