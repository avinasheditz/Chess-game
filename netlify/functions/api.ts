import type { Config, Context } from "@netlify/functions";
import { db } from "../../db/index.js";
import { games, chats } from "../../db/schema.js";
import { eq, and, gt } from "drizzle-orm";
import { Chess } from "chess.js";
import { nanoid } from "nanoid";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

export default async (req: Request, context: Context) => {
  const url = new URL(req.url);
  const path = url.pathname.replace('/api/', '');

  if (req.method === "POST" && path === "create-room") {
    const { playerId } = await req.json();
    const roomId = nanoid(6).toUpperCase();
    const chess = new Chess();
    await db.insert(games).values({
      roomId,
      fen: chess.fen(),
      whitePlayerId: playerId,
      status: 'waiting',
      history: [],
      rematchRequests: [],
    });
    return Response.json({ roomId, color: "white" });
  }

  if (req.method === "POST" && path === "join-room") {
    const { roomId, playerId } = await req.json();
    const normalizedRoomId = roomId.toUpperCase();
    
    const [game] = await db.select().from(games).where(eq(games.roomId, normalizedRoomId));
    
    if (!game) {
      return Response.json({ error: "Room not found" }, { status: 404 });
    }

    let color: "white" | "black" = "white";
    const updateData: any = { lastActivity: new Date() };

    if (game.whitePlayerId === playerId) {
      color = "white";
    } else if (game.blackPlayerId === playerId) {
      color = "black";
    } else if (!game.whitePlayerId) {
      updateData.whitePlayerId = playerId;
      color = "white";
    } else if (!game.blackPlayerId) {
      updateData.blackPlayerId = playerId;
      color = "black";
    } else {
      return Response.json({ error: "Room is full" }, { status: 403 });
    }

    if (game.status === 'waiting' && ((game.whitePlayerId && updateData.blackPlayerId) || (game.blackPlayerId && updateData.whitePlayerId) || (updateData.whitePlayerId && updateData.blackPlayerId))) {
       updateData.status = 'active';
    }

    await db.update(games).set(updateData).where(eq(games.roomId, normalizedRoomId));
    
    const [updatedGame] = await db.select().from(games).where(eq(games.roomId, normalizedRoomId));

    return Response.json({ 
      roomId: normalizedRoomId, 
      color,
      fen: updatedGame.fen,
      history: updatedGame.history,
      players: { white: updatedGame.whitePlayerId, black: updatedGame.blackPlayerId },
      status: updatedGame.status
    });
  }

  if (req.method === "POST" && path === "make-move") {
    const { roomId, playerId, move } = await req.json();
    const [game] = await db.select().from(games).where(eq(games.roomId, roomId));
    if (!game) return Response.json({ error: "Game not found" }, { status: 404 });

    const chess = new Chess(game.fen);
    try {
      const result = chess.move(move);
      if (result) {
        const history = [...(game.history as any[]), result];
        const isGameOver = chess.isGameOver();
        let status = game.status;
        let winner = null;
        let reason = null;

        if (isGameOver) {
          status = 'finished';
          if (chess.isCheckmate()) {
            winner = chess.turn() === 'w' ? 'Black' : 'White';
            reason = 'checkmate';
          } else if (chess.isDraw()) {
            reason = 'draw';
          }
        }

        await db.update(games).set({
          fen: chess.fen(),
          history,
          status,
          winner,
          reason,
          lastActivity: new Date()
        }).where(eq(games.roomId, roomId));

        return Response.json({ success: true, fen: chess.fen(), history, status, winner, reason });
      } else {
        return Response.json({ error: "Invalid move" }, { status: 400 });
      }
    } catch (e) {
      return Response.json({ error: "Invalid move" }, { status: 400 });
    }
  }

  if (req.method === "GET" && path.startsWith("game/")) {
    const roomId = path.split('/')[1];
    const [game] = await db.select().from(games).where(eq(games.roomId, roomId));
    if (!game) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json({
      fen: game.fen,
      history: game.history,
      status: game.status,
      players: { white: game.whitePlayerId, black: game.blackPlayerId },
      rematchRequests: game.rematchRequests,
      winner: game.winner,
      reason: game.reason
    });
  }

  if (req.method === "POST" && path === "chat") {
    const { roomId, senderName, message } = await req.json();
    const [inserted] = await db.insert(chats).values({
      roomId,
      senderName,
      message
    }).returning();
    return Response.json(inserted);
  }

  if (req.method === "GET" && path.startsWith("chat/")) {
    const roomId = path.split('/')[1];
    const lastId = parseInt(url.searchParams.get('lastId') || '0', 10);
    const msgs = await db.select().from(chats).where(and(eq(chats.roomId, roomId), gt(chats.id, lastId))).orderBy(chats.id);
    return Response.json(msgs);
  }

  if (req.method === "POST" && path === "request-rematch") {
    const { roomId, playerId } = await req.json();
    const [game] = await db.select().from(games).where(eq(games.roomId, roomId));
    if (!game) return Response.json({ error: "Game not found" }, { status: 404 });

    const currentRequests = new Set((game.rematchRequests as string[]) || []);
    currentRequests.add(playerId);

    if (currentRequests.size === 2) {
      const chess = new Chess();
      await db.update(games).set({
        fen: chess.fen(),
        history: [],
        rematchRequests: [],
        status: 'active',
        winner: null,
        reason: null,
        lastActivity: new Date()
      }).where(eq(games.roomId, roomId));
      return Response.json({ reset: true });
    } else {
      await db.update(games).set({
        rematchRequests: Array.from(currentRequests)
      }).where(eq(games.roomId, roomId));
      return Response.json({ reset: false });
    }
  }
  
  if (req.method === "POST" && path === "leave-room") {
    const { roomId, playerId } = await req.json();
    const [game] = await db.select().from(games).where(eq(games.roomId, roomId));
    if (!game) return Response.json({ success: true });
    
    const updateData: any = {};
    if (game.whitePlayerId === playerId) updateData.whitePlayerId = null;
    if (game.blackPlayerId === playerId) updateData.blackPlayerId = null;
    
    if (Object.keys(updateData).length > 0) {
      await db.update(games).set(updateData).where(eq(games.roomId, roomId));
    }
    
    return Response.json({ success: true });
  }

  if (req.method === "POST" && path === "analyze") {
    const { history, winner, reason } = await req.json();
    
    if (!history || !Array.isArray(history)) {
      return Response.json({ error: "Invalid history" }, { status: 400 });
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

      return Response.json({ analysis: response.text });
    } catch (error) {
      console.error("AI Analysis error:", error);
      return Response.json({ error: "Failed to generate analysis" }, { status: 500 });
    }
  }

  return new Response("Method not allowed", { status: 405 });
};

export const config: Config = {
  path: "/api/*",
};
