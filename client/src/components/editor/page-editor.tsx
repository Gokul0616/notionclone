import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, Share, Users, Eye } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import CursorTracker from "@/components/collaboration/cursor-tracker";
import LivePresence from "@/components/collaboration/live-presence";
import SharePage from "@/components/sharing/share-page";
import BlockEditor from "./block-editor";
import type { Page, Block } from "@shared/schema";

export default function PageEditor() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [showShareDialog, setShowShareDialog] = useState(false);
  const pageId = parseInt(id || "0");

  const { data: page, isLoading } = useQuery<Page>({
    queryKey: ["/api/pages", pageId],
    enabled: !!pageId,
  });

  const { data: blocks = [] } = useQuery<Block[]>({
    queryKey: ["/api/blocks", pageId],
    enabled: !!pageId,
  });

  const updatePageMutation = useMutation({
    mutationFn: async (updates: Partial<Page>) => {
      const response = await apiRequest("PATCH", `/api/pages/${pageId}`, updates);
      return await response.json();
    },
    onSuccess: (updatedPage) => {
      queryClient.setQueryData(["/api/pages", pageId], updatedPage);
      setIsEditing(false);
      toast({
        title: "Page updated",
        description: "Your changes have been saved.",
      });
    },
    onError: () => {
      toast({
        title: "Update failed",
        description: "Failed to update the page. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/pages/${pageId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pages"] });
      toast({
        title: "Page deleted",
        description: "The page has been moved to trash.",
      });
    },
  });

  useEffect(() => {
    if (page) {
      setTitle(page.title);
    }
  }, [page]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!page) {
    return (
      <div className="text-center py-8">
        <h2 className="text-2xl font-bold mb-4">Page not found</h2>
        <p className="text-muted-foreground">The page you're looking for doesn't exist.</p>
      </div>
    );
  }

  const handleUpdateTitle = () => {
    if (title.trim() && title !== page.title) {
      updatePageMutation.mutate({ title: title.trim() });
    } else {
      setIsEditing(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleUpdateTitle();
    } else if (e.key === "Escape") {
      setTitle(page.title);
      setIsEditing(false);
    }
  };

  return (
    <div className="relative min-h-screen">
      {/* Real-time collaboration components */}
      <CursorTracker pageId={pageId} />
      <LivePresence pageId={pageId} />
      
      <Card className="max-w-4xl mx-auto">
        <CardContent className="p-6 space-y-6">
          {/* Page Header */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Badge variant="outline">
                  <Eye className="h-3 w-3 mr-1" />
                  {page.isPublic ? "Public" : "Private"}
                </Badge>
                <Badge variant="secondary">
                  <Users className="h-3 w-3 mr-1" />
                  Collaborative
                </Badge>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowShareDialog(true)}
                >
                  <Share className="h-4 w-4 mr-2" />
                  Share
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isPending}
                >
                  Delete
                </Button>
              </div>
            </div>

            {/* Page Title */}
            <div className="space-y-2">
              {isEditing ? (
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={handleUpdateTitle}
                  onKeyDown={handleKeyPress}
                  className="text-3xl font-bold border-none shadow-none p-0 h-auto"
                  autoFocus
                />
              ) : (
                <h1
                  className="text-3xl font-bold cursor-pointer hover:bg-muted/50 p-2 rounded"
                  onClick={() => setIsEditing(true)}
                >
                  {page.title}
                </h1>
              )}
              
              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                <span>Created by {page.createdBy}</span>
                <span>•</span>
                <span>Last edited {new Date(page.updatedAt).toLocaleDateString()}</span>
                {page.lastEditedBy && (
                  <>
                    <span>•</span>
                    <span>by {page.lastEditedBy}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Block Editor */}
          <BlockEditor pageId={pageId} blocks={blocks} />

          {/* Page Statistics */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center space-x-4">
                <span>{blocks.length} blocks</span>
                <span>•</span>
                <span>
                  {blocks.reduce((count, block) => 
                    count + (block.content?.text?.length || 0), 0
                  )} characters
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span>Page ID: {pageId}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Share Dialog */}
      {showShareDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Share Page</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowShareDialog(false)}
              >
                ×
              </Button>
            </div>
            <SharePage pageId={pageId} pageTitle={page.title} />
          </div>
        </div>
      )}
    </div>
  );
}