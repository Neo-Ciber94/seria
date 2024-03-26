import { useLayoutEffect, useState } from "react";

// Define a type for the theme
type Theme = "dark" | "light";

export function useTheme(): Theme {
  const [theme, setTheme] = useState<Theme>("dark");

  useLayoutEffect(() => {
    const checkTheme = () => {
      const dataTheme = document.documentElement.getAttribute("data-theme");
      const isDark = dataTheme === "dark";
      setTheme(isDark ? "dark" : "light");
    };

    const observer = new MutationObserver((mutations) => {
      mutations.forEach(function (mutation) {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "data-theme"
        ) {
          checkTheme();
        }
      });
    });

    checkTheme();
    observer.observe(document.documentElement, {
      attributes: true,
    });
    return () => {
      observer.disconnect();
    };
  }, []);

  return theme;
}
