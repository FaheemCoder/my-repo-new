import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button 
        variant="ghost" 
        size="icon" 
        className="h-9 w-9"
        aria-label="Loading theme toggle"
      >
        <Sun className="h-5 w-5" />
      </Button>
    );
  }

  const isDark = theme === "dark";
  const toggleTheme = () => {
    const newTheme = isDark ? "light" : "dark";
    setTheme(newTheme);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="h-9 w-9"
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      aria-pressed={isDark}
      role="switch"
      aria-checked={isDark}
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
    >
      {isDark ? (
        <Sun className="h-5 w-5 transition-all" aria-hidden="true" />
      ) : (
        <Moon className="h-5 w-5 transition-all" aria-hidden="true" />
      )}
      <span className="sr-only">
        {isDark ? "Switch to light mode" : "Switch to dark mode"}
      </span>
    </Button>
  );
}