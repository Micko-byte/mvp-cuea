import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { motion } from "framer-motion";
import { CalendarDays, X, Plus, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface CalendarEvent {
  id: string;
  event_name: string;
  start_date: string;
  end_date: string | null;
  category: string;
  trimester: string | null;
  description: string | null;
  is_student_created: boolean;
  created_by: string | null;
}

interface AcademicCalendarProps {
  open: boolean;
  onClose: () => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  academic: "bg-primary/10 text-primary border-primary/20",
  registration: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  deadline: "bg-destructive/10 text-destructive border-destructive/20",
  exam: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  event: "bg-accent text-accent-foreground border-accent",
  orientation: "bg-green-500/10 text-green-600 border-green-500/20",
  governance: "bg-muted text-muted-foreground border-border",
  cat: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
};

export const AcademicCalendar = ({ open, onClose }: AcademicCalendarProps) => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEvent, setNewEvent] = useState({ event_name: "", category: "exam", start_date: "" });
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!open) return;
    loadEvents();
  }, [open]);

  const loadEvents = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("academic_calendar")
      .select("*")
      .order("start_date", { ascending: true });
    if (data) setEvents(data as CalendarEvent[]);
    setLoading(false);
  };

  if (!open) return null;

  const eventDates = events.map((e) => new Date(e.start_date + "T00:00:00"));
  const selectedEvents = events.filter(
    (e) => selectedDate && new Date(e.start_date + "T00:00:00").toDateString() === selectedDate.toDateString()
  );

  const now = new Date();
  const upcomingEvents = events
    .filter((e) => new Date(e.start_date + "T00:00:00") >= now)
    .slice(0, 6);

  const handleAddEvent = async () => {
    if (!newEvent.event_name || !newEvent.start_date || !user) return;
    setAdding(true);
    const { error } = await supabase.from("academic_calendar").insert({
      event_name: newEvent.event_name,
      start_date: newEvent.start_date,
      end_date: newEvent.start_date,
      category: newEvent.category,
      is_student_created: true,
      created_by: user.id,
    } as any);
    setAdding(false);
    if (error) {
      toast.error("Failed to add event");
      return;
    }
    toast.success("Event added!");
    setNewEvent({ event_name: "", category: "exam", start_date: "" });
    setShowAddForm(false);
    loadEvents();
  };

  const handleDeleteEvent = async (id: string) => {
    await supabase.from("academic_calendar").delete().eq("id", id);
    toast.success("Event removed");
    loadEvents();
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 300 }}
      className="fixed right-0 top-0 h-full w-80 bg-card border-l border-border z-40 flex flex-col shadow-xl"
    >
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-primary" />
          <h3 className="font-display font-bold text-foreground">Academic Calendar</h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="p-1 hover:bg-muted rounded-lg"
            title="Add CAT/Exam date"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showAddForm && (
        <div className="p-3 border-b border-border space-y-2 bg-muted/30">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Add CAT/Exam Date</p>
          <Input
            placeholder="e.g. CSC101 CAT 1"
            value={newEvent.event_name}
            onChange={(e) => setNewEvent((p) => ({ ...p, event_name: e.target.value }))}
            className="text-sm"
          />
          <Input
            type="date"
            value={newEvent.start_date}
            onChange={(e) => setNewEvent((p) => ({ ...p, start_date: e.target.value }))}
            className="text-sm"
          />
          <Select value={newEvent.category} onValueChange={(v) => setNewEvent((p) => ({ ...p, category: v }))}>
            <SelectTrigger className="text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="exam">Exam</SelectItem>
              <SelectItem value="cat">CAT</SelectItem>
              <SelectItem value="deadline">Deadline</SelectItem>
              <SelectItem value="event">Event</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleAddEvent} disabled={adding || !newEvent.event_name || !newEvent.start_date} size="sm" className="w-full">
            {adding ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
            Add Event
          </Button>
        </div>
      )}

      <div className="p-3 border-b border-border">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            modifiers={{ event: eventDates }}
            modifiersClassNames={{ event: "bg-primary/20 font-bold text-primary" }}
            className="rounded-xl"
          />
        )}
      </div>

      {selectedEvents.length > 0 && (
        <div className="p-4 border-b border-border">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Selected Date</p>
          {selectedEvents.map((evt) => (
            <div key={evt.id} className={`px-3 py-2 rounded-lg border text-sm mb-1 flex items-center justify-between ${CATEGORY_COLORS[evt.category] || ""}`}>
              <div>
                <span>{evt.event_name}</span>
                {evt.trimester && <span className="text-xs opacity-60 ml-1">({evt.trimester})</span>}
              </div>
              {evt.is_student_created && evt.created_by === user?.id && (
                <button onClick={() => handleDeleteEvent(evt.id)} className="p-0.5 hover:text-destructive">
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Upcoming Events</p>
        <div className="space-y-2">
          {upcomingEvents.map((evt) => (
            <button
              key={evt.id}
              onClick={() => setSelectedDate(new Date(evt.start_date + "T00:00:00"))}
              className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-muted transition-colors"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">{evt.event_name}</p>
                {evt.is_student_created && (
                  <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">My</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {new Date(evt.start_date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                {evt.trimester && ` • ${evt.trimester}`}
              </p>
            </button>
          ))}
          {upcomingEvents.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No upcoming events</p>
          )}
        </div>
      </div>
    </motion.div>
  );
};
