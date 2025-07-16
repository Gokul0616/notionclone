import { LRUCache } from 'lru-cache';
import type { Page, Block, User, Workspace } from '@shared/schema';

// Production-grade caching system
export class CacheService {
  private pageCache: LRUCache<number, Page>;
  private blockCache: LRUCache<number, Block[]>;
  private userCache: LRUCache<string, User>;
  private workspaceCache: LRUCache<number, Workspace>;
  private workspacePagesCache: LRUCache<number, Page[]>;

  constructor() {
    this.pageCache = new LRUCache<number, Page>({
      max: 1000,
      ttl: 1000 * 60 * 10, // 10 minutes
    });

    this.blockCache = new LRUCache<number, Block[]>({
      max: 500,
      ttl: 1000 * 60 * 5, // 5 minutes
    });

    this.userCache = new LRUCache<string, User>({
      max: 1000,
      ttl: 1000 * 60 * 30, // 30 minutes
    });

    this.workspaceCache = new LRUCache<number, Workspace>({
      max: 200,
      ttl: 1000 * 60 * 15, // 15 minutes
    });

    this.workspacePagesCache = new LRUCache<number, Page[]>({
      max: 200,
      ttl: 1000 * 60 * 5, // 5 minutes
    });
  }

  // Page caching
  getPage(id: number): Page | undefined {
    return this.pageCache.get(id);
  }

  setPage(id: number, page: Page): void {
    this.pageCache.set(id, page);
  }

  invalidatePage(id: number): void {
    this.pageCache.delete(id);
  }

  // Block caching
  getBlocks(pageId: number): Block[] | undefined {
    return this.blockCache.get(pageId);
  }

  setBlocks(pageId: number, blocks: Block[]): void {
    this.blockCache.set(pageId, blocks);
  }

  invalidateBlocks(pageId: number): void {
    this.blockCache.delete(pageId);
  }

  // User caching
  getUser(id: string): User | undefined {
    return this.userCache.get(id);
  }

  setUser(id: string, user: User): void {
    this.userCache.set(id, user);
  }

  invalidateUser(id: string): void {
    this.userCache.delete(id);
  }

  // Workspace caching
  getWorkspace(id: number): Workspace | undefined {
    return this.workspaceCache.get(id);
  }

  setWorkspace(id: number, workspace: Workspace): void {
    this.workspaceCache.set(id, workspace);
  }

  invalidateWorkspace(id: number): void {
    this.workspaceCache.delete(id);
    this.workspacePagesCache.delete(id);
  }

  // Workspace pages caching
  getWorkspacePages(workspaceId: number): Page[] | undefined {
    return this.workspacePagesCache.get(workspaceId);
  }

  setWorkspacePages(workspaceId: number, pages: Page[]): void {
    this.workspacePagesCache.set(workspaceId, pages);
  }

  invalidateWorkspacePages(workspaceId: number): void {
    this.workspacePagesCache.delete(workspaceId);
  }

  // Clear all cache
  clearAll(): void {
    this.pageCache.clear();
    this.blockCache.clear();
    this.userCache.clear();
    this.workspaceCache.clear();
    this.workspacePagesCache.clear();
  }
}

export const cache = new CacheService();