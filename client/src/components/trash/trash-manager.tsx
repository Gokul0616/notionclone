import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Trash2, 
  RotateCcw, 
  Search, 
  Clock, 
  AlertTriangle,
  FileX,
  RefreshCcw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface TrashManagerProps {
  workspaceId: number;
}

export default function TrashManager({ workspaceId }: TrashManagerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: deletedPages, isLoading } = useQuery({
    queryKey: [`/api/workspaces/${workspaceId}/pages/deleted`],
    enabled: !!workspaceId,
  });

  const restorePageMutation = useMutation({
    mutationFn: async (pageId: number) => {
      return await apiRequest(`/api/pages/${pageId}/restore`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${workspaceId}/pages`] });
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${workspaceId}/pages/deleted`] });
      toast({
        title: "Page restored",
        description: "The page has been moved back to your workspace",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to restore page",
        variant: "destructive",
      });
    },
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: async (pageId: number) => {
      return await apiRequest(`/api/pages/${pageId}/permanent-delete`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${workspaceId}/pages/deleted`] });
      toast({
        title: "Page permanently deleted",
        description: "The page has been permanently removed",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to permanently delete page",
        variant: "destructive",
      });
    },
  });

  const emptyTrashMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/workspaces/${workspaceId}/trash/empty`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${workspaceId}/pages/deleted`] });
      toast({
        title: "Trash emptied",
        description: "All deleted pages have been permanently removed",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to empty trash",
        variant: "destructive",
      });
    },
  });

  const filteredPages = deletedPages?.filter((page: any) =>
    page.title.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const getDaysInTrash = (deletedAt: string) => {
    const days = Math.floor((Date.now() - new Date(deletedAt).getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted animate-pulse rounded"></div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-muted animate-pulse rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Trash</h2>
          <p className="text-muted-foreground">
            Pages deleted within the last 30 days can be restored
          </p>
        </div>
        {filteredPages.length > 0 && (
          <Button
            variant="destructive"
            onClick={() => emptyTrashMutation.mutate()}
            disabled={emptyTrashMutation.isPending}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Empty Trash
          </Button>
        )}
      </div>

      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search deleted pages..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Badge variant="secondary">
          {filteredPages.length} {filteredPages.length === 1 ? 'item' : 'items'}
        </Badge>
      </div>

      {filteredPages.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <FileX className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">Trash is empty</h3>
            <p className="text-muted-foreground text-center max-w-sm">
              {searchTerm 
                ? "No deleted pages match your search"
                : "When you delete pages, they'll appear here for 30 days before being permanently removed"
              }
            </p>
            {searchTerm && (
              <Button 
                variant="outline" 
                onClick={() => setSearchTerm("")}
                className="mt-4"
              >
                Clear search
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredPages.map((page: any) => {
            const daysInTrash = getDaysInTrash(page.deletedAt);
            const isExpiringSoon = daysInTrash > 25;
            
            return (
              <Card key={page.id} className={isExpiringSoon ? "border-orange-200 bg-orange-50" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium truncate">{page.title}</h3>
                        {isExpiringSoon && (
                          <Badge variant="destructive" className="flex items-center space-x-1">
                            <AlertTriangle className="h-3 w-3" />
                            <span>Expiring soon</span>
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center space-x-4 mt-1 text-sm text-muted-foreground">
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>Deleted {daysInTrash} {daysInTrash === 1 ? 'day' : 'days'} ago</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span>Expires in {30 - daysInTrash} {30 - daysInTrash === 1 ? 'day' : 'days'}</span>
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
            );
          })}
        </div>
      )}

      {filteredPages.length > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <RefreshCcw className="h-4 w-4 text-blue-600" />
              </div>
              <div className="space-y-1">
                <h4 className="font-medium text-blue-900">Auto-deletion Notice</h4>
                <p className="text-sm text-blue-700">
                  Pages in trash are automatically deleted after 30 days. 
                  Restore any important pages before they're permanently removed.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}