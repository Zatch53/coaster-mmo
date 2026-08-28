import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const pieces = sqliteTable("pieces", {
  id: text("id").primaryKey(),
  parkId: text("park_id").notNull().default("main"),
  type: text("type").notNull(), // e.g. track_straight, track_curve_l, station, ferris_wheel, ...
  x: integer("x").notNull(),
  y: integer("y").notNull(),
  z: integer("z").notNull().default(0),
  rotation: integer("rotation").notNull().default(0), // 0-3, quarter turns
  color: text("color").notNull().default("#e63946"),
  ownerName: text("owner_name").notNull(),
  createdAt: integer("created_at").notNull(),
});
