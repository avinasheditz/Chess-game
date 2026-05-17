import express from "express";
import path from "path";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import { Chess } from "chess.js";
import { nanoid } from "nanoid";

import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

  const PORT = 3000;
  app.use(express.json());

  // API routes go here FIRST
  app.post("/api/analyze", async (req, res) => {
    const { history, winner, reason } = req.body;
    
    if (!history || !Array.isArray(history)) {
      return res.status(400).json({ error: "Invalid history" });
    }

    const pgn = history.map((move: any, i: number) => {
      if (i % 2 === 0) return `${Math.floor(i / 2) + 1}. ${move.san}`;
      return move.san;
    }).join(" ");

    const prompt = `Analyze this chess game. 
Game history (SAN): ${pgn}
Result: ${winner ? `${winner} wins by ${reason}` : "Draw"}

Please provide:
1. A brief summary of the game progression.
2. Key turning points or critical moves.
3. One major mistake or 'blunder' for each side (if any).
4. Suggestions for improvement for both players.

Keep the tone educational, professional, and encouraging. Use markdown for formatting.`;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      res.json({ analysis: response.text });
    } catch (error) {
      console.error("AI Analysis error:", error);
      res.status(500).json({ error: "Failed to generate analysis" });
    }
  });

  // Interface for game state
  interface GameSession {
    roomId: string;
    fen: string;
    players: {
      white?: string; // socketId
      black?: string; // socketId
    };
    history: any[];
    lastActivity: number;
    rematchRequests: Set<string>;
    status: 'waiting' | 'active' | 'finished';
  }

  const games = new Map<string, GameSession>();

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("create-room", () => {
      const roomId = nanoid(6).toUpperCase();
      const game: GameSession = {
        roomId,
        fen: new Chess().fen(),
        players: { white: socket.id },
        history: [],
        lastActivity: Date.now(),
        rematchRequests: new Set(),
        status: 'waiting'
      };
      games.set(roomId, game);
      socket.join(roomId);
      socket.emit("room-created", { roomId, color: "white" });
      console.log(`Room ${roomId} created by ${socket.id}`);
    });

    socket.on("join-room", (roomId: string) => {
      roomId = roomId.toUpperCase();
      const game = games.get(roomId);
      
      if (!game) {
        socket.emit("error-message", "Room not found");
        return;
      }

      if (game.players.white && game.players.black) {
        socket.emit("error-message", "Room is full");
        return;
      }

      let color: "white" | "black";
      if (!game.players.white) {
        game.players.white = socket.id;
        color = "white";
      } else {
        game.players.black = socket.id;
        color = "black";
      }

      game.status = 'active';
      socket.join(roomId);
      game.lastActivity = Date.now();
      
      socket.emit("room-joined", { 
        roomId, 
        color, 
        fen: game.fen, 
        history: game.history,
        players: game.players
      });
      
      socket.to(roomId).emit("player-joined", { color, socketId: socket.id });
      console.log(`User ${socket.id} joined room ${roomId} as ${color}`);
    });

    socket.on("make-move", ({ roomId, move }: { roomId: string; move: any }) => {
      const game = games.get(roomId);
      if (!game) return;

      const chess = new Chess(game.fen);
      try {
        const result = chess.move(move);
        if (result) {
          game.fen = chess.fen();
          game.history.push(result);
          game.lastActivity = Date.now();
          
          const isGameOver = chess.isGameOver();
          if (isGameOver) {
            game.status = 'finished';
          }

          io.to(roomId).emit("move-sync", { 
            fen: game.fen, 
            lastMove: result,
            history: game.history,
            turn: chess.turn() === 'w' ? 'white' : 'black',
            isGameOver,
            isCheckmate: chess.isCheckmate(),
            isDraw: chess.isDraw(),
            isStalemate: chess.isStalemate(),
            isThreefoldRepetition: chess.isThreefoldRepetition()
          });
        }
      } catch (e) {
        socket.emit("error-message", "Invalid move");
      }
    });

    socket.on("chat-message", ({ roomId, message, senderName }: { roomId: string; message: string; senderName: string }) => {
      io.to(roomId).emit("chat-received", { 
        sender: socket.id, 
        senderName,
        message,
        timestamp: Date.now() 
      });
    });

    socket.on("request-rematch", (roomId: string) => {
      const game = games.get(roomId);
      if (!game) return;

      game.rematchRequests.add(socket.id);
      
      if (game.rematchRequests.size === 2) {
        // Reset game
        game.fen = new Chess().fen();
        game.history = [];
        game.rematchRequests.clear();
        game.status = 'active';
        
        io.to(roomId).emit("game-reset", { fen: game.fen });
      } else {
        socket.to(roomId).emit("rematch-requested", { from: socket.id });
      }
    });

    socket.on("disconnecting", () => {
      for (const roomId of socket.rooms) {
        if (roomId !== socket.id) {
          const game = games.get(roomId);
          if (game) {
            if (game.players.white === socket.id) delete game.players.white;
            if (game.players.black === socket.id) delete game.players.black;
            
            socket.to(roomId).emit("player-left", { color: socket.id === game.players.white ? 'white' : 'black' });
            
            if (!game.players.white && !game.players.black) {
              games.delete(roomId);
            }
          }
        }
      }
    });
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
