import { useState, useEffect } from "react";
import { useParams } from "wouter";
import Sidebar from "@/components/sidebar";
import PageEditor from "@/components/page-editor";
import CommandPalette from "@/components/command-palette";

export default function Workspace() {
  const { id } = useParams<{ id?: string }>();
  const [currentPageId, setCurrentPageId] = useState<number | null>(
    id ? parseInt(id) : 4 // Default to "Project Notes" page
  );
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  useEffect(() => {
    if (id) {
      setCurrentPageId(parseInt(id));
    }
  }, [id]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      }
      if (e.key === "Escape" && isCommandPaletteOpen) {
        setIsCommandPaletteOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isCommandPaletteOpen]);

  return (
    <div className="flex h-screen overflow-hidden bg-notion-bg">
      <Sidebar 
        currentPageId={currentPageId}
        onPageSelect={setCurrentPageId}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {currentPageId ? (
          <PageEditor pageId={currentPageId} />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-xl font-semibold notion-heading mb-2">
                Select a page to start editing
              </h2>
              <p className="notion-secondary">
                Choose a page from the sidebar or create a new one
              </p>
            </div>
          </div>
        )}
      </div>

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onPageSelect={setCurrentPageId}
      />
    </div>
  );
}
