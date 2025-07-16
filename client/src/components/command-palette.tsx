import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, FileText } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { type Page } from "@shared/schema";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onPageSelect: (pageId: number) => void;
}

export default function CommandPalette({ isOpen, onClose, onPageSelect }: CommandPaletteProps) {
  const [query, setQuery] = useState("");

  const { data: searchResults = [] } = useQuery<Page[]>({
    queryKey: ["/api/search", { q: query }],
    enabled: query.length > 0,
  });

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
    }
  }, [isOpen]);

  const handlePageSelect = (pageId: number) => {
    onPageSelect(pageId);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && searchResults.length > 0) {
      handlePageSelect(searchResults[0].id);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg p-0">
        <div className="p-4 border-b notion-border">
          <div className="flex items-center space-x-3">
            <Search className="h-5 w-5 notion-secondary" />
            <Input
              placeholder="Search for pages, blocks, or commands..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 border-none outline-none shadow-none notion-text bg-transparent focus-visible:ring-0"
              autoFocus
            />
          </div>
        </div>
        
        <div className="max-h-96 overflow-y-auto">
          {query.length === 0 ? (
            <div className="p-4 text-center notion-secondary">
              Start typing to search pages and commands
            </div>
          ) : searchResults.length === 0 ? (
            <div className="p-4 text-center notion-secondary">
              No results found for "{query}"
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {searchResults.map((page) => (
                <Button
                  key={page.id}
                  variant="ghost"
                  className="w-full justify-start p-3 h-auto"
                  onClick={() => handlePageSelect(page.id)}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">{page.icon}</span>
                    <div className="text-left">
                      <div className="font-medium text-sm notion-text">{page.title}</div>
                      <div className="text-xs notion-secondary">Page</div>
                    </div>
                  </div>
                </Button>
              ))}
              
              {/* Commands */}
              <div className="border-t notion-border mt-2 pt-2">
                <Button
                  variant="ghost"
                  className="w-full justify-start p-3 h-auto"
                  onClick={() => {
                    // Handle new page creation
                    onClose();
                  }}
                >
                  <div className="flex items-center space-x-3">
                    <FileText className="h-4 w-4 notion-secondary" />
                    <div className="text-left">
                      <div className="font-medium text-sm notion-text">New Page</div>
                      <div className="text-xs notion-secondary">Create a new page</div>
                    </div>
                  </div>
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
