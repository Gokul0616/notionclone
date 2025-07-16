import Database from 'better-sqlite3';

// Create database and tables directly
const db = new Database('notion_clone.db');

console.log('Initializing SQLite database...');

// Create users table
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY NOT NULL,
    email TEXT UNIQUE,
    first_name TEXT,
    last_name TEXT,
    profile_image_url TEXT,
    username TEXT UNIQUE,
    password TEXT,
    preferences TEXT,
    timezone TEXT DEFAULT 'UTC',
    theme TEXT DEFAULT 'system',
    language TEXT DEFAULT 'en',
    notifications TEXT DEFAULT '{"email":true,"desktop":true,"mentions":true,"comments":true}',
    privacy TEXT DEFAULT '{"profileVisible":true,"activityVisible":true}',
    gmail_refresh_token TEXT,
    gmail_access_token TEXT,
    gmail_token_expiry INTEGER,
    created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
    updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
  )
`);

// Create workspaces table
db.exec(`
  CREATE TABLE IF NOT EXISTS workspaces (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'personal',
    description TEXT,
    icon TEXT DEFAULT '🏢',
    domain TEXT UNIQUE,
    owner_id TEXT NOT NULL,
    plan TEXT DEFAULT 'free',
    settings TEXT,
    created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
    updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
  )
`);

// Create pages table
db.exec(`
  CREATE TABLE IF NOT EXISTS pages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    icon TEXT DEFAULT '📄',
    cover TEXT,
    parent_id INTEGER,
    workspace_id INTEGER NOT NULL,
    created_by TEXT NOT NULL,
    last_edited_by TEXT,
    is_public INTEGER DEFAULT 0,
    public_id TEXT UNIQUE,
    permissions TEXT,
    properties TEXT,
    is_template INTEGER DEFAULT 0,
    template_id INTEGER,
    is_favorite INTEGER DEFAULT 0,
    is_archived INTEGER DEFAULT 0,
    is_deleted INTEGER DEFAULT 0,
    deleted_at INTEGER,
    created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
    updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
  )
`);

// Create blocks table
db.exec(`
  CREATE TABLE IF NOT EXISTS blocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    page_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    content TEXT,
    position INTEGER NOT NULL,
    parent_id INTEGER,
    properties TEXT,
    created_by TEXT NOT NULL,
    last_edited_by TEXT,
    created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
    updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
  )
`);

// Create workspace_members table
db.exec(`
  CREATE TABLE IF NOT EXISTS workspace_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workspace_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL,
    permissions TEXT,
    joined_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
  )
`);

// Create sessions table
db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    sid TEXT PRIMARY KEY,
    sess TEXT NOT NULL,
    expire INTEGER NOT NULL
  )
`);

console.log('Database initialized successfully!');
db.close();