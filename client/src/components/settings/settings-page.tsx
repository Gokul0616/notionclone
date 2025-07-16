import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trash2, Download, Upload, Mail, Calendar, Bell, User, Shield, Palette } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface UserSettings {
  id: string;
  email: string;
  displayName: string;
  timezone: string;
  theme: string;
  language: string;
  notifications: {
    email: boolean;
    desktop: boolean;
    mentions: boolean;
    comments: boolean;
  };
  privacy: {
    profileVisible: boolean;
    activityVisible: boolean;
  };
}

interface WorkspaceSettings {
  id: number;
  name: string;
  description: string;
  isPublic: boolean;
  allowInvites: boolean;
  defaultPermissions: string;
  features: {
    calendar: boolean;
    email: boolean;
    notifications: boolean;
    templates: boolean;
  };
}

export default function SettingsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("profile");

  const { data: userSettings, isLoading: userLoading } = useQuery<UserSettings>({
    queryKey: ['/api/settings/user'],
  });

  const { data: workspaceSettings, isLoading: workspaceLoading } = useQuery<WorkspaceSettings>({
    queryKey: ['/api/settings/workspace'],
  });

  const updateUserMutation = useMutation({
    mutationFn: async (updates: Partial<UserSettings>) => {
      const response = await apiRequest('PATCH', '/api/settings/user', updates);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Settings updated",
        description: "Your settings have been saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update settings.",
        variant: "destructive",
      });
    },
  });

  const updateWorkspaceMutation = useMutation({
    mutationFn: async (updates: Partial<WorkspaceSettings>) => {
      const response = await apiRequest('PATCH', '/api/settings/workspace', updates);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Workspace updated",
        description: "Workspace settings have been saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update workspace settings.",
        variant: "destructive",
      });
    },
  });

  const exportDataMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/export/workspace');
      return await response.blob();
    },
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `workspace-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({
        title: "Export complete",
        description: "Your workspace data has been exported successfully.",
      });
    },
  });

  if (userLoading || workspaceLoading) {
    return <div className="p-8">Loading settings...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center space-x-2">
        <h1 className="text-2xl font-bold">Settings</h1>
        <Badge variant="secondary">Production</Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="profile" className="flex items-center space-x-2">
            <User className="h-4 w-4" />
            <span>Profile</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center space-x-2">
            <Bell className="h-4 w-4" />
            <span>Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="workspace" className="flex items-center space-x-2">
            <Shield className="h-4 w-4" />
            <span>Workspace</span>
          </TabsTrigger>
          <TabsTrigger value="calendar" className="flex items-center space-x-2">
            <Calendar className="h-4 w-4" />
            <span>Calendar</span>
          </TabsTrigger>
          <TabsTrigger value="email" className="flex items-center space-x-2">
            <Mail className="h-4 w-4" />
            <span>Email</span>
          </TabsTrigger>
          <TabsTrigger value="data" className="flex items-center space-x-2">
            <Download className="h-4 w-4" />
            <span>Data</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Profile Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    defaultValue={userSettings?.displayName}
                    onChange={(e) => updateUserMutation.mutate({ displayName: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    defaultValue={userSettings?.email}
                    onChange={(e) => updateUserMutation.mutate({ email: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select
                    value={userSettings?.timezone}
                    onValueChange={(value) => updateUserMutation.mutate({ timezone: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="America/New_York">Eastern Time</SelectItem>
                      <SelectItem value="America/Chicago">Central Time</SelectItem>
                      <SelectItem value="America/Denver">Mountain Time</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                      <SelectItem value="Europe/London">London</SelectItem>
                      <SelectItem value="Europe/Paris">Paris</SelectItem>
                      <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="theme">Theme</Label>
                  <Select
                    value={userSettings?.theme}
                    onValueChange={(value) => updateUserMutation.mutate({ theme: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select theme" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="email-notifications">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                </div>
                <Switch
                  id="email-notifications"
                  checked={userSettings?.notifications?.email}
                  onCheckedChange={(checked) => 
                    updateUserMutation.mutate({ 
                      notifications: { ...userSettings?.notifications, email: checked } 
                    })
                  }
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="desktop-notifications">Desktop Notifications</Label>
                  <p className="text-sm text-muted-foreground">Show desktop notifications</p>
                </div>
                <Switch
                  id="desktop-notifications"
                  checked={userSettings?.notifications?.desktop}
                  onCheckedChange={(checked) => 
                    updateUserMutation.mutate({ 
                      notifications: { ...userSettings?.notifications, desktop: checked } 
                    })
                  }
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="mention-notifications">Mentions</Label>
                  <p className="text-sm text-muted-foreground">Notify when mentioned</p>
                </div>
                <Switch
                  id="mention-notifications"
                  checked={userSettings?.notifications?.mentions}
                  onCheckedChange={(checked) => 
                    updateUserMutation.mutate({ 
                      notifications: { ...userSettings?.notifications, mentions: checked } 
                    })
                  }
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="comment-notifications">Comments</Label>
                  <p className="text-sm text-muted-foreground">Notify when someone comments</p>
                </div>
                <Switch
                  id="comment-notifications"
                  checked={userSettings?.notifications?.comments}
                  onCheckedChange={(checked) => 
                    updateUserMutation.mutate({ 
                      notifications: { ...userSettings?.notifications, comments: checked } 
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workspace" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Workspace Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="workspace-name">Workspace Name</Label>
                <Input
                  id="workspace-name"
                  defaultValue={workspaceSettings?.name}
                  onChange={(e) => updateWorkspaceMutation.mutate({ name: e.target.value })}
                />
              </div>
              
              <div>
                <Label htmlFor="workspace-description">Description</Label>
                <Input
                  id="workspace-description"
                  defaultValue={workspaceSettings?.description}
                  onChange={(e) => updateWorkspaceMutation.mutate({ description: e.target.value })}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="public-workspace">Public Workspace</Label>
                  <p className="text-sm text-muted-foreground">Allow public access to this workspace</p>
                </div>
                <Switch
                  id="public-workspace"
                  checked={workspaceSettings?.isPublic}
                  onCheckedChange={(checked) => updateWorkspaceMutation.mutate({ isPublic: checked })}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="allow-invites">Allow Invitations</Label>
                  <p className="text-sm text-muted-foreground">Members can invite others</p>
                </div>
                <Switch
                  id="allow-invites"
                  checked={workspaceSettings?.allowInvites}
                  onCheckedChange={(checked) => updateWorkspaceMutation.mutate({ allowInvites: checked })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendar" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Calendar Integration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="calendar-enabled">Enable Calendar</Label>
                  <p className="text-sm text-muted-foreground">Integrate calendar functionality</p>
                </div>
                <Switch
                  id="calendar-enabled"
                  checked={workspaceSettings?.features?.calendar}
                  onCheckedChange={(checked) => 
                    updateWorkspaceMutation.mutate({ 
                      features: { ...workspaceSettings?.features, calendar: checked } 
                    })
                  }
                />
              </div>
              
              <Button className="w-full" variant="outline">
                <Calendar className="h-4 w-4 mr-2" />
                Open Calendar
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Email Integration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="email-enabled">Enable Email</Label>
                  <p className="text-sm text-muted-foreground">Send and receive emails through Gmail</p>
                </div>
                <Switch
                  id="email-enabled"
                  checked={workspaceSettings?.features?.email}
                  onCheckedChange={(checked) => 
                    updateWorkspaceMutation.mutate({ 
                      features: { ...workspaceSettings?.features, email: checked } 
                    })
                  }
                />
              </div>
              
              <Button className="w-full" variant="outline">
                <Mail className="h-4 w-4 mr-2" />
                Connect Gmail Account
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Data Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex space-x-4">
                <Button
                  onClick={() => exportDataMutation.mutate()}
                  disabled={exportDataMutation.isPending}
                  className="flex items-center space-x-2"
                >
                  <Download className="h-4 w-4" />
                  <span>Export Data</span>
                </Button>
                
                <Button variant="outline" className="flex items-center space-x-2">
                  <Upload className="h-4 w-4" />
                  <span>Import Data</span>
                </Button>
              </div>
              
              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold text-destructive mb-2">Danger Zone</h3>
                <Button variant="destructive" className="flex items-center space-x-2">
                  <Trash2 className="h-4 w-4" />
                  <span>Delete Workspace</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}