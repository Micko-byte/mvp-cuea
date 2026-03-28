import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

export type FontOption = "system-ui" | "dm-sans" | "inter" | "poppins" | "roboto" | "lora" | "jetbrains-mono";
export type ThemeOption = "light" | "dark" | "maroon" | "ocean" | "forest" | "lavender" | "amber";

export interface ChatBackground {
  id: string;
  name: string;
  url: string;
  userBubble: string;   // HSL bg for user bubble
  userText: string;      // HSL text for user bubble
  botBubble: string;     // HSL bg for bot bubble
  botText: string;       // HSL text for bot bubble
}

export const FONT_OPTIONS: { value: FontOption; label: string; family: string }[] = [
  { value: "system-ui", label: "System UI", family: "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" },
  { value: "dm-sans", label: "DM Sans", family: "'DM Sans', sans-serif" },
  { value: "inter", label: "Inter", family: "'Inter', sans-serif" },
  { value: "poppins", label: "Poppins", family: "'Poppins', sans-serif" },
  { value: "roboto", label: "Roboto", family: "'Roboto', sans-serif" },
  { value: "lora", label: "Lora", family: "'Lora', serif" },
  { value: "jetbrains-mono", label: "JetBrains Mono", family: "'JetBrains Mono', monospace" },
];

export const THEME_OPTIONS: { value: ThemeOption; label: string; preview: string }[] = [
  { value: "light", label: "Light", preview: "hsl(0, 0%, 98%)" },
  { value: "dark", label: "Dark", preview: "hsl(220, 20%, 6%)" },
  { value: "maroon", label: "Maroon", preview: "hsl(345, 100%, 25%)" },
  { value: "ocean", label: "Ocean", preview: "hsl(210, 80%, 30%)" },
  { value: "forest", label: "Forest", preview: "hsl(150, 50%, 20%)" },
  { value: "lavender", label: "Lavender", preview: "hsl(270, 40%, 60%)" },
  { value: "amber", label: "Amber", preview: "hsl(36, 90%, 45%)" },
];

export const CHAT_BACKGROUNDS: ChatBackground[] = [
  { id: "none", name: "None", url: "", userBubble: "", userText: "", botBubble: "", botText: "" },
  { id: "purple", name: "Purple Wave", url: "/chat-bg/gradient-purple.jpg", userBubble: "hsl(270, 60%, 30%)", userText: "hsl(0, 0%, 100%)", botBubble: "hsl(0, 0%, 100% / 0.85)", botText: "hsl(270, 40%, 15%)" },
  { id: "sunset", name: "Sunset", url: "/chat-bg/gradient-sunset.jpg", userBubble: "hsl(340, 80%, 40%)", userText: "hsl(0, 0%, 100%)", botBubble: "hsl(0, 0%, 100% / 0.85)", botText: "hsl(340, 60%, 15%)" },
  { id: "teal", name: "Teal", url: "/chat-bg/gradient-teal.jpg", userBubble: "hsl(170, 70%, 25%)", userText: "hsl(0, 0%, 100%)", botBubble: "hsl(0, 0%, 100% / 0.85)", botText: "hsl(170, 50%, 10%)" },
  { id: "night", name: "Night Sky", url: "/chat-bg/gradient-night.jpg", userBubble: "hsl(220, 60%, 45%)", userText: "hsl(0, 0%, 100%)", botBubble: "hsl(220, 20%, 15% / 0.85)", botText: "hsl(0, 0%, 90%)" },
  { id: "rose", name: "Rose", url: "/chat-bg/gradient-rose.jpg", userBubble: "hsl(340, 60%, 45%)", userText: "hsl(0, 0%, 100%)", botBubble: "hsl(0, 0%, 100% / 0.85)", botText: "hsl(340, 40%, 15%)" },
  { id: "mono", name: "Geometric", url: "/chat-bg/geometric-mono.jpg", userBubble: "hsl(0, 0%, 15%)", userText: "hsl(0, 0%, 100%)", botBubble: "hsl(0, 0%, 100% / 0.9)", botText: "hsl(0, 0%, 10%)" },
];

