import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import BlockEditor from "@/components/block-editor";

interface PageEditorProps {
  pageId: number;
}

export default function PageEditor({ pageId }: PageEditorProps) {
  const { toast } = useToast();

  const { data: page, isLoading: pageLoading } = useQuery({
    queryKey: [`/api/pages/${pageId}`],
    enabled: !!pageId,
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return false;
      }
      return failureCount < 3;
    },
  });

  const { data: blocks, isLoading: blocksLoading } = useQuery({
    queryKey: [`/api/pages/${pageId}/blocks`],
    enabled: !!pageId,
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error as Error)) {
        return false;
      }
      return failureCount < 3;
    },
  });

  if (pageLoading || blocksLoading) {
    return (
      <div className="flex-1 p-6">
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="h-12 bg-muted animate-pulse rounded"></div>
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-6 bg-muted animate-pulse rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-medium">Page not found</h3>
          <p className="text-muted-foreground">
            This page may have been deleted or you don't have access to it.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto p-6">
        <div className="space-y-6">
          {/* Page Title */}
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {page.title || "Untitled"}
            </h1>
            {page.lastEditedAt && (
              <p className="text-sm text-muted-foreground mt-2">
                Last edited {new Date(page.lastEditedAt).toLocaleString()}
              </p>
            )}
          </div>

          {/* Block Editor */}
          <BlockEditor pageId={pageId} blocks={blocks || []} />
        </div>
      </div>
    </div>
  );
}