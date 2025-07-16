import { 
  users, workspaces, workspaceMembers, invitations, templates, pages, blocks, comments, activities, notifications,
  type User, type UpsertUser, type InsertUser,
  type Workspace, type InsertWorkspace, type UpdateWorkspace,
  type WorkspaceMember, type InsertWorkspaceMember,
  type Invitation, type InsertInvitation,
  type Template, type InsertTemplate,
  type Page, type InsertPage, type UpdatePage, type PageWithChildren,
  type Block, type InsertBlock, type UpdateBlock,
  type Comment, type InsertComment,
  type Activity, type InsertActivity,
  type Notification, type InsertNotification
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc, asc, like, inArray } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
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
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Workspace operations
  async getWorkspace(id: number): Promise<Workspace | undefined> {
    const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, id));
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
    const [newWorkspace] = await db.insert(workspaces).values(workspace).returning();
    
    // Add owner as workspace member
    await db.insert(workspaceMembers).values({
      workspaceId: newWorkspace.id,
      userId: workspace.ownerId,
      role: 'owner',
      permissions: null,
    });
    
    return newWorkspace;
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
      query = query.where(and(eq(templates.workspaceId, workspaceId), eq(templates.category, category)));
    } else if (workspaceId) {
      query = query.where(eq(templates.workspaceId, workspaceId));
    } else if (category) {
      query = query.where(eq(templates.category, category));
    }
    
    return await query;
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
    const [page] = await db.select().from(pages).where(and(eq(pages.id, id), eq(pages.isDeleted, false)));
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
    return await db.select().from(blocks).where(eq(blocks.pageId, pageId)).orderBy(asc(blocks.position));
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
}

export const storage = new DatabaseStorage();