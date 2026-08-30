import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';
import { getSocket } from '../services/socket';
import { useAuth } from './AuthContext';
import { playSound } from '../utils/soundEffects';

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

  // Goals
  const [goals, setGoals] = useState([]);

  // Active Timer Sync
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
  }, [user?.id]);

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

    const handleChallenge = (challenge) => {
      playSound('quiz_correct');
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
  }, [user?.id, refreshPartnerState]);

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

  const updateStudyStatus = async (statusData) => {
    if (!roomData) return;
    try {
      await api.updateRoomStatus(roomData.id, statusData);
    } catch (err) {
      console.error('[RoomContext] Failed to update status:', err);
    }
  };

  const value = {
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
    setActiveChannel,
    partnerTyping,
    goals,
    timerState,
    refreshPartnerState,
    createInvite,
    cancelInvite,
    acceptInvite,
    removePartner,
    sendMessage,
    sendTyping,
    reactToMessage,
    updateStudyStatus
  };

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
}

export function useRoom() {
  const context = useContext(RoomContext);
  if (!context) {
    throw new Error('useRoom must be used within a RoomProvider');
  }
  return context;
}
