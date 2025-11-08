import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Clock, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  getQueryHistory,
  subscribeToQueryHistory,
  type QueryHistoryEntry,
} from "@/services/queryHistory";

const ActivityFeed = () => {
  const [history, setHistory] = useState<QueryHistoryEntry[]>([]);

  useEffect(() => {
    // Load initial history
    getQueryHistory().then(setHistory);

    // Subscribe to real-time updates
    const channel = subscribeToQueryHistory((entry) => {
      setHistory((prev) => {
        const existing = prev.find((e) => e.id === entry.id);
        if (existing) {
          return prev.map((e) => (e.id === entry.id ? entry : e));
        }
        return [entry, ...prev];
      });
    });

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const getStatusIcon = (approved: boolean | null) => {
    if (approved === null)
      return <Clock className="h-4 w-4 text-muted-foreground" />;
    if (approved) return <CheckCircle2 className="h-4 w-4 text-success" />;
    return <XCircle className="h-4 w-4 text-destructive" />;
  };

  const getStatusBadge = (approved: boolean | null) => {
    if (approved === null)
      return (
        <Badge variant="outline" className="text-xs">
          Pending
        </Badge>
      );
    if (approved)
      return (
        <Badge className="text-xs bg-success/20 text-success border-success/30">
          Approved
        </Badge>
      );
    return (
      <Badge className="text-xs bg-destructive/20 text-destructive border-destructive/30">
        Dismissed
      </Badge>
    );
  };

  return (
    <Card className="h-full border-border/50 bg-card/95 backdrop-blur-sm">
      <CardHeader className="pb-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <CardTitle className="text-base font-medium">Activity Feed</CardTitle>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Real-time query history
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[calc(100vh-12rem)]">
          <div className="space-y-2 p-4">
            {history.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No queries yet
              </div>
            ) : (
              history.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-lg border border-border/50 bg-card/50 p-3 space-y-2 hover:border-border transition-colors animate-fade-in"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {getStatusIcon(entry.approved)}
                      <span className="text-xs font-mono text-muted-foreground truncate">
                        {formatTime(entry.created_at)}
                      </span>
                    </div>
                    {getStatusBadge(entry.approved)}
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground/90 line-clamp-2">
                      {entry.prompt}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                      {entry.proposal}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <code className="text-[10px] font-mono text-primary/60">
                      {entry.trace_id.slice(0, 8)}
                    </code>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default ActivityFeed;
