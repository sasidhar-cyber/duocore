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
      if (token) {
        try {
          const res = await api.getMe();
          setUser(res.user);
          connectSocket(token);
        } catch (err) {
          localStorage.removeItem('duocore_token');
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    }
    loadUser();
  }, [token]);

  const login = async (usernameOrEmail, password) => {
    const res = await api.login({ usernameOrEmail, password });
    localStorage.setItem('duocore_token', res.token);
    setToken(res.token);
    setUser(res.user);
    connectSocket(res.token);
    return res;
  };

  const register = async (username, email, password) => {
    const res = await api.register({ username, email, password });
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
        toggleSound,
        login,
        register,
        demoLogin,
        logout,
        setUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
