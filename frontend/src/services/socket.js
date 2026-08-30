import { io } from 'socket.io-client';

let socket = null;
let currentToken = null;
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || '/';

export function getSocket() {
  const token = localStorage.getItem('duocore_token');

  // If token changed or socket is null, recreate socket
  if (!socket || (token && token !== currentToken)) {
    if (socket) {
      socket.disconnect();
    }
    currentToken = token;
    socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['polling', 'websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 30,
      reconnectionDelay: 1000
    });
  }
  return socket;
}

export function connectSocket(token) {
  const activeToken = token || localStorage.getItem('duocore_token');

  if (socket && currentToken !== activeToken) {
    socket.disconnect();
    socket = null;
  }

  currentToken = activeToken;

  if (!socket) {
    socket = io(SOCKET_URL, {
      auth: { token: activeToken },
      transports: ['polling', 'websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 30,
      reconnectionDelay: 1000
    });
  } else {
    socket.auth = { token: activeToken };
    if (!socket.connected) {
      socket.connect();
    }
  }

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
    currentToken = null;
  }
}
