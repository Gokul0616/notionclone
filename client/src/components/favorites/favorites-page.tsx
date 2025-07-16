import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star, Search, ExternalLink, Clock, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";

interface FavoritePage {
  id: number;
  title: string;
  icon: string;
  workspaceId: number;
  parentId?: number;
  lastEditedAt: string;
  lastEditedBy: string;
  blockCount: number;
  isFavorite: boolean;
}

export default function FavoritesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"title" | "lastEditedAt" | "blockCount">("lastEditedAt");

  const { data: favoritePages, isLoading } = useQuery<FavoritePage[]>({
    queryKey: ['/api/favorites'],
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: async ({ pageId, isFavorite }: { pageId: number; isFavorite: boolean }) => {
      const response = await apiRequest('PATCH', `/api/pages/${pageId}`, { isFavorite });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/favorites'] });
      queryClient.invalidateQueries({ queryKey: ['/api/workspaces'] });
      toast({
        title: "Updated",
        description: "Page favorite status updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update favorite status.",
        variant: "destructive",
      });
    },
  });

  const filteredPages = favoritePages?.filter(page => 
    page.title.toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a, b) => {
    switch (sortBy) {
      case "title":
        return a.title.localeCompare(b.title);
      case "blockCount":
        return b.blockCount - a.blockCount;
      case "lastEditedAt":
      default:
        return new Date(b.lastEditedAt).getTime() - new Date(a.lastEditedAt).getTime();
    }
  });

  if (isLoading) {
    return <div className="p-8">Loading favorites...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h1 className="text-2xl font-bold">Favorites</h1>
          <Badge variant="secondary">{favoritePages?.length || 0} pages</Badge>
        </div>
      </div>

      {/* Search and Sort Controls */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search favorite pages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="lastEditedAt">Recently Edited</SelectItem>
            <SelectItem value="title">Title</SelectItem>
            <SelectItem value="blockCount">Content Size</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Favorite Pages Grid */}
      <div className="space-y-4">
        {!filteredPages?.length ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Star className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No favorite pages</h3>
              <p className="text-muted-foreground text-center max-w-md">
                {searchQuery 
                  ? "No favorite pages match your search."
                  : "Star pages to add them to your favorites for quick access."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPages.map((page) => (
              <Card key={page.id} className="hover:shadow-md transition-shadow cursor-pointer group">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{page.icon}</span>
                      <CardTitle className="text-base truncate">{page.title}</CardTitle>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavoriteMutation.mutate({ pageId: page.id, isFavorite: false });
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Star className="h-4 w-4 fill-current text-yellow-500" />
                    </Button>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <span className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {formatDistanceToNow(new Date(page.lastEditedAt))} ago
                      </span>
                      <span className="flex items-center">
                        <FileText className="h-3 w-3 mr-1" />
                        {page.blockCount} blocks
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs">
                        Workspace {page.workspaceId}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(`/page/${page.id}`, '_self')}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div>
              <h3 className="text-lg font-semibold">{favoritePages?.length || 0}</h3>
              <p className="text-sm text-muted-foreground">Total Favorites</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold">
                {favoritePages?.reduce((sum, page) => sum + page.blockCount, 0) || 0}
              </h3>
              <p className="text-sm text-muted-foreground">Total Blocks</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold">
                {favoritePages?.filter(page => {
                  const editedDate = new Date(page.lastEditedAt);
                  const daysDiff = Math.floor((new Date().getTime() - editedDate.getTime()) / (1000 * 60 * 60 * 24));
                  return daysDiff <= 7;
                }).length || 0}
              </h3>
              <p className="text-sm text-muted-foreground">Edited This Week</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}