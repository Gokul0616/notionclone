# Notion Clone - Production-Grade Full Stack Application

## Overview

This is a comprehensive, production-grade Notion clone built with React, TypeScript, Express, and PostgreSQL. The application provides an exact replica of Notion's functionality including advanced team workspaces, real-time collaboration with cursor tracking, multi-factor authentication, business analytics, sharing features, template galleries, trash management, and enterprise-level security controls.

## User Preferences

Preferred communication style: Simple, everyday language.
Project Priority: Production-grade quality with perfect implementation of all advanced Notion features.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS with custom Notion-inspired design system
- **UI Components**: Radix UI primitives with shadcn/ui component library
- **State Management**: TanStack Query (React Query) for server state
- **Routing**: Wouter for lightweight client-side routing
- **Build Tool**: Vite for fast development and optimized builds

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ESM modules
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon Database (@neondatabase/serverless)
- **Session Management**: PostgreSQL sessions with connect-pg-simple
- **API Design**: RESTful APIs with proper error handling

### Database Schema
The application uses a comprehensive database schema with 11 tables:
- **users**: User accounts with Replit authentication and profile info
- **workspaces**: Team workspaces with business/personal types and settings
- **workspace_members**: User memberships with role-based access control
- **invitations**: Workspace invitation system with token-based acceptance
- **templates**: Custom and global template system with categories
- **pages**: Hierarchical page structure with workspace organization
- **blocks**: Rich content blocks with flexible JSON content storage
- **comments**: Page and block-level commenting system
- **activities**: Comprehensive activity logging for audit trails
- **notifications**: Real-time notification system for user engagement
- **sessions**: PostgreSQL-backed session storage for authentication

## Key Components

### Core Features
1. **Page Management**: Create, edit, delete, and organize pages in a hierarchical structure
2. **Block Editor**: Rich text editing with multiple block types (text, headers, lists, todos, code)
3. **Sidebar Navigation**: Collapsible sidebar with page tree and search functionality
4. **Command Palette**: Quick page search and navigation (Ctrl/Cmd + K)
5. **Real-time Updates**: Automatic content saving and synchronization

### Block Types
- **Text**: Basic paragraph blocks
- **Headers**: H1, H2, H3 with different styling
- **Lists**: Bullet lists with nested items
- **Todo**: Checkable task items
- **Code**: Syntax-highlighted code blocks

### UI Components
- Custom Notion-inspired design with neutral color palette
- Responsive layout with mobile support
- Toast notifications for user feedback
- Loading states and error handling
- Drag and drop functionality for block reordering

## Data Flow

### Page Operations
1. **Page Creation**: Client → POST /api/pages → Database → UI Update
2. **Page Editing**: Client → PATCH /api/pages/:id → Database → UI Update
3. **Page Deletion**: Client → DELETE /api/pages/:id → Database → UI Update

### Block Operations
1. **Block Creation**: Client → POST /api/blocks → Database → UI Update
2. **Block Updates**: Client → PATCH /api/blocks/:id → Database → UI Update
3. **Block Reordering**: Client → PUT /api/blocks/reorder → Database → UI Update

### Search and Navigation
1. **Page Search**: Client → GET /api/search?q=query → Database → Results
2. **Page Navigation**: Client-side routing with URL state management

## External Dependencies

### Database
- **Neon Database**: Serverless PostgreSQL provider
- **Drizzle ORM**: Type-safe database operations
- **Connection Pooling**: Built-in with Neon serverless driver

### UI Libraries
- **Radix UI**: Accessible component primitives
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library
- **React Hook Form**: Form handling and validation

### Development Tools
- **Vite**: Fast build tool with HMR
- **TypeScript**: Type safety across frontend and backend
- **ESBuild**: Fast JavaScript bundler for production
- **Replit Integration**: Development environment optimization

## Deployment Strategy

### Build Process
1. **Frontend**: Vite builds React app to `dist/public`
2. **Backend**: ESBuild bundles Express server to `dist/index.js`
3. **Database**: Drizzle migrations applied via `drizzle-kit push`

### Environment Setup
- **DATABASE_URL**: PostgreSQL connection string (required)
- **NODE_ENV**: Environment mode (development/production)
- **Session Configuration**: PostgreSQL-backed sessions

### Production Considerations
- Static file serving from Express in production
- Database migrations handled through Drizzle Kit
- Environment-specific configuration for database connections
- Error handling and logging for production debugging

### Development Workflow
- **Hot Module Replacement**: Vite dev server with Express middleware
- **Type Checking**: Shared TypeScript configuration
- **Database Schema**: Centralized in `shared/schema.ts`
- **API Layer**: Consistent request/response handling with React Query

The application follows a modern full-stack architecture with clear separation of concerns, type safety throughout, and optimized for both development experience and production performance.