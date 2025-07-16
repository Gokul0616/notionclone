import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { 
  Type, 
  Heading1, 
  Heading2, 
  Heading3, 
  List, 
  CheckSquare, 
  Code,
  Plus,
  GripVertical
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertBlockSchema, updateBlockSchema, type Block, type BlockContent } from "@shared/schema";

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

const blockTypes = [
  { type: "text", label: "Text", icon: Type },
  { type: "heading1", label: "Heading 1", icon: Heading1 },
  { type: "heading2", label: "Heading 2", icon: Heading2 },
  { type: "heading3", label: "Heading 3", icon: Heading3 },
  { type: "bullet-list", label: "Bullet List", icon: List },
  { type: "todo", label: "Todo", icon: CheckSquare },
  { type: "code", label: "Code", icon: Code },
];

function BlockComponent({ block, onUpdate, onDelete, onCreateBelow }: BlockComponentProps) {
  const [content, setContent] = useState(block.content?.text || "");
  const [isChecked, setIsChecked] = useState(block.content?.checked || false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [content]);

  const handleContentChange = (newContent: BlockContent) => {
    onUpdate(newContent);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onCreateBelow('text');
    } else if (e.key === 'Backspace' && content === '' && !e.shiftKey) {
      e.preventDefault();
      onDelete();
    }
  };

  const renderBlock = () => {
    switch (block.type) {
      case "heading1":
        return (
          <textarea
            ref={textareaRef}
            className="w-full bg-transparent border-none outline-none resize-none text-3xl font-bold placeholder-muted-foreground"
            placeholder="Heading 1"
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              handleContentChange({ text: e.target.value });
            }}
            onKeyDown={handleKeyDown}
            rows={1}
          />
        );
        
      case "heading2":
        return (
          <textarea
            ref={textareaRef}
            className="w-full bg-transparent border-none outline-none resize-none text-2xl font-semibold placeholder-muted-foreground"
            placeholder="Heading 2"
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              handleContentChange({ text: e.target.value });
            }}
            onKeyDown={handleKeyDown}
            rows={1}
          />
        );
        
      case "heading3":
        return (
          <textarea
            ref={textareaRef}
            className="w-full bg-transparent border-none outline-none resize-none text-xl font-medium placeholder-muted-foreground"
            placeholder="Heading 3"
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              handleContentChange({ text: e.target.value });
            }}
            onKeyDown={handleKeyDown}
            rows={1}
          />
        );
        
      case "bullet-list":
        return (
          <div className="flex items-start space-x-2">
            <span className="mt-2 w-1 h-1 bg-foreground rounded-full flex-shrink-0"></span>
            <textarea
              ref={textareaRef}
              className="flex-1 bg-transparent border-none outline-none resize-none placeholder-muted-foreground"
              placeholder="List item"
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                handleContentChange({ text: e.target.value });
              }}
              onKeyDown={handleKeyDown}
              rows={1}
            />
          </div>
        );
        
      case "todo":
        return (
          <div className="flex items-start space-x-2">
            <input
              type="checkbox"
              checked={isChecked}
              onChange={(e) => {
                setIsChecked(e.target.checked);
                handleContentChange({ text: content, checked: e.target.checked });
              }}
              className="mt-1 rounded border-gray-300"
            />
            <textarea
              ref={textareaRef}
              className={`flex-1 bg-transparent border-none outline-none resize-none placeholder-muted-foreground ${
                isChecked ? 'line-through text-muted-foreground' : ''
              }`}
              placeholder="Todo item"
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                handleContentChange({ text: e.target.value, checked: isChecked });
              }}
              onKeyDown={handleKeyDown}
              rows={1}
            />
          </div>
        );
        
      case "code":
        return (
          <div className="bg-muted rounded-md p-3">
            <textarea
              ref={textareaRef}
              className="w-full bg-transparent border-none outline-none resize-none font-mono text-sm placeholder-muted-foreground"
              placeholder="Enter code..."
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                handleContentChange({ text: e.target.value });
              }}
              onKeyDown={handleKeyDown}
              rows={3}
            />
          </div>
        );
        
      default:
        return (
          <textarea
            ref={textareaRef}
            className="w-full bg-transparent border-none outline-none resize-none placeholder-muted-foreground"
            placeholder="Type something..."
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              handleContentChange({ text: e.target.value });
            }}
            onKeyDown={handleKeyDown}
            rows={1}
          />
        );
    }
  };

  return (
    <div className="group flex items-start space-x-2 py-1">
      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
        <GripVertical className="h-4 w-4 text-muted-foreground mt-1 cursor-grab" />
      </div>
      <div className="flex-1">
        {renderBlock()}
      </div>
    </div>
  );
}

