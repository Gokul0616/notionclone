import { useQuery } from "@tanstack/react-query";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, FileText, RotateCcw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageWithChildren } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface TrashPageProps {
  workspaceId: number;
  onPageSelect: (pageId: number) => void;
  currentPageId: number | null;
}

export default function TrashPage({ 
  workspaceId, 
  onPageSelect, 
  currentPageId 
}: TrashPageProps) {
  const { collaborationState, restorePage, permanentDelete } = useWebSocket(workspaceId);
  const { toast } = useToast();

  const { data: pages } = useQuery({
    queryKey: [`/api/workspaces/${workspaceId}/pages`],
    enabled: !!workspaceId,
  });

  const trashedPages = pages?.filter((page: PageWithChildren) => 
    collaborationState.trash.has(page.id)
  ) || [];

  const handleRestore = (pageId: number, pageTitle: string) => {
    restorePage(pageId);
    toast({
      title: "Page restored",
      description: `"${pageTitle}" has been restored`,
    });
  };

  const handlePermanentDelete = (pageId: number, pageTitle: string) => {
    permanentDelete(pageId);
    toast({
      title: "Page deleted permanently",
      description: `"${pageTitle}" has been permanently deleted`,
      variant: "destructive",
    });
  };

  if (trashedPages.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto">
            <Trash2 className="h-8 w-8 text-red-600 dark:text-red-500" />
          </div>
          <div>
            <h3 className="text-lg font-medium">Trash is empty</h3>
            <p className="text-muted-foreground mt-2">
              Deleted pages will appear here
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
          <Trash2 className="h-5 w-5 text-red-600" />
          <h1 className="text-2xl font-bold">Trash</h1>
          <Badge variant="destructive">
            {trashedPages.length}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Pages in trash will be permanently deleted after 30 days
        </p>
      </div>

      <div className="grid gap-4">
        {trashedPages.map((page) => (
          <div
            key={page.id}
            className={cn(
              "p-4 rounded-lg border hover:bg-accent/50 transition-colors",
              currentPageId === page.id && "bg-accent/50"
            )}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-medium text-muted-foreground">
                    {page.title || "Untitled"}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Deleted {new Date(page.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRestore(page.id, page.title || "Untitled")}
                  className="text-green-600 hover:text-green-700"
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Restore
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePermanentDelete(page.id, page.title || "Untitled")}
                  className="text-red-600 hover:text-red-700"
                >
                  <X className="h-4 w-4 mr-1" />
                  Delete Forever
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}