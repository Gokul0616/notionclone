import { sqliteTable, text, integer, blob, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table - enhanced with team collaboration features
export const users = sqliteTable("users", {
  id: text("id").primaryKey().notNull(),
  email: text("email").unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  profileImageUrl: text("profile_image_url"),
  username: text("username").unique(),
  password: text("password"), // for credential-based auth
  preferences: text("preferences"), // user settings, theme, etc. (JSON string)
  timezone: text("timezone").default("UTC"),
  theme: text("theme").default("system"),
  language: text("language").default("en"),
  notifications: text("notifications").default('{"email":true,"desktop":true,"mentions":true,"comments":true}'),
  privacy: text("privacy").default('{"profileVisible":true,"activityVisible":true}'),
  gmailRefreshToken: text("gmail_refresh_token"),
  gmailAccessToken: text("gmail_access_token"),
  gmailTokenExpiry: integer("gmail_token_expiry"), // timestamp
  createdAt: integer("created_at").default(Date.now()),
  updatedAt: integer("updated_at").default(Date.now()),
});

// Multi-factor authentication table
export const userMFA = sqliteTable("user_mfa", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull(),
  secret: text("secret").notNull(),
  backupCodes: text("backup_codes").default('[]'), // JSON string
  isEnabled: integer("is_enabled", { mode: "boolean" }).default(false),
  lastUsed: integer("last_used"), // timestamp
  createdAt: integer("created_at").default(Date.now()),
  updatedAt: integer("updated_at").default(Date.now()),
});

// Business pages table for enterprise features
export const businessPages = sqliteTable("business_pages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  workspaceId: integer("workspace_id").notNull(),
  pageId: integer("page_id").notNull(),
  businessType: text("business_type").notNull(), // dashboard, analytics, reports, etc.
  configuration: text("configuration").default('{}'), // JSON string
  permissions: text("permissions").default('{"canView":[],"canEdit":[],"canShare":[],"canAnalyze":[]}'),
  createdBy: text("created_by").notNull(),
  createdAt: integer("created_at").default(Date.now()),
  updatedAt: integer("updated_at").default(Date.now()),
});

// Sharing and collaboration table
export const pageShares = sqliteTable("page_shares", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  pageId: integer("page_id").notNull(),
  sharedBy: text("shared_by").notNull(),
  sharedWith: text("shared_with"), // null for public shares
  shareType: text("share_type").notNull(), // public, private, workspace
  permissions: text("permissions").notNull(), // view, edit, comment
  token: text("token").notNull().unique(),
  password: text("password"), // optional password protection
  expiresAt: integer("expires_at"), // timestamp
  allowDownload: integer("allow_download", { mode: "boolean" }).default(false),
  allowComments: integer("allow_comments", { mode: "boolean" }).default(true),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  viewCount: integer("view_count").default(0),
  lastAccessed: integer("last_accessed"), // timestamp
  createdAt: integer("created_at").default(Date.now()),
  updatedAt: integer("updated_at").default(Date.now()),
});

// Real-time collaboration cursors
export const collaborationCursors = sqliteTable("collaboration_cursors", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  pageId: integer("page_id").notNull(),
  userId: text("user_id").notNull(),
  x: integer("x").notNull(),
  y: integer("y").notNull(),
  timestamp: integer("timestamp").default(Date.now()),
  sessionId: text("session_id").notNull(),
});

// Live presence tracking
export const livePresence = sqliteTable("live_presence", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  pageId: integer("page_id").notNull(),
  userId: text("user_id").notNull(),
  status: text("status").notNull(), // active, typing, viewing
  lastSeen: integer("last_seen").default(Date.now()),
  currentBlock: integer("current_block"),
  sessionId: text("session_id").notNull(),
});

