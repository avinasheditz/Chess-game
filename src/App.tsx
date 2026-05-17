/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { Lobby } from './components/Lobby';
import { ChessGame } from './components/ChessGame';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, ChevronRight, Globe, Shield, Settings } from 'lucide-react';

export default function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [gameState, setGameState] = useState<{
    roomId: string | null;
    color: 'white' | 'black' | null;
    status: 'lobby' | 'playing';
  }>({
    roomId: null,
    color: null,
    status: 'lobby',
  });

  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    newSocket.on('room-created', ({ roomId, color }) => {
      setGameState({ roomId, color, status: 'playing' });
    });

    newSocket.on('room-joined', ({ roomId, color }) => {
      setGameState({ roomId, color, status: 'playing' });
    });

    return () => {
      newSocket.close();
    };
  }, []);

  const handleCreateRoom = () => {
    socket?.emit('create-room');
  };

  const handleJoinRoom = (roomId: string) => {
    socket?.emit('join-room', roomId);
  };

  const handleLeaveRoom = () => {
    setGameState({ roomId: null, color: null, status: 'lobby' });
    // Join room 0 to "leave" current room in socket logic or just rely on state
    window.location.reload(); // Hard reset for simplicity
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-orange-500/30">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-orange-600/5 blur-[120px]" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] rounded-full bg-blue-600/5 blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-[0.02] bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
      </div>

      <header className="relative z-10 border-b border-white/5 bg-black/20 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center rotate-3 shadow-lg shadow-orange-500/20">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
              Grandmaster
            </h1>
          </div>
          
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-white/50">
            <a href="#" className="hover:text-white transition-colors">Play</a>
            <a href="#" className="hover:text-white transition-colors">Learn</a>
            <a href="#" className="hover:text-white transition-colors">Puzzles</a>
            <a href="#" className="hover:text-white transition-colors">Leaderboard</a>
          </nav>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Live
            </div>
            
            <button 
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <Settings className="w-5 h-5 text-white/40" />
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 w-full max-w-7xl mx-auto px-2 sm:px-4 py-4 md:py-8 lg:py-12 flex-1 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          {gameState.status === 'lobby' ? (
            <motion.div
              key="lobby"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Lobby 
                onCreateRoom={handleCreateRoom} 
                onJoinRoom={handleJoinRoom} 
              />
            </motion.div>
          ) : (
            <motion.div
              key="game"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.4 }}
            >
              <ChessGame 
                socket={socket!} 
                roomId={gameState.roomId!} 
                playerColor={gameState.color!} 
                onLeave={handleLeaveRoom}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="relative z-10 border-t border-white/5 bg-black/40 py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-white/30 text-sm flex items-center gap-4">
             <span className="flex items-center gap-1.5"><Globe className="w-4 h-4" /> Global Servers</span>
             <span className="flex items-center gap-1.5"><Shield className="w-4 h-4" /> Secure Auth</span>
          </div>
          <div className="text-white/20 text-xs tracking-widest uppercase font-mono">
            Professional Chess Protocol v1.0
          </div>
        </div>
      </footer>
    </div>
  );
}

