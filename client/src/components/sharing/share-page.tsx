import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Copy, Globe, Lock, Users, Eye, Edit, MessageCircle, Download, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ShareSettings {
  id: number;
  shareType: 'public' | 'private' | 'workspace';
  permissions: 'view' | 'edit' | 'comment';
  token: string;
  password?: string;
  expiresAt?: string;
  allowDownload: boolean;
  allowComments: boolean;
  isActive: boolean;
  viewCount: number;
  lastAccessed?: string;
}

interface SharePageProps {
  pageId: number;
  pageTitle: string;
}

export default function SharePage({ pageId, pageTitle }: SharePageProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [sharePassword, setSharePassword] = useState("");
  const [expiryDays, setExpiryDays] = useState<number>(30);

  const { data: shareSettings, isLoading } = useQuery<ShareSettings>({
    queryKey: ['/api/pages/share', pageId],
  });

  const createShareMutation = useMutation({
    mutationFn: async (settings: {
      shareType: string;
      permissions: string;
      password?: string;
      expiryDays?: number;
      allowDownload: boolean;
      allowComments: boolean;
    }) => {
      const response = await apiRequest('POST', `/api/pages/${pageId}/share`, settings);
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['/api/pages/share', pageId], data);
      toast({
        title: "Share link created",
        description: "Page sharing has been enabled successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Sharing failed",
        description: "Failed to create share link. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateShareMutation = useMutation({
    mutationFn: async (settings: Partial<ShareSettings>) => {
      const response = await apiRequest('PATCH', `/api/pages/${pageId}/share`, settings);
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['/api/pages/share', pageId], data);
      toast({
        title: "Share settings updated",
        description: "Sharing preferences have been updated.",
      });
    },
  });

  const revokeShareMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('DELETE', `/api/pages/${pageId}/share`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.setQueryData(['/api/pages/share', pageId], null);
      toast({
        title: "Share link revoked",
        description: "The share link has been disabled.",
      });
    },
  });

  const copyShareLink = () => {
    if (shareSettings?.token) {
      const shareUrl = `${window.location.origin}/shared/${shareSettings.token}`;
      navigator.clipboard.writeText(shareUrl);
      toast({
        title: "Link copied",
        description: "Share link has been copied to clipboard.",
      });
    }
  };

  const getShareTypeIcon = (type: string) => {
    switch (type) {
      case 'public': return <Globe className="h-4 w-4" />;
      case 'workspace': return <Users className="h-4 w-4" />;
      case 'private': return <Lock className="h-4 w-4" />;
      default: return <Globe className="h-4 w-4" />;
    }
  };

  const getPermissionIcon = (permission: string) => {
    switch (permission) {
      case 'view': return <Eye className="h-4 w-4" />;
      case 'edit': return <Edit className="h-4 w-4" />;
      case 'comment': return <MessageCircle className="h-4 w-4" />;
      default: return <Eye className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return <div className="p-6">Loading share settings...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Globe className="h-5 w-5" />
              <span>Share "{pageTitle}"</span>
            </div>
            {shareSettings?.isActive && (
              <Badge variant="default">Active</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {!shareSettings?.isActive ? (
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Share this page with others by creating a shareable link.
              </p>
              
              <Tabs defaultValue="public" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="public">Public</TabsTrigger>
                  <TabsTrigger value="workspace">Workspace</TabsTrigger>
                  <TabsTrigger value="private">Private</TabsTrigger>
                </TabsList>
                
                <TabsContent value="public" className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Globe className="h-4 w-4" />
                      <span className="font-medium">Public on the web</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Anyone with the link can access this page.
                    </p>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="permissions">Permissions</Label>
                        <Select defaultValue="view">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="view">Can view</SelectItem>
                            <SelectItem value="comment">Can comment</SelectItem>
                            <SelectItem value="edit">Can edit</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor="expiry">Expires in</Label>
                        <Select defaultValue="30" onValueChange={(v) => setExpiryDays(parseInt(v))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="7">7 days</SelectItem>
                            <SelectItem value="30">30 days</SelectItem>
                            <SelectItem value="90">90 days</SelectItem>
                            <SelectItem value="365">1 year</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Lock className="h-4 w-4" />
                          <span className="text-sm">Password protection</span>
                        </div>
                        <Switch onCheckedChange={(checked) => setShowPasswordDialog(checked)} />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Download className="h-4 w-4" />
                          <span className="text-sm">Allow download</span>
                        </div>
                        <Switch defaultChecked={false} />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <MessageCircle className="h-4 w-4" />
                          <span className="text-sm">Allow comments</span>
                        </div>
                        <Switch defaultChecked={true} />
                      </div>
                    </div>
                    
                    <Button 
                      onClick={() => createShareMutation.mutate({
                        shareType: 'public',
                        permissions: 'view',
                        expiryDays,
                        allowDownload: false,
                        allowComments: true
                      })}
                      disabled={createShareMutation.isPending}
                      className="w-full"
                    >
                      {createShareMutation.isPending ? 'Creating...' : 'Create Public Link'}
                    </Button>
                  </div>
                </TabsContent>
                
                <TabsContent value="workspace" className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4" />
                      <span className="font-medium">Workspace members only</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Only members of this workspace can access this page.
                    </p>
                    
                    <Button 
                      onClick={() => createShareMutation.mutate({
                        shareType: 'workspace',
                        permissions: 'view',
                        allowDownload: true,
                        allowComments: true
                      })}
                      disabled={createShareMutation.isPending}
                      className="w-full"
                    >
                      {createShareMutation.isPending ? 'Creating...' : 'Share with Workspace'}
                    </Button>
                  </div>
                </TabsContent>
                
                <TabsContent value="private" className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Lock className="h-4 w-4" />
                      <span className="font-medium">Private link</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Only people you invite can access this page.
                    </p>
                    
                    <Button 
                      onClick={() => createShareMutation.mutate({
                        shareType: 'private',
                        permissions: 'view',
                        allowDownload: false,
                        allowComments: true
                      })}
                      disabled={createShareMutation.isPending}
                      className="w-full"
                    >
                      {createShareMutation.isPending ? 'Creating...' : 'Create Private Link'}
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center space-x-3">
                  {getShareTypeIcon(shareSettings.shareType)}
                  <div>
                    <p className="font-medium capitalize">{shareSettings.shareType} Link</p>
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      {getPermissionIcon(shareSettings.permissions)}
                      <span>Can {shareSettings.permissions}</span>
                      {shareSettings.expiresAt && (
                        <>
                          <span>•</span>
                          <Calendar className="h-3 w-3" />
                          <span>Expires {new Date(shareSettings.expiresAt).toLocaleDateString()}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyShareLink}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Link
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => revokeShareMutation.mutate()}
                    disabled={revokeShareMutation.isPending}
                  >
                    Revoke
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">{shareSettings.viewCount}</div>
                  <div className="text-sm text-muted-foreground">Total Views</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">
                    {shareSettings.lastAccessed ? 'Recent' : 'Never'}
                  </div>
                  <div className="text-sm text-muted-foreground">Last Accessed</div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Password Protection</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="share-password">Password</Label>
              <Input
                id="share-password"
                type="password"
                value={sharePassword}
                onChange={(e) => setSharePassword(e.target.value)}
                placeholder="Enter password"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>
                Cancel
              </Button>
              <Button onClick={() => setShowPasswordDialog(false)}>
                Set Password
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}