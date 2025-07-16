import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Mail, Send, Inbox, Sent, Trash2, Search, Plus, Reply, Forward, Archive, Star, Paperclip } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";

interface Email {
  id: string;
  messageId: string;
  threadId: string;
  subject: string;
  body: string;
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  date: string;
  isRead: boolean;
  isStarred: boolean;
  labels: string[];
  attachments: Array<{
    filename: string;
    size: number;
    contentType: string;
    attachmentId: string;
  }>;
  workspaceId: number;
  relatedPageId?: number;
}

interface EmailThread {
  id: string;
  subject: string;
  participants: string[];
  messageCount: number;
  lastMessageDate: string;
  isRead: boolean;
  isStarred: boolean;
  labels: string[];
  messages: Email[];
}

export default function EmailPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedFolder, setSelectedFolder] = useState<"inbox" | "sent" | "drafts" | "trash" | "starred">("inbox");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedThread, setSelectedThread] = useState<EmailThread | null>(null);
  const [showComposeDialog, setShowComposeDialog] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Email | null>(null);

  const { data: gmailConnected, isLoading: connectionLoading } = useQuery<boolean>({
    queryKey: ['/api/email/connection-status'],
  });

  const { data: threads, isLoading: threadsLoading } = useQuery<EmailThread[]>({
    queryKey: ['/api/email/threads', selectedFolder],
    enabled: !!gmailConnected,
  });

  const { data: folderCounts } = useQuery<Record<string, number>>({
    queryKey: ['/api/email/folder-counts'],
    enabled: !!gmailConnected,
  });

  const connectGmailMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/email/connect-gmail');
      return await response.json();
    },
    onSuccess: (data) => {
      if (data.authUrl) {
        window.open(data.authUrl, '_blank');
      }
      queryClient.invalidateQueries({ queryKey: ['/api/email/connection-status'] });
    },
    onError: () => {
      toast({
        title: "Connection failed",
        description: "Failed to connect to Gmail. Please try again.",
        variant: "destructive",
      });
    },
  });

  const sendEmailMutation = useMutation({
    mutationFn: async (emailData: {
      to: string[];
      cc?: string[];
      bcc?: string[];
      subject: string;
      body: string;
      attachments?: File[];
      inReplyTo?: string;
      relatedPageId?: number;
    }) => {
      const formData = new FormData();
      formData.append('emailData', JSON.stringify(emailData));
      
      emailData.attachments?.forEach((file, index) => {
        formData.append(`attachment_${index}`, file);
      });

      const response = await apiRequest('POST', '/api/email/send', formData);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/email/threads'] });
      queryClient.invalidateQueries({ queryKey: ['/api/email/folder-counts'] });
      setShowComposeDialog(false);
      setReplyingTo(null);
      toast({
        title: "Email sent",
        description: "Your email has been sent successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Send failed",
        description: "Failed to send email. Please try again.",
        variant: "destructive",
      });
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (threadId: string) => {
      const response = await apiRequest('PATCH', `/api/email/threads/${threadId}/read`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/email/threads'] });
      queryClient.invalidateQueries({ queryKey: ['/api/email/folder-counts'] });
    },
  });

  const starThreadMutation = useMutation({
    mutationFn: async ({ threadId, isStarred }: { threadId: string; isStarred: boolean }) => {
      const response = await apiRequest('PATCH', `/api/email/threads/${threadId}/star`, { isStarred });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/email/threads'] });
    },
  });

  const archiveThreadMutation = useMutation({
    mutationFn: async (threadId: string) => {
      const response = await apiRequest('PATCH', `/api/email/threads/${threadId}/archive`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/email/threads'] });
      queryClient.invalidateQueries({ queryKey: ['/api/email/folder-counts'] });
      setSelectedThread(null);
    },
  });

  const deleteThreadMutation = useMutation({
    mutationFn: async (threadId: string) => {
      const response = await apiRequest('DELETE', `/api/email/threads/${threadId}`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/email/threads'] });
      queryClient.invalidateQueries({ queryKey: ['/api/email/folder-counts'] });
      setSelectedThread(null);
    },
  });

  const filteredThreads = threads?.filter(thread =>
    thread.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    thread.participants.some(p => p.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (connectionLoading) {
    return <div className="p-8">Loading email connection...</div>;
  }

  if (!gmailConnected) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card>
          <CardHeader className="text-center">
            <Mail className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <CardTitle>Connect Your Gmail Account</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Connect your Gmail account to send and receive emails directly within your workspace.
            </p>
            <Button
              onClick={() => connectGmailMutation.mutate()}
              disabled={connectGmailMutation.isPending}
              className="w-full"
            >
              <Mail className="h-4 w-4 mr-2" />
              Connect Gmail Account
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h1 className="text-2xl font-bold">Email</h1>
          <Badge variant="secondary">
            {folderCounts?.[selectedFolder] || 0} messages
          </Badge>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search emails..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          
          <Dialog open={showComposeDialog} onOpenChange={setShowComposeDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Compose
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>
                  {replyingTo ? 'Reply to Email' : 'Compose New Email'}
                </DialogTitle>
              </DialogHeader>
              <ComposeEmailForm
                replyingTo={replyingTo}
                onSubmit={(data) => sendEmailMutation.mutate(data)}
                onCancel={() => {
                  setShowComposeDialog(false);
                  setReplyingTo(null);
                }}
                isLoading={sendEmailMutation.isPending}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Sidebar */}
        <div className="col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>Folders</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { key: "inbox", label: "Inbox", icon: <Inbox className="h-4 w-4" /> },
                { key: "sent", label: "Sent", icon: <Send className="h-4 w-4" /> },
                { key: "starred", label: "Starred", icon: <Star className="h-4 w-4" /> },
                { key: "drafts", label: "Drafts", icon: <Mail className="h-4 w-4" /> },
                { key: "trash", label: "Trash", icon: <Trash2 className="h-4 w-4" /> },
              ].map((folder) => (
                <Button
                  key={folder.key}
                  variant={selectedFolder === folder.key ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setSelectedFolder(folder.key as any)}
                >
                  {folder.icon}
                  <span className="ml-2">{folder.label}</span>
                  {folderCounts?.[folder.key] && (
                    <Badge variant="secondary" className="ml-auto">
                      {folderCounts[folder.key]}
                    </Badge>
                  )}
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Thread List */}
        <div className="col-span-4">
          <Card>
            <CardHeader>
              <CardTitle>Messages</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[600px] overflow-y-auto">
                {threadsLoading ? (
                  <div className="p-4 text-center">Loading messages...</div>
                ) : !filteredThreads?.length ? (
                  <div className="p-4 text-center text-muted-foreground">
                    No messages found.
                  </div>
                ) : (
                  filteredThreads.map((thread) => (
                    <div
                      key={thread.id}
                      className={`p-4 border-b cursor-pointer hover:bg-muted/50 ${
                        selectedThread?.id === thread.id ? 'bg-muted' : ''
                      } ${!thread.isRead ? 'font-semibold' : ''}`}
                      onClick={() => {
                        setSelectedThread(thread);
                        if (!thread.isRead) {
                          markAsReadMutation.mutate(thread.id);
                        }
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium truncate">
                          {thread.participants.join(', ')}
                        </span>
                        <div className="flex items-center space-x-1">
                          {thread.isStarred && (
                            <Star className="h-3 w-3 text-yellow-500 fill-current" />
                          )}
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(thread.lastMessageDate))}
                          </span>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground truncate">
                        {thread.subject}
                      </div>
                      {thread.messageCount > 1 && (
                        <Badge variant="outline" className="mt-1">
                          {thread.messageCount} messages
                        </Badge>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Message Content */}
        <div className="col-span-5">
          {selectedThread ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="truncate">{selectedThread.subject}</CardTitle>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => starThreadMutation.mutate({ 
                        threadId: selectedThread.id, 
                        isStarred: !selectedThread.isStarred 
                      })}
                    >
                      <Star className={`h-4 w-4 ${selectedThread.isStarred ? 'text-yellow-500 fill-current' : ''}`} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => archiveThreadMutation.mutate(selectedThread.id)}
                    >
                      <Archive className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteThreadMutation.mutate(selectedThread.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-[500px] overflow-y-auto">
                  {selectedThread.messages.map((message) => (
                    <div key={message.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{message.from}</span>
                          <span className="text-sm text-muted-foreground">
                            to {message.to.join(', ')}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(message.date))} ago
                        </span>
                      </div>
                      
                      {message.attachments.length > 0 && (
                        <div className="mb-2">
                          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <Paperclip className="h-3 w-3" />
                            <span>{message.attachments.length} attachment(s)</span>
                          </div>
                        </div>
                      )}
                      
                      <div className="prose prose-sm max-w-none">
                        <div dangerouslySetInnerHTML={{ __html: message.body }} />
                      </div>
                      
                      <div className="flex items-center space-x-2 mt-4 pt-2 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setReplyingTo(message);
                            setShowComposeDialog(true);
                          }}
                        >
                          <Reply className="h-4 w-4 mr-2" />
                          Reply
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setReplyingTo(message);
                            setShowComposeDialog(true);
                          }}
                        >
                          <Forward className="h-4 w-4 mr-2" />
                          Forward
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Mail className="h-12 w-12 text-muted-foreground mb-4 mx-auto" />
                  <h3 className="text-lg font-semibold mb-2">No message selected</h3>
                  <p className="text-muted-foreground">
                    Select a message from the list to view its content.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// Compose Email Form Component
function ComposeEmailForm({
  replyingTo,
  onSubmit,
  onCancel,
  isLoading,
}: {
  replyingTo?: Email | null;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState({
    to: replyingTo ? [replyingTo.from] : [],
    cc: [],
    bcc: [],
    subject: replyingTo ? `Re: ${replyingTo.subject}` : '',
    body: '',
    attachments: [] as File[],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      inReplyTo: replyingTo?.messageId,
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setFormData({ ...formData, attachments: [...formData.attachments, ...files] });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="to">To</Label>
        <Input
          id="to"
          value={formData.to.join(', ')}
          onChange={(e) => setFormData({ ...formData, to: e.target.value.split(',').map(s => s.trim()) })}
          placeholder="recipient@example.com"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="cc">CC</Label>
          <Input
            id="cc"
            value={formData.cc.join(', ')}
            onChange={(e) => setFormData({ ...formData, cc: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
            placeholder="cc@example.com"
          />
        </div>
        <div>
          <Label htmlFor="bcc">BCC</Label>
          <Input
            id="bcc"
            value={formData.bcc.join(', ')}
            onChange={(e) => setFormData({ ...formData, bcc: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
            placeholder="bcc@example.com"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="subject">Subject</Label>
        <Input
          id="subject"
          value={formData.subject}
          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
          required
        />
      </div>

      <div>
        <Label htmlFor="body">Message</Label>
        <Textarea
          id="body"
          value={formData.body}
          onChange={(e) => setFormData({ ...formData, body: e.target.value })}
          rows={10}
          required
        />
      </div>

      <div>
        <Label htmlFor="attachments">Attachments</Label>
        <Input
          id="attachments"
          type="file"
          multiple
          onChange={handleFileUpload}
        />
        {formData.attachments.length > 0 && (
          <div className="mt-2 space-y-1">
            {formData.attachments.map((file, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <span>{file.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const newAttachments = [...formData.attachments];
                    newAttachments.splice(index, 1);
                    setFormData({ ...formData, attachments: newAttachments });
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          <Send className="h-4 w-4 mr-2" />
          {isLoading ? 'Sending...' : 'Send'}
        </Button>
      </div>
    </form>
  );
}