import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  avatar: text("avatar"),
});

export const pages = pgTable("pages", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  icon: text("icon").default("📄"),
  parentId: integer("parent_id"),
  userId: integer("user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  isDeleted: boolean("is_deleted").default(false),
});

export const blocks = pgTable("blocks", {
  id: serial("id").primaryKey(),
  pageId: integer("page_id").notNull(),
  type: text("type").notNull(), // text, header, list, code, todo, etc.
  content: jsonb("content"), // flexible content storage
  position: integer("position").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
});

export const insertPageSchema = createInsertSchema(pages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBlockSchema = createInsertSchema(blocks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updatePageSchema = insertPageSchema.partial();
export const updateBlockSchema = insertBlockSchema.partial();

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Page = typeof pages.$inferSelect;
export type InsertPage = z.infer<typeof insertPageSchema>;
export type UpdatePage = z.infer<typeof updatePageSchema>;

export type Block = typeof blocks.$inferSelect;
export type InsertBlock = z.infer<typeof insertBlockSchema>;
export type UpdateBlock = z.infer<typeof updateBlockSchema>;

export interface PageWithChildren extends Page {
  children?: PageWithChildren[];
}

export interface BlockContent {
  text?: string;
  checked?: boolean;
  language?: string;
  items?: string[];
  level?: number;
}
