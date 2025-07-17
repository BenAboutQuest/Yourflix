import { UserCircle, Search, Settings, LogOut, UserPlus, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import logoPath from "@assets/file_0000000039f0622fa7d959c52f7065fc_1752346582129.png";

interface HeaderProps {
  onAddMovie: () => void;
  onOpenSearch: () => void;
}

export default function Header({
  onAddMovie,
  onOpenSearch,
}: HeaderProps) {
  const [, navigate] = useLocation();
  const { user, logout, isLoggingOut } = useAuth();
  const { toast } = useToast();

  const handleLogout = () => {
    logout();
    toast({
      title: "Logged Out", 
      description: "You have been successfully logged out.",
    });
  };
  return (
    <header className="bg-app-secondary/80 backdrop-blur-lg border-b border-app-gray-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <img 
                src={logoPath} 
                alt="YourFlix" 
                className="h-8 w-auto"
              />
            </div>
          </div>

          {/* Spacer */}
          <div className="flex-1"></div>

          {/* Navigation Icons */}
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={onOpenSearch}
              className="text-gray-300 hover:text-app-accent transition-colors"
              title="Search Movies"
            >
              <Search className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/loans')}
              className="text-gray-300 hover:text-app-accent transition-colors"
              title="Loan Management"
            >
              <UserPlus className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/settings')}
              className="text-gray-300 hover:text-app-accent transition-colors"
              title="Settings"
            >
              <Settings className="h-5 w-5" />
            </Button>
            {user?.username === 'admin' && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/admin')}
                className="text-gray-300 hover:text-app-accent transition-colors"
                title="User Management"
              >
                <Shield className="h-5 w-5" />
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-gray-300 hover:text-app-accent transition-colors"
                  title="Profile"
                >
                  <UserCircle className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{user?.displayName}</p>
                  <p className="text-xs text-muted-foreground">@{user?.username}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} disabled={isLoggingOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  {isLoggingOut ? "Logging out..." : "Log out"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
