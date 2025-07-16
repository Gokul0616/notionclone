import { useState, useEffect } from 'react';
import { useWebSocketAPI } from '../../hooks/useWebSocketAPI';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { 
  Plus, 
  FileText, 
  Search, 
  Settings, 
  Users, 
  LogOut,
  Building,
  Home,
  Star,
  Archive,
  Trash2
} from 'lucide-react';

interface User {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
}

interface Workspace {
  id: number;
  name: string;
  type: string;
  description: string;
  icon: string;
  plan: string;
}

interface Page {
  id: number;
  title: string;
  workspaceId: number;
  createdAt: number;
  updatedAt: number;
}

interface MainWorkspaceProps {
  user: User;
  workspaces: Workspace[];
  onLogout: () => void;
}

export function MainWorkspace({ user, workspaces, onLogout }: MainWorkspaceProps) {
  const { send, isConnected, subscribe } = useWebSocketAPI();
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(false);
  const [newPageTitle, setNewPageTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Set default workspace
  useEffect(() => {
    if (workspaces.length > 0 && !selectedWorkspace) {
      setSelectedWorkspace(workspaces[0]);
    }
  }, [workspaces, selectedWorkspace]);

  // Load pages when workspace changes
  useEffect(() => {
    if (selectedWorkspace && isConnected) {
      loadPages();
    }
  }, [selectedWorkspace, isConnected]);

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribePageCreated = subscribe('page_created', (page: Page) => {
      if (selectedWorkspace && page.workspaceId === selectedWorkspace.id) {
        setPages(prev => [...prev, page]);
      }
    });

    const unsubscribePageUpdated = subscribe('page_updated', (page: Page) => {
      if (selectedWorkspace && page.workspaceId === selectedWorkspace.id) {
        setPages(prev => prev.map(p => p.id === page.id ? page : p));
      }
    });

    const unsubscribePageDeleted = subscribe('page_deleted', (data: { id: number }) => {
      setPages(prev => prev.filter(p => p.id !== data.id));
    });

    return () => {
      unsubscribePageCreated();
      unsubscribePageUpdated();
      unsubscribePageDeleted();
    };
  }, [subscribe, selectedWorkspace]);

  const loadPages = async () => {
    if (!selectedWorkspace) return;
    
    setLoading(true);
    try {
      const response = await send({
        type: 'get_pages',
        data: { workspaceId: selectedWorkspace.id }
      });
      
      if (response.data) {
        setPages(response.data);
      }
    } catch (error) {
      console.error('Error loading pages:', error);
    } finally {
      setLoading(false);
    }
  };

  const createPage = async () => {
    if (!selectedWorkspace || !newPageTitle.trim()) return;

    try {
      const response = await send({
        type: 'create_page',
        data: {
          title: newPageTitle,
          workspaceId: selectedWorkspace.id,
          content: '[]',
          status: 'draft'
        }
      });

      if (response.data) {
        setNewPageTitle('');
        // Page will be added via WebSocket subscription
      }
    } catch (error) {
      console.error('Error creating page:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await send({ type: 'auth_logout' });
      onLogout();
    } catch (error) {
      console.error('Error logging out:', error);
      onLogout(); // Logout anyway
    }
  };

  const filteredPages = pages.filter(page => 
    page.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-white flex">
      {/* Sidebar */}
      <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-xl font-bold text-black">MindTracker</h1>
          <p className="text-sm text-gray-600">Welcome, {user.firstName}!</p>
        </div>

        {/* Workspace Selector */}
        <div className="p-4 border-b border-gray-200">
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Workspace
            </p>
            {workspaces.map(workspace => (
              <button
                key={workspace.id}
                onClick={() => setSelectedWorkspace(workspace)}
                className={`w-full flex items-center space-x-3 p-2 rounded-md text-left transition-colors ${
                  selectedWorkspace?.id === workspace.id 
                    ? 'bg-black text-white' 
                    : 'text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span className="text-lg">{workspace.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{workspace.name}</p>
                  <p className="text-xs opacity-75">{workspace.type}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 p-4">
          <div className="space-y-1">
            <button className="w-full flex items-center space-x-3 p-2 rounded-md text-gray-700 hover:bg-gray-200 transition-colors">
              <Home className="h-4 w-4" />
              <span className="text-sm">Home</span>
            </button>
            <button className="w-full flex items-center space-x-3 p-2 rounded-md text-gray-700 hover:bg-gray-200 transition-colors">
              <Star className="h-4 w-4" />
              <span className="text-sm">Favorites</span>
            </button>
            <button className="w-full flex items-center space-x-3 p-2 rounded-md text-gray-700 hover:bg-gray-200 transition-colors">
              <Archive className="h-4 w-4" />
              <span className="text-sm">Archived</span>
            </button>
            <button className="w-full flex items-center space-x-3 p-2 rounded-md text-gray-700 hover:bg-gray-200 transition-colors">
              <Trash2 className="h-4 w-4" />
              <span className="text-sm">Trash</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {user.firstName.charAt(0)}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{user.username}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
              </div>
            </div>
            <Button 
              onClick={handleLogout}
              variant="ghost" 
              size="sm"
              className="text-gray-600 hover:text-black"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="h-16 border-b border-gray-200 flex items-center justify-between px-6">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">{selectedWorkspace?.icon}</span>
              <h2 className="text-xl font-semibold text-black">{selectedWorkspace?.name}</h2>
              <Badge variant="secondary" className="text-xs">
                {selectedWorkspace?.plan}
              </Badge>
            </div>
            <div className={`flex items-center space-x-2 ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-xs">{isConnected ? 'Connected' : 'Disconnected'}</span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search pages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-64 border-gray-300 focus:ring-black focus:border-black"
              />
            </div>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6">
          {selectedWorkspace ? (
            <div className="max-w-4xl mx-auto">
              {/* Create Page */}
              <Card className="mb-6 border-gray-200">
                <CardHeader>
                  <CardTitle className="text-lg">Create New Page</CardTitle>
                  <CardDescription>Add a new page to your workspace</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex space-x-4">
                    <Input
                      placeholder="Page title..."
                      value={newPageTitle}
                      onChange={(e) => setNewPageTitle(e.target.value)}
                      className="flex-1 border-gray-300 focus:ring-black focus:border-black"
                      onKeyPress={(e) => e.key === 'Enter' && createPage()}
                    />
                    <Button 
                      onClick={createPage}
                      disabled={!newPageTitle.trim()}
                      className="bg-black text-white hover:bg-gray-800"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Page
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Pages List */}
              <Card className="border-gray-200">
                <CardHeader>
                  <CardTitle className="text-lg">Pages</CardTitle>
                  <CardDescription>
                    {filteredPages.length} page{filteredPages.length !== 1 ? 's' : ''} in {selectedWorkspace.name}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
                    </div>
                  ) : filteredPages.length > 0 ? (
                    <div className="space-y-3">
                      {filteredPages.map(page => (
                        <div key={page.id} className="flex items-center space-x-3 p-3 rounded-md border border-gray-200 hover:bg-gray-50 transition-colors">
                          <FileText className="h-5 w-5 text-gray-400" />
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-900">{page.title}</h3>
                            <p className="text-sm text-gray-500">
                              Updated {new Date(page.updatedAt).toLocaleDateString()}
                            </p>
                          </div>
                          <Button variant="ghost" size="sm">
                            Open
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No pages yet</h3>
                      <p className="text-gray-500">Create your first page to get started.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500">Select a workspace to get started</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}