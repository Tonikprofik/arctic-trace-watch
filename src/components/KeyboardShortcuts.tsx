import { useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Keyboard } from "lucide-react";

interface KeyboardShortcutsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const KeyboardShortcuts = ({ open, onOpenChange }: KeyboardShortcutsProps) => {
  const shortcuts = [
    { key: "Ctrl/⌘ + Enter", action: "Execute query" },
    { key: "Escape", action: "Clear form / Close dialogs" },
    { key: "M", action: "Toggle map view" },
    { key: "A", action: "Run AI analysis" },
    { key: "?", action: "Show keyboard shortcuts" },
    { key: "/", action: "Focus query input" },
    { key: "L", action: "Toggle live mode" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong border-primary/30">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Quick access to common actions
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-4">
          {shortcuts.map((shortcut, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors"
            >
              <span className="text-sm text-foreground/90">{shortcut.action}</span>
              <Badge variant="outline" className="font-mono text-xs bg-primary/10 border-primary/30">
                {shortcut.key}
              </Badge>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const useKeyboardShortcuts = (callbacks: {
  onExecuteQuery?: () => void;
  onClear?: () => void;
  onToggleMap?: () => void;
  onAIAnalysis?: () => void;
  onFocusInput?: () => void;
  onShowHelp?: () => void;
  onToggleLive?: () => void;
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore shortcuts when typing in input/textarea
      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA";

      // Ctrl/Cmd + Enter - Execute query (works in textarea)
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        callbacks.onExecuteQuery?.();
        return;
      }

      // Escape - Clear form or close dialogs
      if (e.key === "Escape") {
        e.preventDefault();
        callbacks.onClear?.();
        return;
      }

      // Don't process other shortcuts when in input fields
      if (isInput && e.key !== "Escape") return;

      // M - Toggle map
      if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        callbacks.onToggleMap?.();
        return;
      }

      // A - AI Analysis
      if (e.key === "a" || e.key === "A") {
        e.preventDefault();
        callbacks.onAIAnalysis?.();
        return;
      }

      // ? - Show help
      if (e.key === "?" && e.shiftKey) {
        e.preventDefault();
        callbacks.onShowHelp?.();
        return;
      }

      // / - Focus input
      if (e.key === "/") {
        e.preventDefault();
        callbacks.onFocusInput?.();
        return;
      }

      // L - Toggle live mode
      if (e.key === "l" || e.key === "L") {
        e.preventDefault();
        callbacks.onToggleLive?.();
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [callbacks]);
};
