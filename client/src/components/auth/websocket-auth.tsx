import { useState, useEffect } from 'react';
import { useWebSocketAPI } from '../../hooks/useWebSocketAPI';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Alert, AlertDescription } from '../ui/alert';
import { Loader2, Wifi, WifiOff } from 'lucide-react';

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

interface WebSocketAuthProps {
  onAuth: (authState: AuthState) => void;
}

export function WebSocketAuth({ onAuth }: WebSocketAuthProps) {
  const { send, isConnected, isReconnecting } = useWebSocketAPI();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loginData, setLoginData] = useState({
    usernameOrEmail: '',
    password: ''
  });
  const [registerData, setRegisterData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    password: ''
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected) {
      setError('Not connected to server. Please wait...');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await send({
        type: 'auth_login',
        data: loginData
      });

      if (response.error) {
        setError(response.error);
      } else {
        onAuth({
          user: response.data.user,
          workspaces: response.data.workspaces,
          isAuthenticated: true
        });
      }
    } catch (err) {
      setError('Login failed. Please try again.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected) {
      setError('Not connected to server. Please wait...');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await send({
        type: 'auth_register',
        data: registerData
      });

      if (response.error) {
        setError(response.error);
      } else {
        onAuth({
          user: response.data.user,
          workspaces: response.data.workspaces,
          isAuthenticated: true
        });
      }
    } catch (err) {
      setError('Registration failed. Please try again.');
      console.error('Registration error:', err);
    } finally {
      setLoading(false);
    }
  };

  const ConnectionStatus = () => {
    if (isReconnecting) {
      return (
        <div className="flex items-center space-x-2 text-yellow-600 bg-yellow-50 p-3 rounded-md border border-yellow-200">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Reconnecting to server...</span>
        </div>
      );
    }

    if (!isConnected) {
      return (
        <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-md border border-red-200">
          <WifiOff className="h-4 w-4" />
          <span className="text-sm">Disconnected from server</span>
        </div>
      );
    }

    return (
      <div className="flex items-center space-x-2 text-green-600 bg-green-50 p-3 rounded-md border border-green-200">
        <Wifi className="h-4 w-4" />
        <span className="text-sm">Connected to server</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-gray-200">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-black">Welcome to MindTracker</CardTitle>
          <CardDescription className="text-gray-600">
            Sign in to your account or create a new one
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ConnectionStatus />
          
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertDescription className="text-red-700">{error}</AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-gray-100">
              <TabsTrigger value="login" className="text-black data-[state=active]:bg-white data-[state=active]:text-black">
                Sign In
              </TabsTrigger>
              <TabsTrigger value="register" className="text-black data-[state=active]:bg-white data-[state=active]:text-black">
                Sign Up
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-4">
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label htmlFor="usernameOrEmail" className="text-black">Username or Email</Label>
                  <Input
                    id="usernameOrEmail"
                    type="text"
                    value={loginData.usernameOrEmail}
                    onChange={(e) => setLoginData({...loginData, usernameOrEmail: e.target.value})}
                    placeholder="Enter your username or email"
                    className="border-gray-300 focus:ring-black focus:border-black"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="password" className="text-black">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={loginData.password}
                    onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                    placeholder="Enter your password"
                    className="border-gray-300 focus:ring-black focus:border-black"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading || !isConnected}
                  className="w-full bg-black text-white hover:bg-gray-800 disabled:bg-gray-300"
                >
                  {loading ? (
                    <div className="flex items-center space-x-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Signing in...</span>
                    </div>
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </form>

              <div className="text-center text-sm text-gray-600">
                <p>Demo credentials:</p>
                <p className="font-mono text-xs">admin@mindtracker.com / admin123</p>
              </div>
            </TabsContent>

            <TabsContent value="register" className="space-y-4">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName" className="text-black">First Name</Label>
                    <Input
                      id="firstName"
                      type="text"
                      value={registerData.firstName}
                      onChange={(e) => setRegisterData({...registerData, firstName: e.target.value})}
                      placeholder="First name"
                      className="border-gray-300 focus:ring-black focus:border-black"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName" className="text-black">Last Name</Label>
                    <Input
                      id="lastName"
                      type="text"
                      value={registerData.lastName}
                      onChange={(e) => setRegisterData({...registerData, lastName: e.target.value})}
                      placeholder="Last name"
                      className="border-gray-300 focus:ring-black focus:border-black"
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="email" className="text-black">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={registerData.email}
                    onChange={(e) => setRegisterData({...registerData, email: e.target.value})}
                    placeholder="Enter your email"
                    className="border-gray-300 focus:ring-black focus:border-black"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="username" className="text-black">Username</Label>
                  <Input
                    id="username"
                    type="text"
                    value={registerData.username}
                    onChange={(e) => setRegisterData({...registerData, username: e.target.value})}
                    placeholder="Choose a username"
                    className="border-gray-300 focus:ring-black focus:border-black"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="registerPassword" className="text-black">Password</Label>
                  <Input
                    id="registerPassword"
                    type="password"
                    value={registerData.password}
                    onChange={(e) => setRegisterData({...registerData, password: e.target.value})}
                    placeholder="Create a password"
                    className="border-gray-300 focus:ring-black focus:border-black"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading || !isConnected}
                  className="w-full bg-black text-white hover:bg-gray-800 disabled:bg-gray-300"
                >
                  {loading ? (
                    <div className="flex items-center space-x-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Creating account...</span>
                    </div>
                  ) : (
                    'Create Account'
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}