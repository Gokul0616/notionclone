import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { parse } from 'url';
import { storage } from './storage';

interface WebSocketClient extends WebSocket {
  userId?: string;
  pageId?: number;
  sessionId?: string;
  userName?: string;
  userColor?: string;
}

interface CursorData {
  type: 'cursor_update' | 'cursor_hide';
  pageId: number;
  userId: string;
  userName: string;
  userColor: string;
  x: number;
  y: number;
  timestamp: number;
}

interface PresenceData {
  type: 'join_presence' | 'leave_presence' | 'typing' | 'stopped_typing';
  pageId: number;
  userId: string;
  userName: string;
  status: 'active' | 'typing' | 'viewing';
  currentBlock?: number;
}

class CollaborationServer {
  private wss: WebSocketServer;
  private clients: Map<string, WebSocketClient> = new Map();
  private pageRooms: Map<number, Set<string>> = new Map();
  private userCursors: Map<string, CursorData> = new Map();
  private userPresence: Map<string, PresenceData> = new Map();

  constructor(server: Server) {
    this.wss = new WebSocketServer({ 
      server, 
      path: '/ws',
      verifyClient: (info) => {
        // Add basic verification if needed
        return true;
      }
    });

    this.wss.on('connection', (ws: WebSocketClient, request) => {
      const sessionId = this.generateSessionId();
      ws.sessionId = sessionId;
      this.clients.set(sessionId, ws);

      console.log(`WebSocket client connected: ${sessionId}`);

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(ws, message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      });

      ws.on('close', () => {
        this.handleDisconnect(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.handleDisconnect(ws);
      });
    });
  }

  private generateSessionId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  private async handleMessage(ws: WebSocketClient, message: any) {
    const { type } = message;

    switch (type) {
      case 'join_page':
        await this.handleJoinPage(ws, message);
        break;

      case 'cursor_update':
        await this.handleCursorUpdate(ws, message);
        break;

      case 'cursor_hide':
        await this.handleCursorHide(ws, message);
        break;

      case 'join_presence':
        await this.handleJoinPresence(ws, message);
        break;

      case 'user_typing':
        await this.handleUserTyping(ws, message);
        break;

      case 'user_stopped_typing':
        await this.handleUserStoppedTyping(ws, message);
        break;

      case 'block_edit':
        await this.handleBlockEdit(ws, message);
        break;

      case 'create_page':
        await this.handleCreatePage(ws, message);
        break;

      case 'update_page':
        await this.handleUpdatePage(ws, message);
        break;

      case 'delete_page':
        await this.handleDeletePage(ws, message);
        break;

      case 'create_block':
        await this.handleCreateBlock(ws, message);
        break;

      case 'update_block':
        await this.handleUpdateBlock(ws, message);
        break;

      case 'delete_block':
        await this.handleDeleteBlock(ws, message);
        break;

      case 'reorder_blocks':
        await this.handleReorderBlocks(ws, message);
        break;

      case 'toggle_favorite':
        await this.handleToggleFavorite(ws, message);
        break;

      case 'archive_page':
        await this.handleArchivePage(ws, message);
        break;

      case 'restore_page':
        await this.handleRestorePage(ws, message);
        break;

      case 'permanent_delete':
        await this.handlePermanentDelete(ws, message);
        break;

      default:
        console.warn('Unknown message type:', type);
    }
  }

  private async handleJoinPage(ws: WebSocketClient, message: any) {
    const { pageId, userId, userName, userColor } = message;
    
    ws.userId = userId;
    ws.pageId = pageId;
    ws.userName = userName;
    ws.userColor = userColor;

    // Add user to page room
    if (!this.pageRooms.has(pageId)) {
      this.pageRooms.set(pageId, new Set());
    }
    this.pageRooms.get(pageId)!.add(ws.sessionId!);

    // Notify other users in the page
    this.broadcastToPage(pageId, {
      type: 'user_joined',
      userId,
      userName,
      userColor,
      timestamp: Date.now()
    }, ws.sessionId!);

    // Send current cursors to the new user
    const currentCursors = Array.from(this.userCursors.values())
      .filter(cursor => cursor.pageId === pageId && cursor.userId !== userId);
    
    ws.send(JSON.stringify({
      type: 'initial_cursors',
      cursors: currentCursors
    }));

    // Log activity
    try {
      await storage.logActivity({
        type: 'page_joined',
        userId,
        workspaceId: 1, // This should be dynamic based on page
        pageId,
        blockId: null,
        metadata: { userName, sessionId: ws.sessionId }
      });
    } catch (error) {
      console.error('Error logging page join activity:', error);
    }
  }

