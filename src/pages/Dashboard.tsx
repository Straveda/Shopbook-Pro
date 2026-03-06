// FILE: client/src/pages/Dashboard.tsx - FIXED WITH PROPER LIMITS
import { useState, useEffect } from "react";
import { DashboardCard } from "@/components/DashboardCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet, TrendingUp, AlertCircle, Package, Send, UserPlus, FileText, Loader2, RefreshCw, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { AddCustomerDialog } from "@/components/AddCustomerDialog";
import { AddCreditDialog } from "@/components/AddCreditDialog";
import { ReceivePaymentDialog } from "@/components/ReceivePaymentDialog";
import { QuickSaleDialog } from "@/components/QuickSaleDialog";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import dashboardService from "@/services/dashboardService";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // State for dialogs
  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  const [addCreditOpen, setAddCreditOpen] = useState(false);
  const [quickSaleOpen, setQuickSaleOpen] = useState(false);
  const [receivePaymentOpen, setReceivePaymentOpen] = useState(false);
  const [selectedPaymentCustomer, setSelectedPaymentCustomer] = useState<{
    name: string;
    outstanding: number;
    _id?: string;
  } | null>(null);

  // Dashboard data state
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [salesTrend, setSalesTrend] = useState<any[]>([]);
  const [collectionStats, setCollectionStats] = useState<any>(null);
  const [customerStats, setCustomerStats] = useState<any>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Auto-refresh dashboard every 1 minute
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('Auto-refreshing dashboard...');
      fetchDashboardData();
    }, 60000); // 1 minute (60,000 ms)

    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    if (loading && !refreshing) {
      setLoading(true);
    }
    try {
      console.log('Loading dashboard...');
      const response = await dashboardService.getCompleteDashboard();

      if (response.success) {
        setDashboardData(response.data.summary);
        setSalesTrend(response.data.trend);
        setCollectionStats(response.data.collection);
        setCustomerStats(response.data.customers);
        console.log('Dashboard loaded successfully');

        // Show refresh notification if it was a manual refresh
        if (refreshing) {
          console.log('Dashboard refreshed with latest data');
        }
      } else {
        toast.error('Failed to load dashboard');
      }
    } catch (error: any) {
      console.error('Dashboard error:', error);
      toast.error(error.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    toast.success('Dashboard refreshed with latest data');
  };

  const handleSendReminders = () => {
    const overdueCount = dashboardData?.overdueCustomers?.length || 0;
    if (overdueCount === 0) {
      toast.info('No overdue customers');
      return;
    }
    navigate('/reminders');
    toast.success(`Go to reminders page to send reminders to ${overdueCount} overdue customers`);
  };

  const handleReceivePayment = (customer: any) => {
    setSelectedPaymentCustomer({
      name: customer.name,
      outstanding: customer.amount,
      _id: customer._id
    });
    setReceivePaymentOpen(true);
  };

  // Handle payment recorded - refresh dashboard immediately
  const handlePaymentRecorded = async () => {
    setReceivePaymentOpen(false);
    console.log('Payment recorded, refreshing dashboard immediately...');
    await fetchDashboardData();
    toast.success('Payment recorded! Dashboard updated.');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const summary = dashboardData?.summary || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome! Here's your shop summary</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={refreshing}
            className="gap-2"
            title="Refresh dashboard data"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={handleSendReminders}
          >
            <Send className="h-4 w-4" />
            Send Reminders
          </Button>
        </div>
      </div>

      {/* Main Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <DashboardCard
          title="Today's Collection"
          value={`₹${(summary.todaysCollection || 0).toLocaleString()}`}
          icon={Wallet}
          variant="success"
          subtitle={`${(summary.todaysCollection > 0 ? '+' : '')}₹${(summary.todaysCollection || 0)}`}
        />
        <DashboardCard
          title="Total Outstanding"
          value={`₹${(summary.totalOutstanding || 0).toLocaleString()}`}
          icon={TrendingUp}
          variant="default"
          subtitle={`From ${summary.activeCredits || 0} customers`}
        />
        <DashboardCard
          title="Overdue Payments"
          value={`₹${(summary.overdueAmount || 0).toLocaleString()}`}
          icon={AlertCircle}
          variant="destructive"
          subtitle={`${dashboardData?.overdueCustomers?.length || 0} customers`}
        />
        <DashboardCard
          title="Low Stock Items"
          value={summary.lowStockItems || 0}
          icon={Package}
          variant="warning"
          subtitle="Needs reorder"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Additional Stats */}
        <Card className="border-2 border-blue-200 bg-blue-50">
          <CardContent className="p-6">
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-600">Total Customers</div>
              <div className="text-3xl font-bold text-blue-600">{summary.totalCustomers || 0}</div>
              <div className="text-xs text-gray-600">
                {customerStats?.newCustomers || 0} new this month
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-purple-200 bg-purple-50">
          <CardContent className="p-6">
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-600">Total Revenue</div>
              <div className="text-3xl font-bold text-purple-600">
                ₹{(summary.totalRevenue || 0).toLocaleString()}
              </div>
              <div className="text-xs text-gray-600">
                {summary.totalSales || 0} sales
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-green-200 bg-green-50">
          <CardContent className="p-6">
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-600">Amount Collected</div>
              <div className="text-3xl font-bold text-green-600">
                ₹{(summary.totalPaidAmount || 0).toLocaleString()}
              </div>
              {collectionStats && (
                <div className="text-xs text-green-600 font-medium">
                  {collectionStats.collectionPercentage.toFixed(1)}% collected
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Sales Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Sales Trend (Last 7 Days)</span>
              <TrendingUp className="h-4 w-4 text-teal-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            {salesTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={salesTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value) => `₹${value}`} />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    stroke="#14b8a6"
                    strokeWidth={2}
                    dot={{ fill: '#14b8a6' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                No sales data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Collection Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Collection Performance</CardTitle>
          </CardHeader>
          <CardContent>
            {collectionStats && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Collection Rate</span>
                    <span className="text-lg font-bold text-teal-600">
                      {collectionStats.collectionPercentage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-teal-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${collectionStats.collectionPercentage}%` }}
                    ></div>
                  </div>
                </div>

                <div className="pt-4 border-t space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Expected Amount</span>
                    <span className="font-semibold">₹{collectionStats.totalExpected.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-green-600">Collected</span>
                    <span className="font-semibold text-green-600">₹{collectionStats.collected.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-red-600">Pending</span>
                    <span className="font-semibold text-red-600">₹{collectionStats.pending.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Overdue Customers & Recent Transactions */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Overdue Customers - LIMITED TO 4 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Overdue Payments (Top 4)</CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate('/credits')}
            >
              View All
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboardData?.overdueCustomers && dashboardData.overdueCustomers.length > 0 ? (
                dashboardData.overdueCustomers.slice(0, 4).map((customer: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-lg bg-red-50 hover:bg-red-100 transition-colors border border-red-200"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-sm">{customer.name}</div>
                      <div className="text-xs text-muted-foreground">{customer.phone}</div>
                    </div>
                    <div className="text-right mr-4">
                      <div className="font-bold text-red-600">₹{customer.amount.toLocaleString()}</div>
                      <Badge variant="destructive" className="text-xs mt-1">
                        {customer.daysOverdue} days
                      </Badge>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2"
                      onClick={() => handleReceivePayment(customer)}
                    >
                      <Wallet className="h-3 w-3" />
                      Pay
                    </Button>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No overdue payments</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Transactions - LIMITED TO 4 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Recent Transactions (Latest 4)</CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate('/customers')}
            >
              View All
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboardData?.recentTransactions && dashboardData.recentTransactions.length > 0 ? (
                dashboardData.recentTransactions.slice(0, 4).map((transaction: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-sm">{transaction.customerName}</div>
                      <div className="text-xs text-muted-foreground">{transaction.description}</div>
                    </div>
                    <div className="text-right">
                      <div className={`font-semibold ${transaction.type === 'Payment' ? 'text-green-600' : 'text-red-600'}`}>
                        {transaction.type === 'Payment' ? '+' : '-'}₹{transaction.amount.toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">{transaction.date}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No recent transactions</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Alert */}
      {dashboardData?.inventoryAlerts && dashboardData.inventoryAlerts.length > 0 && (
        <Card className="border-2 border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              Low Stock Alert
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {dashboardData.inventoryAlerts.map((item: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <span>
                    <strong>{item.itemName}</strong> ({item.itemCode})
                  </span>
                  <span className="text-yellow-700">
                    {item.quantity} {item.unit} (Reorder: {item.reorderLevel})
                  </span>
                </div>
              ))}
            </div>
            <Button
              size="sm"
              className="mt-4 gap-2 bg-yellow-600 hover:bg-yellow-700"
              onClick={() => navigate('/inventory')}
            >
              <Package className="h-4 w-4" />
              Manage Inventory
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button
              variant="outline"
              className="h-20 flex-col gap-2"
              onClick={() => setAddCustomerOpen(true)}
            >
              <UserPlus className="h-6 w-6" />
              Add Customer
            </Button>
            <Button
              variant="outline"
              className="h-20 flex-col gap-2"
              onClick={() => setQuickSaleOpen(true)}
            >
              <FileText className="h-6 w-6" />
              New Sale
            </Button>
            <Button
              variant="outline"
              className="h-20 flex-col gap-2"
              onClick={() => setAddCreditOpen(true)}
            >
              <TrendingUp className="h-6 w-6" />
              Give Credit
            </Button>
            <Button
              variant="outline"
              className="h-20 flex-col gap-2"
              onClick={() => navigate('/credits')}
            >
              <Wallet className="h-6 w-6" />
              Credit Book
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <AddCustomerDialog
        open={addCustomerOpen}
        onOpenChange={setAddCustomerOpen}
        onSuccess={() => {
          setAddCustomerOpen(false);
          fetchDashboardData();
        }}
      />
      <AddCreditDialog
        open={addCreditOpen}
        onOpenChange={setAddCreditOpen}
        onCreditAdded={() => {
          setAddCreditOpen(false);
          fetchDashboardData();
        }}
      />
      <QuickSaleDialog
        open={quickSaleOpen}
        onOpenChange={setQuickSaleOpen}
      />
      {selectedPaymentCustomer && (
        <ReceivePaymentDialog
          open={receivePaymentOpen}
          onOpenChange={setReceivePaymentOpen}
          customer={selectedPaymentCustomer}
          creditId=""
          onPaymentRecorded={handlePaymentRecorded}
        />
      )}
    </div>
  );
}