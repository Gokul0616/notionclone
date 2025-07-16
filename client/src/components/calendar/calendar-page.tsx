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
import { Calendar, Clock, Plus, Edit, Trash2, Users, Video, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isSameDay, startOfWeek, endOfWeek } from "date-fns";

interface CalendarEvent {
  id: number;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  location?: string;
  type: "meeting" | "task" | "reminder" | "deadline";
  attendees: string[];
  workspaceId: number;
  pageId?: number;
  createdBy: string;
  isAllDay: boolean;
  recurrence?: "none" | "daily" | "weekly" | "monthly";
  status: "confirmed" | "tentative" | "cancelled";
}

export default function CalendarPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<"month" | "week" | "day">("month");
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  const { data: events, isLoading } = useQuery<CalendarEvent[]>({
    queryKey: ['/api/calendar/events', format(currentDate, 'yyyy-MM')],
  });

  const createEventMutation = useMutation({
    mutationFn: async (eventData: Omit<CalendarEvent, 'id' | 'createdBy'>) => {
      const response = await apiRequest('POST', '/api/calendar/events', eventData);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/events'] });
      setShowEventDialog(false);
      setEditingEvent(null);
      toast({
        title: "Event created",
        description: "Calendar event has been created successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create calendar event.",
        variant: "destructive",
      });
    },
  });

  const updateEventMutation = useMutation({
    mutationFn: async ({ id, ...eventData }: Partial<CalendarEvent> & { id: number }) => {
      const response = await apiRequest('PATCH', `/api/calendar/events/${id}`, eventData);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/events'] });
      setShowEventDialog(false);
      setEditingEvent(null);
      toast({
        title: "Event updated",
        description: "Calendar event has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update calendar event.",
        variant: "destructive",
      });
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: async (eventId: number) => {
      const response = await apiRequest('DELETE', `/api/calendar/events/${eventId}`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/events'] });
      toast({
        title: "Event deleted",
        description: "Calendar event has been deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete calendar event.",
        variant: "destructive",
      });
    },
  });

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getEventsForDay = (date: Date) => {
    return events?.filter(event => 
      isSameDay(new Date(event.startDate), date) ||
      (new Date(event.startDate) <= date && new Date(event.endDate) >= date)
    ) || [];
  };

  const getEventTypeColor = (type: CalendarEvent['type']) => {
    switch (type) {
      case "meeting": return "bg-blue-500";
      case "task": return "bg-green-500";
      case "reminder": return "bg-yellow-500";
      case "deadline": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  const getEventTypeIcon = (type: CalendarEvent['type']) => {
    switch (type) {
      case "meeting": return <Users className="h-3 w-3" />;
      case "task": return <Clock className="h-3 w-3" />;
      case "reminder": return <Calendar className="h-3 w-3" />;
      case "deadline": return <Clock className="h-3 w-3" />;
      default: return <Calendar className="h-3 w-3" />;
    }
  };

  if (isLoading) {
    return <div className="p-8">Loading calendar...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold">Calendar</h1>
          <Badge variant="secondary">{events?.length || 0} events this month</Badge>
        </div>
        
        <div className="flex items-center space-x-2">
          <Select value={viewMode} onValueChange={(value: any) => setViewMode(value)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Month</SelectItem>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="day">Day</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            variant="outline"
            onClick={() => setCurrentDate(new Date())}
          >
            Today
          </Button>
          
          <div className="flex items-center space-x-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
            >
              ←
            </Button>
            <h2 className="text-lg font-semibold min-w-[120px] text-center">
              {format(currentDate, 'MMMM yyyy')}
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
            >
              →
            </Button>
          </div>
          
          <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Event
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingEvent ? 'Edit Event' : 'Create New Event'}
                </DialogTitle>
              </DialogHeader>
              <EventForm
                event={editingEvent}
                onSubmit={(data) => {
                  if (editingEvent) {
                    updateEventMutation.mutate({ ...data, id: editingEvent.id });
                  } else {
                    createEventMutation.mutate(data);
                  }
                }}
                onCancel={() => {
                  setShowEventDialog(false);
                  setEditingEvent(null);
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Calendar Grid */}
      <Card>
        <CardHeader>
          <div className="grid grid-cols-7 gap-1 text-center">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="p-2 text-sm font-medium text-muted-foreground">
                {day}
              </div>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day) => {
              const dayEvents = getEventsForDay(day);
              const isCurrentMonth = day.getMonth() === currentDate.getMonth();
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              
              return (
                <div
                  key={day.toISOString()}
                  className={`min-h-[100px] p-2 border rounded-lg cursor-pointer transition-colors ${
                    isCurrentMonth ? 'bg-background' : 'bg-muted/50'
                  } ${isToday(day) ? 'ring-2 ring-primary' : ''} ${
                    isSelected ? 'bg-primary/10' : ''
                  } hover:bg-muted/80`}
                  onClick={() => setSelectedDate(day)}
                >
                  <div className={`text-sm font-medium mb-1 ${
                    isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'
                  }`}>
                    {format(day, 'd')}
                  </div>
                  
                  <div className="space-y-1">
                    {dayEvents.slice(0, 3).map((event) => (
                      <div
                        key={event.id}
                        className={`text-xs p-1 rounded text-white truncate flex items-center space-x-1 ${getEventTypeColor(event.type)}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingEvent(event);
                          setShowEventDialog(true);
                        }}
                      >
                        {getEventTypeIcon(event.type)}
                        <span className="truncate">{event.title}</span>
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-xs text-muted-foreground">
                        +{dayEvents.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Selected Day Events */}
      {selectedDate && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Events for {format(selectedDate, 'MMMM d, yyyy')}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {getEventsForDay(selectedDate).length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No events scheduled for this day.
              </p>
            ) : (
              <div className="space-y-3">
                {getEventsForDay(selectedDate).map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${getEventTypeColor(event.type)}`} />
                      <div>
                        <h4 className="font-medium">{event.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {event.isAllDay ? 'All day' : format(new Date(event.startDate), 'h:mm a')}
                          {event.location && ` • ${event.location}`}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingEvent(event);
                          setShowEventDialog(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteEventMutation.mutate(event.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Event Form Component
function EventForm({ 
  event, 
  onSubmit, 
  onCancel 
}: { 
  event?: CalendarEvent | null;
  onSubmit: (data: Omit<CalendarEvent, 'id' | 'createdBy'>) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    title: event?.title || '',
    description: event?.description || '',
    startDate: event?.startDate || format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    endDate: event?.endDate || format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    location: event?.location || '',
    type: event?.type || 'meeting' as const,
    attendees: event?.attendees || [],
    workspaceId: event?.workspaceId || 1,
    pageId: event?.pageId,
    isAllDay: event?.isAllDay || false,
    recurrence: event?.recurrence || 'none' as const,
    status: event?.status || 'confirmed' as const,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="title">Event Title</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
        />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="startDate">Start Date & Time</Label>
          <Input
            id="startDate"
            type="datetime-local"
            value={formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            required
          />
        </div>
        <div>
          <Label htmlFor="endDate">End Date & Time</Label>
          <Input
            id="endDate"
            type="datetime-local"
            value={formData.endDate}
            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="location">Location</Label>
        <Input
          id="location"
          value={formData.location}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          placeholder="Meeting room, video call link, etc."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="type">Event Type</Label>
          <Select
            value={formData.type}
            onValueChange={(value: any) => setFormData({ ...formData, type: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="meeting">Meeting</SelectItem>
              <SelectItem value="task">Task</SelectItem>
              <SelectItem value="reminder">Reminder</SelectItem>
              <SelectItem value="deadline">Deadline</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="status">Status</Label>
          <Select
            value={formData.status}
            onValueChange={(value: any) => setFormData({ ...formData, status: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="tentative">Tentative</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {event ? 'Update Event' : 'Create Event'}
        </Button>
      </div>
    </form>
  );
}