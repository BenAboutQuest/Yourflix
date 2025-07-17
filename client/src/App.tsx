import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { usePureDarkMode } from "@/hooks/usePureDarkMode";
import logoPath from "@assets/file_0000000039f0622fa7d959c52f7065fc_1752346582129.png";
import Home from "@/pages/home";
import SubGenresPage from "@/pages/sub-genres";
import SettingsPage from "@/pages/settings";
import LoansPage from "@/pages/loans";
import AdminPage from "@/pages/admin";
import LoginPage from "@/pages/login";
import DebugLoginPage from "@/pages/debug-login";
import UltraSimplePage from "@/pages/ultra-simple";
import SimpleLoginPage from "@/pages/simple-login";
import RegisterPage from "@/pages/register";
import NotFound from "@/pages/not-found";

function AuthenticatedRoutes() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/sub-genres/:genre">
        {(params) => <SubGenresPage genre={decodeURIComponent(params.genre)} />}
      </Route>
      <Route path="/settings" component={SettingsPage} />
      <Route path="/loans" component={LoansPage} />
      <Route path="/admin" component={AdminPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function UnauthenticatedRoutes() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/debug-login" component={DebugLoginPage} />
      <Route path="/ultra-simple" component={UltraSimplePage} />
      <Route path="/simple-login" component={SimpleLoginPage} />
      <Route path="/" component={SimpleLoginPage} />
      <Route component={LoginPage} />
    </Switch>
  );
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();
  usePureDarkMode(); // Initialize pure dark mode handling

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-animated-gradient">
        <div className="text-center">
          <div className="mb-8">
            <img 
              src={logoPath} 
              alt="YourFlix" 
              className="h-20 w-auto mx-auto mb-4 animate-pulse"
            />
          </div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-400 mx-auto mb-4"></div>
          <p className="text-white text-lg font-medium bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">Loading YourFlix...</p>
        </div>
      </div>
    );
  }

  return isAuthenticated ? <AuthenticatedRoutes /> : <UnauthenticatedRoutes />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="dark min-h-screen bg-animated-gradient text-white">
          <Toaster />
          <Router />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
