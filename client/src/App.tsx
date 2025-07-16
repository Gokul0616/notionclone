import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { useAuth, AuthProvider } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";
import Workspace from "@/pages/workspace";
import LandingPage from "@/components/auth/landing-page";
import AuthPage from "@/pages/auth-page";

function Router() {
  const { user, isLoading } = useAuth();

  return (
    <Switch>
      {isLoading ? (
        <div>Loading...</div>
      ) : !user ? (
        <>
          <Route path="/auth" component={AuthPage} />
          <Route path="/" component={LandingPage} />
        </>
      ) : (
        <>
          <Route path="/" component={Workspace} />
          <Route path="/workspace/:id" component={Workspace} />
          <Route path="/page/:id" component={Workspace} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