export default function BlockEditor({ pageId, blocks }: BlockEditorProps) {
  const [showBlockMenu, setShowBlockMenu] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createBlockMutation = useMutation({
    mutationFn: async (blockData: { type: string; pageId: number; position: number }) => {
      const response = await apiRequest('POST', '/api/blocks', {
        ...blockData,
        content: { text: "" }
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/pages/${pageId}/blocks`] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create block",
        variant: "destructive",
      });
    },
  });

  const updateBlockMutation = useMutation({
    mutationFn: async ({ id, content }: { id: number; content: BlockContent }) => {
      const response = await apiRequest('PATCH', `/api/blocks/${id}`, { content });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/pages/${pageId}/blocks`] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update block",
        variant: "destructive",
      });
    },
  });

  const deleteBlockMutation = useMutation({
    mutationFn: async (blockId: number) => {
      const response = await apiRequest('DELETE', `/api/blocks/${blockId}`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/pages/${pageId}/blocks`] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete block",
        variant: "destructive",
      });
    },
  });

  const handleUpdateBlock = (blockId: number, content: BlockContent) => {
    updateBlockMutation.mutate({ id: blockId, content });
  };

  const handleCreateBlock = (type: string, afterBlockId?: number) => {
    const afterIndex = afterBlockId ? blocks.findIndex(b => b.id === afterBlockId) : -1;
    const position = afterIndex >= 0 ? blocks[afterIndex].position + 1 : blocks.length;
    
    createBlockMutation.mutate({
      type,
      pageId,
      position
    });
  };

  const handleDeleteBlock = (blockId: number) => {
    deleteBlockMutation.mutate(blockId);
  };

  const sortedBlocks = [...blocks].sort((a, b) => a.position - b.position);

  return (
    <div className="space-y-2">
      {sortedBlocks.map((block) => (
        <BlockComponent
          key={block.id}
          block={block}
          onUpdate={(content) => handleUpdateBlock(block.id, content)}
          onDelete={() => handleDeleteBlock(block.id)}
          onCreateBelow={(type) => handleCreateBlock(type, block.id)}
        />
      ))}

      {/* Add Block Button */}
      <div className="relative">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowBlockMenu(!showBlockMenu)}
          className="text-muted-foreground hover:text-foreground"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add a block
        </Button>

        {showBlockMenu && (
          <div className="absolute top-full left-0 mt-1 bg-background border rounded-lg shadow-lg z-10 min-w-48">
            <div className="p-2 space-y-1">
              {blockTypes.map((blockType) => (
                <Button
                  key={blockType.type}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => {
                    handleCreateBlock(blockType.type);
                    setShowBlockMenu(false);
                  }}
                >
                  <blockType.icon className="h-4 w-4 mr-2" />
                  {blockType.label}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>

      {blocks.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <Type className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">Start writing</h3>
          <p className="text-muted-foreground mb-4">
            Add your first block to begin creating content
          </p>
          <Button onClick={() => handleCreateBlock('text')}>
            <Plus className="h-4 w-4 mr-2" />
            Add a text block
          </Button>
        </div>
      )}
    </div>
  );
}