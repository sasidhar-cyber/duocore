import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import api, { resolveStreamUrl } from '../services/api';

const MusicContext = createContext();

const THEMES = [
  { id: 'spotify', name: 'Spotify Green', primary: '#1db954', gradient: 'from-emerald-500 to-green-600', ring: 'ring-emerald-500' },
  { id: 'neon_pink', name: 'Neon Pink Glow', primary: '#ec4899', gradient: 'from-pink-500 to-rose-600', ring: 'ring-pink-500' },
  { id: 'cyber_cyan', name: 'Cyber Cyan', primary: '#06b6d4', gradient: 'from-cyan-500 to-blue-600', ring: 'ring-cyan-500' },
  { id: 'purple_twilight', name: 'Purple Twilight', primary: '#a855f7', gradient: 'from-purple-500 to-indigo-600', ring: 'ring-purple-500' },
  { id: 'amoled', name: 'Pure AMOLED', primary: '#ffffff', gradient: 'from-slate-800 to-black', ring: 'ring-slate-400' }
];

export const EQ_PRESETS = {
  'Flat': { bass: 0, mid: 0, treble: 0 },
  'Bass Boost': { bass: 7, mid: 1, treble: -1 },
  'Vocal': { bass: -2, mid: 6, treble: 2 },
  'Treble': { bass: -3, mid: 2, treble: 7 },
  'Balanced': { bass: 3, mid: 2, treble: 3 }
};