// Theme CSS variable maps
const THEME_VARS: Record<ThemeOption, Record<string, string>> = {
  light: {},  // default, no override
  dark: {},   // uses .dark class
  maroon: {
    "--background": "345 20% 8%",
    "--foreground": "0 0% 95%",
    "--card": "345 20% 11%",
    "--card-foreground": "0 0% 95%",
    "--popover": "345 20% 11%",
    "--popover-foreground": "0 0% 95%",
    "--primary": "345 80% 50%",
    "--primary-foreground": "0 0% 100%",
    "--secondary": "345 15% 18%",
    "--secondary-foreground": "0 0% 90%",
    "--muted": "345 15% 15%",
    "--muted-foreground": "0 0% 60%",
    "--accent": "345 30% 18%",
    "--accent-foreground": "345 80% 75%",
    "--border": "345 15% 20%",
    "--input": "345 15% 20%",
    "--ring": "345 80% 50%",
    "--sidebar-background": "345 20% 6%",
    "--sidebar-foreground": "0 0% 85%",
    "--sidebar-accent": "345 30% 14%",
    "--sidebar-accent-foreground": "0 0% 95%",
    "--sidebar-border": "345 15% 12%",
    "--chat-input-bg": "345 15% 12%",
  },
  ocean: {
    "--background": "210 30% 8%",
    "--foreground": "0 0% 95%",
    "--card": "210 30% 11%",
    "--card-foreground": "0 0% 95%",
    "--popover": "210 30% 11%",
    "--popover-foreground": "0 0% 95%",
    "--primary": "210 80% 55%",
    "--primary-foreground": "0 0% 100%",
    "--secondary": "210 20% 18%",
    "--secondary-foreground": "0 0% 90%",
    "--muted": "210 20% 15%",
    "--muted-foreground": "0 0% 60%",
    "--accent": "210 30% 20%",
    "--accent-foreground": "210 70% 75%",
    "--border": "210 20% 20%",
    "--input": "210 20% 20%",
    "--ring": "210 80% 55%",
    "--sidebar-background": "210 30% 6%",
    "--sidebar-foreground": "0 0% 85%",
    "--sidebar-accent": "210 25% 14%",
    "--sidebar-accent-foreground": "0 0% 95%",
    "--sidebar-border": "210 20% 12%",
    "--chat-input-bg": "210 20% 12%",
  },
  forest: {
    "--background": "150 25% 7%",
    "--foreground": "0 0% 95%",
    "--card": "150 25% 10%",
    "--card-foreground": "0 0% 95%",
    "--popover": "150 25% 10%",
    "--popover-foreground": "0 0% 95%",
    "--primary": "150 60% 40%",
    "--primary-foreground": "0 0% 100%",
    "--secondary": "150 15% 16%",
    "--secondary-foreground": "0 0% 90%",
    "--muted": "150 15% 14%",
    "--muted-foreground": "0 0% 60%",
    "--accent": "150 25% 18%",
    "--accent-foreground": "150 50% 70%",
    "--border": "150 15% 18%",
    "--input": "150 15% 18%",
    "--ring": "150 60% 40%",
    "--sidebar-background": "150 25% 5%",
    "--sidebar-foreground": "0 0% 85%",
    "--sidebar-accent": "150 20% 12%",
    "--sidebar-accent-foreground": "0 0% 95%",
    "--sidebar-border": "150 15% 10%",
    "--chat-input-bg": "150 15% 10%",
  },
  lavender: {
    "--background": "270 20% 8%",
    "--foreground": "0 0% 95%",
    "--card": "270 20% 11%",
    "--card-foreground": "0 0% 95%",
    "--popover": "270 20% 11%",
    "--popover-foreground": "0 0% 95%",
    "--primary": "270 60% 60%",
    "--primary-foreground": "0 0% 100%",
    "--secondary": "270 15% 18%",
    "--secondary-foreground": "0 0% 90%",
    "--muted": "270 15% 15%",
    "--muted-foreground": "0 0% 60%",
    "--accent": "270 25% 20%",
    "--accent-foreground": "270 50% 75%",
    "--border": "270 15% 20%",
    "--input": "270 15% 20%",
    "--ring": "270 60% 60%",
    "--sidebar-background": "270 20% 6%",
    "--sidebar-foreground": "0 0% 85%",
    "--sidebar-accent": "270 20% 14%",
    "--sidebar-accent-foreground": "0 0% 95%",
    "--sidebar-border": "270 15% 12%",
    "--chat-input-bg": "270 15% 12%",
  },
  amber: {
    "--background": "36 20% 8%",
    "--foreground": "0 0% 95%",
    "--card": "36 20% 11%",
    "--card-foreground": "0 0% 95%",
    "--popover": "36 20% 11%",
    "--popover-foreground": "0 0% 95%",
    "--primary": "36 90% 50%",
    "--primary-foreground": "0 0% 5%",
    "--secondary": "36 15% 18%",
    "--secondary-foreground": "0 0% 90%",
    "--muted": "36 15% 15%",
    "--muted-foreground": "0 0% 60%",
    "--accent": "36 25% 20%",
    "--accent-foreground": "36 70% 70%",
    "--border": "36 15% 20%",
    "--input": "36 15% 20%",
    "--ring": "36 90% 50%",
    "--sidebar-background": "36 20% 6%",
    "--sidebar-foreground": "0 0% 85%",
    "--sidebar-accent": "36 20% 14%",
    "--sidebar-accent-foreground": "0 0% 95%",
    "--sidebar-border": "36 15% 12%",
    "--chat-input-bg": "36 15% 12%",
  },
};

