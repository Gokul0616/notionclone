import { useQuery } from "@tanstack/react-query";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, FileText, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageWithChildren } from "@shared/schema";

interface FavoritesPageProps {
  workspaceId: number;
  onPageSelect: (pageId: number) => void;
  currentPageId: number | null;
}

export default function FavoritesPage({ 
  workspaceId, 
  onPageSelect, 
  currentPageId 
}: FavoritesPageProps) {
  const { collaborationState, toggleFavorite } = useWebSocket(workspaceId);

  const { data: pages } = useQuery({
    queryKey: [`/api/workspaces/${workspaceId}/pages`],
    enabled: !!workspaceId,
  });

  const favoritePages = pages?.filter((page: PageWithChildren) => 
    collaborationState.favorites.has(page.id)
  ) || [];

  const handleToggleFavorite = (pageId: number) => {
    toggleFavorite(pageId);
  };

  if (favoritePages.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center mx-auto">
            <Star className="h-8 w-8 text-yellow-600 dark:text-yellow-500" />
          </div>
          <div>
            <h3 className="text-lg font-medium">No favorites yet</h3>
            <p className="text-muted-foreground mt-2">
              Star pages to quickly access them here
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Star className="h-5 w-5 text-yellow-600" />
          <h1 className="text-2xl font-bold">Favorites</h1>
          <Badge variant="secondary">
            {favoritePages.length}
          </Badge>
        </div>
      </div>

      <div className="grid gap-4">
        {favoritePages.map((page) => (
          <div
            key={page.id}
            className={cn(
              "p-4 rounded-lg border hover:bg-accent cursor-pointer transition-colors",
              currentPageId === page.id && "bg-accent"
            )}
            onClick={() => onPageSelect(page.id)}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-medium">
                    {page.title || "Untitled"}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Last edited {new Date(page.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleFavorite(page.id);
                }}
                className="text-yellow-600 hover:text-yellow-700"
              >
                <Star className="h-4 w-4 fill-current" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}