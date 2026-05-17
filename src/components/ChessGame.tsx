import { useState, useEffect, useCallback, useRef } from 'react';
import { Chess, Move } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import useSound from 'use-sound';
import { 
  Copy, Check, Share2, MessageSquare, History, 
  Settings, Flag, RefreshCcw, MoreVertical,
  ChevronLeft, Send, User, Trophy, Clock, Sparkles, X, Volume2, VolumeX
} from 'lucide-react';
import { Chat } from './Chat';
import { cn } from '../lib/utils';

interface ChessGameProps {
  socket: Socket;
  roomId: string;
  playerColor: 'white' | 'black';
  onLeave: () => void;
}

const MOVE_SOUND = 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3';
const CAPTURE_SOUND = 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3';
const CHECK_SOUND = 'https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3';
const GAME_OVER_SOUND = 'https://assets.mixkit.co/active_storage/sfx/2570/2570-preview.mp3';

export function ChessGame({ socket, roomId, playerColor, onLeave }: ChessGameProps) {
  const [game, setGame] = useState(new Chess());
  const [lastMove, setLastMove] = useState<Move | null>(null);
  const [history, setHistory] = useState<Move[]>([]);
  const [isGameOver, setIsGameOver] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [opponentName, setOpponentName] = useState('Opponent');
  const [whiteTime, setWhiteTime] = useState(600);
  const [blackTime, setBlackTime] = useState(600);
  const [muted, setMuted] = useState(false);

  const [playMove] = useSound(MOVE_SOUND, { volume: 0.5 });
  const [playCapture] = useSound(CAPTURE_SOUND, { volume: 0.5 });
  const [playCheck] = useSound(CHECK_SOUND, { volume: 0.5 });
  const [playGameOver] = useSound(GAME_OVER_SOUND, { volume: 0.5 });

  const [rematchRequested, setRematchRequested] = useState(false);
  const [players, setPlayers] = useState<{ white?: string; black?: string }>({});

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);

  const turn = game.turn() === 'w' ? 'white' : 'black';

  const triggerSound = useCallback((move: Move) => {
    if (muted) return;
    
    if (move.captured) {
      playCapture();
    } else if (move.san.includes('+') || move.san.includes('#')) {
      playCheck();
    } else {
      playMove();
    }
  }, [muted, playMove, playCapture, playCheck]);

  const analyzeGame = async () => {
    if (history.length === 0) return;
    setIsAnalyzing(true);
    setShowAnalysis(true);
    
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          history: history,
          winner: result?.includes('White') ? 'White' : result?.includes('Black') ? 'Black' : null,
          reason: result?.split('by ')[1] || 'Game end'
        }),
      });
      
      const data = await response.json();
      if (data.analysis) {
        setAnalysis(data.analysis);
      }
    } catch (error) {
      console.error('Analysis failed:', error);
      setAnalysis('Failed to load analysis. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    if (isGameOver || !players.white || !players.black) return;

    const interval = setInterval(() => {
      if (turn === 'white') {
        setWhiteTime(prev => Math.max(0, prev - 1));
      } else {
        setBlackTime(prev => Math.max(0, prev - 1));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [turn, isGameOver, players]);

  useEffect(() => {
    if (whiteTime === 0 || blackTime === 0) {
      setIsGameOver(true);
      setResult(whiteTime === 0 ? "Black wins by time" : "White wins by time");
      if (!muted) playGameOver();
    }
  }, [whiteTime, blackTime, muted, playGameOver]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  const isMyTurn = turn === playerColor;

  useEffect(() => {
    socket.on('move-sync', ({ fen, lastMove: move, history: newHistory, isGameOver, isCheckmate, isDraw }) => {
      const newGame = new Chess(fen);
      setGame(newGame);
      setLastMove(move);
      setHistory(newHistory);
      
      triggerSound(move);
      
      if (isGameOver) {
        setIsGameOver(true);
        if (!muted) playGameOver();
        if (isCheckmate) {
          setResult(`${move.color === 'w' ? 'White' : 'Black'} wins by checkmate`);
        } else if (isDraw) {
          setResult('Draw');
        }
      }
    });

    socket.on('room-joined', (data) => {
      setGame(new Chess(data.fen));
      setHistory(data.history);
      setPlayers(data.players);
    });

    socket.on('player-joined', ({ color, socketId }) => {
       setPlayers(prev => ({ ...prev, [color]: socketId }));
    });

    socket.on('game-reset', ({ fen }) => {
      setGame(new Chess(fen));
      setHistory([]);
      setLastMove(null);
      setIsGameOver(false);
      setResult(null);
      setRematchRequested(false);
    });

    socket.on('rematch-requested', () => {
      setRematchRequested(true);
    });

    socket.on('player-left', ({ color }) => {
       setOpponentName('Opponent Left');
    });

    return () => {
      socket.off('move-sync');
      socket.off('room-joined');
      socket.off('player-joined');
      socket.off('game-reset');
      socket.off('rematch-requested');
      socket.off('player-left');
    };
  }, [socket, playerColor]);

  function onDrop(sourceSquare: string, targetSquare: string) {
    if (!isMyTurn || isGameOver) return false;

    try {
      const move = game.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q', // always promote to queen for simplicity
      });

      if (move) {
        socket.emit('make-move', { roomId, move });
        setLastMove(move);
        return true;
      }
    } catch (e) {
      return false;
    }
    return false;
  }

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRematch = () => {
    socket.emit('request-rematch', roomId);
  };

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-[1fr_350px] xl:grid-cols-[1fr_400px] gap-4 sm:gap-6 lg:gap-8 h-full max-w-full overflow-hidden">
      {/* Left Column: Board and Controls */}
      <div className="flex flex-col gap-4 sm:gap-6 order-1 lg:order-1">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2 sm:gap-4">
             <button 
              onClick={onLeave}
              className="p-1.5 sm:p-2 hover:bg-white/10 rounded-lg transition-colors"
             >
                <ChevronLeft className="w-5 h-5" />
             </button>
             <div>
                <h2 className="font-bold flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base">
                   <span className="hidden sm:inline">Room:</span> <span className="font-mono text-orange-400">{roomId}</span>
                   <button onClick={copyRoomId} className="hover:text-white transition-colors p-1">
                      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-white/40" />}
                   </button>
                </h2>
                <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Standard • Blitz 10m</p>
             </div>
          </div>
          
          <div className="flex gap-2">
             <button 
               onClick={() => setMuted(!muted)}
               className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/60"
               title={muted ? "Unmute" : "Mute"}
             >
                {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
             </button>
             <button className="px-3 py-1.5 sm:px-4 sm:py-2 bg-white/5 border border-white/10 rounded-xl text-xs sm:text-sm font-bold hover:bg-white/10 transition-colors flex items-center gap-2">
                <Share2 className="w-3.5 h-3.5" /> <span className="hidden xs:inline">Share</span>
             </button>
          </div>
        </div>

        {/* Opponent Info (Top on mobile) */}
        <div className="flex items-center justify-between p-3 sm:p-4 bg-white/5 border border-white/10 rounded-2xl sm:rounded-3xl">
           <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/10 flex items-center justify-center">
                 <User className="w-4 h-4 sm:w-5 sm:h-5 text-white/40" />
              </div>
              <div>
                 <p className="text-xs sm:text-sm font-bold truncate max-w-[100px] sm:max-w-none">{opponentName}</p>
                 <p className="text-[9px] sm:text-[10px] text-white/30 font-bold uppercase tracking-widest leading-none">
                   {playerColor === 'white' ? 'Black' : 'White'}
                 </p>
              </div>
           </div>
           <div className={cn(
             "flex items-center gap-1.5 sm:gap-2 text-lg sm:text-xl font-mono font-bold transition-colors",
             turn !== playerColor ? "text-orange-400" : "text-white/60"
           )}>
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 opacity-40" /> {formatTime(playerColor === 'white' ? blackTime : whiteTime)}
           </div>
        </div>

        <div className="relative aspect-square w-full max-w-[min(90vw,600px)] lg:max-w-none mx-auto group">
          {/* Square overlay for decorative glow */}
          <div className="absolute -inset-4 bg-orange-600/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          
          <div className="rounded-xl overflow-hidden border border-white/10 shadow-2xl relative">
            <Chessboard 
              options={{
                position: game.fen(), 
                onPieceDrop: ({ sourceSquare, targetSquare }) => onDrop(sourceSquare, targetSquare),
                boardOrientation: playerColor,
                darkSquareStyle: { backgroundColor: '#1e2124' },
                lightSquareStyle: { backgroundColor: '#2b2f33' },
                boardStyle: {
                  borderRadius: '4px',
                  boxShadow: '0 5px 15px rgba(0, 0, 0, 0.5)'
                },
                animationDurationInMs: 200
              }}
            />
            
            {/* Game Over Overlay */}
            <AnimatePresence>
              {isGameOver && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center z-50"
                >
                  <motion.div
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    className="space-y-6"
                  >
                    <div className="w-20 h-20 bg-orange-500 rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-orange-500/40">
                      <Trophy className="w-10 h-10" />
                    </div>
                    <div>
                      <h3 className="text-4xl font-bold italic tracking-tight">Game Over</h3>
                      <p className="text-white/60 mt-2 font-medium">{result}</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                      <button 
                        onClick={handleRematch}
                        className={cn(
                          "px-8 py-3 rounded-2xl font-bold transition-all flex items-center gap-2 justify-center",
                          rematchRequested ? "bg-green-500 hover:bg-green-600" : "bg-orange-500 hover:bg-orange-600"
                        )}
                      >
                         <RefreshCcw className="w-5 h-5" />
                         {rematchRequested ? "Rematch Accepted" : "Request Rematch"}
                      </button>
                      
                      <button 
                        onClick={analyzeGame}
                        disabled={isAnalyzing}
                        className="px-8 py-3 rounded-2xl font-bold bg-white/10 hover:bg-white/20 transition-all flex items-center gap-2 justify-center border border-white/10"
                      >
                         <Sparkles className={cn("w-5 h-5 text-orange-400", isAnalyzing && "animate-spin")} />
                         {isAnalyzing ? "Analysing..." : "AI Analysis"}
                      </button>
                    </div>

                    <AnimatePresence>
                      {showAnalysis && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="mt-6 p-6 rounded-3xl bg-black/80 border border-white/10 text-left max-w-xl mx-auto w-full max-h-[40vh] overflow-y-auto custom-scrollbar relative"
                        >
                          <button 
                            onClick={() => setShowAnalysis(false)}
                            className="absolute top-4 right-4 p-1 rounded-lg hover:bg-white/10 transition-colors"
                          >
                             <X className="w-4 h-4" />
                          </button>
                          
                          <div className="flex items-center gap-3 mb-4">
                             <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center">
                                <Sparkles className="w-4 h-4 text-orange-400" />
                             </div>
                             <h4 className="font-bold text-lg">Match Insights</h4>
                          </div>

                          <div className="prose prose-invert prose-sm max-w-none prose-p:text-white/70 prose-headings:text-white prose-strong:text-orange-400">
                             {isAnalyzing ? (
                               <div className="space-y-3">
                                  <div className="h-4 bg-white/5 rounded-full animate-pulse w-3/4" />
                                  <div className="h-4 bg-white/5 rounded-full animate-pulse w-1/2" />
                                  <div className="h-4 bg-white/5 rounded-full animate-pulse w-5/6" />
                               </div>
                             ) : (
                               <Markdown>{analysis}</Markdown>
                             )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Turn Indicator */}
            {!isGameOver && (
              <div className={cn(
                "absolute top-4 right-4 px-4 py-2 rounded-full border backdrop-blur-md text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all",
                isMyTurn 
                  ? "bg-orange-500/20 border-orange-500/50 text-orange-400" 
                  : "bg-white/5 border-white/10 text-white/40"
              )}>
                <div className={cn("w-2 h-2 rounded-full", isMyTurn ? "bg-orange-500 animate-pulse" : "bg-white/20")} />
                {isMyTurn ? "Your Turn" : "Opponent Turn"}
              </div>
            )}
          </div>
        </div>

        {/* User Info (Bottom on mobile) */}
        <div className="flex items-center justify-between p-3 sm:p-4 bg-white/5 border border-white/10 rounded-2xl sm:rounded-3xl">
           <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-orange-500 flex items-center justify-center font-bold text-xs sm:text-sm shadow-lg shadow-orange-500/20">
                 {playerColor.charAt(0).toUpperCase()}
              </div>
              <div>
                 <p className="text-xs sm:text-sm font-bold">You</p>
                 <p className="text-[9px] sm:text-[10px] text-white/30 font-bold uppercase tracking-widest leading-none">{playerColor}</p>
              </div>
           </div>
           <div className={cn(
             "px-3 py-1 sm:px-4 sm:py-1.5 rounded-xl bg-black/40 font-mono font-bold text-base sm:text-lg transition-all",
             turn === playerColor ? "text-orange-400 ring-1 ring-orange-500/50" : "text-white/40"
           )}>
              {formatTime(playerColor === 'white' ? whiteTime : blackTime)}
           </div>
        </div>
      </div>

      {/* Right Column: Sidebar */}
      <div className="flex flex-col gap-4 sm:gap-6 lg:h-[calc(100vh-12rem)] min-h-[400px] order-2 lg:order-2">
        {/* Toggleable Chat/History */}
        <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 shrink-0">
           <button 
             onClick={() => setShowChat(false)}
             className={cn(
                "flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all",
                !showChat ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60"
             )}
           >
              <History className="w-4 h-4" /> Move History
           </button>
           <button 
             onClick={() => setShowChat(true)}
             className={cn(
                "flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all",
                showChat ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60"
             )}
           >
              <MessageSquare className="w-4 h-4" /> Chat
           </button>
        </div>

        <div className="flex-1 bg-white/5 border border-white/10 rounded-3xl overflow-hidden flex flex-col">
           {showChat ? (
             <Chat socket={socket} roomId={roomId} playerColor={playerColor} />
           ) : (
             <div className="flex-1 flex flex-col">
                <div className="p-4 border-b border-white/5 flex items-center justify-between">
                   <h3 className="text-sm font-bold uppercase tracking-wider text-white/40">Moves</h3>
                   <span className="text-[10px] font-mono text-white/20">{history.length} half-moves</span>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                   <div className="grid grid-cols-2 gap-2">
                      {Array.from({ length: Math.ceil(history.length / 2) }).map((_, i) => (
                        <div key={i} className="contents">
                           <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                              <span className="text-[10px] font-mono text-white/20 select-none">{i + 1}.</span>
                              <span className="font-bold text-sm text-white/80">{history[i * 2]?.san}</span>
                           </div>
                           {history[i * 2 + 1] && (
                             <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                                <span className="text-[10px] font-mono text-white/10 select-none"></span>
                                <span className="font-bold text-sm text-white/80">{history[i * 2 + 1].san}</span>
                             </div>
                           )}
                        </div>
                      ))}
                   </div>
                   {history.length === 0 && (
                     <div className="flex flex-col items-center justify-center gap-4 py-20 opacity-20">
                        <History className="w-12 h-12" />
                        <p className="text-sm font-bold">No moves yet</p>
                     </div>
                   )}
                </div>
             </div>
           )}
        </div>

        <div className="flex gap-3 shrink-0">
           <button className="flex-1 py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center gap-2 text-xs sm:text-sm font-bold hover:bg-white/10 transition-colors">
              <Flag className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-400" /> Resign
           </button>
           <button className="flex-1 py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center gap-2 text-xs sm:text-sm font-bold hover:bg-white/10 transition-colors">
              <RefreshCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400" /> Draw
           </button>
        </div>
      </div>
    </div>
  );
}
