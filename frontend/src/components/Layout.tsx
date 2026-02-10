import { Sparkles, LogOut } from "lucide-react";
import { Link, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";

export function Layout() {
  const { userEmail, logout } = useAuth();
  const initial = userEmail?.[0]?.toUpperCase() ?? "?";

  return (
    <div className="min-h-screen flex flex-col bg-linear-to-b from-background to-muted/30">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 rounded-lg bg-linear-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-sm shadow-violet-200 group-hover:shadow-violet-300 transition-shadow">
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-semibold text-[15px] tracking-tight">DocChat</span>
          </Link>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-6 h-6 rounded-full bg-linear-to-br from-violet-400 to-indigo-500 flex items-center justify-center text-white text-[10px] font-bold">
                {initial}
              </div>
              <span className="text-sm">{userEmail}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline text-xs">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
