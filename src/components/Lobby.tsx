import { useState } from 'react';
import { motion } from 'motion/react';
import { Plus, Users, Hash, ChevronRight, Swords, Sparkles, Trophy } from 'lucide-react';
import { cn } from '../lib/utils';

interface LobbyProps {
  onCreateRoom: () => void;
  onJoinRoom: (roomId: string) => void;
}

export function Lobby({ onCreateRoom, onJoinRoom }: LobbyProps) {
  const [roomIdInput, setRoomIdInput] = useState('');

  return (
    <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 py-12">
      <div className="space-y-8">
        <div className="space-y-4">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-500 text-xs font-bold uppercase tracking-wider"
          >
            <Sparkles className="w-3 h-3" />
            New Season Live
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-6xl font-bold leading-tight"
          >
            Play Chess <br />
            <span className="text-white/40">With Anyone, Anywhere.</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="text-white/50 text-lg max-w-md"
          >
            Join the most advanced multiplayer chess platform. Create private rooms, 
            compete in real-time, and master the 64 squares.
          </motion.p>
        </div>

        <div className="flex flex-wrap gap-4">
          <div className="flex -space-x-3">
             {[1,2,3,4].map(i => (
               <img 
                key={i} 
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i * 123}`} 
                className="w-10 h-10 rounded-full border-2 border-[#0a0a0a] bg-white/10" 
                alt="Avatar"
               />
             ))}
             <div className="w-10 h-10 rounded-full border-2 border-[#0a0a0a] bg-white/5 flex items-center justify-center text-[10px] font-bold text-white/40">
               +2K
             </div>
          </div>
          <p className="text-white/40 text-sm flex items-center gap-2">
            <Trophy className="w-4 h-4 text-orange-400" />
            2,481 players online right now
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onCreateRoom}
          className="group relative overflow-hidden p-8 rounded-3xl bg-gradient-to-br from-orange-500 to-orange-600 border border-white/20 shadow-2xl shadow-orange-500/20 text-left transition-all"
        >
          <div className="relative z-10 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
              <Plus className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-2xl font-bold">Create Room</h3>
              <p className="text-white/80 text-sm mt-1">Start a new private match and invite a friend.</p>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
              Launch Now <ChevronRight className="w-4 h-4" />
            </div>
          </div>
          <Swords className="absolute -right-8 -bottom-8 w-48 h-48 opacity-10 group-hover:opacity-20 transition-opacity rotate-12" />
        </motion.button>

        <div className="p-8 rounded-3xl bg-white/5 border border-white/10 space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">
              <Hash className="w-6 h-6 text-orange-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Join Game</h3>
              <p className="text-white/40 text-sm">Enter a room code to join an existing session.</p>
            </div>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Ex: AB12CD"
              value={roomIdInput}
              onChange={(e) => setRoomIdInput(e.target.value.toUpperCase())}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-lg font-mono focus:outline-none focus:border-orange-500/50 transition-colors placeholder:text-white/10"
              maxLength={6}
            />
            <button
              onClick={() => onJoinRoom(roomIdInput)}
              disabled={!roomIdInput || roomIdInput.length < 3}
              className="px-6 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed font-bold transition-colors"
            >
              Join
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center gap-3">
             <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center"><Users className="w-4 h-4 text-blue-400" /></div>
             <div className="text-[10px] uppercase font-bold tracking-wider text-white/30">Local Play Coming Soon</div>
          </div>
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center gap-3">
             <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center"><Sparkles className="w-4 h-4 text-purple-400" /></div>
             <div className="text-[10px] uppercase font-bold tracking-wider text-white/30">Practice with Hydra AI</div>
          </div>
        </div>
      </div>
    </div>
  );
}