  private async handleCursorUpdate(ws: WebSocketClient, message: CursorData) {
    if (!ws.userId || !ws.pageId) return;

    const cursorData: CursorData = {
      type: 'cursor_update',
      pageId: message.pageId,
      userId: ws.userId,
      userName: ws.userName || '',
      userColor: ws.userColor || '#000000',
      x: message.x,
      y: message.y,
      timestamp: Date.now()
    };

    // Store cursor position
    this.userCursors.set(ws.userId, cursorData);

    // Broadcast to other users in the same page
    this.broadcastToPage(message.pageId, cursorData, ws.sessionId!);

    // Optionally persist to database for analytics
    try {
      await storage.logCollaborationCursor({
        pageId: message.pageId,
        userId: ws.userId,
        x: message.x,
        y: message.y,
        sessionId: ws.sessionId!
      });
    } catch (error) {
      console.error('Error logging cursor position:', error);
    }
  }

  private async handleCursorHide(ws: WebSocketClient, message: any) {
    if (!ws.userId) return;

    this.userCursors.delete(ws.userId);

    this.broadcastToPage(message.pageId, {
      type: 'cursor_hide',
      userId: ws.userId,
      timestamp: Date.now()
    }, ws.sessionId!);
  }

  private async handleJoinPresence(ws: WebSocketClient, message: any) {
    const { pageId, userId, userName, userAvatar } = message;

    const presenceData: PresenceData = {
      type: 'join_presence',
      pageId,
      userId,
      userName,
      status: 'active'
    };

    this.userPresence.set(userId, presenceData);

    // Get all users in the page
    const pageUsers = Array.from(this.userPresence.values())
      .filter(presence => presence.pageId === pageId);

    // Send presence update to all users in the page
    this.broadcastToPage(pageId, {
      type: 'presence_update',
      users: pageUsers.map(p => ({
        id: p.userId,
        name: p.userName,
        status: p.status,
        lastSeen: Date.now()
      }))
    });

    // Persist presence to database
    try {
      await storage.updateLivePresence({
        pageId,
        userId,
        status: 'active',
        sessionId: ws.sessionId!
      });
    } catch (error) {
      console.error('Error updating live presence:', error);
    }
  }

  private async handleUserTyping(ws: WebSocketClient, message: any) {
    if (!ws.userId) return;

    const presenceData = this.userPresence.get(ws.userId);
    if (presenceData) {
      presenceData.status = 'typing';
      this.userPresence.set(ws.userId, presenceData);
    }

    this.broadcastToPage(message.pageId, {
      type: 'user_typing',
      userId: ws.userId,
      userName: ws.userName,
      blockId: message.blockId,
      timestamp: Date.now()
    }, ws.sessionId!);
  }

  private async handleUserStoppedTyping(ws: WebSocketClient, message: any) {
    if (!ws.userId) return;

    const presenceData = this.userPresence.get(ws.userId);
    if (presenceData) {
      presenceData.status = 'active';
      this.userPresence.set(ws.userId, presenceData);
    }

    this.broadcastToPage(message.pageId, {
      type: 'user_stopped_typing',
      userId: ws.userId,
      timestamp: Date.now()
    }, ws.sessionId!);
  }

