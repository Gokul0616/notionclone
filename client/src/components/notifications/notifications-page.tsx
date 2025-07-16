import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, BellOff, Check, CheckCheck, Trash2, Filter, Search, Calendar, MessageSquare, UserPlus, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";

interface Notification {
  id: number;
  type: "mention" | "comment" | "invitation" | "page_shared" | "deadline" | "meeting" | "task_assigned" | "page_updated";
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  userId: string;
  workspaceId: number;
  relatedId?: number;
  relatedType?: "page" | "comment" | "workspace" | "event";
  actionUrl?: string;
  priority: "low" | "medium" | "high";
  metadata?: Record<string, any>;
}

export default function NotificationsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "unread" | "read">("all");
  const [sortBy, setSortBy] = useState<"createdAt" | "priority">("createdAt");
  const [selectedNotifications, setSelectedNotifications] = useState<Set<number>>(new Set());

  const { data: notifications, isLoading } = useQuery<Notification[]>({
    queryKey: ['/api/notifications'],
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationIds: number[]) => {
      const response = await apiRequest('PATCH', '/api/notifications/mark-read', { notificationIds });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      setSelectedNotifications(new Set());
      toast({
        title: "Notifications updated",
        description: "Selected notifications marked as read.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update notifications.",
        variant: "destructive",
      });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('PATCH', '/api/notifications/mark-all-read');
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      toast({
        title: "All notifications marked as read",
        description: "You're all caught up!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to mark all notifications as read.",
        variant: "destructive",
      });
    },
  });

  const deleteNotificationsMutation = useMutation({
    mutationFn: async (notificationIds: number[]) => {
      const response = await apiRequest('DELETE', '/api/notifications', { notificationIds });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      setSelectedNotifications(new Set());
      toast({
        title: "Notifications deleted",
        description: "Selected notifications have been deleted.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete notifications.",
        variant: "destructive",
      });
    },
  });

  const filteredNotifications = notifications?.filter(notification => {
    const matchesSearch = notification.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         notification.message.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesFilter = true;
    if (filterType === "unread") {
      matchesFilter = !notification.isRead;
    } else if (filterType === "read") {
      matchesFilter = notification.isRead;
    }
    
    return matchesSearch && matchesFilter;
  }).sort((a, b) => {
    if (sortBy === "priority") {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const unreadCount = notifications?.filter(n => !n.isRead).length || 0;

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case "mention": return <MessageSquare className="h-4 w-4" />;
      case "comment": return <MessageSquare className="h-4 w-4" />;
      case "invitation": return <UserPlus className="h-4 w-4" />;
      case "page_shared": return <FileText className="h-4 w-4" />;
      case "deadline": return <Calendar className="h-4 w-4" />;
      case "meeting": return <Calendar className="h-4 w-4" />;
      case "task_assigned": return <FileText className="h-4 w-4" />;
      case "page_updated": return <FileText className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: Notification['priority']) => {
    switch (priority) {
      case "high": return "text-red-600 bg-red-50";
      case "medium": return "text-orange-600 bg-orange-50";
      case "low": return "text-blue-600 bg-blue-50";
      default: return "text-gray-600 bg-gray-50";
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read when clicked
    if (!notification.isRead) {
      markAsReadMutation.mutate([notification.id]);
    }
    
    // Navigate to related content if actionUrl exists
    if (notification.actionUrl) {
      window.open(notification.actionUrl, '_self');
    }
  };

  const handleSelectAll = () => {
    if (selectedNotifications.size === filteredNotifications?.length) {
      setSelectedNotifications(new Set());
    } else {
      setSelectedNotifications(new Set(filteredNotifications?.map(n => n.id) || []));
    }
  };

  if (isLoading) {
    return <div className="p-8">Loading notifications...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h1 className="text-2xl font-bold">Notifications</h1>
          <Badge variant="secondary">{unreadCount} unread</Badge>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllAsReadMutation.mutate()}
            disabled={unreadCount === 0 || markAllAsReadMutation.isPending}
          >
            <CheckCheck className="h-4 w-4 mr-2" />
            Mark All Read
          </Button>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search notifications..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="unread">Unread</SelectItem>
            <SelectItem value="read">Read</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="createdAt">Recent</SelectItem>
            <SelectItem value="priority">Priority</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Bulk Actions */}
      {selectedNotifications.size > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {selectedNotifications.size} notification{selectedNotifications.size !== 1 ? 's' : ''} selected
              </span>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => markAsReadMutation.mutate(Array.from(selectedNotifications))}
                  disabled={markAsReadMutation.isPending}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Mark as Read
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteNotificationsMutation.mutate(Array.from(selectedNotifications))}
                  disabled={deleteNotificationsMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notifications List */}
      <div className="space-y-2">
        {!filteredNotifications?.length ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Bell className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No notifications</h3>
              <p className="text-muted-foreground text-center max-w-md">
                {searchQuery || filterType !== "all" 
                  ? "No notifications match your search or filter criteria."
                  : "You're all caught up! New notifications will appear here."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Select All Checkbox */}
            <div className="flex items-center space-x-2 p-2 text-sm">
              <input
                type="checkbox"
                checked={selectedNotifications.size === filteredNotifications.length}
                onChange={handleSelectAll}
                className="rounded"
              />
              <span>Select all</span>
            </div>
            
            {filteredNotifications.map((notification) => (
              <Card 
                key={notification.id} 
                className={`cursor-pointer transition-all hover:shadow-md ${
                  !notification.isRead ? 'border-l-4 border-l-primary bg-muted/30' : ''
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      checked={selectedNotifications.has(notification.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        const newSelection = new Set(selectedNotifications);
                        if (e.target.checked) {
                          newSelection.add(notification.id);
                        } else {
                          newSelection.delete(notification.id);
                        }
                        setSelectedNotifications(newSelection);
                      }}
                      className="mt-1"
                    />
                    
                    <div className="flex items-start space-x-3 flex-1">
                      <div className={`p-2 rounded-full ${getPriorityColor(notification.priority)}`}>
                        {getNotificationIcon(notification.type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className={`font-medium ${!notification.isRead ? 'font-semibold' : ''}`}>
                            {notification.title}
                          </h3>
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className={getPriorityColor(notification.priority)}>
                              {notification.priority}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {formatDistanceToNow(new Date(notification.createdAt))} ago
                            </span>
                          </div>
                        </div>
                        
                        <p className="text-sm text-muted-foreground mt-1">
                          {notification.message}
                        </p>
                        
                        {notification.actionUrl && (
                          <div className="mt-2">
                            <Button variant="outline" size="sm">
                              View Details
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </>
        )}
      </div>
    </div>
  );
}