import { Search, User, LogOut, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useUIStore } from "@/store/sidebar";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Link } from "react-router-dom";

export function Header() {
  const { admin, logout } = useAuth();
  const { headerTitle, headerSubtitle } = useUIStore();

  return (
    <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-30 flex items-center justify-between px-6">
      <div className="flex flex-col">
        <h1 className="text-xl font-display font-semibold text-foreground leading-tight tracking-tight">{headerTitle}</h1>
        {headerSubtitle && <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mt-0.5">{headerSubtitle}</p>}
      </div>

      <div className="flex items-center gap-6">
        {/* Search removed from global nav */}

        {admin && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 pl-2 pr-1 py-1 rounded-full hover:bg-muted/50 transition-colors outline-none border-none shadow-none group">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-semibold text-foreground leading-none mb-1 group-hover:text-primary transition-colors">{admin.name}</p>
                  <p className="text-[10px] text-muted-foreground leading-none uppercase tracking-wider font-medium">Administrator</p>
                </div>
                <div className="relative">
                  <Avatar className="h-9 w-9 border border-border/50 shadow-sm ring-offset-background group-hover:ring-2 ring-primary/20 transition-all">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                      {admin.name?.[0].toUpperCase() || "A"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-green-500 border-2 border-background rounded-full" />
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors mr-1" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 mt-1 border-border/50 shadow-lg animate-in fade-in-0 zoom-in-95">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{admin.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">{admin.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/profile" className="cursor-pointer flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>My Profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/settings" className="cursor-pointer flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  <span>System Settings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={logout} 
                className="text-red-500 focus:text-red-500 cursor-pointer flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
