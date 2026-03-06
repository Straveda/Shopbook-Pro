import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LoginPage } from './pages/Auth/Login';
import { Layout } from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Customers from "./pages/Customers";
import CustomerDetail from "./pages/CustomerDetail";
import Credits from "./pages/Credits";
import Reminders from "./pages/Reminders";
import Services from "./pages/Services.tsx";
import Sales from "./pages/Sales";
import SaleDetail from "./pages/SaleDetail";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import Inventory from "./pages/Inventory";
import Vendors from "./pages/Vendors";
import Reports from "./pages/Reports";
import { ForgotPasswordPage } from './pages/Auth/ForgotPassword';
import { ResetPasswordPage } from './pages/Auth/ResetPassword';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Protected Routes - Require Login */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="customers" element={<Customers />} />
            <Route path="customers/:id" element={<CustomerDetail />} />
            <Route path="credits" element={<Credits />} />
            <Route path="reminders" element={<Reminders />} />
            <Route path="services" element={<Services />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="vendors" element={<Vendors />} />
            <Route path="reports" element={<Reports />} />
            <Route path="sales" element={<Sales />} />
            <Route path="sales/:id" element={<SaleDetail />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* Catch All */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;