import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { GripVertical, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { type Block, type InsertBlock, type BlockContent } from "@shared/schema";
import { getBlockTypeFromSlashCommand, createDefaultContent } from "@/lib/blocks";

interface BlockEditorProps {
  pageId: number;
  blocks: Block[];
}

interface BlockComponentProps {
  block: Block;
  onUpdate: (content: BlockContent) => void;
  onDelete: () => void;
  onCreateBelow: (type: string) => void;
}

function BlockComponent({ block, onUpdate, onDelete, onCreateBelow }: BlockComponentProps) {
  const [content, setContent] = useState<BlockContent>(block.content || {});
  const [isSlashMenuOpen, setIsSlashMenuOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleContentChange = (newContent: BlockContent) => {
    setContent(newContent);
    onUpdate(newContent);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onCreateBelow("text");
    }
    
    if (e.key === "Backspace" && contentRef.current) {
      const text = contentRef.current.textContent || "";
      if (text === "" || text === "/") {
        e.preventDefault();
        onDelete();
      }
    }
  };

  const handleInput = () => {
    if (contentRef.current) {
      const text = contentRef.current.textContent || "";
      
      if (text.endsWith("/")) {
        setIsSlashMenuOpen(true);
      } else {
        setIsSlashMenuOpen(false);
      }
      
      if (block.type === "text" || block.type === "header") {
        handleContentChange({ ...content, text });
      }
    }
  };

  const handleSlashCommand = (command: string) => {
    const blockType = getBlockTypeFromSlashCommand(command);
    if (blockType && contentRef.current) {
      // Replace the "/" with empty content and change block type
      contentRef.current.textContent = "";
      setIsSlashMenuOpen(false);
      onCreateBelow(blockType);
    }
  };

  useEffect(() => {
    const element = contentRef.current;
    if (element) {
      element.addEventListener("keydown", handleKeyDown);
      return () => element.removeEventListener("keydown", handleKeyDown);
    }
  }, []);

  const renderContent = () => {
    switch (block.type) {
      case "text":
        return (
          <div
            ref={contentRef}
            className="block-editor outline-none"
            contentEditable
            suppressContentEditableWarning
            onInput={handleInput}
            data-placeholder="Type '/' for commands"
            dangerouslySetInnerHTML={{ __html: content.text || "" }}
          />
        );

      case "header":
        const HeaderTag = content.level === 1 ? "h1" : content.level === 3 ? "h3" : "h2";
        return (
          <HeaderTag
            ref={contentRef}
            className="block-editor outline-none notion-heading font-semibold"
            contentEditable
            suppressContentEditableWarning
            onInput={handleInput}
            data-placeholder="Heading"
            dangerouslySetInnerHTML={{ __html: content.text || "" }}
          />
        );

      case "list":
        return (
          <ul className="space-y-1">
            {(content.items || []).map((item, index) => (
              <li key={index} className="flex items-start space-x-2">
                <span className="notion-secondary mt-1.5">•</span>
                <div
                  className="block-editor outline-none flex-1"
                  contentEditable
                  suppressContentEditableWarning
                  onInput={(e) => {
                    const newItems = [...(content.items || [])];
                    newItems[index] = (e.target as HTMLElement).textContent || "";
                    handleContentChange({ ...content, items: newItems });
                  }}
                  dangerouslySetInnerHTML={{ __html: item }}
                />
              </li>
            ))}
          </ul>
        );

      case "todo":
        return (
          <div className="flex items-center space-x-3">
            <Checkbox
              checked={content.checked || false}
              onCheckedChange={(checked) => 
                handleContentChange({ ...content, checked: !!checked })
              }
            />
            <div
              ref={contentRef}
              className={`block-editor outline-none flex-1 ${
                content.checked ? "line-through notion-secondary" : ""
              }`}
              contentEditable
              suppressContentEditableWarning
              onInput={handleInput}
              data-placeholder="To-do"
              dangerouslySetInnerHTML={{ __html: content.text || "" }}
            />
          </div>
        );

      case "code":
        return (
          <div className="bg-gray-100 rounded p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs notion-secondary font-medium">
                {content.language || "Plain Text"}
              </span>
              <Button variant="ghost" size="sm" className="text-xs notion-secondary h-6">
                Copy
              </Button>
            </div>
            <pre
              ref={contentRef}
              className="block-editor outline-none text-sm font-mono"
              contentEditable
              suppressContentEditableWarning
              onInput={handleInput}
              data-placeholder="Code"
              dangerouslySetInnerHTML={{ __html: content.text || "" }}
            />
          </div>
        );

      default:
        return (
          <div
            ref={contentRef}
            className="block-editor outline-none"
            contentEditable
            suppressContentEditableWarning
            onInput={handleInput}
            data-placeholder="Type something..."
            dangerouslySetInnerHTML={{ __html: content.text || "" }}
          />
        );
    }
  };

  return (
    <div className="group relative block-wrapper hover:bg-gray-50 -mx-2 px-2 py-1 rounded notion-transition">
      <div className="absolute left-0 top-1 block-controls flex items-center">
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 mr-1">
          <GripVertical className="h-3 w-3 notion-secondary" />
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-6 w-6 p-0"
          onClick={() => onCreateBelow("text")}
        >
          <Plus className="h-3 w-3 notion-secondary" />
        </Button>
      </div>
      
      {renderContent()}
      
      {isSlashMenuOpen && (
        <div className="absolute z-10 bg-white border border-gray-200 rounded-lg shadow-lg p-2 mt-1">
          <div className="space-y-1">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start h-8 text-sm"
              onClick={() => handleSlashCommand("h1")}
            >
              Heading 1
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start h-8 text-sm"
              onClick={() => handleSlashCommand("h2")}
            >
              Heading 2
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start h-8 text-sm"
              onClick={() => handleSlashCommand("list")}
            >
              Bullet List
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start h-8 text-sm"
              onClick={() => handleSlashCommand("todo")}
            >
              To-do List
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start h-8 text-sm"
              onClick={() => handleSlashCommand("code")}
            >
              Code Block
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BlockEditor({ pageId, blocks }: BlockEditorProps) {
  const createBlockMutation = useMutation({
    mutationFn: async (blockData: InsertBlock) => {
      const response = await apiRequest("POST", `/api/pages/${pageId}/blocks`, blockData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pages", pageId, "blocks"] });
    },
  });

  const updateBlockMutation = useMutation({
    mutationFn: async ({ id, content }: { id: number; content: BlockContent }) => {
      const response = await apiRequest("PATCH", `/api/blocks/${id}`, { content });
      return response.json();
    },
  });

  const deleteBlockMutation = useMutation({
    mutationFn: async (blockId: number) => {
      const response = await apiRequest("DELETE", `/api/blocks/${blockId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pages", pageId, "blocks"] });
    },
  });

  const handleUpdateBlock = (blockId: number, content: BlockContent) => {
    updateBlockMutation.mutate({ id: blockId, content });
  };

  const handleDeleteBlock = (blockId: number) => {
    deleteBlockMutation.mutate(blockId);
  };

  const handleCreateBlock = (afterPosition: number, type: string) => {
    const content = createDefaultContent(type);
    createBlockMutation.mutate({
      pageId,
      type,
      content,
      position: afterPosition + 1,
    });
  };

  const handleCreateEmptyBlock = () => {
    const nextPosition = blocks.length;
    handleCreateBlock(nextPosition - 1, "text");
  };

  return (
    <div className="space-y-1">
      {blocks.map((block, index) => (
        <BlockComponent
          key={block.id}
          block={block}
          onUpdate={(content) => handleUpdateBlock(block.id, content)}
          onDelete={() => handleDeleteBlock(block.id)}
          onCreateBelow={(type) => handleCreateBlock(index, type)}
        />
      ))}
      
      {/* Empty block for new content */}
      <div className="group relative block-wrapper hover:bg-gray-50 -mx-2 px-2 py-2 rounded notion-transition">
        <div className="absolute left-0 top-2 block-controls flex items-center">
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 mr-1">
            <GripVertical className="h-3 w-3 notion-secondary" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 w-6 p-0"
            onClick={handleCreateEmptyBlock}
          >
            <Plus className="h-3 w-3 notion-secondary" />
          </Button>
        </div>
        <div
          className="min-h-[24px] block-editor outline-none cursor-text notion-text"
          contentEditable
          onClick={handleCreateEmptyBlock}
          data-placeholder="Type '/' for commands"
        />
      </div>
    </div>
  );
}
