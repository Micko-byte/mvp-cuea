import { useEffect } from "react";

const CUSTOM_VAR_PREFIX = "--";

/**
 * Forces light appearance for the duration of the component's lifetime
 * (used on auth pages so dashboard themes never leak into them).
 */
export function useForceLightTheme() {
  useEffect(() => {
    const root = document.documentElement;
    const hadDark = root.classList.contains("dark");
    const prevTheme = root.getAttribute("data-sk-theme");
    const prevInline = root.getAttribute("style");

    root.classList.remove("dark");
    root.removeAttribute("data-sk-theme");
    // Strip inline theme variable overrides applied by PersonalizationContext
    Array.from(root.style).forEach((prop) => {
      if (prop.startsWith(CUSTOM_VAR_PREFIX)) root.style.removeProperty(prop);
    });
    root.setAttribute("data-sk-force-light", "true");

    return () => {
      root.removeAttribute("data-sk-force-light");
      if (hadDark) root.classList.add("dark");
      if (prevTheme) root.setAttribute("data-sk-theme", prevTheme);
      if (prevInline !== null) root.setAttribute("style", prevInline);
    };
  }, []);
}
