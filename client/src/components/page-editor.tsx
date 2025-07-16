import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Share, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import BlockEditor from "@/components/block-editor";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { type Page, type Block } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface PageEditorProps {
  pageId: number;
}

export default function PageEditor({ pageId }: PageEditorProps) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [icon, setIcon] = useState("");

  const { data: page, isLoading: pageLoading } = useQuery<Page>({
    queryKey: ["/api/pages", pageId],
  });

  const { data: blocks = [], isLoading: blocksLoading } = useQuery<Block[]>({
    queryKey: ["/api/pages", pageId, "blocks"],
  });

  const updatePageMutation = useMutation({
    mutationFn: async ({ title, icon }: { title?: string; icon?: string }) => {
      const response = await apiRequest("PATCH", `/api/pages/${pageId}`, { title, icon });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pages", pageId] });
      queryClient.invalidateQueries({ queryKey: ["/api/pages"] });
    },
  });

  useEffect(() => {
    if (page) {
      setTitle(page.title);
      setIcon(page.icon || "📄");
    }
  }, [page]);

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    // Auto-save after a delay
    const timeoutId = setTimeout(() => {
      if (newTitle !== page?.title) {
        updatePageMutation.mutate({ title: newTitle });
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  };

  const handleIconChange = (newIcon: string) => {
    setIcon(newIcon);
    updatePageMutation.mutate({ icon: newIcon });
  };

  const handleShare = () => {
    toast({
      title: "Share feature",
      description: "Share functionality would be implemented here",
    });
  };

  if (pageLoading || blocksLoading) {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-12 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              <div className="h-4 bg-gray-200 rounded w-4/6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold notion-heading mb-2">Page not found</h2>
          <p className="notion-secondary">The page you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Top Bar */}
      <div className="bg-notion-bg border-b notion-border px-6 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2 text-sm notion-secondary">
          {page.parentId && (
            <>
              <span className="notion-hover px-2 py-1 rounded cursor-pointer">Personal</span>
              <span>/</span>
            </>
          )}
          <span className="notion-text font-medium">{page.title}</span>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 notion-hover"
            onClick={handleShare}
          >
            <Share className="h-4 w-4 mr-1" />
            Share
          </Button>
          
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 notion-hover">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Page Editor */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-8">
          {/* Page Header */}
          <div className="mb-8">
            {/* Page Icon & Title */}
            <div className="flex items-start space-x-4 mb-4">
              <Input
                value={icon}
                onChange={(e) => handleIconChange(e.target.value)}
                className="text-4xl w-16 h-16 border-none bg-transparent p-2 text-center notion-hover rounded notion-transition"
              />
              <div className="flex-1">
                <Input
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className="text-3xl font-bold notion-heading border-none bg-transparent p-0 h-auto shadow-none focus-visible:ring-0"
                  placeholder="Untitled"
                />
              </div>
            </div>
            
            {/* Page Meta */}
            <div className="text-sm notion-secondary mb-6">
              <span>Last edited </span>
              <span>{new Date(page.updatedAt).toLocaleDateString()}</span>
              <span> by John Doe</span>
            </div>
          </div>

          {/* Block Editor */}
          <BlockEditor pageId={pageId} blocks={blocks} />
        </div>
      </div>
    </div>
  );
}
