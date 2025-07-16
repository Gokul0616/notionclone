import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Plus,
  Building2,
  Users,
  Settings,
  Crown,
  Star,
  ChevronDown,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertWorkspaceSchema } from "@shared/schema";

import { useAuth } from "@/hooks/useAuth";

interface WorkspaceSelectorProps {
  currentWorkspaceId?: number;
  onWorkspaceChange: (workspaceId: number) => void;
}

export default function WorkspaceSelector({
  currentWorkspaceId,
  onWorkspaceChange,
}: WorkspaceSelectorProps) {
  // Get the current user's ID from the useAuth hook
  const { user } = useAuth();
  const ownerId = user?.id; // Ensure this is a string as per the schema

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newWorkspace, setNewWorkspace] = useState({
    name: "",
    description: "",
    type: "personal",
    ownerId: ownerId || "", // Initialize with ownerId
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: workspaces, isLoading } = useQuery({
    queryKey: ["/api/workspaces"],
  });

  const { data: currentWorkspace } = useQuery({
    queryKey: [`/api/workspaces/${currentWorkspaceId}`],
    enabled: !!currentWorkspaceId,
  });

  const createWorkspaceMutation = useMutation({
    mutationFn: async (workspaceData: typeof newWorkspace) => {
      console.log("=== CLIENT: Creating workspace ===");
      console.log("Workspace data:", JSON.stringify(workspaceData, null, 2));
      console.log("Current user:", user);
      
      const response = await apiRequest("POST", "/api/workspaces", workspaceData);
      const workspace = await response.json();
      
      console.log("Workspace creation response:", workspace);
      return workspace;
    },
    onSuccess: (workspace) => {
      console.log("Workspace created successfully:", workspace);
      queryClient.invalidateQueries({ queryKey: ["/api/workspaces"] });
      setShowCreateDialog(false);
      setNewWorkspace({
        name: "",
        description: "",
        type: "personal",
        ownerId: ownerId || "",
      });
      onWorkspaceChange(workspace.id);
      toast({
        title: "Success",
        description: "Workspace created successfully",
      });
    },
    onError: (error: any) => {
      console.error("=== CLIENT: Workspace creation error ===");
      console.error("Error object:", error);
      console.error("Error message:", error.message);
      console.error("Error details:", error.details);
      
      let errorMessage = "Failed to create workspace";
      
      if (error.details) {
        if (Array.isArray(error.details)) {
          // Zod validation errors
          errorMessage = error.details.map((e: any) => e.message).join(", ");
        } else {
          errorMessage = error.details;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleCreateWorkspace = () => {
    console.log("=== CLIENT: Handle create workspace ===");
    console.log("Current user:", user);
    console.log("Owner ID:", ownerId);
    console.log("New workspace data:", newWorkspace);
    
    if (!ownerId) {
      console.error("No owner ID available");
      toast({
        title: "Error",
        description: "User ID is not available. Please log in.",
        variant: "destructive",
      });
      return;
    }

    if (!newWorkspace.name || newWorkspace.name.trim() === "") {
      console.error("Workspace name is required");
      toast({
        title: "Error",
        description: "Workspace name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      const workspaceData = {
        ...newWorkspace,
        ownerId: ownerId,
        name: newWorkspace.name.trim(),
      };
      
      console.log("Validating workspace data:", workspaceData);
      const validatedData = insertWorkspaceSchema.parse(workspaceData);
      console.log("Validation successful, creating workspace");
      
      createWorkspaceMutation.mutate(validatedData);
    } catch (error: any) {
      console.error("Validation error:", error);
      
      let errorMessage = "Please fill in all required fields";
      if (error.errors) {
        errorMessage = error.errors.map((e: any) => e.message).join(", ");
      }
      
      toast({
        title: "Validation Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return <div className="h-10 bg-muted animate-pulse rounded-md"></div>;
  }

  return (
    <div className="flex items-center space-x-2">
      {/* Current Workspace Display */}
      <Select
        value={currentWorkspaceId?.toString()}
        onValueChange={(value) => onWorkspaceChange(parseInt(value))}
      >
        <SelectTrigger className="w-[280px]">
          <SelectValue>
            <div className="flex items-center space-x-2">
              <Building2 className="h-4 w-4" />
              <span className="truncate">
                {currentWorkspace?.name || "Select Workspace"}
              </span>
              {currentWorkspace?.type === "business" && (
                <Crown className="h-3 w-3 text-yellow-500" />
              )}
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {workspaces?.map((workspace: any) => (
            <SelectItem key={workspace.id} value={workspace.id.toString()}>
              <div className="flex items-center space-x-2 w-full">
                <Building2 className="h-4 w-4" />
                <span className="flex-1 truncate">{workspace.name}</span>
                <div className="flex items-center space-x-1">
                  {workspace.type === "business" && (
                    <Crown className="h-3 w-3 text-yellow-500" />
                  )}
                  <Badge variant="secondary" className="text-xs">
                    {workspace.type}
                  </Badge>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Create New Workspace */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Workspace</DialogTitle>
            <DialogDescription>
              Set up a new workspace for your team or personal projects
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Workspace Name</Label>
              <Input
                id="name"
                placeholder="My Awesome Workspace"
                value={newWorkspace.name}
                onChange={(e) =>
                  setNewWorkspace((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Input
                id="description"
                placeholder="What's this workspace for?"
                value={newWorkspace.description}
                onChange={(e) =>
                  setNewWorkspace((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-3">
              <Label>Workspace Type</Label>
              <div className="grid grid-cols-2 gap-3">
                <Card
                  className={`cursor-pointer transition-colors ${
                    newWorkspace.type === "personal"
                      ? "ring-2 ring-blue-500 bg-blue-50"
                      : "hover:bg-muted"
                  }`}
                  onClick={() =>
                    setNewWorkspace((prev) => ({ ...prev, type: "personal" }))
                  }
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center space-x-2">
                      <Star className="h-4 w-4" />
                      <span>Personal</span>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      For individual use and personal projects
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card
                  className={`cursor-pointer transition-colors ${
                    newWorkspace.type === "business"
                      ? "ring-2 ring-blue-500 bg-blue-50"
                      : "hover:bg-muted"
                  }`}
                  onClick={() =>
                    setNewWorkspace((prev) => ({ ...prev, type: "business" }))
                  }
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center space-x-2">
                      <Crown className="h-4 w-4 text-yellow-500" />
                      <span>Business</span>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Advanced features for teams and organizations
                    </CardDescription>
                  </CardHeader>
                </Card>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateWorkspace}
                disabled={
                  createWorkspaceMutation.isPending ||
                  !newWorkspace.name ||
                  !newWorkspace.ownerId // Disable if ownerId is missing
                }
              >
                {createWorkspaceMutation.isPending
                  ? "Creating..."
                  : "Create Workspace"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Workspace Settings */}
      {currentWorkspaceId && (
        <Button variant="ghost" size="sm">
          <Settings className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
