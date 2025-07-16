import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Search, 
  FileText, 
  ChevronRight, 
  ChevronDown,
  MoreHorizontal,
  Star,
  Trash2,
  Archive,
  Settings,
  Folder,
  Home
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertPageSchema, type PageWithChildren } from "@shared/schema";

interface SidebarProps {
  currentPageId: number | null;
  onPageSelect: (pageId: number) => void;
  onOpenCommandPalette: () => void;
  currentView: 'pages' | 'favorites' | 'archived' | 'trash' | 'settings';
  onViewChange: (view: 'pages' | 'favorites' | 'archived' | 'trash' | 'settings') => void;
}

export default function Sidebar({ 
  currentPageId, 
  onPageSelect, 
  onOpenCommandPalette, 
  currentView, 
  onViewChange 
}: SidebarProps) {
  const [expandedPages, setExpandedPages] = useState<Set<number>>(new Set());
  const [newPageTitle, setNewPageTitle] = useState("");
  const [showNewPageInput, setShowNewPageInput] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get the current workspace ID from the first workspace for now
  const { data: workspaces } = useQuery({
    queryKey: ["/api/workspaces"],
  });
  
  const workspaceId = workspaces?.[0]?.id;

  // Use WebSocket for real-time operations
  const { 
    isConnected, 
    collaborationState, 
    createPage: createPageWS, 
    toggleFavorite, 
    archivePage, 
    restorePage, 
    permanentDelete 
  } = useWebSocket(workspaceId);

  const { data: pages, isLoading } = useQuery({
    queryKey: [`/api/workspaces/${workspaceId}/pages`],
    enabled: !!workspaceId,
  });

  const handleCreatePage = (title: string, parentId?: number) => {
    if (!workspaceId) return;
    
    createPageWS(title, parentId);
    setNewPageTitle("");
    setShowNewPageInput(false);
    
    toast({
      title: "Page created",
      description: `"${title}" has been created`,
    });
  };

  const toggleExpanded = (pageId: number) => {
    const newExpanded = new Set(expandedPages);
    if (newExpanded.has(pageId)) {
      newExpanded.delete(pageId);
    } else {
      newExpanded.add(pageId);
    }
    setExpandedPages(newExpanded);
  };

  const handleCreatePageClick = () => {
    if (!newPageTitle.trim() || !workspaceId) return;
    handleCreatePage(newPageTitle.trim());
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreatePageClick();
    } else if (e.key === 'Escape') {
      setShowNewPageInput(false);
      setNewPageTitle("");
    }
  };

  const renderPage = (page: PageWithChildren, level = 0) => {
    const hasChildren = page.children && page.children.length > 0;
    const isExpanded = expandedPages.has(page.id);
    const isSelected = currentPageId === page.id;

    return (
      <div key={page.id}>
        <div
          className={cn(
            "flex items-center w-full px-2 py-1 text-sm rounded-md cursor-pointer group hover:bg-accent",
            isSelected && "bg-accent text-accent-foreground",
            level > 0 && "ml-4"
          )}
          style={{ paddingLeft: `${8 + level * 16}px` }}
        >
          <div className="flex items-center flex-1 min-w-0">
            {hasChildren ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 mr-1"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpanded(page.id);
                }}
              >
                {isExpanded ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </Button>
            ) : (
              <div className="w-4 mr-1" />
            )}
            
            <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
            
            <span
              className="truncate flex-1 text-left"
              onClick={() => onPageSelect(page.id)}
            >
              {page.title || "Untitled"}
            </span>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100"
          >
            <MoreHorizontal className="h-3 w-3" />
          </Button>
        </div>
        
        {hasChildren && isExpanded && (
          <div>
            {page.children?.map((child) => renderPage(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="w-64 border-r bg-muted/5 p-4">
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-8 bg-muted animate-pulse rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-64 border-r bg-muted/5 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            Pages
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowNewPageInput(true)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground"
          onClick={onOpenCommandPalette}
        >
          <Search className="h-4 w-4 mr-2" />
          Search pages...
          <Badge variant="secondary" className="ml-auto text-xs">
            ⌘K
          </Badge>
        </Button>
      </div>

      {/* New Page Input */}
      {showNewPageInput && (
        <div className="p-4 border-b bg-accent/50">
          <Input
            placeholder="Page title"
            value={newPageTitle}
            onChange={(e) => setNewPageTitle(e.target.value)}
            onKeyDown={handleKeyPress}
            onBlur={() => {
              if (!newPageTitle.trim()) {
                setShowNewPageInput(false);
              }
            }}
            autoFocus
            className="text-sm"
          />
        </div>
      )}

      {/* Pages List */}
      <div className="flex-1 overflow-y-auto p-2">
        {pages && pages.length > 0 ? (
          <div className="space-y-1">
            {pages.map((page: PageWithChildren) => renderPage(page))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
              <FileText className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              No pages yet
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowNewPageInput(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create your first page
            </Button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t">
        <div className="space-y-1">
          <Button 
            variant={currentView === 'favorites' ? 'secondary' : 'ghost'} 
            className="w-full justify-start text-sm"
            onClick={() => onViewChange('favorites')}
          >
            <Star className="h-4 w-4 mr-2" />
            Favorites
            {collaborationState.favorites.size > 0 && (
              <Badge variant="secondary" className="ml-auto">
                {collaborationState.favorites.size}
              </Badge>
            )}
          </Button>
          <Button 
            variant={currentView === 'archived' ? 'secondary' : 'ghost'} 
            className="w-full justify-start text-sm"
            onClick={() => onViewChange('archived')}
          >
            <Archive className="h-4 w-4 mr-2" />
            Archived
            {collaborationState.archived.size > 0 && (
              <Badge variant="secondary" className="ml-auto">
                {collaborationState.archived.size}
              </Badge>
            )}
          </Button>
          <Button 
            variant={currentView === 'trash' ? 'secondary' : 'ghost'} 
            className="w-full justify-start text-sm"
            onClick={() => onViewChange('trash')}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Trash
            {collaborationState.trash.size > 0 && (
              <Badge variant="secondary" className="ml-auto">
                {collaborationState.trash.size}
              </Badge>
            )}
          </Button>
          <Button 
            variant={currentView === 'settings' ? 'secondary' : 'ghost'} 
            className="w-full justify-start text-sm"
            onClick={() => onViewChange('settings')}
          >
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
        
        {isConnected && (
          <div className="mt-4 p-2 bg-green-50 dark:bg-green-900/20 rounded-md">
            <div className="flex items-center text-green-600 dark:text-green-400">
              <div className="h-2 w-2 bg-green-500 rounded-full mr-2"></div>
              <span className="text-xs">Connected - Real-time sync</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}