import { useEffect, useState } from 'react';
import { useWebSocketAPI } from '../../hooks/useWebSocketAPI';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { 
  Calendar, 
  Mail, 
  FileText, 
  Users, 
  BarChart3, 
  Settings,
  Building,
  Globe,
  Shield,
  Zap
} from 'lucide-react';

interface BusinessPageProps {
  subdomain: string;
}

export function BusinessPage({ subdomain }: BusinessPageProps) {
  const { send, isConnected, subscribe } = useWebSocketAPI();
  const [businessData, setBusinessData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadBusinessData = async () => {
      try {
        setLoading(true);
        
        // Get business workspace data by subdomain
        const response = await send({
          type: 'get_business_workspace',
          data: { subdomain }
        });

        if (response.error) {
          setError(response.error);
        } else {
          setBusinessData(response.data);
        }
      } catch (err) {
        setError('Failed to load business data');
        console.error('Error loading business data:', err);
      } finally {
        setLoading(false);
      }
    };

    if (isConnected) {
      loadBusinessData();
    }
  }, [isConnected, subdomain, send]);

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribe = subscribe('business_update', (data) => {
      if (data.subdomain === subdomain) {
        setBusinessData(data.businessData);
      }
    });

    return unsubscribe;
  }, [subscribe, subdomain]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading business page...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
            <h2 className="text-red-800 font-semibold mb-2">Error</h2>
            <p className="text-red-600">{error}</p>
            <Button 
              onClick={() => window.location.reload()} 
              className="mt-4"
              variant="outline"
            >
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const businessName = businessData?.name || subdomain;
  const businessType = businessData?.type || 'business';
  const memberCount = businessData?.members?.length || 0;
  const pageCount = businessData?.pages?.length || 0;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Building className="h-8 w-8 text-black" />
                <h1 className="text-2xl font-bold text-black">{businessName}</h1>
              </div>
              <Badge variant="secondary" className="bg-black text-white">
                {businessType}
              </Badge>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Users className="h-4 w-4" />
                <span>{memberCount} members</span>
              </div>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-12">
          <h2 className="text-4xl font-bold text-black mb-4">
            Welcome to {businessName}
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl">
            Your business workspace for collaboration, documentation, and productivity. 
            Access all your team's resources in one place.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <Card className="border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Pages</p>
                  <p className="text-3xl font-bold text-black">{pageCount}</p>
                </div>
                <FileText className="h-8 w-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Team Members</p>
                  <p className="text-3xl font-bold text-black">{memberCount}</p>
                </div>
                <Users className="h-8 w-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Projects</p>
                  <p className="text-3xl font-bold text-black">{Math.ceil(pageCount / 5)}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Uptime</p>
                  <p className="text-3xl font-bold text-black">99.9%</p>
                </div>
                <Zap className="h-8 w-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          <Card className="border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>Calendar & Events</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Manage your team's schedule, meetings, and important dates all in one place.
              </p>
              <Button className="bg-black text-white hover:bg-gray-800">
                View Calendar
              </Button>
            </CardContent>
          </Card>

          <Card className="border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Mail className="h-5 w-5" />
                <span>Email Integration</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Connect your email to automatically sync conversations and create actionable tasks.
              </p>
              <Button className="bg-black text-white hover:bg-gray-800">
                Connect Email
              </Button>
            </CardContent>
          </Card>

          <Card className="border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Document Management</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Create, edit, and collaborate on documents with your team in real-time.
              </p>
              <Button className="bg-black text-white hover:bg-gray-800">
                Browse Documents
              </Button>
            </CardContent>
          </Card>

          <Card className="border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Security & Compliance</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Enterprise-grade security with role-based access controls and audit logs.
              </p>
              <Button className="bg-black text-white hover:bg-gray-800">
                Security Settings
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {businessData?.recentActivity?.length > 0 ? (
                businessData.recentActivity.map((activity: any, index: number) => (
                  <div key={index} className="flex items-center space-x-4 py-3 border-b border-gray-100 last:border-b-0">
                    <div className="w-2 h-2 bg-black rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">{activity.description}</p>
                      <p className="text-xs text-gray-500">{activity.timestamp}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-8">No recent activity</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <footer className="mt-16 py-8 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Globe className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-600">
                {subdomain}.oururl.com
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <button className="text-sm text-gray-600 hover:text-black">
                Privacy Policy
              </button>
              <button className="text-sm text-gray-600 hover:text-black">
                Terms of Service
              </button>
              <button className="text-sm text-gray-600 hover:text-black">
                Support
              </button>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}