interface PersonalizationState {
  font: FontOption;
  theme: ThemeOption;
  chatBackground: string; // background id
  nickname: string;
}

interface PersonalizationContextType extends PersonalizationState {
  setFont: (f: FontOption) => void;
  setTheme: (t: ThemeOption) => void;
  setChatBackground: (id: string) => void;
  setNickname: (n: string) => void;
  getFontFamily: () => string;
  getChatBg: () => ChatBackground | undefined;
}

const STORAGE_KEY = "sekani-personalization";

const defaults: PersonalizationState = {
  font: "system-ui",
  theme: "light",
  chatBackground: "none",
  nickname: "",
};

const PersonalizationContext = createContext<PersonalizationContextType | null>(null);

export const PersonalizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<PersonalizationState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
    } catch {
      return defaults;
    }
  });

  // Persist
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  // Apply theme
  useEffect(() => {
    const root = document.documentElement;
    // Remove dark class first
    root.classList.remove("dark");

    if (state.theme === "dark") {
      root.classList.add("dark");
      // Clear any custom vars
      Object.keys(THEME_VARS.maroon).forEach((k) => root.style.removeProperty(k));
    } else if (state.theme === "light") {
      Object.keys(THEME_VARS.maroon).forEach((k) => root.style.removeProperty(k));
    } else {
      // Custom theme — apply vars
      const vars = THEME_VARS[state.theme];
      if (vars) {
        Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
      }
    }
  }, [state.theme]);

  // Apply font
  useEffect(() => {
    const fontDef = FONT_OPTIONS.find((f) => f.value === state.font);
    if (fontDef) {
      document.body.style.fontFamily = fontDef.family;
    }
  }, [state.font]);

  const setFont = useCallback((f: FontOption) => setState((s) => ({ ...s, font: f })), []);
  const setTheme = useCallback((t: ThemeOption) => setState((s) => ({ ...s, theme: t })), []);
  const setChatBackground = useCallback((id: string) => setState((s) => ({ ...s, chatBackground: id })), []);
  const setNickname = useCallback((n: string) => setState((s) => ({ ...s, nickname: n })), []);

  const getFontFamily = useCallback(() => {
    return FONT_OPTIONS.find((f) => f.value === state.font)?.family || "'DM Sans', sans-serif";
  }, [state.font]);

  const getChatBg = useCallback(() => {
    return CHAT_BACKGROUNDS.find((b) => b.id === state.chatBackground);
  }, [state.chatBackground]);

  return (
    <PersonalizationContext.Provider value={{ ...state, setFont, setTheme, setChatBackground, setNickname, getFontFamily, getChatBg }}>
      {children}
    </PersonalizationContext.Provider>
  );
};

export const usePersonalization = () => {
  const ctx = useContext(PersonalizationContext);
  if (!ctx) throw new Error("usePersonalization must be used within PersonalizationProvider");
  return ctx;
};
