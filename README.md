# ⚡ DuoCore

> **1v1 Stealth Duo Chat & High-Fidelity Music Streaming Platform**  
> *Created with ❤️ by **C Sasidhar Reddy***

[![Production Deployment](https://img.shields.io/badge/Render-Live%20Deploy-brightgreen?logo=render)](https://soundwave-ns7b.onrender.com)
[![Platform](https://img.shields.io/badge/Platform-Web%20%7C%20PWA%20%7C%20Android%20(Capacitor)-blue)](https://soundwave-ns7b.onrender.com)
[![License](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)

---

## 🌐 Live Application
* **Production Web App**: [https://soundwave-ns7b.onrender.com](https://soundwave-ns7b.onrender.com)
* **Backend API Health**: [https://soundwave-ns7b.onrender.com/api/health](https://soundwave-ns7b.onrender.com/api/health)

---

## 📱 Android APK & Mobile Installation

### Option 1: Instant PWA Install (Android Chrome / iOS Safari)
1. Open [https://soundwave-ns7b.onrender.com](https://soundwave-ns7b.onrender.com) in **Google Chrome** on your Android phone.
2. Tap the browser menu (three dots `⋮`) and select **"Install App"** or **"Add to Home screen"**.
3. Launch DuoCore directly from your home screen as a standalone full-screen mobile app.

### Option 2: Build Native Android APK (Capacitor)
DuoCore includes a full native Android project configured with `@capacitor/android`.

```bash
# 1. Clone repository
git clone https://github.com/sasidhar-cyber/duocore.git
cd duocore

# 2. Install dependencies & build frontend assets
cd frontend
npm install
npm run build

# 3. Synchronize web assets with Android Native project
npx cap sync android

# 4. Open in Android Studio or build APK with Gradle
npx cap open android
# In Android Studio: Build -> Build Bundle(s) / APK(s) -> Build APK(s)
# Output APK: frontend/android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 🌟 Key Features

### 🎵 1. High-Fidelity Music Streaming Engine
* **A-to-Z Music Catalog**: Stream millions of tracks, chartbusters, and global pop in high-bitrate audio.
* **Telugu Music & Cinema Hub**: Special curated hubs for Tollywood blockbusters (*Animal*, *Devara*, *Kalki 2898 AD*, *Guntur Kaaram*, *Hi Nanna*, *Sita Ramam*, *RRR*, etc.).
* **Smart Instant Search & Telugu Voice Search**: Real-time autocomplete, debounced query resolution, and Telugu voice search recognition.
* **Albums & Artists Explorer**: Full album tracks, discographies, and artist profiles.
* **Rich Audio Player Architecture**:
  * **Bottom Sticky Mini Player** with quick playback controls and progress bar.
  * **Full-Screen Now Playing Player** with dynamic album artwork, queue controls, and time seeking.
  * **Synchronized Karaoke Lyrics** with adjustable font size and sync offsets.
  * **5-Band Equalizer** with presets (*Bass Boost*, *Vocal*, *Treble*, *Balanced*, *Flat*) and custom tuning.
  * **Sleep Timer** (10m, 20m, 30m, 45m, 60m, or End of Current Song).
* **Offline MP3 Downloads**: Direct song downloading for authorized streams with local offline library management.

---

### 💬 2. 1v1 Stealth Duo Chat
* **Stealth Disguise Mode**: DuoCore appears as an innocent, polished music player. The private 1v1 chat is accessible only via secret trigger (triple-tap logo or 4-digit PIN unlock).
* **Private 1v1 Pairing**: Join using a secure 6-character room code (`DUO-XXX`).
* **Real-Time Active / Online Status**: Live partner presence indicator (`Active now` with animated emerald pulse, accurate last-seen timestamps).
* **Real-Time Typing Indicator**: In-stream 3-dot typing bubble on receiver side and header subtitle indicator.
* **Default Blue + Pink Chat Theme**: Sent bubbles in vibrant blue-to-pink gradient with high readability; received bubbles in subtle midnight slate with blue/pink accents.
* **Real Message Delivery States**: Real-time sent (`✓`), delivered (`✓✓`), and blue read ticks (`✓✓`).
* **Media & File Attachments**: Share photos, videos, recorded voice notes, and documents.
* **Message Actions**: Context menu with Reply, Star, Pin, Copy, and Delete.
* **Emergency Panic Clear & Stealth Wipe**: Instantly wipe all chat messages from server database and both devices on repeated wrong PIN entry.

---

### 📞 3. WebRTC Audio & HD Video Calls
* **1v1 Real-Time Peer-to-Peer Calls**: High-definition audio and video calling directly between paired partners.
* **Incoming Call Overlay**: Custom ringing modal with browser notification signaling.
* **Call Controls**: Front/Rear camera switching, microphone mute, and video toggle.

---

### 🛡️ 4. Security & Cloud Persistence
* **Dual Database Architecture**: SQLite for local speed paired with automated persistent cloud synchronization to **Supabase PostgreSQL**.
* **Transport Encryption**: All communication is secured via HTTPS/TLS and Secure WebSockets (`wss://`).
* **Session Security**: JWT-based authentication, rate limiting, and helmet security headers.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite, Tailwind CSS, Lucide Icons, Socket.IO Client, Web Audio API, WebRTC |
| **Mobile** | Capacitor Android Native Container, Progressive Web App (PWA) |
| **Backend** | Node.js, Express.js, Socket.IO Server, Better-SQLite3, `yt-dlp`, Axios |
| **Cloud Database** | Supabase (PostgreSQL Persistent Snapshot Sync) |
| **Deployment** | Render (Node Production Environment) |

---

## 🚀 Local Development Setup

### Prerequisites
* **Node.js**: v18.0.0 or higher
* **npm**: v9.0.0 or higher

### 1. Clone & Install
```bash
git clone https://github.com/sasidhar-cyber/duocore.git
cd duocore
npm run build
```

### 2. Start Application
```bash
# Start both Backend (Port 5000) and Frontend (Port 3000)
./start.sh
```

- **Frontend**: `http://localhost:3000`
- **Backend API**: `http://localhost:5000`
- **Health Check**: `http://localhost:5000/api/health`

---

## 👨‍💻 Author

* **Created by**: **C Sasidhar Reddy**
* **GitHub**: [@sasidhar-cyber](https://github.com/sasidhar-cyber)

---

## 📄 License
This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
