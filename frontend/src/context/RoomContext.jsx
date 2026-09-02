import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';
import { getSocket } from '../services/socket';
import { useAuth } from './AuthContext';
import { playSound } from '../utils/soundEffects';
import { showBrowserNotification } from '../utils/notificationService';

const RoomContext = createContext(null);

export function RoomProvider({ children }) {
  const { user } = useAuth();

  const [hasPartner, setHasPartner] = useState(false);
  const [hasRoom, setHasRoom] = useState(false);
  const [partnership, setPartnership] = useState(null);
  const [partner, setPartner] = useState(null);
  const [members, setMembers] = useState([]);
  const [roomData, setRoomData] = useState(null);
  const [pendingInvite, setPendingInvite] = useState(null);

  // Realtime Chat & Vault Messages
  const [normalMessages, setNormalMessages] = useState([]);
  const [privateMessages, setPrivateMessages] = useState([]);
  const [activeChannel, setActiveChannel] = useState('normal'); // 'normal' | 'private'
  const [partnerTyping, setPartnerTyping] = useState({ normal: false, private: false });

  // Goals & Timer
  const [goals, setGoals] = useState([]);
  const [timerState, setTimerState] = useState(null);

  // Global WebRTC Calling State (Accessible across whole app)
  const [incomingCall, setIncomingCall] = useState(null);
  const [activeCallModal, setActiveCallModal] = useState(null); // 'video' | 'audio' | null
  const [isCallInitiator, setIsCallInitiator] = useState(false);

  const currentRoomIdRef = useRef(null);

  // Load active squad / room state from backend
  const refreshPartnerState = useCallback(async () => {
    const activeToken = localStorage.getItem('duocore_token');
    if (!activeToken) {
      setHasPartner(false);
      setHasRoom(false);
      setPartnership(null);
      setPartner(null);
      setMembers([]);
      setRoomData(null);
      setGoals([]);
      setPendingInvite(null);
      setNormalMessages([]);
      setPrivateMessages([]);
      return;
    }

    try {
      const res = await api.getCurrentPartner();

      if (res.hasRoom && res.room) {
        setHasRoom(true);
        setHasPartner(res.hasPartner);
        setPartnership(res.partnership || null);
        setPartner(res.partner);
        setMembers(res.members || []);
        setRoomData(res.room);
        setGoals(res.goals || []);
        setPendingInvite(null);
        currentRoomIdRef.current = res.room.id;

        // Join socket room
        const s = getSocket();
        if (s) {
          if (!s.connected) s.connect();
          s.emit('room:join', { roomId: res.room.id });
        }

        // Fetch initial messages for this room
        api.getRoomMessages(res.room.id, 'normal')
          .then((msgRes) => {
            if (msgRes.messages) setNormalMessages(msgRes.messages);
          })
          .catch(() => {});
      } else {
        setHasPartner(false);
        setHasRoom(false);
        setPartnership(null);
        setPartner(null);
        setMembers([]);
        setRoomData(null);
        setGoals([]);
        setPendingInvite(res.pendingInvite || null);
        currentRoomIdRef.current = null;
      }
    } catch (err) {
      console.error('[RoomContext] Failed to load room state:', err);
    }
  }, [user?.id]);

  // Initial load on user login/auth change
  useEffect(() => {
    refreshPartnerState();
  }, [refreshPartnerState]);

  // Background Auto-Sync (2.5s interval to ensure 100% real-time pairing & messages even on spotty mobile data)
  useEffect(() => {
    const interval = setInterval(async () => {
      const activeToken = localStorage.getItem('duocore_token');
      if (!activeToken) return;

      if (currentRoomIdRef.current) {
        try {
          const msgRes = await api.getRoomMessages(currentRoomIdRef.current, activeChannel);
          if (msgRes.messages) {
            if (activeChannel === 'private') {
              setPrivateMessages(msgRes.messages);
            } else {
              setNormalMessages(msgRes.messages);
            }
          }
          if (!hasPartner) {
            const partnerRes = await api.getCurrentPartner();
            if (partnerRes.hasPartner) {
              setHasPartner(true);
              setPartner(partnerRes.partner);
              setMembers(partnerRes.members || []);
            }
          }
        } catch (e) {}
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [activeChannel, hasPartner]);

  const typingResetTimerRef = useRef(null);

  // Handle App Foreground / Visibility Change & Network Online on mobile
  useEffect(() => {
    const handleForeground = () => {
      if (document.visibilityState === 'visible') {
        const s = getSocket();
        if (s && !s.connected) {
          s.connect();
        }
        if (currentRoomIdRef.current && s && s.connected) {
          s.emit('room:join', { roomId: currentRoomIdRef.current });
        }
        refreshPartnerState();
      }
    };

    const handleOnline = () => {
      const s = getSocket();
      if (s) {
        if (!s.connected) s.connect();
        if (currentRoomIdRef.current) {
          s.emit('room:join', { roomId: currentRoomIdRef.current });
        }
      }
      refreshPartnerState();
    };

    document.addEventListener('visibilitychange', handleForeground);
    window.addEventListener('focus', handleForeground);
    window.addEventListener('online', handleOnline);

    return () => {
      document.removeEventListener('visibilitychange', handleForeground);
      window.removeEventListener('focus', handleForeground);
      window.removeEventListener('online', handleOnline);
    };
  }, [refreshPartnerState]);

  // Socket event listeners
  useEffect(() => {
    const s = getSocket();
    if (!s) return;

    const handleNewMessage = (msg) => {
      if (!currentRoomIdRef.current || msg.room_id === currentRoomIdRef.current) {
        if (msg.channel_type === 'private') {
          setPrivateMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        } else {
          setNormalMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        }
      }

      if (msg.sender_id !== user?.id) {
        if (localStorage.getItem('duocore_notif_messages') !== 'false') {
          playSound('message');
          showBrowserNotification(msg.username || 'DuoCore Message', {
            body: msg.text || 'Sent you an attachment',
            tag: `duocore-${msg.room_id}`
          });
        }
      }
    };

    const handlePartnerTyping = ({ channel = 'normal', isTyping }) => {
      const ch = channel || 'normal';
      setPartnerTyping((prev) => ({
        ...prev,
        [ch]: !!isTyping
      }));

      if (typingResetTimerRef.current) clearTimeout(typingResetTimerRef.current);
      if (isTyping) {
        typingResetTimerRef.current = setTimeout(() => {
          setPartnerTyping((prev) => ({
            ...prev,
            [ch]: false
          }));
        }, 4000);
      }
    };

    const handlePartnerStatus = (data) => {
      setPartner((prev) => (prev ? { ...prev, ...data } : data));
      setMembers((prev) => prev.map(m => m.id === data.userId ? { ...m, ...data } : m));
    };

    const handlePartnerJoined = (data) => {
      if (data.userId !== user?.id) {
        if (localStorage.getItem('duocore_notif_invites') !== 'false') {
          playSound('quiz_correct');
          if (document.hidden) {
            showBrowserNotification('Duo Partner Connected', {
              body: `${data.username || 'Your friend'} has joined your private room!`,
              tag: 'duocore-partner'
            });
          }
        }
        refreshPartnerState();
      }
    };

    const handleMemberJoined = () => {
      if (localStorage.getItem('duocore_notif_invites') !== 'false') {
        playSound('quiz_correct');
      }
      refreshPartnerState();
    };

    const handlePartnerLeft = (data) => {
      if (data.userId !== user?.id) {
        setPartner((prev) => (prev ? { ...prev, is_online: false } : prev));
        setMembers((prev) => prev.map(m => m.id === data.userId ? { ...m, is_online: false } : m));
      }
    };

    const handleDuoConnected = () => {
      playSound('quiz_correct');
      refreshPartnerState();
    };

    const handleDuoPartnerRemoved = () => {
      setHasPartner(false);
      setPartner(null);
      setPartnership(null);
      playSound('quiz_wrong');
      refreshPartnerState();
    };

    const handleTimerSync = (state) => {
      setTimerState(state);
    };

    const handleUserStatusChange = ({ userId, isOnline, lastSeen }) => {
      setMembers((prev) =>
        prev.map((m) =>
          m.id === userId ? { ...m, is_online: isOnline, last_seen: isOnline ? 'now' : lastSeen } : m
        )
      );
      setPartner((prev) =>
        prev && prev.id === userId ? { ...prev, is_online: isOnline, last_seen: isOnline ? 'now' : lastSeen } : prev
      );
    };

    const handleRoomStatuses = ({ statuses }) => {
      if (!Array.isArray(statuses)) return;
      const statusMap = new Map(statuses.map((s) => [s.userId, s]));
      setMembers((prev) =>
        prev.map((m) => {
          const stat = statusMap.get(m.id);
          return stat ? { ...m, is_online: stat.isOnline, last_seen: stat.lastSeen } : m;
        })
      );
      setPartner((prev) => {
        if (!prev) return prev;
        const stat = statusMap.get(prev.id);
        return stat ? { ...prev, is_online: stat.isOnline, last_seen: stat.lastSeen } : prev;
      });
    };

    const handleSocketConnect = () => {
      if (currentRoomIdRef.current) {
        s.emit('room:join', { roomId: currentRoomIdRef.current });
      }
    };

    const handleReaction = ({ messageId, userId, emoji, action }) => {
      const updateList = (list) =>
        list.map((m) => {
          if (m.id !== messageId) return m;
          const reactions = { ...(m.reactions || {}) };
          if (action === 'added') {
            reactions[emoji] = (reactions[emoji] || 0) + 1;
          } else {
            reactions[emoji] = Math.max(0, (reactions[emoji] || 1) - 1);
            if (reactions[emoji] === 0) delete reactions[emoji];
          }
          return { ...m, reactions };
        });

      setNormalMessages(updateList);
      setPrivateMessages(updateList);
    };

    const handleMessageDeleted = ({ messageId, channel = 'normal' }) => {
      const filterDeleted = (list) => list.filter((m) => m.id !== messageId);
      if (channel.startsWith('dm:') || channel.startsWith('private:')) {
        setPrivateMessages(filterDeleted);
      } else {
        setNormalMessages(filterDeleted);
      }
    };

    const handleRoomCleared = ({ roomId, channel = 'normal' }) => {
      if (roomId === currentRoomIdRef.current) {
        if (channel.startsWith('dm:') || channel.startsWith('private:')) {
          setPrivateMessages([]);
        } else {
          setNormalMessages([]);
        }
      }
    };

    const handleMessagesRead = ({ roomId, channel = 'normal', readBy }) => {
      const markRead = (list) =>
        list.map((m) => (m.sender_id !== readBy ? { ...m, is_read: 1 } : m));

      if (channel.startsWith('dm:') || channel.startsWith('private:')) {
        setPrivateMessages(markRead);
      } else {
        setNormalMessages(markRead);
      }
    };

    const handleIncomingRing = (callData) => {
      if (callData.caller?.id === user?.id) return;
      setIncomingCall(callData);
      if (localStorage.getItem('duocore_notif_calls') !== 'false') {
        if (document.hidden) {
          showBrowserNotification(`Incoming ${callData.callType === 'video' ? 'HD Video' : 'Audio'} Call`, {
            body: `${callData.caller?.username || 'Duo Partner'} is calling you on DuoCore...`,
            tag: 'duocore-call'
          });
        }
      }
    };

    const handleCallDeclined = (data) => {
      alert(`${data.username || 'Partner'} declined the call.`);
      setActiveCallModal(null);
      setIncomingCall(null);
    };

    s.on('connect', handleSocketConnect);
    s.on('chat:new_message', handleNewMessage);
    s.on('chat:message_deleted', handleMessageDeleted);
    s.on('chat:messages_read', handleMessagesRead);
    s.on('chat:partner_typing', handlePartnerTyping);
    s.on('presence:partner_status', handlePartnerStatus);
    s.on('presence:user_status_change', handleUserStatusChange);
    s.on('presence:room_statuses', handleRoomStatuses);
    s.on('room:partner_joined', handlePartnerJoined);
    s.on('room:member_joined', handleMemberJoined);
    s.on('room:partner_left', handlePartnerLeft);
    s.on('duo:connected', handleDuoConnected);
    s.on('duo:partner_removed', handleDuoPartnerRemoved);
    s.on('timer:state_sync', handleTimerSync);
    s.on('chat:reaction_updated', handleReaction);
    s.on('chat:room_cleared', handleRoomCleared);
    s.on('call:incoming_ring', handleIncomingRing);
    s.on('call:declined', handleCallDeclined);

    return () => {
      s.off('connect', handleSocketConnect);
      s.off('chat:new_message', handleNewMessage);
      s.off('chat:message_deleted', handleMessageDeleted);
      s.off('chat:messages_read', handleMessagesRead);
      s.off('chat:partner_typing', handlePartnerTyping);
      s.off('presence:partner_status', handlePartnerStatus);
      s.off('presence:user_status_change', handleUserStatusChange);
      s.off('presence:room_statuses', handleRoomStatuses);
      s.off('room:partner_joined', handlePartnerJoined);
      s.off('room:member_joined', handleMemberJoined);
      s.off('room:partner_left', handlePartnerLeft);
      s.off('duo:connected', handleDuoConnected);
      s.off('duo:partner_removed', handleDuoPartnerRemoved);
      s.off('timer:state_sync', handleTimerSync);
      s.off('chat:reaction_updated', handleReaction);
      s.off('chat:room_cleared', handleRoomCleared);
      s.off('call:incoming_ring', handleIncomingRing);
      s.off('call:declined', handleCallDeclined);
    };
  }, [user?.id, refreshPartnerState]);

  // Periodic heartbeat
  useEffect(() => {
    if (!roomData?.id) return;
    const interval = setInterval(() => {
      const s = getSocket();
      if (s && s.connected) {
        s.emit('presence:heartbeat', { roomId: roomData.id });
      }
    }, 25000);
    return () => clearInterval(interval);
  }, [roomData?.id]);

  // Actions
  const createInvite = async () => {
    const res = await api.createInvite();
    setPendingInvite(res.invite);
    return res.invite;
  };

  const cancelInvite = async () => {
    await api.cancelInvite();
    setPendingInvite(null);
  };

  const acceptInvite = async (code) => {
    const res = await api.acceptInvite(code);
    await refreshPartnerState();
    return res;
  };

  const removePartner = async () => {
    const res = await api.removePartner();
    await refreshPartnerState();
    return res;
  };

  const sendMessage = async ({ text, channel = activeChannel, metadata = {}, replyTo = null, fileUrl = null, fileType = null }) => {
    if (!roomData) return;

    try {
      const res = await api.sendRoomMessage(roomData.id, {
        text: text || '',
        channel_type: channel || 'normal',
        metadata: typeof metadata === 'object' ? metadata : {},
        reply_to_id: replyTo?.id || null,
        file_url: fileUrl,
        file_type: fileType
      });
      const savedMsg = res.message || res.data;
      if (savedMsg) {
        if (channel === 'private') {
          setPrivateMessages((prev) => {
            if (prev.some((m) => m.id === savedMsg.id)) return prev;
            return [...prev, savedMsg];
          });
        } else {
          setNormalMessages((prev) => {
            if (prev.some((m) => m.id === savedMsg.id)) return prev;
            return [...prev, savedMsg];
          });
        }
      }
    } catch (err) {
      console.warn('[SendMessage REST] Fallback error:', err);
    }
  };

  const sendTyping = (arg1 = true, arg2 = 'normal') => {
    if (!roomData?.id) return;
    let isTyping = true;
    let channel = 'normal';
    if (typeof arg1 === 'boolean') {
      isTyping = arg1;
      channel = typeof arg2 === 'string' ? arg2 : 'normal';
    } else if (typeof arg1 === 'string') {
      channel = arg1;
      isTyping = typeof arg2 === 'boolean' ? arg2 : true;
    }
    const s = getSocket();
    if (s && s.connected) {
      s.emit('chat:typing', { roomId: roomData.id, channel: channel || 'normal', isTyping: !!isTyping });
    }
  };

  const clearChatMessages = async (channel = 'normal') => {
    if (!roomData?.id) return;
    try {
      await api.clearRoomMessages(roomData.id, channel);
      if (channel.startsWith('dm:') || channel.startsWith('private:')) {
        setPrivateMessages([]);
      } else {
        setNormalMessages([]);
      }
    } catch (err) {
      console.error('[RoomContext] Clear chat error:', err);
      throw err;
    }
  };

  const panicClearMessages = async (channel = 'normal') => {
    if (!roomData?.id) return;
    try {
      await api.panicClearRoomMessages(roomData.id);
      setNormalMessages([]);
      setPrivateMessages([]);
    } catch (err) {
      console.error('[RoomContext] Panic clear error:', err);
      throw err;
    }
  };

  const deleteSingleMessage = async (messageId, channel = 'normal') => {
    if (!roomData?.id) return;
    try {
      await api.deleteMessage(roomData.id, messageId);
      const filterMsg = (list) => list.filter((m) => m.id !== messageId);
      if (channel.startsWith('dm:') || channel.startsWith('private:')) {
        setPrivateMessages(filterMsg);
      } else {
        setNormalMessages(filterMsg);
      }
    } catch (err) {
      console.error('[RoomContext] Delete message error:', err);
      throw err;
    }
  };

  const startOutgoingCall = (callType = 'video') => {
    if (!roomData?.id) return;
    const target = partner || members.find((m) => m.id !== user?.id);
    const s = getSocket();
    if (s && s.connected) {
      s.emit('call:start_call', {
        targetUserId: target?.id,
        roomId: roomData.id,
        callType
      });
    }
    setIsCallInitiator(true);
    setActiveCallModal(callType);
  };

  const acceptIncomingCall = () => {
    if (!incomingCall) return;
    const type = incomingCall.callType || 'video';
    setIncomingCall(null);
    setIsCallInitiator(false);
    setActiveCallModal(type);
  };

  const declineIncomingCall = () => {
    if (!incomingCall) return;
    const s = getSocket();
    if (s && s.connected) {
      s.emit('call:decline_call', {
        callerSocketId: incomingCall.caller?.socketId,
        targetUserId: incomingCall.caller?.id,
        roomId: incomingCall.roomId || roomData?.id
      });
    }
    setIncomingCall(null);
  };

  const endActiveCall = () => {
    const s = getSocket();
    if (s && s.connected && roomData?.id) {
      s.emit('call:leave', { roomId: roomData.id });
    }
    setActiveCallModal(null);
    setIncomingCall(null);
  };

  return (
    <RoomContext.Provider
      value={{
        hasPartner,
        hasRoom,
        partnership,
        partner,
        members,
        roomData,
        pendingInvite,
        normalMessages,
        privateMessages,
        activeChannel,
        partnerTyping,
        goals,
        timerState,
        incomingCall,
        activeCallModal,
        isCallInitiator,
        refreshPartnerState,
        createInvite,
        cancelInvite,
        acceptInvite,
        removePartner,
        sendMessage,
        sendTyping,
        clearChatMessages,
        panicClearMessages,
        deleteSingleMessage,
        startOutgoingCall,
        acceptIncomingCall,
        declineIncomingCall,
        endActiveCall,
        setActiveCallModal,
        setActiveChannel
      }}
    >
      {children}
    </RoomContext.Provider>
  );
}

export function useRoom() {
  const context = useContext(RoomContext);
  if (!context) {
    throw new Error('useRoom must be used within a RoomProvider');
  }
  return context;
}
