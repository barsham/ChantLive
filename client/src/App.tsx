import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { SeoManager } from "@/components/seo-manager";
import Landing from "@/pages/landing";
import About from "@/pages/about";
import Blog from "@/pages/blog";
import BlogPost from "@/pages/blog-post";
import Changelog from "@/pages/changelog";
import ForOrganizers from "@/pages/for-organizers";
import AdminDashboard from "@/pages/admin-dashboard";
import DemoEditor from "@/pages/demo-editor";
import ParticipantHandout from "@/pages/participant-handout";
import EventPlan from "@/pages/event-plan";
import RecoveryConsole from "@/pages/recovery-console";
import EventReport from "@/pages/event-report";
import CommandCenter from "@/pages/command-center";
import VolunteerBriefing from "@/pages/volunteer-briefing";
import RunOfShow from "@/pages/run-of-show";
import SafetyBoard from "@/pages/safety-board";
import ShareKit from "@/pages/share-kit";
import AdminUsers from "@/pages/admin-users";
import Participant from "@/pages/participant";
import Login from "@/pages/login";
import Register from "@/pages/register";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import NotFound from "@/pages/not-found";
import StatusPage from "@/pages/status";
import { PlatformStatusProvider } from "@/lib/platform-status";
import { PlatformStatusBanner } from "@/components/platform-status-banner";
import { useLocation } from "wouter";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, isLoading } = useAuth();
  const [, navigate] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    navigate("/login");
    return null;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/about" component={About} />
      <Route path="/for-organizers" component={ForOrganizers} />
      <Route path="/blog" component={Blog} />
      <Route path="/blog/:slug" component={BlogPost} />
      <Route path="/changelog" component={Changelog} />
      <Route path="/status" component={StatusPage} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/admin">
        {() => <ProtectedRoute component={AdminDashboard} />}
      </Route>
      <Route path="/admin/demos/:id/handout">
        {() => <ProtectedRoute component={ParticipantHandout} />}
      </Route>
      <Route path="/admin/demos/:id/command">
        {() => <ProtectedRoute component={CommandCenter} />}
      </Route>
      <Route path="/admin/demos/:id/briefing">
        {() => <ProtectedRoute component={VolunteerBriefing} />}
      </Route>
      <Route path="/admin/demos/:id/run-of-show">
        {() => <ProtectedRoute component={RunOfShow} />}
      </Route>
      <Route path="/admin/demos/:id/safety">
        {() => <ProtectedRoute component={SafetyBoard} />}
      </Route>
      <Route path="/admin/demos/:id/plan">
        {() => <ProtectedRoute component={EventPlan} />}
      </Route>
      <Route path="/admin/demos/:id/recovery">
        {() => <ProtectedRoute component={RecoveryConsole} />}
      </Route>
      <Route path="/admin/demos/:id/report">
        {() => <ProtectedRoute component={EventReport} />}
      </Route>
      <Route path="/admin/demos/:id/share-kit">
        {() => <ProtectedRoute component={ShareKit} />}
      </Route>
      <Route path="/admin/demos/:id">
        {() => <ProtectedRoute component={DemoEditor} />}
      </Route>
      <Route path="/admin/users">
        {() => <ProtectedRoute component={AdminUsers} />}
      </Route>
      <Route path="/d/:publicId" component={Participant} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <PlatformStatusProvider>
          <AuthProvider>
            <SeoManager />
            <Toaster />
            <PlatformStatusBanner />
            <Router />
          </AuthProvider>
        </PlatformStatusProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
