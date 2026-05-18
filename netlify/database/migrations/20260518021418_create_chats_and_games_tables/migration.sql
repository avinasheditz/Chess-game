CREATE TABLE "chats" (
	"id" serial PRIMARY KEY,
	"room_id" varchar(20) NOT NULL,
	"sender_name" varchar(50) NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "games" (
	"room_id" varchar(20) PRIMARY KEY,
	"fen" varchar(100) NOT NULL,
	"white_player_id" varchar(100),
	"black_player_id" varchar(100),
	"status" varchar(20) DEFAULT 'waiting' NOT NULL,
	"last_activity" timestamp DEFAULT now() NOT NULL,
	"history" json DEFAULT '"[]"' NOT NULL,
	"rematch_requests" json DEFAULT '"[]"' NOT NULL,
	"winner" varchar(20),
	"reason" varchar(50)
);