  private async handleBlockEdit(ws: WebSocketClient, message: any) {
    if (!ws.userId || !ws.pageId) return;

    // Broadcast block edit to other users
    this.broadcastToPage(ws.pageId, {
      type: 'block_edit',
      userId: ws.userId,
      userName: ws.userName,
      blockId: message.blockId,
      content: message.content,
      timestamp: Date.now()
    }, ws.sessionId!);

    // Log activity
    try {
      await storage.logActivity({
        type: 'block_edited',
        userId: ws.userId,
        workspaceId: 1, // This should be dynamic
        pageId: ws.pageId,
        blockId: message.blockId,
        metadata: { content: message.content }
      });
    } catch (error) {
      console.error('Error logging block edit activity:', error);
    }
  }

  private handleDisconnect(ws: WebSocketClient) {
    if (ws.sessionId) {
      this.clients.delete(ws.sessionId);
    }

    if (ws.userId) {
      this.userCursors.delete(ws.userId);
      this.userPresence.delete(ws.userId);
    }

    if (ws.pageId) {
      const pageRoom = this.pageRooms.get(ws.pageId);
      if (pageRoom && ws.sessionId) {
        pageRoom.delete(ws.sessionId);
        
        // Notify other users
        this.broadcastToPage(ws.pageId, {
          type: 'user_left',
          userId: ws.userId,
          userName: ws.userName,
          timestamp: Date.now()
        }, ws.sessionId);
      }
    }

    console.log(`WebSocket client disconnected: ${ws.sessionId}`);
  }

