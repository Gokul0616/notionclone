import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { WebSocketAPIServer } from "./websocket-api";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { 
  insertPageSchema, insertBlockSchema, updatePageSchema, updateBlockSchema,
  insertWorkspaceSchema, insertInvitationSchema, insertTemplateSchema,
  insertUserSchema, type Page, type Block, type Workspace, type User
} from "@shared/schema";
import { storage } from "./storage";
import { nanoid } from "nanoid";
import bcrypt from "bcrypt";
import { z } from "zod";

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

  // Health check endpoint
  app.get('/api/health', async (req, res) => {
    try {
      // Test database connection
      await storage.getUser('test-user-id');
      res.json({ status: 'ok', database: 'connected' });
    } catch (error) {
      console.error("Health check failed:", error);
      res.status(500).json({ status: 'error', database: 'disconnected', error: error.message });
    }
  });

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

  // Credential-based authentication routes
  const credentialLoginSchema = z.object({
    username: z.string().min(1, "Username is required"),
    password: z.string().min(1, "Password is required")
  });

  const credentialRegisterSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    username: z.string().min(1, "Username is required"),
    email: z.string().email("Valid email is required"),
    password: z.string().min(8, "Password must be at least 8 characters")
  });

  app.post('/api/login', async (req, res) => {
    try {
      const { username, password } = credentialLoginSchema.parse(req.body);
      
      // Find user by username or email
      const user = await storage.getUserByUsernameOrEmail(username);
      if (!user || !user.password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Set up session
      req.session.user = {
        claims: {
          sub: user.id,
          email: user.email,
          first_name: user.firstName,
          last_name: user.lastName,
          profile_image_url: user.profileImageUrl
        }
      };

      // Return user data (without password)
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Login error:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid input data" });
      }
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post('/api/register', async (req, res) => {
    try {
      const { name, username, email, password } = credentialRegisterSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByUsernameOrEmail(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username or email already exists" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Create user
      const [firstName, ...lastNameParts] = name.split(' ');
      const lastName = lastNameParts.join(' ');
      
      const newUser = await storage.upsertUser({
        id: nanoid(),
        email,
        firstName,
        lastName: lastName || '',
        username,
        password: hashedPassword,
        profileImageUrl: null,
        preferences: null,
        timezone: 'UTC',
        theme: 'system',
        language: 'en',
        notifications: {
          email: true,
          desktop: true,
          mentions: true,
          comments: true
        },
        privacy: {
          profileVisible: true,
          activityVisible: true
        },
        gmailRefreshToken: null,
        gmailAccessToken: null,
        gmailTokenExpiry: null
      });

      // Set up session
      req.session.user = {
        claims: {
          sub: newUser.id,
          email: newUser.email,
          first_name: newUser.firstName,
          last_name: newUser.lastName,
          profile_image_url: newUser.profileImageUrl
        }
      };

      // Create default workspace
      try {
        const defaultWorkspace = await storage.createWorkspace({
          name: `${firstName}'s Workspace`,
          description: 'Your personal workspace',
          type: 'personal',
          ownerId: newUser.id,
          icon: '🏠',
          plan: 'free',
          settings: null
        });

        // Add user as owner of the workspace
        await storage.addWorkspaceMember({
          workspaceId: defaultWorkspace.id,
          userId: newUser.id,
          role: 'owner',
          permissions: null
        });
      } catch (workspaceError) {
        console.error("Failed to create default workspace:", workspaceError);
        // Continue without workspace - user can create one later
      }

      // Return user data (without password)
      const { password: _, ...userWithoutPassword } = newUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Registration error:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid input data" });
      }
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
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
      console.log("=== WORKSPACE CREATION DEBUG ===");
      console.log("User ID:", userId);
      console.log("Request body:", JSON.stringify(req.body, null, 2));
      
      // Validate user ID exists
      if (!userId) {
        console.error("No user ID found in request");
        return res.status(401).json({ error: "User not authenticated" });
      }
      
      // Check if user exists in database
      const user = await storage.getUser(userId);
      if (!user) {
        console.error("User not found in database:", userId);
        return res.status(404).json({ error: "User not found" });
      }
      console.log("User found:", user);
      
      // Validate required fields
      if (!req.body.name || req.body.name.trim() === "") {
        console.error("Missing or empty workspace name");
        return res.status(400).json({ error: "Workspace name is required" });
      }
      
      const workspaceData = {
        name: req.body.name.trim(),
        description: req.body.description || null,
        type: req.body.type || "personal",
        ownerId: userId,
        icon: req.body.icon || "🏢",
        plan: "free",
        settings: null
      };
      
      console.log("Prepared workspace data:", JSON.stringify(workspaceData, null, 2));
      
      // Validate with schema
      const validatedData = insertWorkspaceSchema.parse(workspaceData);
      console.log("Schema validation passed:", JSON.stringify(validatedData, null, 2));
      
      // Create workspace
      const workspace = await storage.createWorkspace(validatedData);
      console.log("Successfully created workspace:", JSON.stringify(workspace, null, 2));
      
      res.json(workspace);
    } catch (error) {
      console.error("=== WORKSPACE CREATION ERROR ===");
      console.error("Error type:", error.constructor.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
      
      if (error.name === 'ZodError') {
        console.error("Validation errors:", error.errors);
        return res.status(400).json({ 
          error: "Invalid workspace data", 
          details: error.errors 
        });
      }
      
      res.status(500).json({ 
        error: "Failed to create workspace", 
        details: error.message 
      });
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
      console.log("=== PAGE CREATION DEBUG ===");
      console.log("User ID:", userId);
      console.log("Request body:", JSON.stringify(req.body, null, 2));
      
      const pageData = insertPageSchema.parse({
        ...req.body,
        createdBy: userId,
        lastEditedBy: userId
      });
      
      console.log("Parsed page data:", JSON.stringify(pageData, null, 2));
      
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
        resourceType: 'page',
        resourceId: page.id.toString(),
        metadata: { title: page.title }
      });
      
      res.json(page);
    } catch (error) {
      console.error("=== PAGE CREATION ERROR ===");
      console.error("Error object:", error);
      console.error("Error message:", error.message);
      if (error.errors) {
        console.error("Validation errors:", error.errors);
      }
      res.status(400).json({ error: "Invalid page data", details: error.message });
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
        resourceType: 'page',
        resourceId: pageId.toString(),
        metadata: { title: page.title }
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
      console.log("=== BLOCK CREATION DEBUG ===");
      console.log("User ID:", userId);
      console.log("Request body:", JSON.stringify(req.body, null, 2));
      
      const blockData = insertBlockSchema.parse({
        ...req.body,
        createdBy: userId,
        lastEditedBy: userId
      });
      
      console.log("Parsed block data:", JSON.stringify(blockData, null, 2));
      
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
      console.error("=== BLOCK CREATION ERROR ===");
      console.error("Error object:", error);
      console.error("Error message:", error.message);
      if (error.errors) {
        console.error("Validation errors:", error.errors);
      }
      res.status(400).json({ error: "Invalid block data", details: error.message });
    }
  });

  app.patch("/api/blocks/:id", isAuthenticated, async (req: any, res) => {
    try {
      const blockId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      console.log("=== BLOCK UPDATE DEBUG ===");
      console.log("Block ID:", blockId);
      console.log("User ID:", userId);
      console.log("Request body:", JSON.stringify(req.body, null, 2));
      
      // Get block directly from storage
      const block = await storage.getBlockById(blockId);
      if (!block) {
        console.log("Block not found with ID:", blockId);
        return res.status(404).json({ error: "Block not found" });
      }
      
      console.log("Found block:", JSON.stringify(block, null, 2));
      
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
      
      console.log("Update data:", JSON.stringify(blockData, null, 2));
      
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
      console.error("=== BLOCK UPDATE ERROR ===");
      console.error("Error object:", error);
      console.error("Error message:", error.message);
      if (error.errors) {
        console.error("Validation errors:", error.errors);
      }
      res.status(400).json({ error: "Invalid block data", details: error.message });
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

  // Initialize WebSocket API server for full WebSocket-only communication
  const wsApiServer = new WebSocketAPIServer(httpServer);

  return httpServer;
}