export function MusicProvider({ children }) {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [queue, setQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isLoop, setIsLoop] = useState(false);
  const [trackError, setTrackError] = useState(null);

  // Favorites (Synced with DB + Local Storage)
  const [favorites, setFavorites] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('soundwave_favorites') || '[]');
    } catch {
      return [];
    }
  });

  // Playlists
  const [playlists, setPlaylists] = useState([]);
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);
  const [playlistTrackToAdd, setPlaylistTrackToAdd] = useState(null);

  // History & Statistics
  const [recentlyPlayed, setRecentlyPlayed] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('soundwave_recently_played') || '[]');
    } catch {
      return [];
    }
  });
  const [userTasteArtists, setUserTasteArtists] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('soundwave_taste_artists') || '[]');
    } catch {
      return [];
    }
  });

  // Queue Drawer & Modals
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isLyricsOpen, setIsLyricsOpen] = useState(false);
  const [isNowPlayingOpen, setIsNowPlayingOpen] = useState(false);
  const [isShortcutsHelpOpen, setIsShortcutsHelpOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);

  // Lyrics Settings
  const [lyricsFontSize, setLyricsFontSize] = useState(18);
  const [lyricsOffsetMs, setLyricsOffsetMs] = useState(0);

  // Equalizer
  const [activeEqPreset, setActiveEqPreset] = useState('Flat');

  // Sleep Timer
  const [sleepTimerOption, setSleepTimerOption] = useState(null);
  const [sleepTimeRemaining, setSleepTimeRemaining] = useState(null);
  const sleepTimerRef = useRef(null);
  const sleepIntervalRef = useRef(null);

  // Theme & Customizable App Disguise Name
  const [activeTheme, setActiveTheme] = useState(() => localStorage.getItem('soundwave_theme') || 'spotify');
  const [appTitle, setAppTitle] = useState(() => localStorage.getItem('soundwave_app_title') || 'SoundWave');

  // Secret Steganography Vault Chat State
  const [isSecretChatOpen, setIsSecretChatOpen] = useState(false);

  const audioRef = useRef(null);
  const audioContextRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const bassFilterRef = useRef(null);
  const midFilterRef = useRef(null);
  const trebleFilterRef = useRef(null);

  // Save favorites & history to localStorage
  useEffect(() => {
    localStorage.setItem('soundwave_favorites', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem('soundwave_recently_played', JSON.stringify(recentlyPlayed));
  }, [recentlyPlayed]);

  useEffect(() => {
    localStorage.setItem('soundwave_taste_artists', JSON.stringify(userTasteArtists));
  }, [userTasteArtists]);

  // Load User DB Favorites & Playlists on mount
  useEffect(() => {
    api.getFavorites()
      .then((res) => {
        if (res.favorites && res.favorites.length > 0) {
          setFavorites(res.favorites);
        }
      })
      .catch(() => {});

    api.getPlaylists()
      .then((res) => {
        if (res.playlists) setPlaylists(res.playlists);
      })
      .catch(() => {});
  }, []);

  // Safe Equalizer Init (Only if supported and doesn't block audio element)
  const initEqualizer = () => {
    if (audioContextRef.current || !audioRef.current) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const source = ctx.createMediaElementSource(audioRef.current);
      sourceNodeRef.current = source;

      const bass = ctx.createBiquadFilter();
      bass.type = 'lowshelf';
      bass.frequency.value = 100;
      bassFilterRef.current = bass;

      const mid = ctx.createBiquadFilter();
      mid.type = 'peaking';
      mid.frequency.value = 1000;
      mid.Q.value = 1;
      midFilterRef.current = mid;

      const treble = ctx.createBiquadFilter();
      treble.type = 'highshelf';
      treble.frequency.value = 3000;
      trebleFilterRef.current = treble;

      source.connect(bass);
      bass.connect(mid);
      mid.connect(treble);
      treble.connect(ctx.destination);
    } catch (e) {
      // Mobile Safari / Chrome may restrict createMediaElementSource without CORS
      console.warn('[Equalizer] Handled gracefully:', e);
    }
  };

  const applyEqPreset = (presetName) => {
    setActiveEqPreset(presetName);
    initEqualizer();
    const gains = EQ_PRESETS[presetName] || EQ_PRESETS['Flat'];

    if (bassFilterRef.current) bassFilterRef.current.gain.value = gains.bass;
    if (midFilterRef.current) midFilterRef.current.gain.value = gains.mid;
    if (trebleFilterRef.current) trebleFilterRef.current.gain.value = gains.treble;
  };

  // Toggle Favorite
  const toggleFavorite = async (track) => {
    if (!track) return;
    const exists = favorites.some((t) => t.id === track.id);

    if (exists) {
      setFavorites((prev) => prev.filter((t) => t.id !== track.id));
      api.removeFavorite(track.id).catch(() => {});
    } else {
      setFavorites((prev) => [track, ...prev]);
      api.addFavorite(track).catch(() => {});
    }
  };

  const isFavorite = (trackId) => {
    return favorites.some((t) => t.id === trackId);
  };

  const playAllFavorites = (shuffle = false) => {
    if (favorites.length === 0) return;
    let list = [...favorites];
    if (shuffle) list = list.sort(() => Math.random() - 0.5);
    playTrack(list[0], list);
  };

  // Play a Track (Mobile & Desktop Rock Solid)
  const playTrack = async (track, newQueue = null, autoOpen = true) => {
    if (!track) return;

    if (newQueue) {
      setQueue(newQueue);
      const idx = newQueue.findIndex((t) => t.id === track.id);
      setCurrentIndex(idx !== -1 ? idx : 0);
    } else if (queue.length === 0) {
      setQueue([track]);
      setCurrentIndex(0);
    }

    setCurrentTrack(track);
    setTrackError(null);
    setIsBuffering(true);

    if (autoOpen) {
      setIsNowPlayingOpen(true);
    }

    // Save to Recently Played
    setRecentlyPlayed((prev) => {
      const filtered = prev.filter((t) => t.id !== track.id);
      return [track, ...filtered].slice(0, 30);
    });

    // Update Taste Profile
    if (track.artist) {
      setUserTasteArtists((prev) => {
        const cleanArtist = track.artist.split('-')[0].trim();
        const filtered = prev.filter((a) => a.toLowerCase() !== cleanArtist.toLowerCase());
        return [cleanArtist, ...filtered].slice(0, 10);
      });
    }

    // Record History in DB
    api.recordHistory(track, track.seconds || 0).catch(() => {});

    try {
      const res = await api.getMusicStream(track.id);
      if (!res.streamUrl) throw new Error('Stream URL unavailable');
      const resolvedUrl = resolveStreamUrl(res.streamUrl);

      if (audioRef.current) {
        audioRef.current.src = resolvedUrl;
        audioRef.current.load();

        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              setIsPlaying(true);
              setIsBuffering(false);
              setTrackError(null);
            })
            .catch((err) => {
              console.warn('[Mobile Autoplay]:', err.message);
              setIsBuffering(false);
            });
        }
      }
    } catch (err) {
      console.error('[Music Stream Error]:', err);
      setIsBuffering(false);
      setIsPlaying(false);
      setTrackError('Unable to play this track. Please check connection or tap Retry.');
    }
  };

  const retryPlayback = () => {
    if (currentTrack) {
      playTrack(currentTrack, queue, false);
    }
  };

  const togglePlay = () => {
    if (!audioRef.current || !currentTrack) return;
    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume().catch(() => {});
    }
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch((e) => {
          console.warn('Play error:', e);
          setIsBuffering(false);
        });
    }
  };

  const nextTrack = useCallback(() => {
    if (queue.length === 0) return;
    let nextIdx = isShuffle
      ? Math.floor(Math.random() * queue.length)
      : (currentIndex + 1) % queue.length;
    setCurrentIndex(nextIdx);
    playTrack(queue[nextIdx]);
  }, [queue, currentIndex, isShuffle]);

  const prevTrack = () => {
    if (queue.length === 0) return;
    let prevIdx = (currentIndex - 1 + queue.length) % queue.length;
    setCurrentIndex(prevIdx);
    playTrack(queue[prevIdx]);
  };

  const seekTo = (seconds) => {
    if (audioRef.current) {
      audioRef.current.currentTime = seconds;
      setCurrentTime(seconds);
    }
  };

  const skipTime = (deltaSeconds) => {
    if (audioRef.current) {
      const newTime = Math.max(0, Math.min(duration || 100, currentTime + deltaSeconds));
      seekTo(newTime);
    }
  };

  const handleVolumeChange = (newVol) => {
    setVolume(newVol);
    setIsMuted(newVol === 0);
    if (audioRef.current) {
      audioRef.current.volume = newVol;
    }
  };

  const toggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      handleVolumeChange(volume || 0.8);
    } else {
      setIsMuted(true);
      if (audioRef.current) audioRef.current.volume = 0;
    }
  };

  // Queue Operations
  const addToQueue = (track) => {
    setQueue((prev) => [...prev, track]);
  };

  const playNextInQueue = (track) => {
    setQueue((prev) => {
      const nextQueue = [...prev];
      nextQueue.splice(currentIndex + 1, 0, track);
      return nextQueue;
    });
  };

  const removeFromQueue = (index) => {
    setQueue((prev) => prev.filter((_, idx) => idx !== index));
    if (index < currentIndex) setCurrentIndex((i) => Math.max(0, i - 1));
  };

  const clearQueue = () => {
    if (currentTrack) {
      setQueue([currentTrack]);
      setCurrentIndex(0);
    } else {
      setQueue([]);
      setCurrentIndex(0);
    }
  };

  const reorderQueue = (fromIdx, toIdx) => {
    setQueue((prev) => {
      const copy = [...prev];
      const [moved] = copy.splice(fromIdx, 1);
      copy.splice(toIdx, 0, moved);
      return copy;
    });
  };

  // Sleep Timer
  const setSleepTimer = (option) => {
    cancelSleepTimer();
    setSleepTimerOption(option);

    if (option === 'end_of_song') {
      setSleepTimeRemaining('End of Song');
      return;
    }

    const minutes = Number(option);
    if (isNaN(minutes)) return;

    let secondsLeft = minutes * 60;
    setSleepTimeRemaining(`${Math.ceil(secondsLeft / 60)}m`);

    sleepIntervalRef.current = setInterval(() => {
      secondsLeft -= 1;
      if (secondsLeft <= 0) {
        if (audioRef.current) audioRef.current.pause();
        setIsPlaying(false);
        cancelSleepTimer();
      } else {
        const mins = Math.floor(secondsLeft / 60);
        const secs = secondsLeft % 60;
        setSleepTimeRemaining(`${mins}:${secs < 10 ? '0' : ''}${secs}`);
      }
    }, 1000);
  };

  const cancelSleepTimer = () => {
    if (sleepIntervalRef.current) clearInterval(sleepIntervalRef.current);
    if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
    setSleepTimerOption(null);
    setSleepTimeRemaining(null);
  };

  // Playlists API Helpers
  const fetchPlaylists = async () => {
    try {
      const res = await api.getPlaylists();
      if (res.playlists) setPlaylists(res.playlists);
    } catch {}
  };

  const createPlaylist = async (name, description = '') => {
    const res = await api.createPlaylist({ name, description });
    await fetchPlaylists();
    return res.playlist;
  };

  const deletePlaylist = async (id) => {
    await api.deletePlaylist(id);
    await fetchPlaylists();
  };

  const addSongToPlaylist = async (playlistId, track) => {
    await api.addSongToPlaylist(playlistId, track);
    await fetchPlaylists();
  };

  const removeSongFromPlaylist = async (playlistId, trackId) => {
    await api.removeSongFromPlaylist(playlistId, trackId);
    await fetchPlaylists();
  };

  const playPlaylist = async (playlistId, shuffle = false) => {
    try {
      const res = await api.getPlaylist(playlistId);
      if (res.tracks && res.tracks.length > 0) {
        let list = [...res.tracks];
        if (shuffle) list = list.sort(() => Math.random() - 0.5);
        playTrack(list[0], list);
      }
    } catch (e) {
      console.warn('Could not play playlist:', e);
    }
  };

  // Audio Element Listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0);
      setIsBuffering(false);
    };
    const handleCanPlay = () => setIsBuffering(false);
    const handleError = () => {
      setIsBuffering(false);
      setIsPlaying(false);
    };
    const handleEnded = () => {
      if (sleepTimerOption === 'end_of_song') {
        cancelSleepTimer();
        setIsPlaying(false);
        return;
      }
      if (isLoop) {
        audio.currentTime = 0;
        audio.play();
      } else {
        nextTrack();
      }
    };
    const handleWaiting = () => setIsBuffering(true);
    const handlePlaying = () => {
      setIsBuffering(false);
      setIsPlaying(true);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('error', handleError);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('playing', handlePlaying);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('playing', handlePlaying);
    };
  }, [queue, currentIndex, isShuffle, isLoop, sleepTimerOption, nextTrack]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = e.target.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || e.target.isContentEditable) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        skipTime(-5);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        skipTime(5);
      } else if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        nextTrack();
      } else if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        prevTrack();
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        toggleMute();
      } else if (e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        setIsLyricsOpen((prev) => !prev);
      } else if (e.key === 'f' || e.key === 'F') {
        if (currentTrack) {
          e.preventDefault();
          toggleFavorite(currentTrack);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentTrack, isPlaying, isMuted, volume, currentTime, duration, nextTrack]);

  return (
    <MusicContext.Provider
      value={{
        currentTrack,
        queue,
        currentIndex,
        isPlaying,
        isBuffering,
        currentTime,
        duration,
        volume,
        isMuted,
        isShuffle,
        isLoop,
        favorites,
        playlists,
        recentlyPlayed,
        userTasteArtists,
        isQueueOpen,
        isLyricsOpen,
        isNowPlayingOpen,
        isShortcutsHelpOpen,
        isStatsOpen,
        lyricsFontSize,
        lyricsOffsetMs,
        activeEqPreset,
        trackError,
        setTrackError,
        retryPlayback,
        sleepTimerOption,
        sleepTimeRemaining,
        activeTheme,
        appTitle,
        isSecretChatOpen,
        isPlaylistModalOpen,
        playlistTrackToAdd,
        THEMES,
        EQ_PRESETS,
        playTrack,
        togglePlay,
        nextTrack,
        prevTrack,
        seekTo,
        skipTime,
        handleVolumeChange,
        toggleMute,
        setIsShuffle,
        setIsLoop,
        toggleFavorite,
        isFavorite,
        playAllFavorites,
        addToQueue,
        playNextInQueue,
        removeFromQueue,
        clearQueue,
        reorderQueue,
        setSleepTimer,
        cancelSleepTimer,
        applyEqPreset,
        setLyricsFontSize,
        setLyricsOffsetMs,
        setIsLyricsOpen,
        setIsQueueOpen,
        openQueue: () => setIsQueueOpen(true),
        closeQueue: () => setIsQueueOpen(false),
        openNowPlaying: () => setIsNowPlayingOpen(true),
        closeNowPlaying: () => setIsNowPlayingOpen(false),
        openShortcutsHelp: () => setIsShortcutsHelpOpen(true),
        closeShortcutsHelp: () => setIsShortcutsHelpOpen(false),
        openStats: () => setIsStatsOpen(true),
        closeStats: () => setIsStatsOpen(false),
        openPlaylistModal: (track) => { setPlaylistTrackToAdd(track); setIsPlaylistModalOpen(true); },
        closePlaylistModal: () => { setPlaylistTrackToAdd(null); setIsPlaylistModalOpen(false); },
        fetchPlaylists,
        createPlaylist,
        deletePlaylist,
        addSongToPlaylist,
        removeSongFromPlaylist,
        playPlaylist,
        changeTheme: (t) => { setActiveTheme(t); localStorage.setItem('soundwave_theme', t); },
        changeAppTitle: (t) => { setAppTitle(t); localStorage.setItem('soundwave_app_title', t); },
        openSecretChat: () => setIsSecretChatOpen(true),
        closeSecretChat: () => setIsSecretChatOpen(false)
      }}
    >
      <audio
        ref={audioRef}
        preload="auto"
        playsInline
        webkit-playsinline="true"
      />
      {children}
    </MusicContext.Provider>
  );
}

export function useMusic() {
  return useContext(MusicContext);
}
