import { useLayoutEffect, useState } from "react";

// Define a type for the theme
type Theme = "dark" | "light";

export function useTheme(): Theme {
  const [theme, setTheme] = useState<Theme>("dark");

  useLayoutEffect(() => {
    function detectTheme() {
      const htmlElement = document.documentElement;

      if (htmlElement.hasAttribute("data-theme")) {
        const detectedTheme = htmlElement.getAttribute("data-theme") as Theme;
        if (detectedTheme === "dark" || detectedTheme === "light") {
          setTheme(detectedTheme);
        }
      }
    }

    detectTheme();
    document.addEventListener("DOMContentLoaded", detectTheme);

    return () => {
      document.removeEventListener("DOMContentLoaded", detectTheme);
    };
  }, []);

  return theme;
}