// Workspaces table - team workspaces
export const workspaces = sqliteTable("workspaces", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  type: text("type").default("personal"), // personal, business
  description: text("description"),
  icon: text("icon").default("🏢"),
  domain: text("domain").unique(),
  ownerId: text("owner_id").notNull(),
  plan: text("plan").default("free"), // free, personal, team, enterprise
  settings: text("settings"), // JSON string
  createdAt: integer("created_at").default(Date.now()),
  updatedAt: integer("updated_at").default(Date.now()),
});

// Workspace members - user roles in workspaces
export const workspaceMembers = sqliteTable("workspace_members", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  workspaceId: integer("workspace_id").notNull(),
  userId: text("user_id").notNull(),
  role: text("role").notNull(), // owner, admin, member, guest
  permissions: text("permissions"), // JSON string
  joinedAt: integer("joined_at").default(Date.now()),
});

// Member invitations
export const invitations = sqliteTable("invitations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  workspaceId: integer("workspace_id").notNull(),
  email: text("email").notNull(),
  role: text("role").notNull(),
  invitedBy: text("invited_by").notNull(),
  token: text("token").notNull().unique(),
  expiresAt: integer("expires_at").notNull(), // timestamp
  acceptedAt: integer("accepted_at"), // timestamp
  createdAt: integer("created_at").default(Date.now()),
});

// Templates table
export const templates = sqliteTable("templates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  description: text("description"),
  icon: text("icon").default("📋"),
  category: text("category").notNull(), // personal, team, engineering, design, etc.
  content: text("content").notNull(), // template structure (JSON string)
  isPublic: integer("is_public", { mode: "boolean" }).default(false),
  createdBy: text("created_by").notNull(),
  workspaceId: integer("workspace_id"),
  usageCount: integer("usage_count").default(0),
  createdAt: integer("created_at").default(Date.now()),
  updatedAt: integer("updated_at").default(Date.now()),
});

// Pages table - enhanced with workspace support
export const pages = sqliteTable("pages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  icon: text("icon").default("📄"),
  cover: text("cover"), // cover image URL
  parentId: integer("parent_id"),
  workspaceId: integer("workspace_id").notNull(),
  createdBy: text("created_by").notNull(),
  lastEditedBy: text("last_edited_by"),
  isPublic: integer("is_public", { mode: "boolean" }).default(false),
  publicId: text("public_id").unique(), // for public sharing
  permissions: text("permissions"), // page-level permissions (JSON string)
  properties: text("properties"), // custom properties (JSON string)
  isTemplate: integer("is_template", { mode: "boolean" }).default(false),
  templateId: integer("template_id"),
  isFavorite: integer("is_favorite", { mode: "boolean" }).default(false),
  isArchived: integer("is_archived", { mode: "boolean" }).default(false),
  isDeleted: integer("is_deleted", { mode: "boolean" }).default(false),
  deletedAt: integer("deleted_at"), // timestamp
  createdAt: integer("created_at").default(Date.now()),
  updatedAt: integer("updated_at").default(Date.now()),
});

export const blocks = sqliteTable("blocks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  pageId: integer("page_id").notNull(),
  type: text("type").notNull(), // text, header, list, code, todo, quote, divider, image, video, audio, file, database, callout, toggle, etc.
  content: text("content"), // flexible content storage (JSON string)
  position: integer("position").notNull(),
  parentId: integer("parent_id"), // for nested blocks (toggles, etc.)
  properties: text("properties"), // additional block properties (color, formatting, etc.) (JSON string)
  createdBy: text("created_by").notNull(),
  lastEditedBy: text("last_edited_by"),
  createdAt: integer("created_at").default(Date.now()),
  updatedAt: integer("updated_at").default(Date.now()),
});

// Comments and discussions
export const comments = sqliteTable("comments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  pageId: integer("page_id"),
  blockId: integer("block_id"),
  content: text("content").notNull(),
  authorId: text("author_id").notNull(),
  parentId: integer("parent_id"), // for threaded comments
  isResolved: integer("is_resolved", { mode: "boolean" }).default(false),
  resolvedBy: text("resolved_by"),
  resolvedAt: integer("resolved_at"), // timestamp
  createdAt: integer("created_at").default(Date.now()),
  updatedAt: integer("updated_at").default(Date.now()),
});

