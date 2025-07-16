import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  FileText, 
  Clock, 
  Hash,
  ArrowRight,
  Command
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onPageSelect: (pageId: number) => void;
}

interface SearchResult {
  id: number;
  title: string;
  type: 'page' | 'block' | 'command';
  content?: string;
  lastModified?: string;
  path?: string;
}

export default function CommandPalette({ isOpen, onClose, onPageSelect }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Get the current workspace ID from the first workspace for now
  const { data: workspaces } = useQuery({
    queryKey: ["/api/workspaces"],
  });
  
  const workspaceId = workspaces?.[0]?.id;

  const { data: searchResults, isLoading } = useQuery({
    queryKey: [`/api/workspaces/${workspaceId}/search`, { q: query }],
    enabled: !!workspaceId && query.length > 0,
  });

  // Mock commands for demonstration
  const commands = [
    { id: -1, title: "Create new page", type: 'command' as const, content: "Add a new page to your workspace" },
    { id: -2, title: "Open settings", type: 'command' as const, content: "Manage workspace settings" },
    { id: -3, title: "View trash", type: 'command' as const, content: "See deleted pages" },
    { id: -4, title: "Import from Notion", type: 'command' as const, content: "Import your existing Notion workspace" },
  ];

  // Combine search results with commands
  const allResults: SearchResult[] = [
    ...(query.length > 0 ? commands.filter(cmd => 
      cmd.title.toLowerCase().includes(query.toLowerCase()) ||
      cmd.content.toLowerCase().includes(query.toLowerCase())
    ) : []),
    ...(searchResults || []).map((page: any) => ({
      id: page.id,
      title: page.title,
      type: 'page' as const,
      content: page.content?.slice(0, 100) + (page.content?.length > 100 ? '...' : ''),
      lastModified: page.lastEditedAt,
      path: page.parentTitle ? `${page.parentTitle} > ${page.title}` : page.title
    }))
  ];

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [allResults.length]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, allResults.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          handleSelect(allResults[selectedIndex]);
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, allResults]);

  // Reset when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const handleSelect = (result: SearchResult) => {
    if (result.type === 'page') {
      onPageSelect(result.id);
      onClose();
    } else if (result.type === 'command') {
      // Handle command execution
      switch (result.id) {
        case -1:
          // Create new page
          console.log('Create new page');
          break;
        case -2:
          // Open settings
          console.log('Open settings');
          break;
        case -3:
          // View trash
          console.log('View trash');
          break;
        case -4:
          // Import from Notion
          console.log('Import from Notion');
          break;
      }
      onClose();
    }
  };

  const getResultIcon = (result: SearchResult) => {
    switch (result.type) {
      case 'page':
        return <FileText className="h-4 w-4" />;
      case 'command':
        return <Hash className="h-4 w-4" />;
      default:
        return <Search className="h-4 w-4" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] p-0" aria-describedby="command-palette-description">
        <DialogHeader className="sr-only">
          <DialogTitle>Command Palette</DialogTitle>
        </DialogHeader>
        <div id="command-palette-description" className="sr-only">
          Search for pages, commands, and content across your workspace
        </div>
        
        <div className="flex items-center border-b px-4 py-3">
          <Search className="h-4 w-4 mr-3 text-muted-foreground" />
          <Input
            placeholder="Search pages, commands, and content..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="border-none shadow-none focus-visible:ring-0 text-base"
            autoFocus
          />
          <Badge variant="outline" className="ml-2 text-xs">
            <Command className="h-3 w-3 mr-1" />
            K
          </Badge>
        </div>

        <div className="max-h-96 overflow-y-auto p-2">
          {query.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                <Search className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="font-medium mb-1">Quick Search</h3>
              <p className="text-sm text-muted-foreground">
                Type to search pages, content, and commands
              </p>
              <div className="mt-4 space-y-2 text-xs text-muted-foreground">
                <div className="flex items-center justify-center space-x-4">
                  <span>↑↓ Navigate</span>
                  <span>↵ Select</span>
                  <span>ESC Close</span>
                </div>
              </div>
            </div>
          ) : isLoading ? (
            <div className="px-4 py-8 text-center">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Searching...</p>
            </div>
          ) : allResults.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                <Search className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="font-medium mb-1">No results found</h3>
              <p className="text-sm text-muted-foreground">
                Try a different search term or create a new page
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {allResults.map((result, index) => (
                <Button
                  key={`${result.type}-${result.id}`}
                  variant="ghost"
                  className={cn(
                    "w-full justify-start h-auto p-3 text-left",
                    index === selectedIndex && "bg-accent"
                  )}
                  onClick={() => handleSelect(result)}
                >
                  <div className="flex items-start space-x-3 w-full">
                    <div className="mt-0.5 text-muted-foreground">
                      {getResultIcon(result)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium truncate">
                          {result.title}
                        </span>
                        <Badge 
                          variant="secondary" 
                          className="text-xs capitalize"
                        >
                          {result.type}
                        </Badge>
                      </div>
                      {result.content && (
                        <p className="text-sm text-muted-foreground mt-1 truncate">
                          {result.content}
                        </p>
                      )}
                      {result.path && result.path !== result.title && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {result.path}
                        </p>
                      )}
                      {result.lastModified && (
                        <div className="flex items-center space-x-1 mt-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>
                            Modified {new Date(result.lastModified).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100" />
                  </div>
                </Button>
              ))}
            </div>
          )}
        </div>

        {allResults.length > 0 && (
          <div className="border-t px-4 py-2 bg-muted/20">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{allResults.length} results</span>
              <div className="flex items-center space-x-4">
                <span>↑↓ Navigate</span>
                <span>↵ Select</span>
                <span>ESC Close</span>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}