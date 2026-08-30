export function formatLastSeen(lastSeenTimestamp, isOnline = false) {
  if (isOnline || lastSeenTimestamp === 'now') {
    return 'Active now';
  }

  if (!lastSeenTimestamp) {
    return 'Offline';
  }

  try {
    const date = new Date(lastSeenTimestamp);
    if (isNaN(date.getTime())) return 'Offline';

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) {
      return 'Last seen just now';
    }
    if (diffMins < 60) {
      return `Last seen ${diffMins}m ago`;
    }
    if (diffHours < 24) {
      return `Last seen ${diffHours}h ago`;
    }
    if (diffDays === 1) {
      return `Last seen yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    if (diffDays < 7) {
      return `Last seen ${diffDays}d ago`;
    }

    return `Last seen ${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
  } catch (e) {
    return 'Offline';
  }
}
