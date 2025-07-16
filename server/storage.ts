import { 
  users, pages, blocks,
  type User, type InsertUser,
  type Page, type InsertPage, type UpdatePage, type PageWithChildren,
  type Block, type InsertBlock, type UpdateBlock
} from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Page operations
  getPage(id: number): Promise<Page | undefined>;
  getPagesByUserId(userId: number): Promise<Page[]>;
  getPagesWithChildren(userId: number): Promise<PageWithChildren[]>;
  createPage(page: InsertPage): Promise<Page>;
  updatePage(id: number, updates: UpdatePage): Promise<Page | undefined>;
  deletePage(id: number): Promise<boolean>;
  searchPages(userId: number, query: string): Promise<Page[]>;

  // Block operations
  getBlocksByPageId(pageId: number): Promise<Block[]>;
  createBlock(block: InsertBlock): Promise<Block>;
  updateBlock(id: number, updates: UpdateBlock): Promise<Block | undefined>;
  deleteBlock(id: number): Promise<boolean>;
  reorderBlocks(pageId: number, blockIds: number[]): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private pages: Map<number, Page>;
  private blocks: Map<number, Block>;
  private currentUserId: number;
  private currentPageId: number;
  private currentBlockId: number;

  constructor() {
    this.users = new Map();
    this.pages = new Map();
    this.blocks = new Map();
    this.currentUserId = 1;
    this.currentPageId = 1;
    this.currentBlockId = 1;

    // Create default user
    const defaultUser: User = {
      id: 1,
      username: "john",
      password: "password",
      name: "John Doe",
      avatar: null
    };
    this.users.set(1, defaultUser);
    this.currentUserId = 2;

    // Create default pages structure
    this.createDefaultPages();
  }

  private createDefaultPages() {
    const defaultPages: Page[] = [
      {
        id: 1,
        title: "Getting Started",
        icon: "📋",
        parentId: null,
        userId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        isDeleted: false
      },
      {
        id: 2,
        title: "Quick Start Guide",
        icon: "📄",
        parentId: 1,
        userId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        isDeleted: false
      },
      {
        id: 3,
        title: "Templates",
        icon: "📄",
        parentId: 1,
        userId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        isDeleted: false
      },
      {
        id: 4,
        title: "Project Notes",
        icon: "📝",
        parentId: null,
        userId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        isDeleted: false
      },
      {
        id: 5,
        title: "Personal",
        icon: "🗂️",
        parentId: null,
        userId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        isDeleted: false
      },
      {
        id: 6,
        title: "Daily Journal",
        icon: "📄",
        parentId: 5,
        userId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        isDeleted: false
      },
      {
        id: 7,
        title: "Task List",
        icon: "☑️",
        parentId: 5,
        userId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        isDeleted: false
      }
    ];

    defaultPages.forEach(page => this.pages.set(page.id, page));
    this.currentPageId = 8;

    // Create default blocks for Project Notes page
    const defaultBlocks: Block[] = [
      {
        id: 1,
        pageId: 4,
        type: "text",
        content: { text: "Welcome to your project notes! This is where you can capture ideas, plan features, and track progress on your latest project." },
        position: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 2,
        pageId: 4,
        type: "header",
        content: { text: "Project Overview", level: 2 },
        position: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 3,
        pageId: 4,
        type: "list",
        content: { 
          items: [
            "Define project scope and requirements",
            "Design user interface mockups", 
            "Set up development environment"
          ]
        },
        position: 2,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    defaultBlocks.forEach(block => this.blocks.set(block.id, block));
    this.currentBlockId = 4;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { 
      ...insertUser, 
      id,
      avatar: null
    };
    this.users.set(id, user);
    return user;
  }

  async getPage(id: number): Promise<Page | undefined> {
    const page = this.pages.get(id);
    return page && !page.isDeleted ? page : undefined;
  }

  async getPagesByUserId(userId: number): Promise<Page[]> {
    return Array.from(this.pages.values())
      .filter(page => page.userId === userId && !page.isDeleted);
  }

  async getPagesWithChildren(userId: number): Promise<PageWithChildren[]> {
    const allPages = await this.getPagesByUserId(userId);
    const pageMap = new Map<number, PageWithChildren>();
    
    // Convert to PageWithChildren and create map
    allPages.forEach(page => {
      pageMap.set(page.id, { ...page, children: [] });
    });

    const rootPages: PageWithChildren[] = [];

    // Build hierarchy
    allPages.forEach(page => {
      const pageWithChildren = pageMap.get(page.id)!;
      if (page.parentId) {
        const parent = pageMap.get(page.parentId);
        if (parent) {
          parent.children!.push(pageWithChildren);
        }
      } else {
        rootPages.push(pageWithChildren);
      }
    });

    return rootPages;
  }

  async createPage(page: InsertPage): Promise<Page> {
    const id = this.currentPageId++;
    const now = new Date();
    const newPage: Page = {
      ...page,
      id,
      createdAt: now,
      updatedAt: now,
      isDeleted: false
    };
    this.pages.set(id, newPage);
    return newPage;
  }

  async updatePage(id: number, updates: UpdatePage): Promise<Page | undefined> {
    const page = this.pages.get(id);
    if (!page || page.isDeleted) return undefined;

    const updatedPage: Page = {
      ...page,
      ...updates,
      updatedAt: new Date()
    };
    this.pages.set(id, updatedPage);
    return updatedPage;
  }

  async deletePage(id: number): Promise<boolean> {
    const page = this.pages.get(id);
    if (!page) return false;

    // Soft delete
    const deletedPage: Page = {
      ...page,
      isDeleted: true,
      updatedAt: new Date()
    };
    this.pages.set(id, deletedPage);
    
    // Delete all blocks in this page
    Array.from(this.blocks.values())
      .filter(block => block.pageId === id)
      .forEach(block => this.deleteBlock(block.id));

    return true;
  }

  async searchPages(userId: number, query: string): Promise<Page[]> {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.pages.values())
      .filter(page => 
        page.userId === userId && 
        !page.isDeleted &&
        page.title.toLowerCase().includes(lowerQuery)
      );
  }

  async getBlocksByPageId(pageId: number): Promise<Block[]> {
    return Array.from(this.blocks.values())
      .filter(block => block.pageId === pageId)
      .sort((a, b) => a.position - b.position);
  }

  async createBlock(block: InsertBlock): Promise<Block> {
    const id = this.currentBlockId++;
    const now = new Date();
    const newBlock: Block = {
      ...block,
      id,
      createdAt: now,
      updatedAt: now
    };
    this.blocks.set(id, newBlock);
    return newBlock;
  }

  async updateBlock(id: number, updates: UpdateBlock): Promise<Block | undefined> {
    const block = this.blocks.get(id);
    if (!block) return undefined;

    const updatedBlock: Block = {
      ...block,
      ...updates,
      updatedAt: new Date()
    };
    this.blocks.set(id, updatedBlock);
    return updatedBlock;
  }

  async deleteBlock(id: number): Promise<boolean> {
    return this.blocks.delete(id);
  }

  async reorderBlocks(pageId: number, blockIds: number[]): Promise<boolean> {
    const blocks = await this.getBlocksByPageId(pageId);
    
    blockIds.forEach((blockId, index) => {
      const block = this.blocks.get(blockId);
      if (block && block.pageId === pageId) {
        const updatedBlock: Block = {
          ...block,
          position: index,
          updatedAt: new Date()
        };
        this.blocks.set(blockId, updatedBlock);
      }
    });

    return true;
  }
}

export const storage = new MemStorage();
