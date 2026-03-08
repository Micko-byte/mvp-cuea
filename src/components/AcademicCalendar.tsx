import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { motion } from "framer-motion";
import { CalendarDays, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const ACADEMIC_EVENTS = [
  { date: new Date(2026, 0, 6), title: "Semester 2 Begins", type: "semester" },
  { date: new Date(2026, 2, 16), title: "Mid-Semester Exams", type: "exam" },
  { date: new Date(2026, 3, 3), title: "Easter Break Starts", type: "break" },
  { date: new Date(2026, 3, 13), title: "Easter Break Ends", type: "break" },
  { date: new Date(2026, 4, 11), title: "End of Semester Exams", type: "exam" },
  { date: new Date(2026, 4, 25), title: "Semester 2 Ends", type: "semester" },
  { date: new Date(2026, 8, 1), title: "Semester 1 Begins", type: "semester" },
  { date: new Date(2026, 10, 9), title: "Mid-Semester Exams", type: "exam" },
  { date: new Date(2026, 11, 7), title: "End of Semester Exams", type: "exam" },
  { date: new Date(2026, 11, 18), title: "Semester 1 Ends", type: "semester" },
];

interface AcademicCalendarProps {
  open: boolean;
  onClose: () => void;
}

export const AcademicCalendar = ({ open, onClose }: AcademicCalendarProps) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  if (!open) return null;

  const eventDates = ACADEMIC_EVENTS.map((e) => e.date);
  const selectedEvents = ACADEMIC_EVENTS.filter(
    (e) => selectedDate && e.date.toDateString() === selectedDate.toDateString()
  );

  const upcomingEvents = ACADEMIC_EVENTS
    .filter((e) => e.date >= new Date())
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 5);

  const typeColors: Record<string, string> = {
    exam: "bg-destructive/10 text-destructive border-destructive/20",
    semester: "bg-primary/10 text-primary border-primary/20",
    break: "bg-accent text-accent-foreground border-accent",
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
        <button onClick={onClose} className="p-1 hover:bg-muted rounded-lg">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-3 border-b border-border">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          modifiers={{ event: eventDates }}
          modifiersClassNames={{ event: "bg-primary/20 font-bold text-primary" }}
          className="rounded-xl"
        />
      </div>

      {selectedEvents.length > 0 && (
        <div className="p-4 border-b border-border">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Selected Date</p>
          {selectedEvents.map((evt, i) => (
            <div key={i} className={`px-3 py-2 rounded-lg border text-sm mb-1 ${typeColors[evt.type] || ""}`}>
              {evt.title}
            </div>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Upcoming Events</p>
        <div className="space-y-2">
          {upcomingEvents.map((evt, i) => (
            <button
              key={i}
              onClick={() => setSelectedDate(evt.date)}
              className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-muted transition-colors"
            >
              <p className="text-sm font-medium text-foreground">{evt.title}</p>
              <p className="text-xs text-muted-foreground">
                {evt.date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
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
