const API_BASE = '/api';

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

  // Duo Partnership & Invites (Persistent 1-Time Connect)
  getCurrentPartner: () => apiRequest('/partners/current'),
  removePartner: () => apiRequest('/partners/remove', { method: 'POST' }),
  createInvite: () => apiRequest('/invites/create', { method: 'POST' }),
  validateInvite: (code) => apiRequest(`/invites/code/${encodeURIComponent(code)}`),
  acceptInvite: (code) => apiRequest('/invites/accept', { method: 'POST', body: { code } }),
  cancelInvite: () => apiRequest('/invites/cancel', { method: 'POST' }),

  // Rooms & Messages (Normal + Private Channels + Uploads)
  getRoomMessages: (roomId, channel = 'normal') => apiRequest(`/rooms/${roomId}/messages?channel=${channel}`),
  sendRoomMessage: (roomId, body) => apiRequest(`/rooms/${roomId}/messages`, { method: 'POST', body }),
  uploadFile: (roomId, formData) => apiRequest(`/rooms/${roomId}/upload`, { method: 'POST', body: formData }),
  updateRoomStatus: (roomId, body) => apiRequest(`/rooms/${roomId}/status`, { method: 'PATCH', body }),

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
