import { pgTable, text, serial, integer, boolean, timestamp, jsonb, varchar, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table - enhanced with team collaboration features
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  username: varchar("username").unique(),
  password: varchar("password"), // for credential-based auth
  preferences: jsonb("preferences"), // user settings, theme, etc.
  timezone: varchar("timezone").default("UTC"),
  theme: varchar("theme").default("system"),
  language: varchar("language").default("en"),
  notifications: jsonb("notifications").$type<{
    email: boolean;
    desktop: boolean;
    mentions: boolean;
    comments: boolean;
  }>().default({
    email: true,
    desktop: true,
    mentions: true,
    comments: true,
  }),
  privacy: jsonb("privacy").$type<{
    profileVisible: boolean;
    activityVisible: boolean;
  }>().default({
    profileVisible: true,
    activityVisible: true,
  }),
  gmailRefreshToken: varchar("gmail_refresh_token"),
  gmailAccessToken: varchar("gmail_access_token"),
  gmailTokenExpiry: timestamp("gmail_token_expiry"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Multi-factor authentication table
export const userMFA = pgTable("user_mfa", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  secret: varchar("secret").notNull(),
  backupCodes: jsonb("backup_codes").$type<string[]>().default([]),
  isEnabled: boolean("is_enabled").default(false),
  lastUsed: timestamp("last_used"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Business pages table for enterprise features
export const businessPages = pgTable("business_pages", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id").notNull(),
  pageId: integer("page_id").notNull(),
  businessType: text("business_type").notNull(), // dashboard, analytics, reports, etc.
  configuration: jsonb("configuration").default({}),
  permissions: jsonb("permissions").$type<{
    canView: string[];
    canEdit: string[];
    canShare: string[];
    canAnalyze: string[];
  }>().default({
    canView: [],
    canEdit: [],
    canShare: [],
    canAnalyze: []
  }),
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Sharing and collaboration table
export const pageShares = pgTable("page_shares", {
  id: serial("id").primaryKey(),
  pageId: integer("page_id").notNull(),
  sharedBy: varchar("shared_by").notNull(),
  sharedWith: varchar("shared_with"), // null for public shares
  shareType: text("share_type").notNull(), // public, private, workspace
  permissions: text("permissions").notNull(), // view, edit, comment
  token: varchar("token").notNull().unique(),
  password: varchar("password"), // optional password protection
  expiresAt: timestamp("expires_at"),
  allowDownload: boolean("allow_download").default(false),
  allowComments: boolean("allow_comments").default(true),
  isActive: boolean("is_active").default(true),
  viewCount: integer("view_count").default(0),
  lastAccessed: timestamp("last_accessed"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Real-time collaboration cursors
export const collaborationCursors = pgTable("collaboration_cursors", {
  id: serial("id").primaryKey(),
  pageId: integer("page_id").notNull(),
  userId: varchar("user_id").notNull(),
  x: integer("x").notNull(),
  y: integer("y").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
  sessionId: varchar("session_id").notNull(),
});

// Live presence tracking
export const livePresence = pgTable("live_presence", {
  id: serial("id").primaryKey(),
  pageId: integer("page_id").notNull(),
  userId: varchar("user_id").notNull(),
  status: text("status").notNull(), // active, typing, viewing
  lastSeen: timestamp("last_seen").defaultNow(),
  currentBlock: integer("current_block"),
  sessionId: varchar("session_id").notNull(),
});

// Workspaces table - team workspaces
export const workspaces = pgTable("workspaces", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").default("personal"), // personal, business
  description: text("description"),
  icon: text("icon").default("🏢"),
  domain: text("domain").unique(),
  ownerId: varchar("owner_id").notNull(),
  plan: text("plan").default("free"), // free, personal, team, enterprise
  settings: jsonb("settings"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Workspace members - user roles in workspaces
export const workspaceMembers = pgTable("workspace_members", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id").notNull(),
  userId: varchar("user_id").notNull(),
  role: text("role").notNull(), // owner, admin, member, guest
  permissions: jsonb("permissions"),
  joinedAt: timestamp("joined_at").defaultNow(),
});

// Member invitations
export const invitations = pgTable("invitations", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id").notNull(),
  email: text("email").notNull(),
  role: text("role").notNull(),
  invitedBy: varchar("invited_by").notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  acceptedAt: timestamp("accepted_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Templates table
export const templates = pgTable("templates", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  icon: text("icon").default("📋"),
  category: text("category").notNull(), // personal, team, engineering, design, etc.
  content: jsonb("content").notNull(), // template structure
  isPublic: boolean("is_public").default(false),
  createdBy: varchar("created_by").notNull(),
  workspaceId: integer("workspace_id"),
  usageCount: integer("usage_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Pages table - enhanced with workspace support
export const pages = pgTable("pages", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  icon: text("icon").default("📄"),
  cover: text("cover"), // cover image URL
  parentId: integer("parent_id"),
  workspaceId: integer("workspace_id").notNull(),
  createdBy: varchar("created_by").notNull(),
  lastEditedBy: varchar("last_edited_by"),
  isPublic: boolean("is_public").default(false),
  publicId: text("public_id").unique(), // for public sharing
  permissions: jsonb("permissions"), // page-level permissions
  properties: jsonb("properties"), // custom properties
  isTemplate: boolean("is_template").default(false),
  templateId: integer("template_id"),
  isFavorite: boolean("is_favorite").default(false),
  isArchived: boolean("is_archived").default(false),
  isDeleted: boolean("is_deleted").default(false),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const blocks = pgTable("blocks", {
  id: serial("id").primaryKey(),
  pageId: integer("page_id").notNull(),
  type: text("type").notNull(), // text, header, list, code, todo, quote, divider, image, video, audio, file, database, callout, toggle, etc.
  content: jsonb("content"), // flexible content storage
  position: integer("position").notNull(),
  parentId: integer("parent_id"), // for nested blocks (toggles, etc.)
  properties: jsonb("properties"), // additional block properties (color, formatting, etc.)
  createdBy: varchar("created_by").notNull(),
  lastEditedBy: varchar("last_edited_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Comments and discussions
export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  pageId: integer("page_id"),
  blockId: integer("block_id"),
  content: text("content").notNull(),
  authorId: varchar("author_id").notNull(),
  parentId: integer("parent_id"), // for threaded comments
  isResolved: boolean("is_resolved").default(false),
  resolvedBy: varchar("resolved_by"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Activity log for tracking changes
export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id").notNull(),
  userId: varchar("user_id").notNull(),
  action: text("action").notNull(), // created, updated, deleted, shared, etc.
  resourceType: text("resource_type").notNull(), // page, block, workspace, etc.
  resourceId: text("resource_id").notNull(),
  metadata: jsonb("metadata"), // additional context
  createdAt: timestamp("created_at").defaultNow(),
});

// Notifications
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  type: text("type").notNull(), // mention, comment, invite, etc.
  title: text("title").notNull(),
  message: text("message"),
  data: jsonb("data"), // additional data for the notification
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Session storage table for auth
export const sessions = pgTable("sessions", {
  sid: varchar("sid").primaryKey(),
  sess: jsonb("sess").notNull(),
  expire: timestamp("expire").notNull(),
});

// Calendar events table
export const calendarEvents = pgTable("calendar_events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  location: text("location"),
  type: text("type").notNull(), // meeting, task, reminder, deadline
  attendees: jsonb("attendees").$type<string[]>().default([]),
  workspaceId: integer("workspace_id").notNull(),
  pageId: integer("page_id"), // optional link to page
  createdBy: varchar("created_by").notNull(),
  isAllDay: boolean("is_all_day").default(false),
  recurrence: text("recurrence").default("none"), // none, daily, weekly, monthly
  status: text("status").default("confirmed"), // confirmed, tentative, cancelled
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Email threads table for Gmail integration
export const emailThreads = pgTable("email_threads", {
  id: varchar("id").primaryKey(),
  gmailThreadId: varchar("gmail_thread_id").notNull(),
  subject: text("subject").notNull(),
  participants: jsonb("participants").$type<string[]>().default([]),
  messageCount: integer("message_count").default(1),
  lastMessageDate: timestamp("last_message_date").notNull(),
  isRead: boolean("is_read").default(false),
  isStarred: boolean("is_starred").default(false),
  labels: jsonb("labels").$type<string[]>().default([]),
  workspaceId: integer("workspace_id").notNull(),
  userId: varchar("user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Email messages table
export const emailMessages = pgTable("email_messages", {
  id: varchar("id").primaryKey(),
  gmailMessageId: varchar("gmail_message_id").notNull(),
  threadId: varchar("thread_id").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  fromEmail: text("from_email").notNull(),
  toEmails: jsonb("to_emails").$type<string[]>().default([]),
  ccEmails: jsonb("cc_emails").$type<string[]>().default([]),
  bccEmails: jsonb("bcc_emails").$type<string[]>().default([]),
  date: timestamp("date").notNull(),
  isRead: boolean("is_read").default(false),
  isStarred: boolean("is_starred").default(false),
  labels: jsonb("labels").$type<string[]>().default([]),
  attachments: jsonb("attachments").$type<Array<{
    filename: string;
    size: number;
    contentType: string;
    attachmentId: string;
  }>>().default([]),
  workspaceId: integer("workspace_id").notNull(),
  relatedPageId: integer("related_page_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Schema definitions
export const insertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertWorkspaceSchema = createInsertSchema(workspaces).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  description: z.string().optional().nullable(),
});

export const insertWorkspaceMemberSchema = createInsertSchema(workspaceMembers).omit({
  id: true,
  joinedAt: true,
});

export const insertInvitationSchema = createInsertSchema(invitations).omit({
  id: true,
  createdAt: true,
});

export const insertTemplateSchema = createInsertSchema(templates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
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

export const insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertActivitySchema = createInsertSchema(activities).omit({
  id: true,
  createdAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const insertCalendarEventSchema = createInsertSchema(calendarEvents).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertEmailThreadSchema = createInsertSchema(emailThreads).omit({
  createdAt: true,
  updatedAt: true
});

export const insertEmailMessageSchema = createInsertSchema(emailMessages).omit({
  createdAt: true,
  updatedAt: true
});

export const insertUserMFASchema = createInsertSchema(userMFA).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertBusinessPageSchema = createInsertSchema(businessPages).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertPageShareSchema = createInsertSchema(pageShares).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertCollaborationCursorSchema = createInsertSchema(collaborationCursors).omit({
  id: true,
  timestamp: true
});

export const insertLivePresenceSchema = createInsertSchema(livePresence).omit({
  id: true,
  lastSeen: true
});

export const updatePageSchema = insertPageSchema.partial();
export const updateBlockSchema = insertBlockSchema.partial();
export const updateWorkspaceSchema = insertWorkspaceSchema.partial();

// Type exports
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpsertUser = typeof users.$inferInsert;

export type Workspace = typeof workspaces.$inferSelect;
export type InsertWorkspace = z.infer<typeof insertWorkspaceSchema>;
export type UpdateWorkspace = z.infer<typeof updateWorkspaceSchema>;

export type WorkspaceMember = typeof workspaceMembers.$inferSelect;
export type InsertWorkspaceMember = z.infer<typeof insertWorkspaceMemberSchema>;

export type Invitation = typeof invitations.$inferSelect;
export type InsertInvitation = z.infer<typeof insertInvitationSchema>;

export type Template = typeof templates.$inferSelect;
export type InsertTemplate = z.infer<typeof insertTemplateSchema>;

export type Page = typeof pages.$inferSelect;
export type InsertPage = z.infer<typeof insertPageSchema>;
export type UpdatePage = z.infer<typeof updatePageSchema>;

export type Block = typeof blocks.$inferSelect;
export type InsertBlock = z.infer<typeof insertBlockSchema>;
export type UpdateBlock = z.infer<typeof updateBlockSchema>;

export type Comment = typeof comments.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;

export type Activity = typeof activities.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

export type CalendarEvent = typeof calendarEvents.$inferSelect;
export type InsertCalendarEvent = z.infer<typeof insertCalendarEventSchema>;

export type EmailThread = typeof emailThreads.$inferSelect;
export type InsertEmailThread = z.infer<typeof insertEmailThreadSchema>;

export type EmailMessage = typeof emailMessages.$inferSelect;
export type InsertEmailMessage = z.infer<typeof insertEmailMessageSchema>;

export type UserMFA = typeof userMFA.$inferSelect;
export type InsertUserMFA = z.infer<typeof insertUserMFASchema>;

export type BusinessPage = typeof businessPages.$inferSelect;
export type InsertBusinessPage = z.infer<typeof insertBusinessPageSchema>;

export type PageShare = typeof pageShares.$inferSelect;
export type InsertPageShare = z.infer<typeof insertPageShareSchema>;

export type CollaborationCursor = typeof collaborationCursors.$inferSelect;
export type InsertCollaborationCursor = z.infer<typeof insertCollaborationCursorSchema>;

export type LivePresence = typeof livePresence.$inferSelect;
export type InsertLivePresence = z.infer<typeof insertLivePresenceSchema>;

export interface PageWithChildren extends Page {
  children?: PageWithChildren[];
}

export interface BlockContent {
  text?: string;
  checked?: boolean;
  language?: string;
  items?: string[];
  level?: number;
  color?: string;
  backgroundColor?: string;
  url?: string;
  caption?: string;
  width?: number;
  height?: number;
  emoji?: string;
  title?: string;
  isOpen?: boolean;
  format?: "bold" | "italic" | "underline" | "strikethrough" | "code";
  link?: string;
  children?: BlockContent[];
}

export interface BlockProperties {
  color?: string;
  backgroundColor?: string;
  format?: string[];
  alignment?: "left" | "center" | "right";
  indentation?: number;
}
