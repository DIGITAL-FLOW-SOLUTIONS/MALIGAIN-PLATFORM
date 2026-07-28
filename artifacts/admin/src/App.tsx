import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Layout from "@/components/Layout";
import { useAdmin } from "@/hooks/useAdmin";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Users from "@/pages/users";
import Verifications from "@/pages/verifications";
import Transactions from "@/pages/transactions";
import Tasks from "@/pages/tasks";
import Audit from "@/pages/audit";
import Admins from "@/pages/admins";
import Withdrawals from "@/pages/withdrawals";
import ReferralBonuses from "@/pages/referral-bonuses";
import Settings from "@/pages/settings";
import Control from "@/pages/control";
import NotFound from "@/pages/not-found";
import InvestmentPlans from "@/pages/investment-plans";
import InvestmentAccounts from "@/pages/investment-accounts";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { admin, loading } = useAdmin();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500" />
      </div>
    );
  }

  if (!admin) return <Login />;

  return <Layout>{children}</Layout>;
}

function Router() {
  return (
    <AuthGuard>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/users" component={Users} />
        <Route path="/verifications" component={Verifications} />
        <Route path="/transactions" component={Transactions} />
        <Route path="/tasks" component={Tasks} />
        <Route path="/audit" component={Audit} />
        <Route path="/withdrawals" component={Withdrawals} />
        <Route path="/referral-bonuses" component={ReferralBonuses} />
        <Route path="/admins" component={Admins} />
        <Route path="/settings" component={Settings} />
        <Route path="/control" component={Control} />
        <Route path="/investment-plans" component={InvestmentPlans} />
        <Route path="/investment-accounts" component={InvestmentAccounts} />
        <Route component={NotFound} />
      </Switch>
    </AuthGuard>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
