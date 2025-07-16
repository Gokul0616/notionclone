import { 
  users, workspaces, workspaceMembers, invitations, templates, pages, blocks, comments, activities, notifications,
  calendarEvents, emailThreads, emailMessages, userMFA, businessPages, pageShares, collaborationCursors, livePresence,
  type User, type UpsertUser, type InsertUser,
  type Workspace, type InsertWorkspace, type UpdateWorkspace,
  type WorkspaceMember, type InsertWorkspaceMember,
  type Invitation, type InsertInvitation,
  type Template, type InsertTemplate,
  type Page, type InsertPage, type UpdatePage, type PageWithChildren,
  type Block, type InsertBlock, type UpdateBlock,
  type Comment, type InsertComment,
  type Activity, type InsertActivity,
  type Notification, type InsertNotification,
  type CalendarEvent, type InsertCalendarEvent,
  type EmailThread, type InsertEmailThread,
  type EmailMessage, type InsertEmailMessage,
  type UserMFA, type InsertUserMFA,
  type BusinessPage, type InsertBusinessPage,
  type PageShare, type InsertPageShare,
  type CollaborationCursor, type InsertCollaborationCursor,
  type LivePresence, type InsertLivePresence
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc, asc, like, inArray } from "drizzle-orm";
import { cache } from "./cache";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsernameOrEmail(usernameOrEmail: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Workspace operations
  getWorkspace(id: number): Promise<Workspace | undefined>;
  getWorkspacesByUserId(userId: string): Promise<Workspace[]>;
  createWorkspace(workspace: InsertWorkspace): Promise<Workspace>;
  updateWorkspace(id: number, updates: UpdateWorkspace): Promise<Workspace | undefined>;
  deleteWorkspace(id: number): Promise<boolean>;
  
  // Workspace member operations
  getWorkspaceMembers(workspaceId: number): Promise<WorkspaceMember[]>;
  addWorkspaceMember(member: InsertWorkspaceMember): Promise<WorkspaceMember>;
  updateWorkspaceMember(workspaceId: number, userId: string, updates: Partial<WorkspaceMember>): Promise<WorkspaceMember | undefined>;
  removeWorkspaceMember(workspaceId: number, userId: string): Promise<boolean>;
  getUserWorkspaceRole(workspaceId: number, userId: string): Promise<string | undefined>;
  
  // Invitation operations
  createInvitation(invitation: InsertInvitation): Promise<Invitation>;
  getInvitation(token: string): Promise<Invitation | undefined>;
  acceptInvitation(token: string, userId: string): Promise<boolean>;
  getWorkspaceInvitations(workspaceId: number): Promise<Invitation[]>;
  
  // Template operations
  getTemplates(workspaceId?: number, category?: string): Promise<Template[]>;
  getTemplate(id: number): Promise<Template | undefined>;
  createTemplate(template: InsertTemplate): Promise<Template>;
  updateTemplate(id: number, updates: Partial<Template>): Promise<Template | undefined>;
  deleteTemplate(id: number): Promise<boolean>;
  
  // Page operations
  getPage(id: number): Promise<Page | undefined>;
  getPagesByWorkspace(workspaceId: number): Promise<Page[]>;
  getPagesWithChildren(workspaceId: number): Promise<PageWithChildren[]>;
  getFavoritePages(workspaceId: number, userId: string): Promise<Page[]>;
  getArchivedPages(workspaceId: number): Promise<Page[]>;
  getDeletedPages(workspaceId: number): Promise<Page[]>;
  createPage(page: InsertPage): Promise<Page>;
  updatePage(id: number, updates: UpdatePage): Promise<Page | undefined>;
  archivePage(id: number): Promise<boolean>;
  deletePage(id: number): Promise<boolean>;
  restorePage(id: number): Promise<boolean>;
  searchPages(workspaceId: number, query: string): Promise<Page[]>;
  
  // Block operations
  getBlocksByPageId(pageId: number): Promise<Block[]>;
  getBlockById(id: number): Promise<Block | undefined>;
  createBlock(block: InsertBlock): Promise<Block>;
  updateBlock(id: number, updates: UpdateBlock): Promise<Block | undefined>;
  deleteBlock(id: number): Promise<boolean>;
  reorderBlocks(pageId: number, blockIds: number[]): Promise<boolean>;
  
  // Comment operations
  getPageComments(pageId: number): Promise<Comment[]>;
  getBlockComments(blockId: number): Promise<Comment[]>;
  createComment(comment: InsertComment): Promise<Comment>;
  updateComment(id: number, updates: Partial<Comment>): Promise<Comment | undefined>;
  deleteComment(id: number): Promise<boolean>;
  resolveComment(id: number, resolvedBy: string): Promise<boolean>;
  
  // Activity operations
  logActivity(activity: InsertActivity): Promise<Activity>;
  getWorkspaceActivity(workspaceId: number, limit?: number): Promise<Activity[]>;
  
  // Notification operations
  createNotification(notification: InsertNotification): Promise<Notification>;
  getUserNotifications(userId: string): Promise<Notification[]>;
  markNotificationRead(id: number): Promise<boolean>;
  markAllNotificationsRead(userId: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    // Check cache first
    const cachedUser = cache.getUser(id);
    if (cachedUser) {
      return cachedUser;
    }
    
    const [user] = await db.select().from(users).where(eq(users.id, id));
    if (user) {
      cache.setUser(id, user);
    }
    return user || undefined;
  }

  async getUserByUsernameOrEmail(usernameOrEmail: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(
      or(
        eq(users.username, usernameOrEmail),
        eq(users.email, usernameOrEmail)
      )
    );
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    try {
      const [user] = await db
        .insert(users)
        .values(userData)
        .returning();
      return user;
    } catch (error) {
      // If user exists, update them
      const [user] = await db
        .update(users)
        .set({
          ...userData,
          updatedAt: Date.now(),
        })
        .where(eq(users.id, userData.id))
        .returning();
      return user;
    }
  }

  // Workspace operations
  async getWorkspace(id: number): Promise<Workspace | undefined> {
    // Check cache first
    const cachedWorkspace = cache.getWorkspace(id);
    if (cachedWorkspace) {
      return cachedWorkspace;
    }
    
    const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, id));
    if (workspace) {
      cache.setWorkspace(id, workspace);
    }
    return workspace || undefined;
  }

  async getWorkspacesByUserId(userId: string): Promise<Workspace[]> {
    const result = await db
      .select({ 
        workspace: workspaces 
      })
      .from(workspaces)
      .leftJoin(workspaceMembers, eq(workspaces.id, workspaceMembers.workspaceId))
      .where(or(eq(workspaces.ownerId, userId), eq(workspaceMembers.userId, userId)));
    
    return result.map(r => r.workspace).filter(Boolean);
  }

  async createWorkspace(workspace: InsertWorkspace): Promise<Workspace> {
    console.log("=== STORAGE: Creating workspace ===");
    console.log("Workspace data:", JSON.stringify(workspace, null, 2));
    
    try {
      // Insert workspace
      const [newWorkspace] = await db.insert(workspaces).values(workspace).returning();
      console.log("Workspace inserted successfully:", JSON.stringify(newWorkspace, null, 2));
      
      // Add owner as workspace member
      const memberData = {
        workspaceId: newWorkspace.id,
        userId: workspace.ownerId,
        role: 'owner' as const,
        permissions: null,
      };
      console.log("Adding workspace member:", JSON.stringify(memberData, null, 2));
      
      await db.insert(workspaceMembers).values(memberData);
      console.log("Workspace member added successfully");
      
      return newWorkspace;
    } catch (error) {
      console.error("=== STORAGE ERROR ===");
      console.error("Error inserting workspace:", error as Error);
      console.error("Error details:", (error as Error).message);
      if ((error as any).code) {
        console.error("Database error code:", (error as any).code);
      }
      throw error;
    }
  }

  async updateWorkspace(id: number, updates: UpdateWorkspace): Promise<Workspace | undefined> {
    const [workspace] = await db
      .update(workspaces)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(workspaces.id, id))
      .returning();
    return workspace || undefined;
  }

  async deleteWorkspace(id: number): Promise<boolean> {
    const result = await db.delete(workspaces).where(eq(workspaces.id, id));
    return result.rowCount! > 0;
  }

  // Workspace member operations
  async getWorkspaceMembers(workspaceId: number): Promise<WorkspaceMember[]> {
    return await db.select().from(workspaceMembers).where(eq(workspaceMembers.workspaceId, workspaceId));
  }

  async addWorkspaceMember(member: InsertWorkspaceMember): Promise<WorkspaceMember> {
    const [newMember] = await db.insert(workspaceMembers).values(member).returning();
    return newMember;
  }

  async updateWorkspaceMember(workspaceId: number, userId: string, updates: Partial<WorkspaceMember>): Promise<WorkspaceMember | undefined> {
    const [member] = await db
      .update(workspaceMembers)
      .set(updates)
      .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)))
      .returning();
    return member || undefined;
  }

  async removeWorkspaceMember(workspaceId: number, userId: string): Promise<boolean> {
    const result = await db
      .delete(workspaceMembers)
      .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)));
    return result.rowCount! > 0;
  }

  async getUserWorkspaceRole(workspaceId: number, userId: string): Promise<string | undefined> {
    const [member] = await db
      .select({ role: workspaceMembers.role })
      .from(workspaceMembers)
      .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)));
    return member?.role;
  }

  // Invitation operations
  async createInvitation(invitation: InsertInvitation): Promise<Invitation> {
    const [newInvitation] = await db.insert(invitations).values(invitation).returning();
    return newInvitation;
  }

  async getInvitation(token: string): Promise<Invitation | undefined> {
    const [invitation] = await db.select().from(invitations).where(eq(invitations.token, token));
    return invitation || undefined;
  }

  async acceptInvitation(token: string, userId: string): Promise<boolean> {
    const invitation = await this.getInvitation(token);
    if (!invitation || invitation.acceptedAt) return false;

    // Add user to workspace
    await this.addWorkspaceMember({
      workspaceId: invitation.workspaceId,
      userId,
      role: invitation.role,
      permissions: null,
    });

    // Mark invitation as accepted
    await db
      .update(invitations)
      .set({ acceptedAt: new Date() })
      .where(eq(invitations.token, token));

    return true;
  }

  async getWorkspaceInvitations(workspaceId: number): Promise<Invitation[]> {
    return await db.select().from(invitations).where(eq(invitations.workspaceId, workspaceId));
  }

  // Template operations
  async getTemplates(workspaceId?: number, category?: string): Promise<Template[]> {
    let query = db.select().from(templates);
    
    if (workspaceId && category) {
      return await db.select().from(templates).where(and(eq(templates.workspaceId, workspaceId), eq(templates.category, category)));
    } else if (workspaceId) {
      return await db.select().from(templates).where(eq(templates.workspaceId, workspaceId));
    } else if (category) {
      return await db.select().from(templates).where(eq(templates.category, category));
    }
    
    return await db.select().from(templates);
  }

  async getTemplate(id: number): Promise<Template | undefined> {
    const [template] = await db.select().from(templates).where(eq(templates.id, id));
    return template || undefined;
  }

  async createTemplate(template: InsertTemplate): Promise<Template> {
    const [newTemplate] = await db.insert(templates).values(template).returning();
    return newTemplate;
  }

  async updateTemplate(id: number, updates: Partial<Template>): Promise<Template | undefined> {
    const [template] = await db
      .update(templates)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(templates.id, id))
      .returning();
    return template || undefined;
  }

  async deleteTemplate(id: number): Promise<boolean> {
    const result = await db.delete(templates).where(eq(templates.id, id));
    return result.rowCount! > 0;
  }

  // Page operations
  async getPage(id: number): Promise<Page | undefined> {
    // Check cache first
    const cachedPage = cache.getPage(id);
    if (cachedPage) {
      return cachedPage;
    }
    
    const [page] = await db.select().from(pages).where(and(eq(pages.id, id), eq(pages.isDeleted, false)));
    if (page) {
      cache.setPage(id, page);
    }
    return page || undefined;
  }

  async getPagesByWorkspace(workspaceId: number): Promise<Page[]> {
    return await db.select().from(pages).where(and(eq(pages.workspaceId, workspaceId), eq(pages.isDeleted, false)));
  }

  async getPagesWithChildren(workspaceId: number): Promise<PageWithChildren[]> {
    const allPages = await this.getPagesByWorkspace(workspaceId);
    const pageMap = new Map<number, PageWithChildren>();
    
    // Convert to PageWithChildren and create map
    allPages.forEach(page => {
      pageMap.set(page.id, { ...page, children: [] });
    });

    const rootPages: PageWithChildren[] = [];

    // Build hierarchy
    allPages.forEach(page => {
      const pageWithChildren = pageMap.get(page.id)!;
      if (page.parentId) {
        const parent = pageMap.get(page.parentId);
        if (parent) {
          parent.children!.push(pageWithChildren);
        }
      } else {
        rootPages.push(pageWithChildren);
      }
    });

    return rootPages;
  }

  async getFavoritePages(workspaceId: number, userId: string): Promise<Page[]> {
    return await db.select().from(pages).where(and(
      eq(pages.workspaceId, workspaceId),
      eq(pages.isFavorite, true),
      eq(pages.isDeleted, false)
    ));
  }

  async getArchivedPages(workspaceId: number): Promise<Page[]> {
    return await db.select().from(pages).where(and(
      eq(pages.workspaceId, workspaceId),
      eq(pages.isArchived, true),
      eq(pages.isDeleted, false)
    ));
  }

  async getDeletedPages(workspaceId: number): Promise<Page[]> {
    return await db.select().from(pages).where(and(
      eq(pages.workspaceId, workspaceId),
      eq(pages.isDeleted, true)
    ));
  }

  async createPage(page: InsertPage): Promise<Page> {
    const [newPage] = await db.insert(pages).values(page).returning();
    return newPage;
  }

  async updatePage(id: number, updates: UpdatePage): Promise<Page | undefined> {
    const [page] = await db
      .update(pages)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(pages.id, id))
      .returning();
    return page || undefined;
  }

  async archivePage(id: number): Promise<boolean> {
    const result = await db
      .update(pages)
      .set({ isArchived: true, updatedAt: new Date() })
      .where(eq(pages.id, id));
    return result.rowCount! > 0;
  }

  async deletePage(id: number): Promise<boolean> {
    const result = await db
      .update(pages)
      .set({ isDeleted: true, deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(pages.id, id));
    return result.rowCount! > 0;
  }

  async restorePage(id: number): Promise<boolean> {
    const result = await db
      .update(pages)
      .set({ isDeleted: false, isArchived: false, deletedAt: null, updatedAt: new Date() })
      .where(eq(pages.id, id));
    return result.rowCount! > 0;
  }

  async searchPages(workspaceId: number, query: string): Promise<Page[]> {
    return await db.select().from(pages).where(and(
      eq(pages.workspaceId, workspaceId),
      eq(pages.isDeleted, false),
      like(pages.title, `%${query}%`)
    ));
  }

  // Block operations
  async getBlocksByPageId(pageId: number): Promise<Block[]> {
    // Check cache first
    const cachedBlocks = cache.getBlocks(pageId);
    if (cachedBlocks) {
      return cachedBlocks;
    }
    
    const blockResults = await db.select().from(blocks).where(eq(blocks.pageId, pageId)).orderBy(asc(blocks.position));
    cache.setBlocks(pageId, blockResults);
    return blockResults;
  }

  async getBlockById(id: number): Promise<Block | undefined> {
    const [block] = await db.select().from(blocks).where(eq(blocks.id, id));
    return block || undefined;
  }

  async createBlock(block: InsertBlock): Promise<Block> {
    const [newBlock] = await db.insert(blocks).values(block).returning();
    return newBlock;
  }

  async updateBlock(id: number, updates: UpdateBlock): Promise<Block | undefined> {
    const [block] = await db
      .update(blocks)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(blocks.id, id))
      .returning();
    
    // Invalidate cache for the page containing this block
    if (block) {
      cache.invalidateBlocks(block.pageId);
    }
    
    return block || undefined;
  }

  async deleteBlock(id: number): Promise<boolean> {
    const result = await db.delete(blocks).where(eq(blocks.id, id));
    return result.rowCount! > 0;
  }

  async reorderBlocks(pageId: number, blockIds: number[]): Promise<boolean> {
    try {
      for (let i = 0; i < blockIds.length; i++) {
        await db
          .update(blocks)
          .set({ position: i, updatedAt: new Date() })
          .where(and(eq(blocks.id, blockIds[i]), eq(blocks.pageId, pageId)));
      }
      return true;
    } catch {
      return false;
    }
  }

  // Comment operations
  async getPageComments(pageId: number): Promise<Comment[]> {
    return await db.select().from(comments).where(eq(comments.pageId, pageId)).orderBy(desc(comments.createdAt));
  }

  async getBlockComments(blockId: number): Promise<Comment[]> {
    return await db.select().from(comments).where(eq(comments.blockId, blockId)).orderBy(desc(comments.createdAt));
  }

  async createComment(comment: InsertComment): Promise<Comment> {
    const [newComment] = await db.insert(comments).values(comment).returning();
    return newComment;
  }

  async updateComment(id: number, updates: Partial<Comment>): Promise<Comment | undefined> {
    const [comment] = await db
      .update(comments)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(comments.id, id))
      .returning();
    return comment || undefined;
  }

  async deleteComment(id: number): Promise<boolean> {
    const result = await db.delete(comments).where(eq(comments.id, id));
    return result.rowCount! > 0;
  }

  async resolveComment(id: number, resolvedBy: string): Promise<boolean> {
    const result = await db
      .update(comments)
      .set({ isResolved: true, resolvedBy, resolvedAt: new Date(), updatedAt: new Date() })
      .where(eq(comments.id, id));
    return result.rowCount! > 0;
  }

  // Activity operations
  async logActivity(activity: InsertActivity): Promise<Activity> {
    const [newActivity] = await db.insert(activities).values(activity).returning();
    return newActivity;
  }

  async getWorkspaceActivity(workspaceId: number, limit = 50): Promise<Activity[]> {
    return await db.select().from(activities)
      .where(eq(activities.workspaceId, workspaceId))
      .orderBy(desc(activities.createdAt))
      .limit(limit);
  }

  // Notification operations
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotification] = await db.insert(notifications).values(notification).returning();
    return newNotification;
  }

  async getUserNotifications(userId: string): Promise<Notification[]> {
    return await db.select().from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async markNotificationRead(id: number): Promise<boolean> {
    const result = await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id));
    return result.rowCount! > 0;
  }

  async markAllNotificationsRead(userId: string): Promise<boolean> {
    const result = await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
    return result.rowCount! > 0;
  }

  // MFA Methods
  async getMFASettings(userId: string): Promise<UserMFA | undefined> {
    try {
      const [mfa] = await db.select().from(userMFA).where(eq(userMFA.userId, userId));
      return mfa;
    } catch (error) {
      console.error('Error getting MFA settings:', error);
      return undefined;
    }
  }

  async setupMFA(userId: string, secret: string): Promise<UserMFA> {
    const [mfa] = await db.insert(userMFA).values({
      userId,
      secret,
      backupCodes: [],
      isEnabled: false
    }).returning();
    return mfa;
  }

  async enableMFA(userId: string, backupCodes: string[]): Promise<UserMFA> {
    const [mfa] = await db.update(userMFA)
      .set({ isEnabled: true, backupCodes, lastUsed: new Date() })
      .where(eq(userMFA.userId, userId))
      .returning();
    return mfa;
  }

  async disableMFA(userId: string): Promise<boolean> {
    try {
      await db.delete(userMFA).where(eq(userMFA.userId, userId));
      return true;
    } catch (error) {
      console.error('Error disabling MFA:', error);
      return false;
    }
  }

  async generateBackupCodes(userId: string): Promise<string[]> {
    const codes = Array.from({ length: 8 }, () => 
      Math.random().toString(36).substring(2, 15).toUpperCase()
    );
    
    await db.update(userMFA)
      .set({ backupCodes: codes })
      .where(eq(userMFA.userId, userId));
    
    return codes;
  }

  // Business Page Methods
  async getBusinessPages(workspaceId: number): Promise<BusinessPage[]> {
    return await db.select().from(businessPages).where(eq(businessPages.workspaceId, workspaceId));
  }

  async createBusinessPage(businessPage: InsertBusinessPage): Promise<BusinessPage> {
    const [page] = await db.insert(businessPages).values(businessPage).returning();
    return page;
  }

  async updateBusinessPage(id: number, updates: Partial<BusinessPage>): Promise<BusinessPage | undefined> {
    const [page] = await db.update(businessPages)
      .set(updates)
      .where(eq(businessPages.id, id))
      .returning();
    return page;
  }

  async deleteBusinessPage(id: number): Promise<boolean> {
    try {
      await db.delete(businessPages).where(eq(businessPages.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting business page:', error);
      return false;
    }
  }

  // Page Sharing Methods
  async getPageShare(pageId: number): Promise<PageShare | undefined> {
    const [share] = await db.select().from(pageShares).where(eq(pageShares.pageId, pageId));
    return share;
  }

  async createPageShare(pageShare: InsertPageShare): Promise<PageShare> {
    const [share] = await db.insert(pageShares).values(pageShare).returning();
    return share;
  }

  async updatePageShare(id: number, updates: Partial<PageShare>): Promise<PageShare | undefined> {
    const [share] = await db.update(pageShares)
      .set(updates)
      .where(eq(pageShares.id, id))
      .returning();
    return share;
  }

  async deletePageShare(id: number): Promise<boolean> {
    try {
      await db.delete(pageShares).where(eq(pageShares.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting page share:', error);
      return false;
    }
  }

  async getSharedPage(token: string): Promise<PageShare | undefined> {
    const [share] = await db.select().from(pageShares).where(eq(pageShares.token, token));
    return share;
  }

  // Collaboration Methods
  async logCollaborationCursor(cursor: InsertCollaborationCursor): Promise<CollaborationCursor> {
    const [cursorData] = await db.insert(collaborationCursors).values(cursor).returning();
    return cursorData;
  }

  async getPageCursors(pageId: number): Promise<CollaborationCursor[]> {
    return await db.select().from(collaborationCursors)
      .where(eq(collaborationCursors.pageId, pageId))
      .orderBy(desc(collaborationCursors.timestamp));
  }

  async updateLivePresence(presence: InsertLivePresence): Promise<LivePresence> {
    const [presenceData] = await db.insert(livePresence).values(presence).returning();
    return presenceData;
  }

  async getPagePresence(pageId: number): Promise<LivePresence[]> {
    return await db.select().from(livePresence)
      .where(eq(livePresence.pageId, pageId))
      .orderBy(desc(livePresence.lastSeen));
  }

  async cleanupOldCursors(olderThan: Date): Promise<boolean> {
    try {
      await db.delete(collaborationCursors)
        .where(and(
          eq(collaborationCursors.timestamp, olderThan)
        ));
      return true;
    } catch (error) {
      console.error('Error cleaning up old cursors:', error);
      return false;
    }
  }

  async cleanupOldPresence(olderThan: Date): Promise<boolean> {
    try {
      await db.delete(livePresence)
        .where(and(
          eq(livePresence.lastSeen, olderThan)
        ));
      return true;
    } catch (error) {
      console.error('Error cleaning up old presence:', error);
      return false;
    }
  }
}

export const storage = new DatabaseStorage();