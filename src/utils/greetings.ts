const GREETINGS: Record<string, string[]> = {
  morning: [
    "Rise and grind",
    "Morning, let's get it",
    "Good morning, time to cook",
    "New day, new wins",
    "Up early, already winning",
  ],
  afternoon: [
    "Afternoon check-in",
    "Midday reset, what's the move",
    "You're locked in",
    "Afternoon grind, no cap",
    "Still going strong",
  ],
  evening: [
    "Evening mode activated",
    "Winding down, still showing up",
    "Golden hour, golden mindset",
    "Evening vibes, let's wrap up strong",
  ],
  night: [
    "Late night session, respect",
    "Burning the midnight oil",
    "Night owl energy",
    "After hours, still putting in work",
  ],
};

export function getTimeBasedGreeting(): string {
  const hour = new Date().getHours();
  let period: string;
  if (hour >= 5 && hour < 12) period = "morning";
  else if (hour >= 12 && hour < 17) period = "afternoon";
  else if (hour >= 17 && hour < 21) period = "evening";
  else period = "night";

  const options = GREETINGS[period];
  return options[Math.floor(Math.random() * options.length)];
}
