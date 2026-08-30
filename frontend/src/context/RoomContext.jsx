import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { getSocket } from '../services/socket';
import { useAuth } from './AuthContext';
import api from '../services/api';
import { playSound } from '../utils/soundEffects';

const RoomContext = createContext(null);

export function RoomProvider({ children }) {
  const { user } = useAuth();

  // Squad / Room State
  const [hasPartner, setHasPartner] = useState(false);
  const [hasRoom, setHasRoom] = useState(false);
  const [partnership, setPartnership] = useState(null);
  const [partner, setPartner] = useState(null);
  const [members, setMembers] = useState([]);
  const [roomData, setRoomData] = useState(null);
  const [pendingInvite, setPendingInvite] = useState(null);
  const [goals, setGoals] = useState([]);

  // Chat Channels State: Normal & Private
  const [activeChannel, setActiveChannel] = useState('normal'); // 'normal' or 'private'
  const [normalMessages, setNormalMessages] = useState([]);
  const [privateMessages, setPrivateMessages] = useState([]);
  const [partnerTyping, setPartnerTyping] = useState({ normal: false, private: false });

  // Focus Timer State
  const [timerState, setTimerState] = useState(null);
  const currentRoomIdRef = useRef(null);

  // Load active squad / room state from backend
  const refreshPartnerState = useCallback(async () => {
    if (!user) {
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

        // Fetch existing messages for both channels
        try {
          const [normRes, privRes] = await Promise.all([
            api.getRoomMessages(res.room.id, 'normal'),
            api.getRoomMessages(res.room.id, 'private')
          ]);
          setNormalMessages(normRes.messages || []);
          setPrivateMessages(privRes.messages || []);
        } catch (e) {}

        // Join socket room
        const s = getSocket();
        if (s) {
          if (!s.connected) s.connect();
          s.emit('room:join', { roomId: res.room.id });
        }
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
  }, [user]);

  // Initial load on user login/auth change
  useEffect(() => {
    refreshPartnerState();
  }, [refreshPartnerState]);

  // Socket event listeners
  useEffect(() => {
    const s = getSocket();
    if (!s) return;

    const handleNewMessage = (msg) => {
      if (msg.room_id === currentRoomIdRef.current) {
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

        if (msg.sender_id !== user?.id) {
          playSound('message');
        }
      }
    };

    const handlePartnerTyping = ({ channel = 'normal', isTyping }) => {
      setPartnerTyping((prev) => ({
        ...prev,
        [channel]: isTyping
      }));
    };

    const handlePartnerStatus = (data) => {
      setPartner((prev) => (prev ? { ...prev, ...data } : data));
      setMembers((prev) => prev.map(m => m.id === data.userId ? { ...m, ...data } : m));
    };

    const handlePartnerJoined = (data) => {
      if (data.userId !== user?.id) {
        playSound('message');
        refreshPartnerState();
      }
    };

    const handleMemberJoined = () => {
      playSound('quiz_correct');
      refreshPartnerState();
    };

    const handlePartnerLeft = (data) => {
      if (data.userId !== user?.id) {
        setPartner((prev) => (prev ? { ...prev, is_online: false } : prev));
      }
    };

    const handleDuoConnected = () => {
      playSound('quiz_correct');
      refreshPartnerState();
    };

    const handleDuoPartnerRemoved = () => {
      playSound('quiz_wrong');
      refreshPartnerState();
    };

    const handleTimerSync = (data) => {
      setTimerState(data);
    };

    const handleReaction = ({ messageId, emoji, action }) => {
      const updater = (prev) =>
        prev.map((msg) => {
          if (msg.id !== messageId) return msg;
          const reactions = { ...(msg.reactions || {}) };
          if (action === 'removed') {
            reactions[emoji] = Math.max(0, (reactions[emoji] || 1) - 1);
            if (!reactions[emoji]) delete reactions[emoji];
          } else {
            reactions[emoji] = (reactions[emoji] || 0) + 1;
          }
          return { ...msg, reactions };
        });

      setNormalMessages(updater);
      setPrivateMessages(updater);
    };

    const handleChallenge = (payload) => {
      if (payload.challengerId !== user?.id) {
        playSound('quiz_correct');
      }
    };

    s.on('chat:new_message', handleNewMessage);
    s.on('chat:partner_typing', handlePartnerTyping);
    s.on('presence:partner_status', handlePartnerStatus);
    s.on('room:partner_joined', handlePartnerJoined);
    s.on('room:member_joined', handleMemberJoined);
    s.on('room:partner_left', handlePartnerLeft);
    s.on('duo:connected', handleDuoConnected);
    s.on('duo:partner_removed', handleDuoPartnerRemoved);
    s.on('timer:state_sync', handleTimerSync);
    s.on('chat:reaction_updated', handleReaction);
    s.on('quiz:challenge_received', handleChallenge);

    return () => {
      s.off('chat:new_message', handleNewMessage);
      s.off('chat:partner_typing', handlePartnerTyping);
      s.off('presence:partner_status', handlePartnerStatus);
      s.off('room:partner_joined', handlePartnerJoined);
      s.off('room:member_joined', handleMemberJoined);
      s.off('room:partner_left', handlePartnerLeft);
      s.off('duo:connected', handleDuoConnected);
      s.off('duo:partner_removed', handleDuoPartnerRemoved);
      s.off('timer:state_sync', handleTimerSync);
      s.off('chat:reaction_updated', handleReaction);
      s.off('quiz:challenge_received', handleChallenge);
    };
  }, [user, refreshPartnerState]);

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

  const sendMessage = async (text, channel = activeChannel, metadata = {}, replyToId = null) => {
    if (!roomData) return;
    const s = getSocket();
    if (s && s.connected) {
      s.emit('chat:send_message', {
        roomId: roomData.id,
        text,
        channel: channel || 'normal',
        metadata,
        replyToId
      });
    } else {
      const res = await api.sendRoomMessage(roomData.id, {
        text,
        channel: channel || 'normal',
        replyToId,
        metadata
      });
      if (channel === 'private') {
        setPrivateMessages((prev) => [...prev, res.data]);
      } else {
        setNormalMessages((prev) => [...prev, res.data]);
      }
    }
  };

  const sendTyping = (isTyping) => {
    if (!roomData) return;
    const s = getSocket();
    if (s) {
      s.emit('chat:typing', { roomId: roomData.id, channel: activeChannel, isTyping });
    }
  };

  const reactToMessage = (messageId, emoji) => {
    if (!roomData) return;
    const s = getSocket();
    if (s) {
      s.emit('chat:react', { roomId: roomData.id, messageId, emoji });
    }
  };

  const updateStudyStatus = (subject, topic, isStudying) => {
    if (!roomData) return;
    const s = getSocket();
    if (s) {
      s.emit('presence:status_update', { roomId: roomData.id, subject, topic, isStudying });
    }
    api.updateRoomStatus(roomData.id, { subject, topic, is_studying: isStudying }).catch(() => {});
  };

  const startTimer = (mode, durationSeconds, subject, topic) => {
    if (!roomData) return;
    const s = getSocket();
    if (s) {
      s.emit('timer:start', { roomId: roomData.id, mode, durationSeconds, subject, topic });
    }
  };

  const pauseTimer = () => {
    if (!roomData) return;
    const s = getSocket();
    if (s) {
      s.emit('timer:pause', { roomId: roomData.id });
    }
  };

  const resetTimer = (mode, durationSeconds) => {
    if (!roomData) return;
    const s = getSocket();
    if (s) {
      s.emit('timer:reset', { roomId: roomData.id, mode, durationSeconds });
    }
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
        goals,
        activeChannel,
        normalMessages,
        privateMessages,
        partnerTyping,
        timerState,
        setActiveChannel,
        createInvite,
        cancelInvite,
        acceptInvite,
        removePartner,
        refreshPartnerState,
        sendMessage,
        sendTyping,
        reactToMessage,
        updateStudyStatus,
        startTimer,
        pauseTimer,
        resetTimer
      }}
    >
      {children}
    </RoomContext.Provider>
  );
}

export function useRoom() {
  const context = useContext(RoomContext);
  if (!context) throw new Error('useRoom must be used within a RoomProvider');
  return context;
}
