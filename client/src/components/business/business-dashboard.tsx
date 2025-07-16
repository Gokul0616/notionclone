import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Users, FileText, Activity, Target, Calendar, Mail, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface BusinessMetrics {
  totalUsers: number;
  totalPages: number;
  totalWorkspaces: number;
  activeCollaborators: number;
  pageViews: number;
  editsSinceLastWeek: number;
  collaborationScore: number;
  productivityIndex: number;
}

interface ActivityData {
  date: string;
  pages: number;
  collaborators: number;
  edits: number;
}

interface WorkspaceAnalytics {
  id: number;
  name: string;
  members: number;
  pages: number;
  activity: number;
  lastActive: string;
  plan: string;
}

export default function BusinessDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d">("30d");
  const [selectedWorkspace, setSelectedWorkspace] = useState<number | null>(null);

  const { data: metrics, isLoading: metricsLoading } = useQuery<BusinessMetrics>({
    queryKey: ['/api/business/metrics', timeRange],
  });

  const { data: activityData, isLoading: activityLoading } = useQuery<ActivityData[]>({
    queryKey: ['/api/business/activity', timeRange],
  });

  const { data: workspaceAnalytics, isLoading: workspaceLoading } = useQuery<WorkspaceAnalytics[]>({
    queryKey: ['/api/business/workspace-analytics'],
  });

  const { data: teamPerformance } = useQuery<any>({
    queryKey: ['/api/business/team-performance', selectedWorkspace],
    enabled: !!selectedWorkspace,
  });

  const exportDataMutation = useMutation({
    mutationFn: async (format: 'csv' | 'pdf' | 'xlsx') => {
      const response = await apiRequest('POST', '/api/business/export', { format, timeRange });
      return await response.blob();
    },
    onSuccess: (blob, format) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `business-report-${new Date().toISOString().split('T')[0]}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      toast({
        title: "Export complete",
        description: `Business report exported as ${format.toUpperCase()}`,
      });
    },
  });

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  const pieData = [
    { name: 'Pages', value: metrics?.totalPages || 0 },
    { name: 'Users', value: metrics?.totalUsers || 0 },
    { name: 'Workspaces', value: metrics?.totalWorkspaces || 0 },
  ];

  if (metricsLoading) {
    return <div className="p-8">Loading business dashboard...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Business Dashboard</h1>
          <p className="text-muted-foreground">Enterprise analytics and team performance insights</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            variant="outline"
            onClick={() => exportDataMutation.mutate('pdf')}
            disabled={exportDataMutation.isPending}
          >
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              +12% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Collaborators</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.activeCollaborators}</div>
            <p className="text-xs text-muted-foreground">
              +5% from last week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pages</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalPages}</div>
            <p className="text-xs text-muted-foreground">
              +18% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collaboration Score</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.collaborationScore}%</div>
            <Progress value={metrics?.collaborationScore} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="analytics" className="space-y-4">
        <TabsList>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="workspaces">Workspaces</TabsTrigger>
          <TabsTrigger value="team">Team Performance</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Activity Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={activityData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="pages" stroke="#8884d8" name="Pages" />
                    <Line type="monotone" dataKey="collaborators" stroke="#82ca9d" name="Collaborators" />
                    <Line type="monotone" dataKey="edits" stroke="#ffc658" name="Edits" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resource Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="workspaces" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {workspaceAnalytics?.map((workspace) => (
              <Card key={workspace.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{workspace.name}</CardTitle>
                    <Badge variant={workspace.plan === 'enterprise' ? 'default' : 'secondary'}>
                      {workspace.plan}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Members</span>
                      <span className="font-medium">{workspace.members}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Pages</span>
                      <span className="font-medium">{workspace.pages}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Activity Score</span>
                      <span className="font-medium">{workspace.activity}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Last Active</span>
                      <span className="font-medium">{workspace.lastActive}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="team" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Team Collaboration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Real-time Collaboration</span>
                    <Badge variant="default">Active</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Cursor Tracking</span>
                    <Badge variant="default">Enabled</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Live Comments</span>
                    <Badge variant="default">Enabled</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Version Control</span>
                    <Badge variant="default">Active</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Productivity Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">Team Efficiency</span>
                      <span className="text-sm font-medium">92%</span>
                    </div>
                    <Progress value={92} />
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">Collaboration Quality</span>
                      <span className="text-sm font-medium">88%</span>
                    </div>
                    <Progress value={88} />
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">Response Time</span>
                      <span className="text-sm font-medium">95%</span>
                    </div>
                    <Progress value={95} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Export Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button
                  variant="outline"
                  onClick={() => exportDataMutation.mutate('csv')}
                  disabled={exportDataMutation.isPending}
                >
                  Export as CSV
                </Button>
                <Button
                  variant="outline"
                  onClick={() => exportDataMutation.mutate('xlsx')}
                  disabled={exportDataMutation.isPending}
                >
                  Export as Excel
                </Button>
                <Button
                  variant="outline"
                  onClick={() => exportDataMutation.mutate('pdf')}
                  disabled={exportDataMutation.isPending}
                >
                  Export as PDF
                </Button>
              </div>
              
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-4">Available Reports</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">User Activity Report</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        Detailed analysis of user engagement and productivity metrics
                      </p>
                      <Button variant="outline" size="sm">Generate Report</Button>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Collaboration Analysis</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        Team collaboration patterns and real-time interaction data
                      </p>
                      <Button variant="outline" size="sm">Generate Report</Button>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}