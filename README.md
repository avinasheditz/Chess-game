# ♟️ Online Multiplayer Chess Game

A modern real-time multiplayer Chess Game where two players can play together from different devices using a Room Code system.

The project is fully responsive, production-ready, GitHub deployable, and designed with a premium modern UI similar to professional chess platforms.

---

# 🚨 Important Rule

This chess game must implement all official chess mechanics **EXCEPT visible “Check” or “King in danger” alerts**.

The game must NOT display:
- “Check”
- King danger warnings
- Flashing king effects
- Danger highlights
- Warning sounds

However, legal chess rules must still be enforced internally.

---

# ✨ Features

## 🌐 Online Multiplayer
- Real-time multiplayer gameplay
- Room code system
- Create Room functionality
- Join Room functionality
- Unique room generation
- Sync moves instantly across devices
- Prevent third-player joining
- Auto reconnect support
- Opponent disconnect detection
- Rematch system
- Leave room option

---

## ♟️ Chess Features
- Full chess rules support
- Legal move validation
- Drag-and-drop movement
- Mobile touch support
- Pawn promotion popup
- Castling
- En passant
- Checkmate detection
- Stalemate detection
- Draw conditions
- Move history panel
- Captured pieces display
- Chess timers/clocks
- Last move highlighting
- Available move indicators
- Undo request system
- Restart match request system

---

## 🎨 UI / UX
- Premium modern interface
- Responsive design
- Mobile-first layout
- Dark/light mode
- Smooth animations
- Glassmorphism or minimal UI
- Multiple board themes
- Elegant typography
- Player avatars
- Connection status indicators
- Animated transitions

---

## 💬 Additional Features
- In-game chat
- Sound effects
- Mute/unmute option
- Save/load matches
- Match history
- Replay finished games
- PGN export/import
- FEN support
- Spectator mode (optional)

---

# 🛠️ Recommended Tech Stack

## Frontend
- React or Next.js
- Tailwind CSS
- react-chessboard
- chess.js

## Backend / Realtime
Choose one:
- Firebase Realtime Database
- Firebase Firestore
- Node.js + Socket.io

## Deployment
Compatible with:
- GitHub Pages
- Vercel
- Netlify
- Render

---

# 📁 Suggested Folder Structure

```bash
online-chess/
│
├── public/
│
├── src/
│   ├── components/
│   │   ├── Board/
│   │   ├── Chat/
│   │   ├── Room/
│   │   ├── Timer/
│   │   ├── Modals/
│   │   └── UI/
│   │
│   ├── pages/
│   │
│   ├── hooks/
│   │
│   ├── services/
│   │   ├── firebase/
│   │   └── socket/
│   │
│   ├── utils/
│   │
│   ├── context/
│   │
│   ├── styles/
│   │
│   └── App.jsx
│
├── .env
├── .gitignore
├── package.json
├── README.md
└── tailwind.config.js
