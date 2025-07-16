import { useState, useEffect } from 'react';
import { Router, Route, Switch } from 'wouter';
import { WebSocketAuth } from './components/auth/websocket-auth';
import { BusinessPage } from './components/business/business-page';
import { Workspace } from './pages/workspace';
import { NotFound } from './pages/not-found';
import { useWebSocketAPI } from './hooks/useWebSocketAPI';

interface User {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  theme: string;
  timezone: string;
  language: string;
}

interface AuthState {
  user: User | null;
  workspaces: any[];
  isAuthenticated: boolean;
}

function App() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    workspaces: [],
    isAuthenticated: false
  });
  const [isLoading, setIsLoading] = useState(true);
  const { send, isConnected } = useWebSocketAPI();

  // Check for existing authentication on app load
  useEffect(() => {
    const checkAuth = async () => {
      if (!isConnected) return;
      
      try {
        const response = await send({
          type: 'get_user'
        });

        if (response.data && !response.error) {
          // User is authenticated, get their workspaces
          const workspacesResponse = await send({
            type: 'get_workspaces'
          });

          setAuthState({
            user: response.data,
            workspaces: workspacesResponse.data || [],
            isAuthenticated: true
          });
        }
      } catch (error) {
        console.log('No existing authentication found');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [isConnected, send]);

  // Handle subdomain routing for business pages
  const getSubdomain = () => {
    const hostname = window.location.hostname;
    const parts = hostname.split('.');
    
    // Check if this is a subdomain (not localhost or main domain)
    if (parts.length > 2 && parts[0] !== 'www') {
      return parts[0];
    }
    
    return null;
  };

  const subdomain = getSubdomain();

  // Show business page for subdomain routing
  if (subdomain) {
    return <BusinessPage subdomain={subdomain} />;
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show authentication if not authenticated
  if (!authState.isAuthenticated) {
    return <WebSocketAuth onAuth={setAuthState} />;
  }

  // Show main application
  const handleLogout = () => {
    setAuthState({
      user: null,
      workspaces: [],
      isAuthenticated: false
    });
  };

  return (
    <Router>
      <div className="min-h-screen bg-white">
        <Switch>
          <Route path="/">
            <Workspace 
              user={authState.user} 
              workspaces={authState.workspaces} 
              onLogout={handleLogout} 
            />
          </Route>
          <Route path="/workspace/:id">
            <Workspace 
              user={authState.user} 
              workspaces={authState.workspaces} 
              onLogout={handleLogout} 
            />
          </Route>
          <Route path="/page/:id">
            <Workspace 
              user={authState.user} 
              workspaces={authState.workspaces} 
              onLogout={handleLogout} 
            />
          </Route>
          <Route component={NotFound} />
        </Switch>
      </div>
    </Router>
  );
}

export default App;