import { type BlockContent } from "@shared/schema";

export function getBlockTypeFromSlashCommand(command: string): string | null {
  const commands: Record<string, string> = {
    "h1": "header",
    "h2": "header", 
    "h3": "header",
    "heading1": "header",
    "heading2": "header",
    "heading3": "header",
    "list": "list",
    "ul": "list",
    "bullet": "list",
    "todo": "todo",
    "task": "todo",
    "checkbox": "todo",
    "code": "code",
    "codeblock": "code",
    "text": "text",
    "paragraph": "text",
    "quote": "quote",
    "callout": "callout",
    "toggle": "toggle",
    "divider": "divider",
    "image": "image",
    "video": "video",
    "audio": "audio",
    "file": "file",
    "database": "database",
    "table": "database",
    "board": "database",
    "gallery": "database",
    "timeline": "database",
    "calendar": "database",
    "list-db": "database"
  };

  return commands[command.toLowerCase()] || null;
}

export function createDefaultContent(type: string): BlockContent {
  switch (type) {
    case "header":
      return { text: "", level: 2 };
    case "list":
      return { items: [""] };
    case "todo":
      return { text: "", checked: false };
    case "code":
      return { text: "", language: "javascript" };
    case "quote":
      return { text: "" };
    case "callout":
      return { text: "", emoji: "💡", backgroundColor: "gray" };
    case "toggle":
      return { text: "", isOpen: false, children: [] };
    case "divider":
      return {};
    case "image":
      return { url: "", caption: "" };
    case "video":
      return { url: "", caption: "" };
    case "audio":
      return { url: "", caption: "" };
    case "file":
      return { url: "", title: "" };
    case "database":
      return { title: "Untitled Database", items: [] };
    case "text":
    default:
      return { text: "" };
  }
}

export function getBlockTypeName(type: string): string {
  const names: Record<string, string> = {
    "text": "Text",
    "header": "Heading",
    "list": "Bullet List",
    "todo": "To-do",
    "code": "Code Block"
  };

  return names[type] || "Unknown";
}
