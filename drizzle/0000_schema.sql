CREATE TABLE users (
 id TEXT PRIMARY KEY NOT NULL, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
 role TEXT NOT NULL CHECK(role IN ('student','admin')), password_hash TEXT NOT NULL
);
--> statement-breakpoint
CREATE TABLE sessions (
 token_hash TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL REFERENCES users(id), expires_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE TABLE equipment (
 id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, category TEXT NOT NULL, description TEXT NOT NULL,
 location TEXT NOT NULL, capacity INTEGER NOT NULL CHECK(capacity BETWEEN 1 AND 100),
 active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)), created_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE TABLE reservations (
 id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL REFERENCES users(id), equipment_id TEXT NOT NULL REFERENCES equipment(id),
 start_at INTEGER NOT NULL, end_at INTEGER NOT NULL, quantity INTEGER NOT NULL CHECK(quantity BETWEEN 1 AND 100),
 status TEXT NOT NULL DEFAULT 'RESERVED' CHECK(status IN ('RESERVED','CANCELLED','ISSUED','RETURNED')),
 purpose TEXT NOT NULL, request_key TEXT NOT NULL, created_at INTEGER NOT NULL,
 issued_at INTEGER, returned_at INTEGER, updated_by TEXT NOT NULL REFERENCES users(id),
 CHECK(end_at>start_at AND end_at-start_at<=604800000), UNIQUE(user_id,request_key)
);
--> statement-breakpoint
CREATE INDEX reservation_availability ON reservations(equipment_id,status,start_at,end_at);
--> statement-breakpoint
CREATE TABLE maintenance (
 id TEXT PRIMARY KEY NOT NULL, equipment_id TEXT NOT NULL REFERENCES equipment(id),
 start_at INTEGER NOT NULL, end_at INTEGER NOT NULL CHECK(end_at>start_at), reason TEXT NOT NULL,
 created_by TEXT NOT NULL REFERENCES users(id)
);
--> statement-breakpoint
CREATE INDEX maintenance_equipment ON maintenance(equipment_id,start_at,end_at);
--> statement-breakpoint
CREATE TABLE audit (
 id INTEGER PRIMARY KEY AUTOINCREMENT, reservation_id TEXT NOT NULL REFERENCES reservations(id),
 actor_id TEXT NOT NULL REFERENCES users(id), action TEXT NOT NULL, at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE TABLE login_attempts (key TEXT PRIMARY KEY NOT NULL, count INTEGER NOT NULL, window_start INTEGER NOT NULL);
