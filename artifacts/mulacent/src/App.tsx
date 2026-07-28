import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import LaunchingPage from "@/pages/launching";

import Login from "@/pages/login";
import Register from "@/pages/register";
import ForgotPassword from "@/pages/forgot-password";
import UpdatePassword from "@/pages/update-password";
import Activate from "@/pages/activate";
import PaymentStatus from "@/pages/payment-status";
import Dashboard from "@/pages/dashboard";
import Profile from "@/pages/profile";
import DownlinesL1Active   from "@/pages/downlines-l1-active";
import DownlinesL1Inactive from "@/pages/downlines-l1-inactive";
import DownlinesL2Active   from "@/pages/downlines-l2-active";
import DownlinesL2Inactive from "@/pages/downlines-l2-inactive";
import DownlinesL3Active   from "@/pages/downlines-l3-active";
import DownlinesL3Inactive from "@/pages/downlines-l3-inactive";
import Tournament from "@/pages/tournament";
import ChatForeigners from "@/pages/chat-foreigners";
import Products from "@/pages/products";
import Downloads from "@/pages/downloads";
import Withdraw from "@/pages/withdraw";
import Recharge from "@/pages/recharge";
import History from "@/pages/history";
import Bonus from "@/pages/bonus";
import Tasks from "@/pages/tasks";
import PayClient from "@/pages/pay-client";
import Verify from "@/pages/verify";
import UgandaPay from "@/pages/uganda-pay";
import ZambiaPay from "@/pages/zambia-pay";
import TanzaniaPay from "@/pages/tanzania-pay";
import CameroonPay from "@/pages/cameroon-pay";
import CongoPay from "@/pages/congo-pay";
import MalawiPay from "@/pages/malawi-pay";
import BotswanaPay from "@/pages/botswana-pay";
import SouthSudanPay from "@/pages/south-sudan-pay";
import RwandaPay from "@/pages/rwanda-pay";
import NotFound from "@/pages/not-found";
import SmtpDebug from "@/pages/smtp-debug";
import Investments from "@/pages/investments";
import InvestmentsCurrent from "@/pages/investments-current";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared query options for the launch-status check.
// No placeholderData — we must know the real status before rendering anything
// so we never flash the login page to a user who should see /launch.
// ---------------------------------------------------------------------------
const launchQueryOptions = {
  queryKey: ["launch-status"],
  queryFn: async () => {
    const res = await fetch("/api/settings/launch");
    if (!res.ok) return { enabled: false, launchDate: "" };
    return res.json() as Promise<{ enabled: boolean; launchDate: string }>;
  },
  refetchInterval: 30_000,
  staleTime: 10_000,
  retry: false,
} as const;

// ---------------------------------------------------------------------------
// Launch gate — holds rendering until the API responds, then either redirects
// to /launch (if enabled) or reveals the app normally.
// ---------------------------------------------------------------------------
function LaunchGate({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { data, isLoading } = useQuery(launchQueryOptions);

  // Block render while we don't yet know the launch status — this is the key
  // fix that prevents the flash of login before redirecting to /launch.
  if (isLoading) return <LoadingSpinner />;

  if (data?.enabled && location !== "/launch") {
    return <Redirect to="/launch" />;
  }

  return <>{children}</>;
}

// ---------------------------------------------------------------------------
// /launch route — a real, bookmarkable URL so refreshing always works.
// Shows a spinner while the status is being fetched, then either shows the
// launch page or redirects home if launch has ended.
// ---------------------------------------------------------------------------
function LaunchRoute() {
  const { data, isLoading, refetch } = useQuery(launchQueryOptions);

  if (isLoading) return <LoadingSpinner />;

  // Launch is over — send the user to the app.
  if (!data?.enabled) {
    return <Redirect to="/" />;
  }

  return (
    <LaunchingPage
      launchDate={data.launchDate}
      onExpired={() => {
        // Countdown hit zero — re-check the server immediately.
        setTimeout(() => refetch(), 500);
      }}
    />
  );
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <LoadingSpinner />;
  if (!user) return <Redirect to="/login" />;
  if (user.status === "inactive") return <Redirect to="/activate" />;

  return (
    <DashboardLayout>
      <Component />
    </DashboardLayout>
  );
}

function ActivateRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <LoadingSpinner />;
  if (!user) return <Redirect to="/login" />;
  if (user.status === "active") return <Redirect to="/dashboard" />;

  return <Activate />;
}

function PublicOnlyRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;

  if (user) {
    if (user.status === "inactive") return <Redirect to="/activate" />;
    return <Redirect to="/dashboard" />;
  }

  return <Component />;
}

function PaymentStatusRoute() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <LoadingSpinner />;
  if (!user) return <Redirect to="/login" />;
  return <PaymentStatus />;
}

function VerifyRoute() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <LoadingSpinner />;
  if (!user) return <Redirect to="/login" />;
  if (user.status === "active") return <Redirect to="/dashboard" />;
  return <Verify />;
}

