import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RotateCcw, Trash2, Search, Filter, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";

interface DeletedPage {
  id: number;
  title: string;
  icon: string;
  deletedAt: string;
  deletedBy: string;
  workspaceId: number;
  parentId?: number;
  size: number; // Number of blocks
}

export default function TrashPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"title" | "deletedAt" | "size">("deletedAt");
  const [filterBy, setFilterBy] = useState<"all" | "recent" | "old">("all");

  const { data: deletedPages, isLoading } = useQuery<DeletedPage[]>({
    queryKey: ['/api/trash/pages'],
  });

  const restorePageMutation = useMutation({
    mutationFn: async (pageId: number) => {
      const response = await apiRequest('POST', `/api/trash/restore/${pageId}`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trash/pages'] });
      queryClient.invalidateQueries({ queryKey: ['/api/workspaces'] });
      toast({
        title: "Page restored",
        description: "The page has been restored successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to restore page.",
        variant: "destructive",
      });
    },
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: async (pageId: number) => {
      const response = await apiRequest('DELETE', `/api/trash/permanent/${pageId}`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trash/pages'] });
      toast({
        title: "Page permanently deleted",
        description: "The page has been permanently deleted.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to permanently delete page.",
        variant: "destructive",
      });
    },
  });

  const emptyTrashMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('DELETE', '/api/trash/empty');
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trash/pages'] });
      toast({
        title: "Trash emptied",
        description: "All pages have been permanently deleted.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to empty trash.",
        variant: "destructive",
      });
    },
  });

  const filteredPages = deletedPages?.filter(page => {
    const matchesSearch = page.title.toLowerCase().includes(searchQuery.toLowerCase());
    const now = new Date();
    const deletedDate = new Date(page.deletedAt);
    const daysDiff = Math.floor((now.getTime() - deletedDate.getTime()) / (1000 * 60 * 60 * 24));
    
    let matchesFilter = true;
    if (filterBy === "recent") {
      matchesFilter = daysDiff <= 7;
    } else if (filterBy === "old") {
      matchesFilter = daysDiff > 30;
    }
    
    return matchesSearch && matchesFilter;
  }).sort((a, b) => {
    switch (sortBy) {
      case "title":
        return a.title.localeCompare(b.title);
      case "size":
        return b.size - a.size;
      case "deletedAt":
      default:
        return new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime();
    }
  });

  if (isLoading) {
    return <div className="p-8">Loading trash...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h1 className="text-2xl font-bold">Trash</h1>
          <Badge variant="secondary">{deletedPages?.length || 0} items</Badge>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => emptyTrashMutation.mutate()}
            disabled={!deletedPages?.length || emptyTrashMutation.isPending}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Empty Trash
          </Button>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search deleted pages..."
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
            <SelectItem value="deletedAt">Recently Deleted</SelectItem>
            <SelectItem value="title">Title</SelectItem>
            <SelectItem value="size">Size</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={filterBy} onValueChange={(value: any) => setFilterBy(value)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Items</SelectItem>
            <SelectItem value="recent">Last 7 Days</SelectItem>
            <SelectItem value="old">Older than 30 Days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Deleted Pages List */}
      <div className="space-y-4">
        {!filteredPages?.length ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Trash2 className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No deleted pages</h3>
              <p className="text-muted-foreground text-center max-w-md">
                {searchQuery || filterBy !== "all" 
                  ? "No pages match your search or filter criteria."
                  : "Your trash is empty. Deleted pages will appear here."}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredPages.map((page) => (
            <Card key={page.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-xl">{page.icon}</span>
                    <div>
                      <h3 className="font-semibold">{page.title}</h3>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          Deleted {formatDistanceToNow(new Date(page.deletedAt))} ago
                        </span>
                        <span>{page.size} blocks</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => restorePageMutation.mutate(page.id)}
                      disabled={restorePageMutation.isPending}
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Restore
                    </Button>
                    
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => permanentDeleteMutation.mutate(page.id)}
                      disabled={permanentDeleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Forever
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Auto-delete notice */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>
              Pages in trash are automatically deleted after 30 days. 
              Restore important pages before they're permanently removed.
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}