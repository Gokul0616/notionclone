import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings, User, Bell, Shield, Palette, LogOut } from "lucide-react";

interface SettingsPageProps {
  workspaceId: number;
}

export default function SettingsPage({ workspaceId }: SettingsPageProps) {
  const { user, logout } = useAuth();

  const { data: workspace } = useQuery({
    queryKey: [`/api/workspaces/${workspaceId}`],
    enabled: !!workspaceId,
  });

  const settingsCards = [
    {
      title: "Profile",
      description: "Manage your personal information",
      icon: User,
      content: (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Email</label>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
          <div>
            <label className="text-sm font-medium">Display Name</label>
            <p className="text-sm text-muted-foreground">{user?.displayName || "Not set"}</p>
          </div>
          <Button variant="outline" size="sm">
            Edit Profile
          </Button>
        </div>
      )
    },
    {
      title: "Notifications",
      description: "Configure your notification preferences",
      icon: Bell,
      content: (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Email notifications</p>
              <p className="text-sm text-muted-foreground">Get notified about page updates</p>
            </div>
            <Button variant="outline" size="sm">
              Configure
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Push notifications</p>
              <p className="text-sm text-muted-foreground">Real-time browser notifications</p>
            </div>
            <Button variant="outline" size="sm">
              Configure
            </Button>
          </div>
        </div>
      )
    },
    {
      title: "Security",
      description: "Manage your account security",
      icon: Shield,
      content: (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Change Password</p>
              <p className="text-sm text-muted-foreground">Update your account password</p>
            </div>
            <Button variant="outline" size="sm">
              Change
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Two-Factor Authentication</p>
              <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
            </div>
            <Badge variant="secondary">Not enabled</Badge>
          </div>
        </div>
      )
    },
    {
      title: "Appearance",
      description: "Customize your workspace appearance",
      icon: Palette,
      content: (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Theme</p>
              <p className="text-sm text-muted-foreground">Choose between light and dark mode</p>
            </div>
            <Button variant="outline" size="sm">
              System
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Font Size</p>
              <p className="text-sm text-muted-foreground">Adjust text size for better readability</p>
            </div>
            <Button variant="outline" size="sm">
              Medium
            </Button>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Settings className="h-5 w-5" />
          <h1 className="text-2xl font-bold">Settings</h1>
        </div>
      </div>

      <div className="grid gap-6 max-w-4xl">
        {workspace && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <span>Workspace Information</span>
                <Badge variant={workspace.type === 'business' ? 'default' : 'secondary'}>
                  {workspace.type}
                </Badge>
              </CardTitle>
              <CardDescription>
                Current workspace details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Name</label>
                  <p className="text-sm text-muted-foreground">{workspace.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <p className="text-sm text-muted-foreground">
                    {workspace.description || "No description"}
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  Edit Workspace
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {settingsCards.map((card) => (
          <Card key={card.title}>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <card.icon className="h-5 w-5" />
                <span>{card.title}</span>
              </CardTitle>
              <CardDescription>
                {card.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {card.content}
            </CardContent>
          </Card>
        ))}

        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-destructive">
              <LogOut className="h-5 w-5" />
              <span>Account</span>
            </CardTitle>
            <CardDescription>
              Manage your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Sign Out</p>
                  <p className="text-sm text-muted-foreground">Sign out of your account</p>
                </div>
                <Button variant="outline" size="sm" onClick={logout}>
                  Sign Out
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}