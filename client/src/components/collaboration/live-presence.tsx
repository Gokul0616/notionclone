import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Circle } from "lucide-react";

interface ActiveUser {
  id: string;
  name: string;
  username: string;
  avatar?: string;
  status: 'active' | 'typing' | 'viewing';
  lastSeen: number;
  currentBlock?: number;
}

export default function LivePresence({ pageId }: { pageId: number }) {
  const { user } = useAuth();
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    if (!user || !pageId) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const websocket = new WebSocket(wsUrl);

    websocket.onopen = () => {
      websocket.send(JSON.stringify({
        type: 'join_presence',
        pageId,
        userId: user.id,
        userName: user.name || user.username,
        userAvatar: user.avatar
      }));
    };

    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'presence_update') {
        setActiveUsers(data.users.filter((u: ActiveUser) => u.id !== user.id));
      }
      
      if (data.type === 'user_typing') {
        setActiveUsers(prev => 
          prev.map(u => 
            u.id === data.userId 
              ? { ...u, status: 'typing', lastSeen: Date.now() }
              : u
          )
        );
      }
      
      if (data.type === 'user_stopped_typing') {
        setActiveUsers(prev => 
          prev.map(u => 
            u.id === data.userId 
              ? { ...u, status: 'active', lastSeen: Date.now() }
              : u
          )
        );
      }
    };

    setWs(websocket);

    return () => {
      websocket.close();
    };
  }, [pageId, user]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'typing': return 'bg-blue-500';
      case 'viewing': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Active';
      case 'typing': return 'Typing...';
      case 'viewing': return 'Viewing';
      default: return 'Online';
    }
  };

  if (activeUsers.length === 0) {
    return null;
  }

  return (
    <Card className="fixed bottom-4 right-4 w-80 z-40">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span className="font-medium">Active Collaborators</span>
          </div>
          <Badge variant="secondary">{activeUsers.length}</Badge>
        </div>
        
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {activeUsers.map((activeUser) => (
            <div key={activeUser.id} className="flex items-center space-x-3">
              <div className="relative">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={activeUser.avatar} />
                  <AvatarFallback>
                    {activeUser.name?.charAt(0) || activeUser.username.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <Circle 
                  className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-white ${getStatusColor(activeUser.status)}`}
                />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium truncate">
                    {activeUser.name || activeUser.username}
                  </p>
                  <Badge variant="outline" className="text-xs">
                    {getStatusText(activeUser.status)}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {activeUser.status === 'typing' ? 'Currently typing...' : 'Online now'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}