// Activity log for tracking changes
export const activities = sqliteTable("activities", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  workspaceId: integer("workspace_id").notNull(),
  userId: text("user_id").notNull(),
  action: text("action").notNull(), // created, updated, deleted, shared, etc.
  resourceType: text("resource_type").notNull(), // page, block, workspace, etc.
  resourceId: text("resource_id").notNull(),
  metadata: text("metadata"), // additional context (JSON string)
  createdAt: integer("created_at").default(Date.now()),
});

// Notifications
export const notifications = sqliteTable("notifications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull(),
  type: text("type").notNull(), // mention, comment, invite, etc.
  title: text("title").notNull(),
  message: text("message"),
  data: text("data"), // additional data for the notification (JSON string)
  isRead: integer("is_read", { mode: "boolean" }).default(false),
  createdAt: integer("created_at").default(Date.now()),
});

// Session storage table for auth
export const sessions = sqliteTable("sessions", {
  sid: text("sid").primaryKey(),
  sess: text("sess").notNull(), // JSON string
  expire: integer("expire").notNull(), // timestamp
});

// Calendar events table
export const calendarEvents = sqliteTable("calendar_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  description: text("description"),
  startDate: integer("start_date").notNull(), // timestamp
  endDate: integer("end_date").notNull(), // timestamp
  location: text("location"),
  type: text("type").notNull(), // meeting, task, reminder, deadline
  attendees: text("attendees").default('[]'), // JSON string
  workspaceId: integer("workspace_id").notNull(),
  pageId: integer("page_id"), // optional link to page
  createdBy: text("created_by").notNull(),
  isAllDay: integer("is_all_day", { mode: "boolean" }).default(false),
  recurrence: text("recurrence").default("none"), // none, daily, weekly, monthly
  status: text("status").default("confirmed"), // confirmed, tentative, cancelled
  createdAt: integer("created_at").default(Date.now()),
  updatedAt: integer("updated_at").default(Date.now()),
});

// Email threads table for Gmail integration
export const emailThreads = sqliteTable("email_threads", {
  id: text("id").primaryKey(),
  gmailThreadId: text("gmail_thread_id").notNull(),
  subject: text("subject").notNull(),
  participants: text("participants").default('[]'), // JSON string
  messageCount: integer("message_count").default(1),
  lastMessageDate: integer("last_message_date").notNull(), // timestamp
  isRead: integer("is_read", { mode: "boolean" }).default(false),
  isStarred: integer("is_starred", { mode: "boolean" }).default(false),
  labels: text("labels").default('[]'), // JSON string
  workspaceId: integer("workspace_id").notNull(),
  userId: text("user_id").notNull(),
  createdAt: integer("created_at").default(Date.now()),
  updatedAt: integer("updated_at").default(Date.now()),
});

// Email messages table
export const emailMessages = sqliteTable("email_messages", {
  id: text("id").primaryKey(),
  gmailMessageId: text("gmail_message_id").notNull(),
  threadId: text("thread_id").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  fromEmail: text("from_email").notNull(),
  toEmails: text("to_emails").default('[]'), // JSON string
  ccEmails: text("cc_emails").default('[]'), // JSON string
  bccEmails: text("bcc_emails").default('[]'), // JSON string
  date: integer("date").notNull(), // timestamp
  isRead: integer("is_read", { mode: "boolean" }).default(false),
  isStarred: integer("is_starred", { mode: "boolean" }).default(false),
  labels: text("labels").default('[]'), // JSON string
  attachments: text("attachments").default('[]'), // JSON string
  workspaceId: integer("workspace_id").notNull(),
  relatedPageId: integer("related_page_id"),
  createdAt: integer("created_at").default(Date.now()),
  updatedAt: integer("updated_at").default(Date.now()),
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
