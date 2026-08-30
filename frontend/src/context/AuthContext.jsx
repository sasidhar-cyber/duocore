import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('duocore_token'));
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(localStorage.getItem('duocore_sound_enabled') !== 'false');

  useEffect(() => {
    async function loadUser() {
      const activeToken = localStorage.getItem('duocore_token');
      if (activeToken) {
        try {
          const res = await api.getMe();
          setUser(res.user);
          setToken(activeToken);
          connectSocket(activeToken);
          setLoading(false);
          return;
        } catch (err) {
          localStorage.removeItem('duocore_token');
        }
      }

      // Auto-create seamless instant user session if none exists
      try {
        const guestName = 'User_' + Math.floor(1000 + Math.random() * 9000);
        const res = await api.register({
          username: guestName,
          email: `${guestName.toLowerCase()}@soundwave.local`,
          password: 'secret_guest_pass'
        });
        localStorage.setItem('duocore_token', res.token);
        setToken(res.token);
        setUser(res.user);
        connectSocket(res.token);
      } catch (e) {
        console.warn('[AuthContext] Auto session fallback:', e);
      }
      setLoading(false);
    }
    loadUser();
  }, []);

  const login = async (arg1, arg2) => {
    let payload = typeof arg1 === 'object' ? arg1 : { usernameOrEmail: arg1, password: arg2 };
    if (!payload.usernameOrEmail && payload.username) {
      payload.usernameOrEmail = payload.username;
    }
    const res = await api.login(payload);
    localStorage.setItem('duocore_token', res.token);
    setToken(res.token);
    setUser(res.user);
    connectSocket(res.token);
    return res;
  };

  const register = async (arg1, arg2, arg3) => {
    let payload = typeof arg1 === 'object' ? arg1 : { username: arg1, email: arg2, password: arg3 };
    const res = await api.register(payload);
    localStorage.setItem('duocore_token', res.token);
    setToken(res.token);
    setUser(res.user);
    connectSocket(res.token);
    return res;
  };

  const demoLogin = async (role) => {
    const res = await api.demoLogin(role);
    localStorage.setItem('duocore_token', res.token);
    setToken(res.token);
    setUser(res.user);
    connectSocket(res.token);
    return res;
  };

  const logout = () => {
    localStorage.removeItem('duocore_token');
    setToken(null);
    setUser(null);
    disconnectSocket();
  };

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem('duocore_sound_enabled', String(next));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        soundEnabled,
        login,
        register,
        demoLogin,
        logout,
        toggleSound
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
