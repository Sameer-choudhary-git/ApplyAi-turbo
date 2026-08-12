import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClientInstance } from "@/lib/query-client";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import PageNotFound from "./lib/PageNotFound";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import UserNotRegisteredError from "@/components/UserNotRegisteredError";
import AppShell from "./components/AppShell";
import Dashboard from "./pages/Dashboard";
import Applications from "./pages/Applications";
import Schedule from "./pages/Schedule";
import Tasks from "./pages/Tasks";
import Analytics from "./pages/Analytics";
import Preferences from "./pages/Preferences";
import Networking from "./pages/Networking";
import SavedJobs from "./pages/SavedJobs";
import Login from "./pages/Login";
import AdminJobs from "@/views/AdminJobs";
import { SentryRouteTracker } from "@/components/SentryRouteTracker";
import ErrorBoundaryWrapper from "@/components/ErrorBoundaryWrapper";

import { Navigate } from "react-router-dom"; // Make sure Navigate is imported!

const AuthenticatedApp = () => {
  const { isLoadingAuth, authError, user } = useAuth(); // Removed navigateToLogin

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  // Gracefully route to login using React Router, preventing token destruction
  if (authError?.type === "auth_required" || !user) {
    return <Navigate to="/login" replace />;
  }

  if (authError?.type === "user_not_registered") {
    return <UserNotRegisteredError />;
  }

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route
          path="/"
          element={
            <ErrorBoundaryWrapper componentName="Dashboard">
              <Dashboard />
            </ErrorBoundaryWrapper>
          }
        />
        <Route
          path="/applications"
          element={
            <ErrorBoundaryWrapper componentName="Applications">
              <Applications />
            </ErrorBoundaryWrapper>
          }
        />
        <Route
          path="/schedule"
          element={
            <ErrorBoundaryWrapper componentName="Schedule">
              <Schedule />
            </ErrorBoundaryWrapper>
          }
        />
        <Route
          path="/tasks"
          element={
            <ErrorBoundaryWrapper componentName="Tasks">
              <Tasks />
            </ErrorBoundaryWrapper>
          }
        />
        <Route
          path="/analytics"
          element={
            <ErrorBoundaryWrapper componentName="Analytics">
              <Analytics />
            </ErrorBoundaryWrapper>
          }
        />
        <Route
          path="/preferences"
          element={
            <ErrorBoundaryWrapper componentName="Preferences">
              <Preferences />
            </ErrorBoundaryWrapper>
          }
        />
        <Route
          path="/networking"
          element={
            <ErrorBoundaryWrapper componentName="Networking">
              <Networking />
            </ErrorBoundaryWrapper>
          }
        />
        <Route
          path="/saved-jobs"
          element={
            <ErrorBoundaryWrapper componentName="SavedJobs">
              <SavedJobs />
            </ErrorBoundaryWrapper>
          }
        />
        <Route
          path="/admin/jobs"
          element={
            <ErrorBoundaryWrapper componentName="Admin Jobs">
              <AdminJobs />
            </ErrorBoundaryWrapper>
          }
        />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <SentryRouteTracker />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/*" element={<AuthenticatedApp />} />
          </Routes>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;