function UgandaPayRoute() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <LoadingSpinner />;
  if (!user) return <Redirect to="/login" />;
  return <UgandaPay />;
}

function ZambiaPayRoute() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <LoadingSpinner />;
  if (!user) return <Redirect to="/login" />;
  return <ZambiaPay />;
}

function TanzaniaPayRoute() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <LoadingSpinner />;
  if (!user) return <Redirect to="/login" />;
  return <TanzaniaPay />;
}

function CameroonPayRoute() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <LoadingSpinner />;
  if (!user) return <Redirect to="/login" />;
  return <CameroonPay />;
}

function CongoPayRoute() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <LoadingSpinner />;
  if (!user) return <Redirect to="/login" />;
  return <CongoPay />;
}

function MalawiPayRoute() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <LoadingSpinner />;
  if (!user) return <Redirect to="/login" />;
  return <MalawiPay />;
}

function BotswanaPayRoute() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <LoadingSpinner />;
  if (!user) return <Redirect to="/login" />;
  return <BotswanaPay />;
}

function SouthSudanPayRoute() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <LoadingSpinner />;
  if (!user) return <Redirect to="/login" />;
  return <SouthSudanPay />;
}

function RwandaPayRoute() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <LoadingSpinner />;
  if (!user) return <Redirect to="/login" />;
  return <RwandaPay />;
}

function Router() {
  return (
    <Switch>
      <Route path="/launch" component={LaunchRoute} />
      <Route path="/" component={() => <Redirect to="/dashboard" />} />
      <Route path="/login" component={() => <PublicOnlyRoute component={Login} />} />
      <Route path="/register" component={() => <PublicOnlyRoute component={Register} />} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/update-password" component={UpdatePassword} />
      <Route path="/activate" component={() => <ActivateRoute />} />
      <Route path="/payment-status" component={() => <PaymentStatusRoute />} />

      <Route path="/dashboard" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/profile" component={() => <ProtectedRoute component={Profile} />} />
      <Route path="/team/level-1/active"   component={() => <ProtectedRoute component={DownlinesL1Active}   />} />
      <Route path="/team/level-1/inactive" component={() => <ProtectedRoute component={DownlinesL1Inactive} />} />
      <Route path="/team/level-2/active"   component={() => <ProtectedRoute component={DownlinesL2Active}   />} />
      <Route path="/team/level-2/inactive" component={() => <ProtectedRoute component={DownlinesL2Inactive} />} />
      <Route path="/team/level-3/active"   component={() => <ProtectedRoute component={DownlinesL3Active}   />} />
      <Route path="/team/level-3/inactive" component={() => <ProtectedRoute component={DownlinesL3Inactive} />} />
      <Route path="/tournament" component={() => <ProtectedRoute component={Tournament} />} />
      <Route path="/chat-foreigners" component={() => <ProtectedRoute component={ChatForeigners} />} />
      <Route path="/products" component={() => <ProtectedRoute component={Products} />} />
      <Route path="/downloads" component={() => <ProtectedRoute component={Downloads} />} />
      <Route path="/withdraw" component={() => <ProtectedRoute component={Withdraw} />} />
      <Route path="/recharge" component={() => <ProtectedRoute component={Recharge} />} />
      <Route path="/history" component={() => <ProtectedRoute component={History} />} />
      <Route path="/bonus" component={() => <ProtectedRoute component={Bonus} />} />
      <Route path="/surveys" component={() => <ProtectedRoute component={Tasks} />} />
      <Route path="/blogging" component={() => <ProtectedRoute component={Tasks} />} />
      <Route path="/watch" component={() => <ProtectedRoute component={Tasks} />} />
      <Route path="/trivia" component={() => <ProtectedRoute component={Tasks} />} />
      <Route path="/chat-lonely" component={() => <ProtectedRoute component={Tasks} />} />
      <Route path="/pay-client" component={() => <ProtectedRoute component={PayClient} />} />
      <Route path="/verify" component={() => <VerifyRoute />} />
      <Route path="/uganda-pay" component={() => <UgandaPayRoute />} />
      <Route path="/zambia-pay" component={() => <ZambiaPayRoute />} />
      <Route path="/tanzania-pay" component={() => <TanzaniaPayRoute />} />
      <Route path="/cameroon-pay" component={() => <CameroonPayRoute />} />
      <Route path="/congo-pay" component={() => <CongoPayRoute />} />
      <Route path="/malawi-pay" component={() => <MalawiPayRoute />} />
      <Route path="/botswana-pay" component={() => <BotswanaPayRoute />} />
      <Route path="/south-sudan-pay" component={() => <SouthSudanPayRoute />} />
      <Route path="/rwanda-pay" component={() => <RwandaPayRoute />} />
      <Route path="/investments" component={() => <ProtectedRoute component={Investments} />} />
      <Route path="/investments/current" component={() => <ProtectedRoute component={InvestmentsCurrent} />} />
      <Route path="/smtp/debug" component={SmtpDebug} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <LaunchGate>
            <AuthProvider>
              <Router />
            </AuthProvider>
          </LaunchGate>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
