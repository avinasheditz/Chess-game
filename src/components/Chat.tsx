import { useState, useEffect, useRef, FormEvent } from 'react';
import { Socket } from 'socket.io-client';
import { Send, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface ChatProps {
  socket: Socket;
  roomId: string;
  playerColor: string;
}

interface Message {
  sender: string;
  senderName: string;
  message: string;
  timestamp: number;
}

export function Chat({ socket, roomId, playerColor }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    socket.on('chat-received', (msg: Message) => {
      setMessages(prev => [...prev, msg]);
    });

    return () => {
      socket.off('chat-received');
    };
  }, [socket]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const msg = {
      roomId,
      message: input,
      senderName: playerColor.charAt(0).toUpperCase() + playerColor.slice(1)
    };

    socket.emit('chat-message', msg);
    
    // Add locally immediately (optimistic)
    setMessages(prev => [...prev, {
      sender: socket.id!,
      senderName: 'You',
      message: input,
      timestamp: Date.now()
    }]);
    
    setInput('');
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-white/5 flex items-center justify-between">
         <h3 className="text-sm font-bold uppercase tracking-wider text-white/40">Chat</h3>
         <span className="text-[10px] font-mono text-white/20">Global Server</span>
      </div>
      
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => {
          const isMe = msg.senderName === 'You';
          return (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={i}
              className={cn(
                "flex flex-col gap-1",
                isMe ? "items-end" : "items-start"
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                 <span className="text-[10px] font-bold uppercase tracking-wider text-white/30">{msg.senderName}</span>
                 <span className="text-[9px] text-white/10">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className={cn(
                "px-4 py-2 rounded-2xl text-sm max-w-[85%] break-words",
                isMe 
                  ? "bg-orange-500 text-white rounded-tr-none" 
                  : "bg-white/10 text-white/90 rounded-tl-none"
              )}>
                {msg.message}
              </div>
            </motion.div>
          );
        })}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-4 py-20 opacity-20">
             <MessageSquareIcon className="w-12 h-12" />
             <p className="text-sm font-bold">Say hello to your opponent!</p>
          </div>
        )}
      </div>

      <form onSubmit={sendMessage} className="p-4 border-t border-white/5 bg-black/20">
        <div className="relative">
          <input
            type="text"
            placeholder="Send a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500/50 transition-colors pr-12"
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-orange-500 rounded-lg hover:bg-orange-600 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}

function MessageSquareIcon({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  );
}