  private broadcastToPage(pageId: number, message: any, excludeSessionId?: string) {
    const pageRoom = this.pageRooms.get(pageId);
    if (!pageRoom) return;

    pageRoom.forEach(sessionId => {
      if (sessionId !== excludeSessionId) {
        const client = this.clients.get(sessionId);
        if (client && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(message));
        }
      }
    });
  }

  // WebSocket CRUD handlers
  private async handleCreatePage(ws: WebSocketClient, message: any) {
    const { title, parentId, workspaceId } = message;
    
    try {
      const { storage } = await import('./storage');
      const newPage = await storage.createPage({
        title,
        parentId: parentId || null,
        workspaceId,
        createdBy: ws.userId!,
        lastEditedBy: ws.userId!
      });

      // Broadcast to all workspace members
      this.broadcastToWorkspace(workspaceId, {
        type: 'page_created',
        page: newPage,
        timestamp: Date.now()
      });

      ws.send(JSON.stringify({
        type: 'page_created_success',
        page: newPage
      }));

    } catch (error) {
      console.error('Error creating page:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Failed to create page'
      }));
    }
  }

  private async handleUpdatePage(ws: WebSocketClient, message: any) {
    const { pageId, updates } = message;
    
    try {
      const { storage } = await import('./storage');
      const updatedPage = await storage.updatePage(pageId, {
        ...updates,
        lastEditedBy: ws.userId!
      });

      if (updatedPage) {
        // Broadcast to all users viewing this page
        this.broadcastToPage(pageId, {
          type: 'page_updated',
          page: updatedPage,
          timestamp: Date.now()
        });
      }

    } catch (error) {
      console.error('Error updating page:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Failed to update page'
      }));
    }
  }

  private async handleDeletePage(ws: WebSocketClient, message: any) {
    const { pageId } = message;
    
    try {
      const { storage } = await import('./storage');
      await storage.deletePage(pageId);

      // Broadcast to all workspace members
      this.broadcastToWorkspace(message.workspaceId, {
        type: 'page_deleted',
        pageId,
        timestamp: Date.now()
      });

    } catch (error) {
      console.error('Error deleting page:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Failed to delete page'
      }));
    }
  }

  private async handleCreateBlock(ws: WebSocketClient, message: any) {
    const { pageId, blockType, content, position } = message;
    
    try {
      const { storage } = await import('./storage');
      const newBlock = await storage.createBlock({
        pageId,
        type: blockType,
        content,
        position,
        createdBy: ws.userId!,
        lastEditedBy: ws.userId!
      });

      // Broadcast to all users viewing this page
      this.broadcastToPage(pageId, {
        type: 'block_created',
        block: newBlock,
        timestamp: Date.now()
      });

    } catch (error) {
      console.error('Error creating block:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Failed to create block'
      }));
    }
  }

  private async handleUpdateBlock(ws: WebSocketClient, message: any) {
    const { blockId, content } = message;
    
    try {
      const { storage } = await import('./storage');
      const updatedBlock = await storage.updateBlock(blockId, {
        content,
        lastEditedBy: ws.userId!
      });

      if (updatedBlock) {
        // Broadcast to all users viewing this page
        this.broadcastToPage(updatedBlock.pageId, {
          type: 'block_updated',
          block: updatedBlock,
          timestamp: Date.now()
        });
      }

    } catch (error) {
      console.error('Error updating block:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Failed to update block'
      }));
    }
  }

  private async handleDeleteBlock(ws: WebSocketClient, message: any) {
    const { blockId } = message;
    
    try {
      const { storage } = await import('./storage');
      const block = await storage.getBlockById(blockId);
      
      if (block) {
        await storage.deleteBlock(blockId);

        // Broadcast to all users viewing this page
        this.broadcastToPage(block.pageId, {
          type: 'block_deleted',
          blockId,
          timestamp: Date.now()
        });
      }

    } catch (error) {
      console.error('Error deleting block:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Failed to delete block'
      }));
    }
  }

  private async handleReorderBlocks(ws: WebSocketClient, message: any) {
    const { pageId, blockIds } = message;
    
    try {
      const { storage } = await import('./storage');
      await storage.reorderBlocks(pageId, blockIds);

      // Broadcast to all users viewing this page
      this.broadcastToPage(pageId, {
        type: 'blocks_reordered',
        pageId,
        blockIds,
        timestamp: Date.now()
      });

    } catch (error) {
      console.error('Error reordering blocks:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Failed to reorder blocks'
      }));
    }
  }

  private async handleToggleFavorite(ws: WebSocketClient, message: any) {
    const { pageId } = message;
    
    try {
      // Implementation depends on your favorite system
      // For now, just broadcast the toggle
      this.broadcastToWorkspace(message.workspaceId, {
        type: 'page_favorite_toggled',
        pageId,
        userId: ws.userId!,
        timestamp: Date.now()
      });

    } catch (error) {
      console.error('Error toggling favorite:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Failed to toggle favorite'
      }));
    }
  }

  private async handleArchivePage(ws: WebSocketClient, message: any) {
    const { pageId } = message;
    
    try {
      const { storage } = await import('./storage');
      await storage.archivePage(pageId);

      // Broadcast to all workspace members
      this.broadcastToWorkspace(message.workspaceId, {
        type: 'page_archived',
        pageId,
        timestamp: Date.now()
      });

    } catch (error) {
      console.error('Error archiving page:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Failed to archive page'
      }));
    }
  }

  private async handleRestorePage(ws: WebSocketClient, message: any) {
    const { pageId } = message;
    
    try {
      const { storage } = await import('./storage');
      await storage.restorePage(pageId);

      // Broadcast to all workspace members
      this.broadcastToWorkspace(message.workspaceId, {
        type: 'page_restored',
        pageId,
        timestamp: Date.now()
      });

    } catch (error) {
      console.error('Error restoring page:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Failed to restore page'
      }));
    }
  }

  private async handlePermanentDelete(ws: WebSocketClient, message: any) {
    const { pageId } = message;
    
    try {
      const { storage } = await import('./storage');
      await storage.deletePage(pageId);

      // Broadcast to all workspace members
      this.broadcastToWorkspace(message.workspaceId, {
        type: 'page_permanently_deleted',
        pageId,
        timestamp: Date.now()
      });

    } catch (error) {
      console.error('Error permanently deleting page:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Failed to permanently delete page'
      }));
    }
  }

  private broadcastToWorkspace(workspaceId: number, message: any) {
    // Find all clients in this workspace
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }

  public getStats() {
    return {
      connectedClients: this.clients.size,
      activeRooms: this.pageRooms.size,
      activeCursors: this.userCursors.size,
      activePresence: this.userPresence.size
    };
  }
}

export { CollaborationServer };