const API_BASE = import.meta.env.VITE_API_BASE || '/api';

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('duocore_token');
  const isFormData = options.body instanceof FormData;
  const headers = {
    ...(!isFormData && { 'Content-Type': 'application/json' }),
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
  };

  if (options.body && typeof options.body === 'object' && !isFormData) {
    config.body = JSON.stringify(options.body);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, config);

  if (response.status === 401) {
    if (!endpoint.includes('/auth/login') && !endpoint.includes('/auth/register')) {
      localStorage.removeItem('duocore_token');
    }
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `HTTP Error ${response.status}`);
  }

  return data;
}

export default {
  // Auth & Profile
  register: (body) => apiRequest('/auth/register', { method: 'POST', body }),
  login: (body) => apiRequest('/auth/login', { method: 'POST', body }),
  getMe: () => apiRequest('/auth/me'),
  updateProfile: (body) => apiRequest('/auth/profile', { method: 'PATCH', body }),
  changePassword: (body) => apiRequest('/auth/change-password', { method: 'POST', body }),

  // Music & Songs API (A to Z YouTube/Spotify Music Streaming, Lyrics, Downloads)
  searchMusic: (q) => apiRequest(`/music/search?q=${encodeURIComponent(q)}`),
  searchMusicAdvanced: ({ q = '', language = '', year = '', category = '' }) =>
    apiRequest(`/music/search?q=${encodeURIComponent(q)}&language=${encodeURIComponent(language)}&year=${encodeURIComponent(year)}&category=${encodeURIComponent(category)}`),
  getSearchSuggestions: (q) => apiRequest(`/music/suggestions?q=${encodeURIComponent(q)}`),
  getTrendingMusic: () => apiRequest('/music/trending'),
  getMusicStream: (videoId) => apiRequest(`/music/stream/${videoId}`),
  getMusicLyrics: (track, artist) => apiRequest(`/music/lyrics?track=${encodeURIComponent(track)}&artist=${encodeURIComponent(artist || '')}`),
  getMusicDownloadUrl: (videoId, title) => `/api/music/download/${videoId}?title=${encodeURIComponent(title || 'song')}`,

  // Favorites (Database Persisted)
  getFavorites: () => apiRequest('/music/favorites'),
  addFavorite: (track) => apiRequest('/music/favorites', {
    method: 'POST',
    body: {
      trackId: track.id,
      title: track.title,
      artist: track.artist,
      thumbnail: track.thumbnail,
      duration: track.duration,
      album: track.album
    }
  }),
  removeFavorite: (trackId) => apiRequest(`/music/favorites/${encodeURIComponent(trackId)}`, { method: 'DELETE' }),

  // Custom Playlists (Database Persisted)
  getPlaylists: () => apiRequest('/music/playlists'),
  createPlaylist: (body) => apiRequest('/music/playlists', { method: 'POST', body }),
  getPlaylist: (id) => apiRequest(`/music/playlists/${id}`),
  updatePlaylist: (id, body) => apiRequest(`/music/playlists/${id}`, { method: 'PUT', body }),
  deletePlaylist: (id) => apiRequest(`/music/playlists/${id}`, { method: 'DELETE' }),
  addSongToPlaylist: (playlistId, track) => apiRequest(`/music/playlists/${playlistId}/songs`, {
    method: 'POST',
    body: {
      trackId: track.id,
      title: track.title,
      artist: track.artist,
      thumbnail: track.thumbnail,
      duration: track.duration,
      album: track.album
    }
  }),
  removeSongFromPlaylist: (playlistId, trackId) => apiRequest(`/music/playlists/${playlistId}/songs/${encodeURIComponent(trackId)}`, { method: 'DELETE' }),

  // Listening History & Statistics
  recordHistory: (track, playDurationSeconds = 0) => apiRequest('/music/history', {
    method: 'POST',
    body: {
      trackId: track.id,
      title: track.title,
      artist: track.artist,
      thumbnail: track.thumbnail,
      duration: track.duration,
      album: track.album,
      playDurationSeconds
    }
  }),
  getHistory: (limit = 50) => apiRequest(`/music/history?limit=${limit}`),
  deleteHistoryItem: (id) => apiRequest(`/music/history/${id}`, { method: 'DELETE' }),
  clearHistory: () => apiRequest('/music/history', { method: 'DELETE' }),
  getStats: () => apiRequest('/music/stats'),
  getRecommendations: () => apiRequest('/music/recommendations'),

  // Duo Partnership & Invites (Persistent 1-Time Connect)
  getCurrentPartner: () => apiRequest('/partners/current'),
  createDuoRoom: () => apiRequest('/partners/create-room', { method: 'POST' }),
  removePartner: () => apiRequest('/partners/remove', { method: 'POST' }),
  createInvite: () => apiRequest('/invites/create', { method: 'POST' }),
  validateInvite: (code) => apiRequest(`/invites/code/${encodeURIComponent(code)}`),
  acceptInvite: (code) => apiRequest('/invites/accept', { method: 'POST', body: { code } }),
  cancelInvite: () => apiRequest('/invites/cancel', { method: 'POST' }),
  leaveRoom: (roomId) => apiRequest('/partners/remove', { method: 'POST' }),

  // Rooms & Messages (Normal + Private Channels + Uploads)
  getRoomMessages: (roomId, channel = 'normal') => apiRequest(`/rooms/${roomId}/messages?channel=${channel}`),
  sendRoomMessage: (roomId, body) => apiRequest(`/rooms/${roomId}/messages`, { method: 'POST', body }),
  uploadFile: (roomId, formData) => apiRequest(`/rooms/${roomId}/upload`, { method: 'POST', body: formData }),
  updateRoomStatus: (roomId, body) => apiRequest(`/rooms/${roomId}/status`, { method: 'PATCH', body }),
  markMessagesRead: (roomId, body) => apiRequest(`/rooms/${roomId}/messages/read`, { method: 'POST', body }),
  deleteMessage: (roomId, messageId) => apiRequest(`/rooms/${roomId}/messages/${messageId}`, { method: 'DELETE' }),

  // Starred & Pinned Messages
  starMessage: (roomId, messageId) => apiRequest(`/rooms/${roomId}/messages/${messageId}/star`, { method: 'POST' }),
  unstarMessage: (roomId, messageId) => apiRequest(`/rooms/${roomId}/messages/${messageId}/star`, { method: 'DELETE' }),
  getStarredMessages: (roomId) => apiRequest(`/rooms/${roomId}/starred`),
  pinMessage: (roomId, messageId) => apiRequest(`/rooms/${roomId}/messages/${messageId}/pin`, { method: 'POST' }),
  unpinMessage: (roomId, messageId) => apiRequest(`/rooms/${roomId}/messages/${messageId}/pin`, { method: 'DELETE' }),
  getPinnedMessages: (roomId) => apiRequest(`/rooms/${roomId}/pinned`),

  // Chat Search, Media Gallery, and Call Logging
  searchChat: (roomId, q) => apiRequest(`/rooms/${roomId}/search?q=${encodeURIComponent(q)}`),
  getMediaGallery: (roomId) => apiRequest(`/rooms/${roomId}/media`),
  logCall: (roomId, body) => apiRequest(`/rooms/${roomId}/calls`, { method: 'POST', body }),
  getCallHistory: (roomId) => apiRequest(`/rooms/${roomId}/calls`),

  // Cyber & Linux Labs
  getCyberProgress: () => apiRequest('/cyber/progress'),
  updateCyberProgress: (body) => apiRequest('/cyber/progress/update', { method: 'POST', body }),
  getLinuxProgress: () => apiRequest('/linux/progress'),
  updateLinuxProgress: (body) => apiRequest('/linux/progress/update', { method: 'POST', body }),
  execLinuxCommand: (command, cwd) => apiRequest('/linux/terminal', { method: 'POST', body: { command, cwd } }),

  // Quizzes & Revision
  getQuizQuestions: (subjectSlug, count = 8) => apiRequest(`/quizzes/questions?subjectSlug=${subjectSlug}&count=${count}`),
  submitQuizAnswer: (body) => apiRequest('/quizzes/submit-answer', { method: 'POST', body }),
  getRevisionItems: () => apiRequest('/revision'),
  addRevisionItem: (body) => apiRequest('/revision/add', { method: 'POST', body }),
  removeRevisionItem: (id) => apiRequest(`/revision/${id}`, { method: 'DELETE' }),
};
