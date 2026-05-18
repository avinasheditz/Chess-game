import { pgTable, varchar, timestamp, json, boolean, integer, serial, text } from "drizzle-orm/pg-core";

export const games = pgTable("games", {
  roomId: varchar("room_id", { length: 20 }).primaryKey(),
  fen: varchar("fen", { length: 100 }).notNull(),
  whitePlayerId: varchar("white_player_id", { length: 100 }),
  blackPlayerId: varchar("black_player_id", { length: 100 }),
  status: varchar("status", { length: 20 }).notNull().default("waiting"), // waiting, active, finished
  lastActivity: timestamp("last_activity").defaultNow().notNull(),
  history: json("history").default("[]").notNull(),
  rematchRequests: json("rematch_requests").default("[]").notNull(),
  winner: varchar("winner", { length: 20 }),
  reason: varchar("reason", { length: 50 }),
});

export const chats = pgTable("chats", {
  id: serial("id").primaryKey(),
  roomId: varchar("room_id", { length: 20 }).notNull(),
  senderName: varchar("sender_name", { length: 50 }).notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
