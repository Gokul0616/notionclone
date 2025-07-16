import { useEffect, useRef, useState } from 'react';
import { useAuth } from './use-auth';

interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

interface CursorPosition {
  userId: string;
  userName: string;
  pageId: number;
  x: number;
  y: number;
  blockId?: number;
  selection?: { start: number; end: number };
}

interface CollaborationState {
  connectedUsers: Map<string, { userId: string; userName: string }>;
  cursors: Map<string, CursorPosition>;
  typingUsers: Map<string, { blockId: number; userName: string }>;
  pages: Map<number, any>;
  blocks: Map<number, any[]>;
  favorites: Set<number>;
  archived: Set<number>;
  trash: Set<number>;
}

export function useWebSocket(workspaceId?: number) {
  const { user } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [collaborationState, setCollaborationState] = useState<CollaborationState>({
    connectedUsers: new Map(),
    cursors: new Map(),
    typingUsers: new Map(),
    pages: new Map(),
    blocks: new Map(),
    favorites: new Set(),
    archived: new Set(),
    trash: new Set()
  });

  const sendMessage = (message: WebSocketMessage) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  };

  useEffect(() => {
    if (!user || !workspaceId) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      // Join workspace
      ws.send(JSON.stringify({
        type: 'join_workspace',
        userId: user.id,
        userName: user.displayName || user.email,
        workspaceId
      }));
    };

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        
        switch (message.type) {
          case 'user_joined':
            setCollaborationState(prev => ({
              ...prev,
              connectedUsers: new Map(prev.connectedUsers).set(message.userId, {
                userId: message.userId,
                userName: message.userName
              })
            }));
            break;
            
          case 'user_left':
            setCollaborationState(prev => {
              const newUsers = new Map(prev.connectedUsers);
              const newCursors = new Map(prev.cursors);
              const newTyping = new Map(prev.typingUsers);
              
              newUsers.delete(message.userId);
              newCursors.delete(message.userId);
              newTyping.delete(message.userId);
              
              return {
                ...prev,
                connectedUsers: newUsers,
                cursors: newCursors,
                typingUsers: newTyping
              };
            });
            break;
            
          case 'cursor_update':
            setCollaborationState(prev => ({
              ...prev,
              cursors: new Map(prev.cursors).set(message.cursor.userId, message.cursor)
            }));
            break;
            
          case 'user_typing':
            setCollaborationState(prev => {
              const newTyping = new Map(prev.typingUsers);
              if (message.isTyping) {
                newTyping.set(message.userId, {
                  blockId: message.blockId,
                  userName: message.userName
                });
              } else {
                newTyping.delete(message.userId);
              }
              return {
                ...prev,
                typingUsers: newTyping
              };
            });
            break;

          // Real-time CRUD updates
          case 'page_created':
            setCollaborationState(prev => ({
              ...prev,
              pages: new Map(prev.pages).set(message.page.id, message.page)
            }));
            break;

          case 'page_updated':
            setCollaborationState(prev => ({
              ...prev,
              pages: new Map(prev.pages).set(message.page.id, message.page)
            }));
            break;

          case 'page_deleted':
            setCollaborationState(prev => {
              const newPages = new Map(prev.pages);
              newPages.delete(message.pageId);
              return {
                ...prev,
                pages: newPages
              };
            });
            break;

          case 'block_created':
            setCollaborationState(prev => {
              const newBlocks = new Map(prev.blocks);
              const pageBlocks = newBlocks.get(message.block.pageId) || [];
              newBlocks.set(message.block.pageId, [...pageBlocks, message.block]);
              return {
                ...prev,
                blocks: newBlocks
              };
            });
            break;

          case 'block_updated':
            setCollaborationState(prev => {
              const newBlocks = new Map(prev.blocks);
              const pageBlocks = newBlocks.get(message.block.pageId) || [];
              const updatedBlocks = pageBlocks.map(block => 
                block.id === message.block.id ? message.block : block
              );
              newBlocks.set(message.block.pageId, updatedBlocks);
              return {
                ...prev,
                blocks: newBlocks
              };
            });
            break;

          case 'block_deleted':
            setCollaborationState(prev => {
              const newBlocks = new Map(prev.blocks);
              Object.keys(newBlocks).forEach(pageId => {
                const pageBlocks = newBlocks.get(parseInt(pageId)) || [];
                newBlocks.set(parseInt(pageId), pageBlocks.filter(block => block.id !== message.blockId));
              });
              return {
                ...prev,
                blocks: newBlocks
              };
            });
            break;

          case 'blocks_reordered':
            setCollaborationState(prev => {
              const newBlocks = new Map(prev.blocks);
              const pageBlocks = newBlocks.get(message.pageId) || [];
              const reorderedBlocks = message.blockIds.map((id: number) => 
                pageBlocks.find(block => block.id === id)
              ).filter(Boolean);
              newBlocks.set(message.pageId, reorderedBlocks);
              return {
                ...prev,
                blocks: newBlocks
              };
            });
            break;

          case 'page_favorite_toggled':
            setCollaborationState(prev => {
              const newFavorites = new Set(prev.favorites);
              if (newFavorites.has(message.pageId)) {
                newFavorites.delete(message.pageId);
              } else {
                newFavorites.add(message.pageId);
              }
              return {
                ...prev,
                favorites: newFavorites
              };
            });
            break;

          case 'page_archived':
            setCollaborationState(prev => ({
              ...prev,
              archived: new Set(prev.archived).add(message.pageId)
            }));
            break;

          case 'page_restored':
            setCollaborationState(prev => {
              const newArchived = new Set(prev.archived);
              const newTrash = new Set(prev.trash);
              newArchived.delete(message.pageId);
              newTrash.delete(message.pageId);
              return {
                ...prev,
                archived: newArchived,
                trash: newTrash
              };
            });
            break;

          case 'page_permanently_deleted':
            setCollaborationState(prev => {
              const newPages = new Map(prev.pages);
              const newTrash = new Set(prev.trash);
              const newArchived = new Set(prev.archived);
              newPages.delete(message.pageId);
              newTrash.delete(message.pageId);
              newArchived.delete(message.pageId);
              return {
                ...prev,
                pages: newPages,
                trash: newTrash,
                archived: newArchived
              };
            });
            break;
        }
      } catch (error) {
        console.error('WebSocket message parsing error:', error);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      setCollaborationState({
        connectedUsers: new Map(),
        cursors: new Map(),
        typingUsers: new Map(),
        pages: new Map(),
        blocks: new Map(),
        favorites: new Set(),
        archived: new Set(),
        trash: new Set()
      });
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [user, workspaceId]);

  const sendCursorPosition = (pageId: number, x: number, y: number, blockId?: number, selection?: { start: number; end: number }) => {
    if (wsRef.current?.readyState === WebSocket.OPEN && user) {
      wsRef.current.send(JSON.stringify({
        type: 'cursor_move',
        userId: user.id,
        userName: user.displayName || user.email,
        pageId,
        x,
        y,
        blockId,
        selection
      }));
    }
  };

  const sendTypingStart = (blockId: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN && user && workspaceId) {
      wsRef.current.send(JSON.stringify({
        type: 'typing_start',
        userId: user.id,
        userName: user.displayName || user.email,
        workspaceId,
        blockId
      }));
    }
  };

  const sendTypingStop = (blockId: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN && user && workspaceId) {
      wsRef.current.send(JSON.stringify({
        type: 'typing_stop',
        userId: user.id,
        userName: user.displayName || user.email,
        workspaceId,
        blockId
      }));
    }
  };

  // WebSocket-based CRUD operations
  const createPage = (title: string, parentId?: number) => {
    sendMessage({
      type: 'create_page',
      title,
      parentId,
      workspaceId
    });
  };

  const updatePage = (pageId: number, updates: any) => {
    sendMessage({
      type: 'update_page',
      pageId,
      updates
    });
  };

  const deletePage = (pageId: number) => {
    sendMessage({
      type: 'delete_page',
      pageId
    });
  };

  const createBlock = (pageId: number, type: string, content: any, position: number) => {
    sendMessage({
      type: 'create_block',
      pageId,
      blockType: type,
      content,
      position
    });
  };

  const updateBlock = (blockId: number, content: any) => {
    sendMessage({
      type: 'update_block',
      blockId,
      content
    });
  };

  const deleteBlock = (blockId: number) => {
    sendMessage({
      type: 'delete_block',
      blockId
    });
  };

  const reorderBlocks = (pageId: number, blockIds: number[]) => {
    sendMessage({
      type: 'reorder_blocks',
      pageId,
      blockIds
    });
  };

  const toggleFavorite = (pageId: number) => {
    sendMessage({
      type: 'toggle_favorite',
      pageId
    });
  };

  const archivePage = (pageId: number) => {
    sendMessage({
      type: 'archive_page',
      pageId
    });
  };

  const restorePage = (pageId: number) => {
    sendMessage({
      type: 'restore_page',
      pageId
    });
  };

  const permanentDelete = (pageId: number) => {
    sendMessage({
      type: 'permanent_delete',
      pageId
    });
  };

  return {
    isConnected,
    collaborationState,
    sendMessage,
    sendCursorPosition,
    sendTypingStart,
    sendTypingStop,
    createPage,
    updatePage,
    deletePage,
    createBlock,
    updateBlock,
    deleteBlock,
    reorderBlocks,
    toggleFavorite,
    archivePage,
    restorePage,
    permanentDelete
  };
}