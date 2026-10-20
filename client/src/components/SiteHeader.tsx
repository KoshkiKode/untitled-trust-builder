import { Link, useLocation } from "wouter";
import { Moon, Sun } from "lucide-react";
import { Logo } from "./Logo";
import { useTheme } from "./ThemeProvider";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  const { theme, toggle } = useTheme();
  const [loc] = useLocation();
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link href="/" data-testid="link-home" className="hover-elevate rounded-md px-1.5 py-1 -ml-1.5">
          <Logo />
        </Link>
        <nav className="flex items-center gap-1.5">
          {loc !== "/build" && (
            <Link href="/build" data-testid="link-build-nav">
              <Button variant="ghost" size="sm" className="font-medium">
                Start a Plan
              </Button>
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggle}
            data-testid="button-theme-toggle"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </nav>
      </div>
    </header>
  );
}
