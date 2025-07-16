import { useEffect, useRef, useState } from 'react';
import { useAuth } from './useAuth';

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
}

export function useWebSocket(workspaceId?: number) {
  const { user } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [collaborationState, setCollaborationState] = useState<CollaborationState>({
    connectedUsers: new Map(),
    cursors: new Map(),
    typingUsers: new Map()
  });

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
        userName: user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.email,
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
        typingUsers: new Map()
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
        userName: user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.email,
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
        userName: user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.email,
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
        userName: user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.email,
        workspaceId,
        blockId
      }));
    }
  };

  return {
    isConnected,
    collaborationState,
    sendCursorPosition,
    sendTypingStart,
    sendTypingStop
  };
}