import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { 
  insertPageSchema, insertBlockSchema, updatePageSchema, updateBlockSchema,
  insertWorkspaceSchema, insertInvitationSchema, insertTemplateSchema,
  type Page, type Block, type Workspace 
} from "@shared/schema";
import { storage } from "./storage";
import { nanoid } from "nanoid";

// Real-time collaboration state
interface CursorPosition {
  userId: string;
  userName: string;
  pageId: number;
  x: number;
  y: number;
  blockId?: number;
  selection?: { start: number; end: number };
}

interface WorkspaceSession {
  userId: string;
  userName: string;
  workspaceId: number;
  ws: WebSocket;
  cursor?: CursorPosition;
}

const activeSessions = new Map<string, WorkspaceSession>();
const workspaceConnections = new Map<number, Set<string>>();

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Workspace routes
  app.get("/api/workspaces", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const workspaces = await storage.getWorkspacesByUserId(userId);
      res.json(workspaces);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch workspaces" });
    }
  });

  app.post("/api/workspaces", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const workspaceData = insertWorkspaceSchema.parse({
        ...req.body,
        ownerId: userId
      });
      const workspace = await storage.createWorkspace(workspaceData);
      res.json(workspace);
    } catch (error) {
      res.status(400).json({ error: "Invalid workspace data" });
    }
  });

  app.get("/api/workspaces/:id", isAuthenticated, async (req: any, res) => {
    try {
      const workspaceId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      // Check if user has access to workspace
      const role = await storage.getUserWorkspaceRole(workspaceId, userId);
      if (!role) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const workspace = await storage.getWorkspace(workspaceId);
      if (!workspace) {
        return res.status(404).json({ error: "Workspace not found" });
      }
      res.json(workspace);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch workspace" });
    }
  });

  // Workspace members
  app.get("/api/workspaces/:id/members", isAuthenticated, async (req: any, res) => {
    try {
      const workspaceId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      const role = await storage.getUserWorkspaceRole(workspaceId, userId);
      if (!role) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const members = await storage.getWorkspaceMembers(workspaceId);
      res.json(members);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch members" });
    }
  });

  // Invitations
  app.post("/api/workspaces/:id/invitations", isAuthenticated, async (req: any, res) => {
    try {
      const workspaceId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      const role = await storage.getUserWorkspaceRole(workspaceId, userId);
      if (!role || (role !== 'owner' && role !== 'admin')) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const invitationData = insertInvitationSchema.parse({
        ...req.body,
        workspaceId,
        invitedBy: userId,
        token: nanoid()
      });
      
      const invitation = await storage.createInvitation(invitationData);
      res.json(invitation);
    } catch (error) {
      res.status(400).json({ error: "Invalid invitation data" });
    }
  });

  app.post("/api/invitations/:token/accept", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const success = await storage.acceptInvitation(req.params.token, userId);
      res.json({ success });
    } catch (error) {
      res.status(500).json({ error: "Failed to accept invitation" });
    }
  });

  // Templates
  app.get("/api/templates", isAuthenticated, async (req: any, res) => {
    try {
      const { workspaceId, category } = req.query;
      const templates = await storage.getTemplates(
        workspaceId ? parseInt(workspaceId as string) : undefined,
        category as string
      );
      res.json(templates);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch templates" });
    }
  });

  app.post("/api/templates", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const templateData = insertTemplateSchema.parse({
        ...req.body,
        createdBy: userId
      });
      const template = await storage.createTemplate(templateData);
      res.json(template);
    } catch (error) {
      res.status(400).json({ error: "Invalid template data" });
    }
  });

  // Page routes
  app.get("/api/workspaces/:workspaceId/pages", isAuthenticated, async (req: any, res) => {
    try {
      const workspaceId = parseInt(req.params.workspaceId);
      const userId = req.user.claims.sub;
      
      const role = await storage.getUserWorkspaceRole(workspaceId, userId);
      if (!role) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const pages = await storage.getPagesWithChildren(workspaceId);
      res.json(pages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch pages" });
    }
  });

  app.get("/api/pages/:id", isAuthenticated, async (req: any, res) => {
    try {
      const pageId = parseInt(req.params.id);
      const page = await storage.getPage(pageId);
      if (!page) {
        return res.status(404).json({ error: "Page not found" });
      }
      
      // Check workspace access
      const userId = req.user.claims.sub;
      const role = await storage.getUserWorkspaceRole(page.workspaceId, userId);
      if (!role) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      res.json(page);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch page" });
    }
  });

  app.post("/api/pages", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const pageData = insertPageSchema.parse({
        ...req.body,
        createdBy: userId,
        lastEditedBy: userId
      });
      
      // Check workspace access
      const role = await storage.getUserWorkspaceRole(pageData.workspaceId, userId);
      if (!role) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const page = await storage.createPage(pageData);
      
      // Log activity
      await storage.logActivity({
        workspaceId: pageData.workspaceId,
        userId,
        action: 'created',
        targetType: 'page',
        targetId: page.id,
        details: { title: page.title }
      });
      
      res.json(page);
    } catch (error) {
      res.status(400).json({ error: "Invalid page data" });
    }
  });

  app.patch("/api/pages/:id", isAuthenticated, async (req: any, res) => {
    try {
      const pageId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      const existingPage = await storage.getPage(pageId);
      if (!existingPage) {
        return res.status(404).json({ error: "Page not found" });
      }
      
      // Check workspace access
      const role = await storage.getUserWorkspaceRole(existingPage.workspaceId, userId);
      if (!role) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const pageData = updatePageSchema.parse({
        ...req.body,
        lastEditedBy: userId
      });
      
      const page = await storage.updatePage(pageId, pageData);
      
      // Broadcast page update to workspace members
      broadcastToWorkspace(existingPage.workspaceId, {
        type: 'page_updated',
        pageId,
        updates: pageData,
        userId
      });
      
      res.json(page);
    } catch (error) {
      res.status(400).json({ error: "Invalid page data" });
    }
  });

  app.delete("/api/pages/:id", isAuthenticated, async (req: any, res) => {
    try {
      const pageId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      const page = await storage.getPage(pageId);
      if (!page) {
        return res.status(404).json({ error: "Page not found" });
      }
      
      const role = await storage.getUserWorkspaceRole(page.workspaceId, userId);
      if (!role) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const success = await storage.deletePage(pageId);
      if (!success) {
        return res.status(404).json({ error: "Page not found" });
      }
      
      // Log activity
      await storage.logActivity({
        workspaceId: page.workspaceId,
        userId,
        action: 'deleted',
        targetType: 'page',
        targetId: pageId,
        details: { title: page.title }
      });
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete page" });
    }
  });

  // Block routes
  app.get("/api/pages/:pageId/blocks", isAuthenticated, async (req: any, res) => {
    try {
      const pageId = parseInt(req.params.pageId);
      const userId = req.user.claims.sub;
      
      const page = await storage.getPage(pageId);
      if (!page) {
        return res.status(404).json({ error: "Page not found" });
      }
      
      const role = await storage.getUserWorkspaceRole(page.workspaceId, userId);
      if (!role) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const blocks = await storage.getBlocksByPageId(pageId);
      res.json(blocks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch blocks" });
    }
  });

  app.post("/api/blocks", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const blockData = insertBlockSchema.parse({
        ...req.body,
        createdBy: userId,
        lastEditedBy: userId
      });
      
      // Check page access
      const page = await storage.getPage(blockData.pageId);
      if (!page) {
        return res.status(404).json({ error: "Page not found" });
      }
      
      const role = await storage.getUserWorkspaceRole(page.workspaceId, userId);
      if (!role) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const block = await storage.createBlock(blockData);
      
      // Broadcast block creation
      broadcastToWorkspace(page.workspaceId, {
        type: 'block_created',
        block,
        userId
      });
      
      res.json(block);
    } catch (error) {
      res.status(400).json({ error: "Invalid block data" });
    }
  });

  app.patch("/api/blocks/:id", isAuthenticated, async (req: any, res) => {
    try {
      const blockId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      const existingBlock = await storage.getBlocksByPageId(req.body.pageId || 0);
      const block = existingBlock.find(b => b.id === blockId);
      if (!block) {
        return res.status(404).json({ error: "Block not found" });
      }
      
      const page = await storage.getPage(block.pageId);
      if (!page) {
        return res.status(404).json({ error: "Page not found" });
      }
      
      const role = await storage.getUserWorkspaceRole(page.workspaceId, userId);
      if (!role) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const blockData = updateBlockSchema.parse({
        ...req.body,
        lastEditedBy: userId
      });
      
      const updatedBlock = await storage.updateBlock(blockId, blockData);
      
      // Broadcast block update
      broadcastToWorkspace(page.workspaceId, {
        type: 'block_updated',
        blockId,
        updates: blockData,
        userId
      });
      
      res.json(updatedBlock);
    } catch (error) {
      res.status(400).json({ error: "Invalid block data" });
    }
  });

  // Search routes
  app.get("/api/workspaces/:workspaceId/search", isAuthenticated, async (req: any, res) => {
    try {
      const workspaceId = parseInt(req.params.workspaceId);
      const userId = req.user.claims.sub;
      const { q: query } = req.query;
      
      if (!query || typeof query !== "string") {
        return res.status(400).json({ error: "Query parameter required" });
      }
      
      const role = await storage.getUserWorkspaceRole(workspaceId, userId);
      if (!role) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const pages = await storage.searchPages(workspaceId, query);
      res.json(pages);
    } catch (error) {
      res.status(500).json({ error: "Search failed" });
    }
  });

  // Activity feed
  app.get("/api/workspaces/:id/activity", isAuthenticated, async (req: any, res) => {
    try {
      const workspaceId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      const role = await storage.getUserWorkspaceRole(workspaceId, userId);
      if (!role) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const activities = await storage.getWorkspaceActivity(workspaceId);
      res.json(activities);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch activity" });
    }
  });

  // Notifications
  app.get("/api/notifications", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const notifications = await storage.getUserNotifications(userId);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  app.patch("/api/notifications/:id/read", isAuthenticated, async (req: any, res) => {
    try {
      const notificationId = parseInt(req.params.id);
      const success = await storage.markNotificationRead(notificationId);
      res.json({ success });
    } catch (error) {
      res.status(500).json({ error: "Failed to mark notification as read" });
    }
  });

  // Business features
  app.get("/api/workspaces/:id/analytics", isAuthenticated, async (req: any, res) => {
    try {
      const workspaceId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      const role = await storage.getUserWorkspaceRole(workspaceId, userId);
      if (!role || (role !== 'owner' && role !== 'admin')) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      // Mock analytics data for business features
      const analytics = {
        totalPages: 0,
        totalBlocks: 0,
        activeMembers: 0,
        recentActivity: [],
        pageViews: 0,
        collaborationScore: 85
      };
      
      res.json(analytics);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server for real-time collaboration
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws, req) => {
    const sessionId = nanoid();
    
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        switch (message.type) {
          case 'join_workspace':
            const session: WorkspaceSession = {
              userId: message.userId,
              userName: message.userName,
              workspaceId: message.workspaceId,
              ws
            };
            
            activeSessions.set(sessionId, session);
            
            if (!workspaceConnections.has(message.workspaceId)) {
              workspaceConnections.set(message.workspaceId, new Set());
            }
            workspaceConnections.get(message.workspaceId)!.add(sessionId);
            
            // Notify others of new user
            broadcastToWorkspace(message.workspaceId, {
              type: 'user_joined',
              userId: message.userId,
              userName: message.userName
            }, sessionId);
            break;
            
          case 'cursor_move':
            const cursorSession = activeSessions.get(sessionId);
            if (cursorSession) {
              cursorSession.cursor = {
                userId: message.userId,
                userName: message.userName,
                pageId: message.pageId,
                x: message.x,
                y: message.y,
                blockId: message.blockId,
                selection: message.selection
              };
              
              // Broadcast cursor position to others in workspace
              broadcastToWorkspace(cursorSession.workspaceId, {
                type: 'cursor_update',
                cursor: cursorSession.cursor
              }, sessionId);
            }
            break;
            
          case 'typing_start':
            broadcastToWorkspace(message.workspaceId, {
              type: 'user_typing',
              userId: message.userId,
              userName: message.userName,
              blockId: message.blockId,
              isTyping: true
            }, sessionId);
            break;
            
          case 'typing_stop':
            broadcastToWorkspace(message.workspaceId, {
              type: 'user_typing',
              userId: message.userId,
              userName: message.userName,
              blockId: message.blockId,
              isTyping: false
            }, sessionId);
            break;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });
    
    ws.on('close', () => {
      const session = activeSessions.get(sessionId);
      if (session) {
        // Remove from workspace connections
        const workspaceConnections_set = workspaceConnections.get(session.workspaceId);
        if (workspaceConnections_set) {
          workspaceConnections_set.delete(sessionId);
        }
        
        // Notify others of user leaving
        broadcastToWorkspace(session.workspaceId, {
          type: 'user_left',
          userId: session.userId,
          userName: session.userName
        }, sessionId);
        
        activeSessions.delete(sessionId);
      }
    });
  });

  function broadcastToWorkspace(workspaceId: number, message: any, excludeSessionId?: string) {
    const connections = workspaceConnections.get(workspaceId);
    if (connections) {
      connections.forEach(sessionId => {
        if (sessionId !== excludeSessionId) {
          const session = activeSessions.get(sessionId);
          if (session && session.ws.readyState === WebSocket.OPEN) {
            session.ws.send(JSON.stringify(message));
          }
        }
      });
    }
  }

  return httpServer;
}