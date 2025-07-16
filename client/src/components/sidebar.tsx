import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { 
  Search, 
  RotateCcw, 
  Trash2, 
  ChevronRight, 
  ChevronDown, 
  FileText, 
  Plus,
  MoreHorizontal
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { type PageWithChildren, type InsertPage } from "@shared/schema";

interface SidebarProps {
  currentPageId: number | null;
  onPageSelect: (pageId: number) => void;
  onOpenCommandPalette: () => void;
}

export default function Sidebar({ currentPageId, onPageSelect, onOpenCommandPalette }: SidebarProps) {
  const [, navigate] = useLocation();
  const [expandedPages, setExpandedPages] = useState<Set<number>>(new Set([5])); // Personal folder expanded by default

  const { data: pages = [], isLoading } = useQuery<PageWithChildren[]>({
    queryKey: ["/api/pages"],
  });

  const createPageMutation = useMutation({
    mutationFn: async (pageData: InsertPage) => {
      const response = await apiRequest("POST", "/api/pages", pageData);
      return response.json();
    },
    onSuccess: (newPage) => {
      queryClient.invalidateQueries({ queryKey: ["/api/pages"] });
      onPageSelect(newPage.id);
      navigate(`/page/${newPage.id}`);
    },
  });

  const handlePageClick = (pageId: number) => {
    onPageSelect(pageId);
    navigate(`/page/${pageId}`);
  };

  const handleToggleExpanded = (pageId: number) => {
    setExpandedPages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(pageId)) {
        newSet.delete(pageId);
      } else {
        newSet.add(pageId);
      }
      return newSet;
    });
  };

  const handleCreatePage = () => {
    const title = "Untitled";
    createPageMutation.mutate({
      title,
      icon: "📄",
      parentId: null,
      userId: 1
    });
  };

  const renderPage = (page: PageWithChildren, level = 0) => {
    const hasChildren = page.children && page.children.length > 0;
    const isExpanded = expandedPages.has(page.id);
    const isSelected = currentPageId === page.id;

    return (
      <div key={page.id}>
        <div
          className={`flex items-center justify-between group px-2 py-1 rounded notion-transition cursor-pointer ${
            isSelected ? "bg-notion-hover" : "hover:bg-notion-hover"
          }`}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
        >
          <div className="flex items-center space-x-1 flex-1" onClick={() => handlePageClick(page.id)}>
            {hasChildren && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleExpanded(page.id);
                }}
                className="p-0.5 hover:bg-gray-200 rounded notion-transition"
              >
                {isExpanded ? (
                  <ChevronDown className="h-3 w-3 notion-secondary" />
                ) : (
                  <ChevronRight className="h-3 w-3 notion-secondary" />
                )}
              </button>
            )}
            {!hasChildren && <div className="w-4" />}
            <span className="text-sm">
              {page.icon} {page.title}
            </span>
          </div>
          <div className="opacity-0 group-hover:opacity-100 flex items-center">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
            >
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </div>
        </div>
        
        {hasChildren && isExpanded && (
          <div>
            {page.children!.map(child => renderPage(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="w-60 notion-sidebar border-r notion-border flex flex-col">
        <div className="p-4">
          <div className="animate-pulse space-y-2">
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-6 bg-gray-200 rounded"></div>
            <div className="h-6 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-60 notion-sidebar border-r notion-border flex flex-col">
      {/* Sidebar Header */}
      <div className="p-3 border-b notion-border">
        <div className="flex items-center justify-between p-2 notion-hover rounded notion-transition cursor-pointer">
          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 bg-gradient-to-br from-blue-500 to-purple-600 rounded text-xs flex items-center justify-center text-white font-semibold">
              N
            </div>
            <span className="font-medium text-sm notion-text">John's Notion</span>
          </div>
          <ChevronDown className="h-4 w-4 notion-secondary" />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="p-3 border-b notion-border space-y-1">
        <Button
          variant="ghost"
          className="w-full justify-start h-8 text-sm notion-hover"
          onClick={onOpenCommandPalette}
        >
          <Search className="h-4 w-4 mr-2 notion-secondary" />
          Search
          <span className="ml-auto text-xs notion-secondary">⌘K</span>
        </Button>
        
        <Button variant="ghost" className="w-full justify-start h-8 text-sm notion-hover">
          <RotateCcw className="h-4 w-4 mr-2 notion-secondary" />
          Updates
        </Button>

        <Button variant="ghost" className="w-full justify-start h-8 text-sm notion-hover">
          <Trash2 className="h-4 w-4 mr-2 notion-secondary" />
          Trash
        </Button>
      </div>

      {/* Page Navigation */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="space-y-1">
          {pages.map(page => renderPage(page))}
        </div>

        {/* Add New Page */}
        <div className="mt-4 pt-2 border-t notion-border">
          <Button
            variant="ghost"
            className="w-full justify-start h-8 text-sm notion-secondary notion-hover"
            onClick={handleCreatePage}
            disabled={createPageMutation.isPending}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add a page
          </Button>
        </div>
      </div>

      {/* User Profile */}
      <div className="p-3 border-t notion-border">
        <div className="flex items-center space-x-2 p-2 notion-hover rounded notion-transition cursor-pointer">
          <div className="w-6 h-6 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white text-xs font-semibold">
            JD
          </div>
          <span className="text-sm notion-text">John Doe</span>
        </div>
      </div>
    </div>
  );
}
