import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import WorkspaceSelector from "@/components/workspace/workspace-selector";
import BusinessDashboard from "@/components/business/business-dashboard";
import ShareDialog from "@/components/sharing/share-dialog";
import CursorOverlay from "@/components/collaboration/cursor-overlay";
import Sidebar from "@/components/sidebar";
import PageEditor from "@/components/page-editor";
import CommandPalette from "@/components/command-palette";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Search, 
  Settings, 
  Bell, 
  Users,
  BarChart3,
  Crown,
  LogOut
} from "lucide-react";

export default function WorkspacePage() {
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<number | null>(null);
  const [currentPageId, setCurrentPageId] = useState<number | null>(null);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showBusinessDashboard, setShowBusinessDashboard] = useState(false);
  
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const { isConnected } = useWebSocket(currentWorkspaceId || undefined);

  // Handle unauthorized errors
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: workspaces } = useQuery({
    queryKey: ["/api/workspaces"],
    enabled: isAuthenticated,
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return false;
      }
      return failureCount < 3;
    },
  });

  const { data: currentWorkspace } = useQuery({
    queryKey: [`/api/workspaces/${currentWorkspaceId}`],
    enabled: !!currentWorkspaceId && isAuthenticated,
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error as Error)) {
        return false;
      }
      return failureCount < 3;
    },
  });

  const { data: notifications } = useQuery({
    queryKey: ["/api/notifications"],
    enabled: isAuthenticated,
  });

  // Auto-select first workspace if none selected
  useEffect(() => {
    if (workspaces && workspaces.length > 0 && !currentWorkspaceId) {
      setCurrentWorkspaceId(workspaces[0].id);
    }
  }, [workspaces, currentWorkspaceId]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(true);
      }
      if (e.key === 'Escape') {
        setShowCommandPalette(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect to login
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top Navigation */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center px-4 gap-4">
          <WorkspaceSelector
            currentWorkspaceId={currentWorkspaceId || undefined}
            onWorkspaceChange={setCurrentWorkspaceId}
          />
          
          <div className="flex-1" />
          
          <div className="flex items-center space-x-2">
            {/* Connection Status */}
            {currentWorkspaceId && (
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-xs text-muted-foreground">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            )}
            
            {/* Business Dashboard Toggle */}
            {currentWorkspace?.type === 'business' && (
              <Button
                variant={showBusinessDashboard ? "default" : "ghost"}
                size="sm"
                onClick={() => setShowBusinessDashboard(!showBusinessDashboard)}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Analytics
              </Button>
            )}
            
            {/* Share Button */}
            {currentWorkspaceId && (
              <ShareDialog 
                workspaceId={currentWorkspaceId}
                pageId={currentPageId || undefined}
              />
            )}
            
            {/* Search */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCommandPalette(true)}
            >
              <Search className="h-4 w-4 mr-2" />
              Search
              <Badge variant="secondary" className="ml-2 text-xs">
                ⌘K
              </Badge>
            </Button>
            
            {/* Notifications */}
            <Button variant="ghost" size="sm" className="relative">
              <Bell className="h-4 w-4" />
              {notifications && notifications.filter((n: any) => !n.isRead).length > 0 && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                  {notifications.filter((n: any) => !n.isRead).length}
                </div>
              )}
            </Button>
            
            {/* User Menu */}
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                {user?.firstName?.charAt(0) || user?.email?.charAt(0) || 'U'}
              </div>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex">
        {showBusinessDashboard && currentWorkspace?.type === 'business' ? (
          <BusinessDashboard workspaceId={currentWorkspaceId!} />
        ) : (
          <>
            {/* Sidebar */}
            {currentWorkspaceId && (
              <Sidebar
                currentPageId={currentPageId}
                onPageSelect={setCurrentPageId}
                onOpenCommandPalette={() => setShowCommandPalette(true)}
              />
            )}
            
            {/* Main Editor */}
            <main className="flex-1 relative">
              {currentPageId ? (
                <>
                  <PageEditor pageId={currentPageId} />
                  {currentWorkspaceId && (
                    <CursorOverlay 
                      workspaceId={currentWorkspaceId} 
                      pageId={currentPageId}
                    />
                  )}
                </>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center space-y-4">
                    <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center mx-auto">
                      <Plus className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium">No page selected</h3>
                      <p className="text-muted-foreground">
                        Choose a page from the sidebar or create a new one
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </main>
          </>
        )}
      </div>

      {/* Command Palette */}
      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        onPageSelect={(pageId) => {
          setCurrentPageId(pageId);
          setShowCommandPalette(false);
        }}
      />
    </div>
  );
}