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
    "paragraph": "text"
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
