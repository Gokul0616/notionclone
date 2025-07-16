import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { storage } from './storage';
import bcrypt from 'bcrypt';
import { nanoid } from 'nanoid';

interface WebSocketClient extends WebSocket {
  userId?: string;
  workspaceId?: number;
  sessionId?: string;
  isAuthenticated?: boolean;
}

interface WSMessage {
  type: string;
  data?: any;
  requestId?: string;
}

interface WSResponse {
  type: string;
  data?: any;
  requestId?: string;
  error?: string;
}

export class WebSocketAPIServer {
  private wss: WebSocketServer;
  private clients: Map<string, WebSocketClient> = new Map();
  private reconnectAttempts: Map<string, number> = new Map();

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/api/ws' });
    this.setupWebSocketServer();
  }

  private setupWebSocketServer() {
    this.wss.on('connection', (ws: WebSocketClient, request) => {
      const sessionId = nanoid();
      ws.sessionId = sessionId;
      this.clients.set(sessionId, ws);

      console.log(`WebSocket client connected: ${sessionId}`);

      ws.on('message', async (message) => {
        try {
          const data: WSMessage = JSON.parse(message.toString());
          await this.handleMessage(ws, data);
        } catch (error) {
          this.sendError(ws, 'Invalid message format');
        }
      });

      ws.on('close', () => {
        this.handleDisconnect(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.handleDisconnect(ws);
      });

      // Send connection success
      this.sendResponse(ws, {
        type: 'connection_established',
        data: { sessionId }
      });
    });
  }

  private async handleMessage(ws: WebSocketClient, message: WSMessage) {
    const { type, data, requestId } = message;

    try {
      switch (type) {
        case 'auth_login':
          await this.handleLogin(ws, data, requestId);
          break;
        case 'auth_register':
          await this.handleRegister(ws, data, requestId);
          break;
        case 'auth_logout':
          await this.handleLogout(ws, requestId);
          break;
        case 'get_user':
          await this.handleGetUser(ws, requestId);
          break;
        case 'get_workspaces':
          await this.handleGetWorkspaces(ws, requestId);
          break;
        case 'create_workspace':
          await this.handleCreateWorkspace(ws, data, requestId);
          break;
        case 'get_pages':
          await this.handleGetPages(ws, data, requestId);
          break;
        case 'create_page':
          await this.handleCreatePage(ws, data, requestId);
          break;
        case 'update_page':
          await this.handleUpdatePage(ws, data, requestId);
          break;
        case 'delete_page':
          await this.handleDeletePage(ws, data, requestId);
          break;
        case 'get_blocks':
          await this.handleGetBlocks(ws, data, requestId);
          break;
        case 'create_block':
          await this.handleCreateBlock(ws, data, requestId);
          break;
        case 'update_block':
          await this.handleUpdateBlock(ws, data, requestId);
          break;
        case 'delete_block':
          await this.handleDeleteBlock(ws, data, requestId);
          break;
        case 'reorder_blocks':
          await this.handleReorderBlocks(ws, data, requestId);
          break;
        case 'get_business_workspace':
          await this.handleGetBusinessWorkspace(ws, data, requestId);
          break;
        case 'heartbeat':
          this.sendResponse(ws, { type: 'heartbeat_response', requestId });
          break;
        default:
          this.sendError(ws, `Unknown message type: ${type}`, requestId);
      }
    } catch (error) {
      console.error('Error handling message:', error);
      this.sendError(ws, 'Internal server error', requestId);
    }
  }

  private async handleLogin(ws: WebSocketClient, data: any, requestId?: string) {
    const { usernameOrEmail, password } = data;
    
    if (!usernameOrEmail || !password) {
      this.sendError(ws, 'Username/email and password are required', requestId);
      return;
    }

    try {
      const user = await storage.getUserByUsernameOrEmail(usernameOrEmail);
      if (!user || !user.password) {
        this.sendError(ws, 'Invalid credentials', requestId);
        return;
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        this.sendError(ws, 'Invalid credentials', requestId);
        return;
      }

      ws.userId = user.id;
      ws.isAuthenticated = true;

      // Get user workspaces
      const workspaces = await storage.getWorkspacesByUserId(user.id);
      
      this.sendResponse(ws, {
        type: 'auth_success',
        data: {
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            theme: user.theme,
            timezone: user.timezone,
            language: user.language
          },
          workspaces
        },
        requestId
      });
    } catch (error) {
      console.error('Login error:', error);
      this.sendError(ws, 'Login failed', requestId);
    }
  }

  private async handleRegister(ws: WebSocketClient, data: any, requestId?: string) {
    const { email, username, password, firstName, lastName } = data;
    
    if (!email || !username || !password) {
      this.sendError(ws, 'Email, username, and password are required', requestId);
      return;
    }

    try {
      const existingUser = await storage.getUserByUsernameOrEmail(username);
      if (existingUser) {
        this.sendError(ws, 'Username or email already exists', requestId);
        return;
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const userId = nanoid();

      const newUser = await storage.upsertUser({
        id: userId,
        email,
        username,
        password: hashedPassword,
        firstName,
        lastName,
        theme: 'system',
        timezone: 'UTC',
        language: 'en',
        notifications: '{"email":true,"desktop":true,"mentions":true,"comments":true}',
        privacy: '{"profileVisible":true,"activityVisible":true}',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Create default workspace
      const workspace = await storage.createWorkspace({
        name: `${firstName || username}'s Workspace`,
        type: 'personal',
        description: 'Your personal workspace',
        icon: '🏠',
        ownerId: userId,
        plan: 'free',
        settings: '{}',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      ws.userId = userId;
      ws.isAuthenticated = true;
      ws.workspaceId = workspace.id;

      this.sendResponse(ws, {
        type: 'auth_success',
        data: {
          user: {
            id: newUser.id,
            email: newUser.email,
            username: newUser.username,
            firstName: newUser.firstName,
            lastName: newUser.lastName,
            theme: newUser.theme,
            timezone: newUser.timezone,
            language: newUser.language
          },
          workspaces: [workspace]
        },
        requestId
      });
    } catch (error) {
      console.error('Registration error:', error);
      this.sendError(ws, 'Registration failed', requestId);
    }
  }

  private async handleLogout(ws: WebSocketClient, requestId?: string) {
    ws.userId = undefined;
    ws.workspaceId = undefined;
    ws.isAuthenticated = false;
    
    this.sendResponse(ws, {
      type: 'auth_logout_success',
      requestId
    });
  }

  private async handleGetUser(ws: WebSocketClient, requestId?: string) {
    if (!ws.isAuthenticated || !ws.userId) {
      this.sendError(ws, 'Not authenticated', requestId);
      return;
    }

    try {
      const user = await storage.getUser(ws.userId);
      if (!user) {
        this.sendError(ws, 'User not found', requestId);
        return;
      }

      this.sendResponse(ws, {
        type: 'user_data',
        data: {
          id: user.id,
          email: user.email,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          theme: user.theme,
          timezone: user.timezone,
          language: user.language
        },
        requestId
      });
    } catch (error) {
      console.error('Get user error:', error);
      this.sendError(ws, 'Failed to get user', requestId);
    }
  }

  private async handleGetWorkspaces(ws: WebSocketClient, requestId?: string) {
    if (!ws.isAuthenticated || !ws.userId) {
      this.sendError(ws, 'Not authenticated', requestId);
      return;
    }

    try {
      const workspaces = await storage.getWorkspacesByUserId(ws.userId);
      this.sendResponse(ws, {
        type: 'workspaces_data',
        data: workspaces,
        requestId
      });
    } catch (error) {
      console.error('Get workspaces error:', error);
      this.sendError(ws, 'Failed to get workspaces', requestId);
    }
  }

  private async handleCreateWorkspace(ws: WebSocketClient, data: any, requestId?: string) {
    if (!ws.isAuthenticated || !ws.userId) {
      this.sendError(ws, 'Not authenticated', requestId);
      return;
    }

    try {
      const workspace = await storage.createWorkspace({
        ...data,
        ownerId: ws.userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      this.sendResponse(ws, {
        type: 'workspace_created',
        data: workspace,
        requestId
      });
    } catch (error) {
      console.error('Create workspace error:', error);
      this.sendError(ws, 'Failed to create workspace', requestId);
    }
  }

  private async handleGetPages(ws: WebSocketClient, data: any, requestId?: string) {
    if (!ws.isAuthenticated || !ws.userId) {
      this.sendError(ws, 'Not authenticated', requestId);
      return;
    }

    try {
      const { workspaceId } = data;
      const pages = await storage.getPagesByWorkspace(workspaceId);
      
      this.sendResponse(ws, {
        type: 'pages_data',
        data: pages,
        requestId
      });
    } catch (error) {
      console.error('Get pages error:', error);
      this.sendError(ws, 'Failed to get pages', requestId);
    }
  }

  private async handleCreatePage(ws: WebSocketClient, data: any, requestId?: string) {
    if (!ws.isAuthenticated || !ws.userId) {
      this.sendError(ws, 'Not authenticated', requestId);
      return;
    }

    try {
      const page = await storage.createPage({
        ...data,
        createdBy: ws.userId,
        lastEditedBy: ws.userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      this.sendResponse(ws, {
        type: 'page_created',
        data: page,
        requestId
      });

      // Broadcast to other users in the workspace
      this.broadcastToWorkspace(data.workspaceId, {
        type: 'page_created',
        data: page
      }, ws.sessionId);
    } catch (error) {
      console.error('Create page error:', error);
      this.sendError(ws, 'Failed to create page', requestId);
    }
  }

  private async handleUpdatePage(ws: WebSocketClient, data: any, requestId?: string) {
    if (!ws.isAuthenticated || !ws.userId) {
      this.sendError(ws, 'Not authenticated', requestId);
      return;
    }

    try {
      const { id, ...updates } = data;
      const page = await storage.updatePage(id, {
        ...updates,
        lastEditedBy: ws.userId,
        updatedAt: Date.now(),
      });

      if (!page) {
        this.sendError(ws, 'Page not found', requestId);
        return;
      }

      this.sendResponse(ws, {
        type: 'page_updated',
        data: page,
        requestId
      });

      // Broadcast to other users in the workspace
      this.broadcastToWorkspace(page.workspaceId, {
        type: 'page_updated',
        data: page
      }, ws.sessionId);
    } catch (error) {
      console.error('Update page error:', error);
      this.sendError(ws, 'Failed to update page', requestId);
    }
  }

  private async handleDeletePage(ws: WebSocketClient, data: any, requestId?: string) {
    if (!ws.isAuthenticated || !ws.userId) {
      this.sendError(ws, 'Not authenticated', requestId);
      return;
    }

    try {
      const { id } = data;
      const success = await storage.deletePage(id);

      if (!success) {
        this.sendError(ws, 'Page not found', requestId);
        return;
      }

      this.sendResponse(ws, {
        type: 'page_deleted',
        data: { id },
        requestId
      });

      // Broadcast to other users in the workspace
      this.broadcastToWorkspace(data.workspaceId, {
        type: 'page_deleted',
        data: { id }
      }, ws.sessionId);
    } catch (error) {
      console.error('Delete page error:', error);
      this.sendError(ws, 'Failed to delete page', requestId);
    }
  }

  private async handleGetBlocks(ws: WebSocketClient, data: any, requestId?: string) {
    if (!ws.isAuthenticated || !ws.userId) {
      this.sendError(ws, 'Not authenticated', requestId);
      return;
    }

    try {
      const { pageId } = data;
      const blocks = await storage.getBlocksByPageId(pageId);
      
      this.sendResponse(ws, {
        type: 'blocks_data',
        data: blocks,
        requestId
      });
    } catch (error) {
      console.error('Get blocks error:', error);
      this.sendError(ws, 'Failed to get blocks', requestId);
    }
  }

  private async handleCreateBlock(ws: WebSocketClient, data: any, requestId?: string) {
    if (!ws.isAuthenticated || !ws.userId) {
      this.sendError(ws, 'Not authenticated', requestId);
      return;
    }

    try {
      const block = await storage.createBlock({
        ...data,
        createdBy: ws.userId,
        lastEditedBy: ws.userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      this.sendResponse(ws, {
        type: 'block_created',
        data: block,
        requestId
      });

      // Broadcast to other users viewing the same page
      this.broadcastToPage(data.pageId, {
        type: 'block_created',
        data: block
      }, ws.sessionId);
    } catch (error) {
      console.error('Create block error:', error);
      this.sendError(ws, 'Failed to create block', requestId);
    }
  }

  private async handleUpdateBlock(ws: WebSocketClient, data: any, requestId?: string) {
    if (!ws.isAuthenticated || !ws.userId) {
      this.sendError(ws, 'Not authenticated', requestId);
      return;
    }

    try {
      const { id, ...updates } = data;
      const block = await storage.updateBlock(id, {
        ...updates,
        lastEditedBy: ws.userId,
        updatedAt: Date.now(),
      });

      if (!block) {
        this.sendError(ws, 'Block not found', requestId);
        return;
      }

      this.sendResponse(ws, {
        type: 'block_updated',
        data: block,
        requestId
      });

      // Broadcast to other users viewing the same page
      this.broadcastToPage(block.pageId, {
        type: 'block_updated',
        data: block
      }, ws.sessionId);
    } catch (error) {
      console.error('Update block error:', error);
      this.sendError(ws, 'Failed to update block', requestId);
    }
  }

  private async handleDeleteBlock(ws: WebSocketClient, data: any, requestId?: string) {
    if (!ws.isAuthenticated || !ws.userId) {
      this.sendError(ws, 'Not authenticated', requestId);
      return;
    }

    try {
      const { id } = data;
      const success = await storage.deleteBlock(id);

      if (!success) {
        this.sendError(ws, 'Block not found', requestId);
        return;
      }

      this.sendResponse(ws, {
        type: 'block_deleted',
        data: { id },
        requestId
      });

      // Broadcast to other users viewing the same page
      this.broadcastToPage(data.pageId, {
        type: 'block_deleted',
        data: { id }
      }, ws.sessionId);
    } catch (error) {
      console.error('Delete block error:', error);
      this.sendError(ws, 'Failed to delete block', requestId);
    }
  }

  private async handleReorderBlocks(ws: WebSocketClient, data: any, requestId?: string) {
    if (!ws.isAuthenticated || !ws.userId) {
      this.sendError(ws, 'Not authenticated', requestId);
      return;
    }

    try {
      const { pageId, blockIds } = data;
      const success = await storage.reorderBlocks(pageId, blockIds);

      if (!success) {
        this.sendError(ws, 'Failed to reorder blocks', requestId);
        return;
      }

      this.sendResponse(ws, {
        type: 'blocks_reordered',
        data: { pageId, blockIds },
        requestId
      });

      // Broadcast to other users viewing the same page
      this.broadcastToPage(pageId, {
        type: 'blocks_reordered',
        data: { pageId, blockIds }
      }, ws.sessionId);
    } catch (error) {
      console.error('Reorder blocks error:', error);
      this.sendError(ws, 'Failed to reorder blocks', requestId);
    }
  }

  private async handleGetBusinessWorkspace(ws: WebSocketClient, data: any, requestId?: string) {
    try {
      const { subdomain } = data;
      
      // Find workspace by subdomain (using domain field in workspace)
      const workspaces = await storage.getWorkspacesByUserId('system'); // Get all workspaces for subdomain lookup
      const workspace = workspaces.find(w => w.domain === subdomain);
      
      if (!workspace) {
        this.sendError(ws, 'Business workspace not found', requestId);
        return;
      }

      // Get workspace pages and members
      const pages = await storage.getPagesByWorkspace(workspace.id);
      const members = await storage.getWorkspaceMembers(workspace.id);
      
      const businessData = {
        ...workspace,
        pages,
        members,
        recentActivity: [
          {
            description: 'Team collaboration session started',
            timestamp: new Date().toISOString()
          },
          {
            description: 'New project documentation created',
            timestamp: new Date(Date.now() - 3600000).toISOString()
          }
        ]
      };

      this.sendResponse(ws, {
        type: 'business_workspace_data',
        data: businessData,
        requestId
      });
    } catch (error) {
      console.error('Get business workspace error:', error);
      this.sendError(ws, 'Failed to get business workspace', requestId);
    }
  }

  private broadcastToWorkspace(workspaceId: number, message: WSResponse, excludeSessionId?: string) {
    this.clients.forEach((client, sessionId) => {
      if (sessionId !== excludeSessionId && client.workspaceId === workspaceId && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }

  private broadcastToPage(pageId: number, message: WSResponse, excludeSessionId?: string) {
    this.clients.forEach((client, sessionId) => {
      if (sessionId !== excludeSessionId && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }

  private sendResponse(ws: WebSocketClient, response: WSResponse) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(response));
    }
  }

  private sendError(ws: WebSocketClient, error: string, requestId?: string) {
    this.sendResponse(ws, {
      type: 'error',
      error,
      requestId
    });
  }

  private handleDisconnect(ws: WebSocketClient) {
    if (ws.sessionId) {
      this.clients.delete(ws.sessionId);
      console.log(`WebSocket client disconnected: ${ws.sessionId}`);
    }
  }
}