import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPageSchema, updatePageSchema, insertBlockSchema, updateBlockSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Page routes
  app.get("/api/pages", async (req, res) => {
    try {
      const userId = 1; // Default user for now
      const pages = await storage.getPagesWithChildren(userId);
      res.json(pages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch pages" });
    }
  });

  app.get("/api/pages/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const page = await storage.getPage(id);
      
      if (!page) {
        return res.status(404).json({ message: "Page not found" });
      }

      res.json(page);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch page" });
    }
  });

  app.post("/api/pages", async (req, res) => {
    try {
      const pageData = insertPageSchema.parse({
        ...req.body,
        userId: 1 // Default user for now
      });
      
      const page = await storage.createPage(pageData);
      res.json(page);
    } catch (error) {
      res.status(400).json({ message: "Invalid page data" });
    }
  });

  app.patch("/api/pages/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = updatePageSchema.parse(req.body);
      
      const page = await storage.updatePage(id, updates);
      
      if (!page) {
        return res.status(404).json({ message: "Page not found" });
      }

      res.json(page);
    } catch (error) {
      res.status(400).json({ message: "Invalid page data" });
    }
  });

  app.delete("/api/pages/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deletePage(id);
      
      if (!success) {
        return res.status(404).json({ message: "Page not found" });
      }

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete page" });
    }
  });

  app.get("/api/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.json([]);
      }

      const userId = 1; // Default user for now
      const pages = await storage.searchPages(userId, query);
      res.json(pages);
    } catch (error) {
      res.status(500).json({ message: "Search failed" });
    }
  });

  // Block routes
  app.get("/api/pages/:pageId/blocks", async (req, res) => {
    try {
      const pageId = parseInt(req.params.pageId);
      const blocks = await storage.getBlocksByPageId(pageId);
      res.json(blocks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch blocks" });
    }
  });

  app.post("/api/pages/:pageId/blocks", async (req, res) => {
    try {
      const pageId = parseInt(req.params.pageId);
      const blockData = insertBlockSchema.parse({
        ...req.body,
        pageId
      });
      
      const block = await storage.createBlock(blockData);
      res.json(block);
    } catch (error) {
      res.status(400).json({ message: "Invalid block data" });
    }
  });

  app.patch("/api/blocks/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = updateBlockSchema.parse(req.body);
      
      const block = await storage.updateBlock(id, updates);
      
      if (!block) {
        return res.status(404).json({ message: "Block not found" });
      }

      res.json(block);
    } catch (error) {
      res.status(400).json({ message: "Invalid block data" });
    }
  });

  app.delete("/api/blocks/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteBlock(id);
      
      if (!success) {
        return res.status(404).json({ message: "Block not found" });
      }

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete block" });
    }
  });

  app.post("/api/pages/:pageId/blocks/reorder", async (req, res) => {
    try {
      const pageId = parseInt(req.params.pageId);
      const { blockIds } = req.body;
      
      const success = await storage.reorderBlocks(pageId, blockIds);
      res.json({ success });
    } catch (error) {
      res.status(500).json({ message: "Failed to reorder blocks" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
