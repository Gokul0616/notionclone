import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Settings, 
  Users, 
  Shield, 
  Bell, 
  Trash2,
  Crown,
  AlertTriangle,
  Save,
  UserPlus,
  Mail
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import MFASetup from "@/components/auth/mfa-setup";
import TrashManager from "@/components/trash/trash-manager";

interface WorkspaceSettingsProps {
  workspaceId: number;
}

export default function WorkspaceSettings({ workspaceId }: WorkspaceSettingsProps) {
  const [activeTab, setActiveTab] = useState("general");
  const [workspaceData, setWorkspaceData] = useState({
    name: "",
    description: "",
    isPublic: false,
    allowGuestAccess: false,
    requireTwoFactor: false
  });
  const [showMFASetup, setShowMFASetup] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: workspace } = useQuery({
    queryKey: [`/api/workspaces/${workspaceId}`],
    enabled: !!workspaceId,
    onSuccess: (data) => {
      setWorkspaceData({
        name: data.name || "",
        description: data.description || "",
        isPublic: data.isPublic || false,
        allowGuestAccess: data.allowGuestAccess || false,
        requireTwoFactor: data.requireTwoFactor || false
      });
    }
  });

  const { data: members } = useQuery({
    queryKey: [`/api/workspaces/${workspaceId}/members`],
    enabled: !!workspaceId,
  });

  const { data: invitations } = useQuery({
    queryKey: [`/api/workspaces/${workspaceId}/invitations`],
    enabled: !!workspaceId,
  });

  const updateWorkspaceMutation = useMutation({
    mutationFn: async (updates: Partial<typeof workspaceData>) => {
      return await apiRequest(`/api/workspaces/${workspaceId}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${workspaceId}`] });
      toast({
        title: "Settings saved",
        description: "Workspace settings have been updated",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update workspace settings",
        variant: "destructive",
      });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest(`/api/workspaces/${workspaceId}/members/${userId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${workspaceId}/members`] });
      toast({
        title: "Member removed",
        description: "The member has been removed from the workspace",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove member",
        variant: "destructive",
      });
    },
  });

  const deleteWorkspaceMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/workspaces/${workspaceId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workspaces"] });
      toast({
        title: "Workspace deleted",
        description: "The workspace has been permanently deleted",
      });
      // Redirect to home or workspace selector
      window.location.href = "/";
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete workspace",
        variant: "destructive",
      });
    },
  });

  const handleSaveSettings = () => {
    updateWorkspaceMutation.mutate(workspaceData);
  };

  const handleMFAComplete = (backupCodes: string[]) => {
    setShowMFASetup(false);
    toast({
      title: "Multi-factor authentication enabled",
      description: "Your account is now more secure",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Workspace Settings</h2>
          <p className="text-muted-foreground">
            Manage your workspace configuration and security
          </p>
        </div>
        {workspace?.type === 'business' && (
          <Badge variant="default" className="flex items-center space-x-1">
            <Crown className="h-3 w-3" />
            <span>Business Plan</span>
          </Badge>
        )}
      </div>

      {showMFASetup && (
        <Card>
          <CardContent className="p-6">
            <MFASetup onComplete={handleMFAComplete} />
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="trash">Trash</TabsTrigger>
        </TabsList>
        
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>
                Basic information about your workspace
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="workspace-name">Workspace Name</Label>
                <Input
                  id="workspace-name"
                  value={workspaceData.name}
                  onChange={(e) => setWorkspaceData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="My Awesome Workspace"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="workspace-description">Description</Label>
                <Textarea
                  id="workspace-description"
                  value={workspaceData.description}
                  onChange={(e) => setWorkspaceData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="What's this workspace for?"
                  rows={3}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Public Workspace</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow anyone to discover and request access
                  </p>
                </div>
                <Switch
                  checked={workspaceData.isPublic}
                  onCheckedChange={(checked) => setWorkspaceData(prev => ({ ...prev, isPublic: checked }))}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Guest Access</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow external collaborators without accounts
                  </p>
                </div>
                <Switch
                  checked={workspaceData.allowGuestAccess}
                  onCheckedChange={(checked) => setWorkspaceData(prev => ({ ...prev, allowGuestAccess: checked }))}
                />
              </div>
              
              <Button onClick={handleSaveSettings} disabled={updateWorkspaceMutation.isPending}>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="members" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Workspace Members</CardTitle>
              <CardDescription>
                Manage who has access to your workspace
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                {members?.map((member: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                        {member.userId.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium">{member.userId}</p>
                        <p className="text-sm text-muted-foreground">
                          Joined {new Date(member.joinedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={member.role === 'owner' ? 'default' : 'secondary'}>
                        {member.role}
                      </Badge>
                      {member.role !== 'owner' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMemberMutation.mutate(member.userId)}
                          disabled={removeMemberMutation.isPending}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                )) || (
                  <p className="text-muted-foreground">No members found</p>
                )}
              </div>
              
              {invitations && invitations.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">PENDING INVITATIONS</Label>
                  {invitations.map((invite: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
                      <div className="flex items-center space-x-3">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{invite.email}</p>
                          <p className="text-sm text-muted-foreground">
                            Invited {new Date(invite.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline">Pending</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>
                Protect your workspace with advanced security features
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Require Two-Factor Authentication</Label>
                  <p className="text-sm text-muted-foreground">
                    All members must enable 2FA to access this workspace
                  </p>
                </div>
                <Switch
                  checked={workspaceData.requireTwoFactor}
                  onCheckedChange={(checked) => setWorkspaceData(prev => ({ ...prev, requireTwoFactor: checked }))}
                />
              </div>
              
              <Button 
                variant="outline" 
                onClick={() => setShowMFASetup(true)}
                className="w-full"
              >
                <Shield className="h-4 w-4 mr-2" />
                Set Up Multi-Factor Authentication
              </Button>
              
              {workspace?.type === 'business' && (
                <div className="space-y-4 pt-4 border-t">
                  <h4 className="font-medium">Business Security Features</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Single Sign-On (SSO)</Label>
                        <p className="text-sm text-muted-foreground">
                          Connect with your organization's identity provider
                        </p>
                      </div>
                      <Badge variant="secondary">Available</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Advanced Audit Logs</Label>
                        <p className="text-sm text-muted-foreground">
                          Detailed activity tracking and compliance reporting
                        </p>
                      </div>
                      <Badge variant="secondary">Enabled</Badge>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>
                Control how and when you receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive updates about workspace activity via email
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Browser Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Show desktop notifications for real-time updates
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Weekly Summary</Label>
                    <p className="text-sm text-muted-foreground">
                      Get a weekly digest of workspace activity
                    </p>
                  </div>
                  <Switch />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="trash" className="space-y-4">
          <TrashManager workspaceId={workspaceId} />
        </TabsContent>
      </Tabs>

      {/* Danger Zone */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-700">Danger Zone</CardTitle>
          <CardDescription>
            Irreversible actions that will permanently affect your workspace
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-700">
              Deleting your workspace will permanently remove all pages, files, and data. 
              This action cannot be undone.
            </AlertDescription>
          </Alert>
          <Button
            variant="destructive"
            className="mt-4"
            onClick={() => {
              if (window.confirm('Are you sure you want to delete this workspace? This action cannot be undone.')) {
                deleteWorkspaceMutation.mutate();
              }
            }}
            disabled={deleteWorkspaceMutation.isPending}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Workspace
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}