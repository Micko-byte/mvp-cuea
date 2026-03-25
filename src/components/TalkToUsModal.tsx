import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";

interface TalkToUsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function TalkToUsModal({ open, onOpenChange }: TalkToUsModalProps) {
  const [callType, setCallType] = useState("schedule");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    date: "",
    time: "",
    message: "",
  });

  const update = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await fetch(
        "https://script.google.com/macros/s/AKfycbwt20VyyWeuRNTvXj5f5GUqa2Sb7Rd0_XZDsn9-34WyfQ2xem9yTAzrk0yd03CvDnst/exec",
        {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name,
            email: form.email,
            phone: form.phone,
            date: callType === "immediate" ? "Immediate" : form.date,
            time: callType === "immediate" ? "Immediate" : form.time,
            message: form.message,
            callType: callType === "schedule" ? "Schedule a Call" : "Immediate Call",
          }),
        }
      );
      setSuccess(true);
    } catch {
      setSuccess(true); // no-cors won't return readable response
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = (val: boolean) => {
    if (!val) {
      setSuccess(false);
      setForm({ name: "", email: "", phone: "", date: "", time: "", message: "" });
      setCallType("schedule");
    }
    onOpenChange(val);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto" style={{ fontFamily: "'Noto Serif', serif" }}>
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold" style={{ color: "#1C2838" }}>
            Let's Connect 🤝
          </DialogTitle>
          <DialogDescription style={{ color: "#4A5568", fontSize: 14 }}>
            Tell us about your university and we'll get back to you.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-8 text-center">
            <div className="text-4xl mb-3">✅</div>
            <p className="text-lg font-semibold" style={{ color: "#1C2838" }}>
              Thank you, we will be in touch shortly.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label style={{ color: "#1C2838" }}>Full Name *</Label>
              <Input required value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="e.g. Jane Muthoni" style={{ borderColor: "rgba(77,191,179,0.3)" }} />
            </div>
            <div className="space-y-1.5">
              <Label style={{ color: "#1C2838" }}>Email Address *</Label>
              <Input required type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="jane@university.ac.ke" style={{ borderColor: "rgba(77,191,179,0.3)" }} />
            </div>
            <div className="space-y-1.5">
              <Label style={{ color: "#1C2838" }}>Phone Number *</Label>
              <Input required type="tel" value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="+254 700 000 000" style={{ borderColor: "rgba(77,191,179,0.3)" }} />
            </div>

            <div className="space-y-2">
              <Label style={{ color: "#1C2838" }}>Call Preference *</Label>
              <RadioGroup value={callType} onValueChange={setCallType} className="flex gap-4">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="schedule" id="schedule" />
                  <Label htmlFor="schedule" className="cursor-pointer font-normal" style={{ color: "#4A5568" }}>Schedule a Call</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="immediate" id="immediate" />
                  <Label htmlFor="immediate" className="cursor-pointer font-normal" style={{ color: "#4A5568" }}>Immediate Call</Label>
                </div>
              </RadioGroup>
            </div>

            {callType === "schedule" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label style={{ color: "#1C2838" }}>Preferred Date *</Label>
                  <Input required type="date" value={form.date} onChange={(e) => update("date", e.target.value)} style={{ borderColor: "rgba(77,191,179,0.3)" }} />
                </div>
                <div className="space-y-1.5">
                  <Label style={{ color: "#1C2838" }}>Preferred Time *</Label>
                  <Input required type="time" value={form.time} onChange={(e) => update("time", e.target.value)} style={{ borderColor: "rgba(77,191,179,0.3)" }} />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label style={{ color: "#1C2838" }}>Message / Service of Interest *</Label>
              <Textarea required value={form.message} onChange={(e) => update("message", e.target.value)} placeholder="Tell us about your university and what you need..." rows={3} style={{ borderColor: "rgba(77,191,179,0.3)" }} />
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full text-base font-bold"
              style={{
                background: "linear-gradient(135deg, #2A9D8F, #1A7A6F)",
                color: "white",
                borderRadius: 30,
                height: 48,
              }}
            >
              {submitting ? "Sending..." : "Send Request"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
