import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { 
  Share2, 
  Mail, 
  Link, 
  Users, 
  Eye, 
  Edit, 
  UserPlus, 
  Copy,
  Check,
  Globe,
  Lock
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ShareDialogProps {
  pageId?: number;
  workspaceId: number;
  trigger?: React.ReactNode;
}

export default function ShareDialog({ pageId, workspaceId, trigger }: ShareDialogProps) {
  const [open, setOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("viewer");
  const [linkPermission, setLinkPermission] = useState("restricted");
  const [copiedLink, setCopiedLink] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: members } = useQuery({
    queryKey: [`/api/workspaces/${workspaceId}/members`],
    enabled: open && !!workspaceId,
  });

  const { data: invitations } = useQuery({
    queryKey: [`/api/workspaces/${workspaceId}/invitations`],
    enabled: open && !!workspaceId,
  });

  const inviteMemberMutation = useMutation({
    mutationFn: async (inviteData: { email: string; role: string }) => {
      const response = await apiRequest("POST", `/api/workspaces/${workspaceId}/invitations`, {
        email: inviteData.email,
        role: inviteData.role,
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${workspaceId}/invitations`] });
      setInviteEmail("");
      toast({
        title: "Invitation sent",
        description: "The invitation has been sent successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send invitation",
        variant: "destructive",
      });
    },
  });

  const handleInviteMember = () => {
    if (!inviteEmail) return;
    inviteMemberMutation.mutate({ email: inviteEmail, role: inviteRole });
  };

  const handleCopyLink = async () => {
    const baseUrl = window.location.origin;
    const shareUrl = pageId 
      ? `${baseUrl}/page/${pageId}` 
      : `${baseUrl}/workspace/${workspaceId}`;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
      toast({
        title: "Link copied",
        description: "Share link has been copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy link",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Share {pageId ? "Page" : "Workspace"}</DialogTitle>
          <DialogDescription>
            Invite people to collaborate or share a link
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="invite" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="invite">Invite People</TabsTrigger>
            <TabsTrigger value="link">Share Link</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
          </TabsList>
          
          <TabsContent value="invite" className="space-y-4">
            <div className="space-y-4">
              <div className="flex space-x-2">
                <div className="flex-1">
                  <Input
                    placeholder="Enter email address"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleInviteMember()}
                  />
                </div>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">
                      <div className="flex items-center space-x-2">
                        <Eye className="h-4 w-4" />
                        <span>Viewer</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="editor">
                      <div className="flex items-center space-x-2">
                        <Edit className="h-4 w-4" />
                        <span>Editor</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="admin">
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4" />
                        <span>Admin</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  onClick={handleInviteMember}
                  disabled={!inviteEmail || inviteMemberMutation.isPending}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite
                </Button>
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">PERMISSION LEVELS</Label>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <Eye className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Viewer:</span>
                    <span className="text-muted-foreground">Can view and comment</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Edit className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Editor:</span>
                    <span className="text-muted-foreground">Can view, comment, and edit</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Admin:</span>
                    <span className="text-muted-foreground">Full access including sharing</span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="link" className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Link sharing</Label>
                <Switch 
                  checked={linkPermission !== "restricted"}
                  onCheckedChange={(checked) => 
                    setLinkPermission(checked ? "viewer" : "restricted")
                  }
                />
              </div>
              
              {linkPermission !== "restricted" && (
                <>
                  <div className="space-y-2">
                    <Label>Anyone with the link</Label>
                    <Select value={linkPermission} onValueChange={setLinkPermission}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="viewer">
                          <div className="flex items-center space-x-2">
                            <Eye className="h-4 w-4" />
                            <span>Can view</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="editor">
                          <div className="flex items-center space-x-2">
                            <Edit className="h-4 w-4" />
                            <span>Can edit</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Input
                      readOnly
                      value={`${window.location.origin}${pageId ? `/page/${pageId}` : `/workspace/${workspaceId}`}`}
                      className="flex-1"
                    />
                    <Button variant="outline" onClick={handleCopyLink}>
                      {copiedLink ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </>
              )}
              
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                {linkPermission === "restricted" ? (
                  <>
                    <Lock className="h-4 w-4" />
                    <span>Only people with access can open with this link</span>
                  </>
                ) : (
                  <>
                    <Globe className="h-4 w-4" />
                    <span>Anyone on the internet with this link can {linkPermission === "viewer" ? "view" : "edit"}</span>
                  </>
                )}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="members" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">WORKSPACE MEMBERS</Label>
                <div className="space-y-2 mt-2">
                  {members?.map((member: any, index: number) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                          {member.userId.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{member.userId}</p>
                          <p className="text-xs text-muted-foreground">
                            Joined {new Date(member.joinedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Badge variant={member.role === 'owner' ? 'default' : 'secondary'}>
                        {member.role}
                      </Badge>
                    </div>
                  )) || (
                    <p className="text-sm text-muted-foreground">No members found</p>
                  )}
                </div>
              </div>
              
              {invitations && invitations.length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground">PENDING INVITATIONS</Label>
                  <div className="space-y-2 mt-2">
                    {invitations.map((invite: any, index: number) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{invite.email}</p>
                            <p className="text-xs text-muted-foreground">
                              Invited {new Date(invite.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline">Pending</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}