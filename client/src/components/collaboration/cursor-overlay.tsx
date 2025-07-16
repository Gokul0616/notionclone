import { useWebSocket } from "@/hooks/useWebSocket";

interface CursorOverlayProps {
  workspaceId: number;
  pageId: number;
}

export default function CursorOverlay({ workspaceId, pageId }: CursorOverlayProps) {
  const { collaborationState } = useWebSocket(workspaceId);

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {Array.from(collaborationState.cursors.values())
        .filter(cursor => cursor.pageId === pageId)
        .map(cursor => (
          <div
            key={cursor.userId}
            className="absolute transition-all duration-100 ease-out"
            style={{
              left: cursor.x,
              top: cursor.y,
              transform: 'translate(-2px, -2px)'
            }}
          >
            {/* Cursor pointer */}
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              className="drop-shadow-md"
            >
              <path
                d="M4 4L16 8L9 9L8 16L4 4Z"
                fill="#3B82F6"
                stroke="white"
                strokeWidth="1"
              />
            </svg>
            
            {/* User label */}
            <div
              className="absolute top-5 left-2 px-2 py-1 bg-blue-500 text-white text-xs rounded-md whitespace-nowrap"
              style={{ fontSize: '11px' }}
            >
              {cursor.userName}
            </div>
          </div>
        ))}
    </div>
  );
}