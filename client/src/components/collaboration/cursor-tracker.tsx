import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";

interface CursorPosition {
  x: number;
  y: number;
  userId: string;
  userName: string;
  userColor: string;
  timestamp: number;
}

interface CollaboratorCursor {
  userId: string;
  userName: string;
  userColor: string;
  position: { x: number; y: number };
  lastSeen: number;
}

export default function CursorTracker({ pageId }: { pageId: number }) {
  const { user } = useAuth();
  const [cursors, setCursors] = useState<Map<string, CollaboratorCursor>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const cursorTimeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  useEffect(() => {
    if (!user || !pageId) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      // Join the page room for collaboration
      ws.send(JSON.stringify({
        type: 'join_page',
        pageId,
        userId: user.id,
        userName: user.name || user.username,
        userColor: getUserColor(user.id)
      }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'cursor_update' && data.userId !== user.id) {
        setCursors(prev => {
          const newCursors = new Map(prev);
          newCursors.set(data.userId, {
            userId: data.userId,
            userName: data.userName,
            userColor: data.userColor,
            position: { x: data.x, y: data.y },
            lastSeen: Date.now()
          });
          return newCursors;
        });

        // Clear existing timeout for this user
        const existingTimeout = cursorTimeoutRef.current.get(data.userId);
        if (existingTimeout) {
          clearTimeout(existingTimeout);
        }

        // Set new timeout to remove cursor after 3 seconds of inactivity
        const timeout = setTimeout(() => {
          setCursors(prev => {
            const newCursors = new Map(prev);
            newCursors.delete(data.userId);
            return newCursors;
          });
          cursorTimeoutRef.current.delete(data.userId);
        }, 3000);

        cursorTimeoutRef.current.set(data.userId, timeout);
      }

      if (data.type === 'user_joined' && data.userId !== user.id) {
        console.log(`${data.userName} joined the page`);
      }

      if (data.type === 'user_left') {
        setCursors(prev => {
          const newCursors = new Map(prev);
          newCursors.delete(data.userId);
          return newCursors;
        });
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };

    return () => {
      ws.close();
      cursorTimeoutRef.current.forEach(timeout => clearTimeout(timeout));
      cursorTimeoutRef.current.clear();
    };
  }, [pageId, user]);

  useEffect(() => {
    if (!isConnected || !wsRef.current) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'cursor_update',
          pageId,
          userId: user?.id,
          userName: user?.name || user?.username,
          userColor: getUserColor(user?.id || ''),
          x: e.clientX,
          y: e.clientY,
          timestamp: Date.now()
        }));
      }
    };

    const handleMouseLeave = () => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'cursor_hide',
          pageId,
          userId: user?.id
        }));
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [isConnected, pageId, user]);

  const getUserColor = (userId: string) => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
    ];
    const index = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index];
  };

  return (
    <>
      {/* Connection Status */}
      <div className="fixed top-4 right-4 z-50">
        <Badge variant={isConnected ? "default" : "destructive"}>
          {isConnected ? `${cursors.size + 1} collaborators` : 'Disconnected'}
        </Badge>
      </div>

      {/* Render other users' cursors */}
      {Array.from(cursors.values()).map((cursor) => (
        <div
          key={cursor.userId}
          className="fixed pointer-events-none z-50 transition-all duration-100"
          style={{
            left: cursor.position.x,
            top: cursor.position.y,
            transform: 'translate(-2px, -2px)'
          }}
        >
          {/* Cursor pointer */}
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            className="drop-shadow-sm"
          >
            <path
              d="M2 2L18 8L8 12L2 18L2 2Z"
              fill={cursor.userColor}
              stroke="white"
              strokeWidth="1"
            />
          </svg>
          
          {/* User name label */}
          <div
            className="absolute top-5 left-2 px-2 py-1 rounded text-xs text-white font-medium whitespace-nowrap"
            style={{ backgroundColor: cursor.userColor }}
          >
            {cursor.userName}
          </div>
        </div>
      ))}
    </>
  );
}