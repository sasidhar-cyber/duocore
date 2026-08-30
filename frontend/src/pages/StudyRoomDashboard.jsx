import React, { useState } from 'react';
import { useRoom } from '../context/RoomContext';
import { DualPresenceBar } from '../components/DualPresenceBar';
import { VoiceRoomBar } from '../components/VoiceRoomBar';
import { ChatView } from '../components/ChatView';
import { InviteModal } from '../components/InviteModal';

export function StudyRoomDashboard({ onSelectTrack }) {
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-in fade-in duration-150">
      {/* Real-time Multi-User Squad Presence Bar */}
      <DualPresenceBar onOpenInvite={() => setInviteModalOpen(true)} />

      {/* WebRTC Real-Time Voice Call Channel */}
      <VoiceRoomBar />

      {/* Full-Width Collaborative Squad Chat & Private Vault */}
      <div className="w-full h-[720px]">
        <ChatView onOpenInvite={() => setInviteModalOpen(true)} />
      </div>

      <InviteModal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
      />
    </div>
  );
}
