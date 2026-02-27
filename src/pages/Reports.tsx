// FILE: src/pages/Reports.tsx (FIXED - Error Free)
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Download, RefreshCw } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import reportsService from "@/services/reportsService";
import salesService from "@/services/salesService";
import { toast } from "sonner";

type ReportTab = 'daily' | 'aging' | 'services' | 'inventory';

interface SaleRecord {
  _id: string;
  saleNumber: string;
  customerName: string;
  customerId?: string;
  totalAmount: number;
  paidAmount: number;
  balanceAmount?: number;
  outstandingAmount?: number;
  status: 'paid' | 'unpaid' | 'partial';
  saleDate?: string;
  createdAt: string;
}

interface StatsData {
  [key: string]: number | string;
}

export default function Reports() {
  const [activeTab, setActiveTab] = useState<ReportTab>('daily');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reportData, setReportData] = useState<any[]>([]);
  const [stats, setStats] = useState<StatsData | null>(null);

  const reportTabs: { id: ReportTab; label: string }[] = [
    { id: 'daily', label: 'Daily' },
    { id: 'aging', label: 'Aging' },
    { id: 'services', label: 'Services' },
    { id: 'inventory', label: 'Inventory' },
  ];

  useEffect(() => {
    fetchReportData(activeTab);
  }, [activeTab]);

  const fetchReportData = async (tab: ReportTab) => {
    setLoading(true);
    try {
      switch(tab) {
        case 'daily':
          await fetchDailySalesData();
          break;
        case 'inventory':
          {
            const response = await reportsService.getInventoryReport();
            setReportData(response.data || []);
            setStats(response.stats || {});
          }
          break;
        case 'aging':
          {
            const response = await reportsService.getAgingReport();
            setReportData(response.data || []);
            setStats(response.stats || {});
          }
          break;
        case 'services':
          {
            const response = await reportsService.getServicesReport();
            setReportData(response.data || []);
            setStats(response.stats || {});
          }
          break;
        default:
          break;
      }
    } catch (error) {
      console.error("Error fetching report:", error);
      toast.error("Failed to load report");
      setReportData([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchDailySalesData = async () => {
    try {
      console.log('📅 Fetching today\'s sales data...');
      const response = await salesService.getAllSales();
      
      if (response.success && Array.isArray(response.data)) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todaysSales = response.data.filter((sale: SaleRecord) => {
          const saleDate = new Date(sale.saleDate || sale.createdAt);
          saleDate.setHours(0, 0, 0, 0);
          return saleDate.getTime() === today.getTime();
        });

        const formattedData = todaysSales.map((sale: SaleRecord) => ({
          'Sale Number': sale.saleNumber,
          'Customer': sale.customerName,
          'Total Amount': `₹${sale.totalAmount.toLocaleString()}`,
          'Paid Amount': `₹${sale.paidAmount.toLocaleString()}`,
          'Outstanding': `₹${(sale.outstandingAmount ?? sale.balanceAmount ?? 0).toLocaleString()}`,
          'Status': sale.status.charAt(0).toUpperCase() + sale.status.slice(1),
          'Time': new Date(sale.saleDate || sale.createdAt).toLocaleTimeString('en-IN'),
        }));

        setReportData(formattedData);

        const totalSales = todaysSales.length;
        const totalAmount = todaysSales.reduce((sum: number, sale: SaleRecord) => sum + (sale.totalAmount || 0), 0);
        const paidAmount = todaysSales.reduce((sum: number, sale: SaleRecord) => sum + (sale.paidAmount || 0), 0);
        const outstanding = todaysSales.reduce((sum: number, sale: SaleRecord) => {
          const outstandingAmt = sale.outstandingAmount ?? sale.balanceAmount ?? 0;
          return sum + outstandingAmt;
        }, 0);

        const paidSales = todaysSales.filter((s: SaleRecord) => s.status === 'paid').length;
        const partialSales = todaysSales.filter((s: SaleRecord) => s.status === 'partial').length;
        const unpaidSales = todaysSales.filter((s: SaleRecord) => s.status === 'unpaid').length;

        setStats({
          totalSales,
          totalAmount,
          paidAmount,
          outstanding,
          paidCount: paidSales,
          partialCount: partialSales,
          unpaidCount: unpaidSales,
          completionRate: totalAmount > 0 ? ((paidAmount / totalAmount) * 100).toFixed(1) : 0
        });

        console.log('✅ Today\'s sales data loaded:', { totalSales, totalAmount, outstanding });
      } else {
        setReportData([]);
        setStats(null);
      }
    } catch (error) {
      console.error("Error fetching daily sales data:", error);
      toast.error("Failed to load daily sales data");
      setReportData([]);
      setStats(null);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchReportData(activeTab);
    setRefreshing(false);
    toast.success("Report refreshed");
  };

  const handleDownloadPDF = () => {
    toast.success("Preparing PDF download...");
  };

  const handleExportCSV = () => {
    if (reportData.length === 0) {
      toast.error("No data to export");
      return;
    }

    const csv = convertToCSV(reportData);
    downloadCSV(csv, `${activeTab}_report`);
    toast.success("Report exported successfully");
  };

  const convertToCSV = (data: any[]) => {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row =>
        headers.map(header => {
          const value = row[header];
          if (typeof value === 'string' && value.includes(',')) {
            return `"${value}"`;
          }
          return value || '';
        }).join(',')
      )
    ].join('\n');

    return csvContent;
  };

  const downloadCSV = (csv: string, fileName: string) => {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `${fileName}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderStatsCards = () => {
    if (!stats) return null;

    if (activeTab === 'daily') {
      return (
        <>
          <Card className="border-teal-200 bg-teal-50">
            <CardContent className="p-6">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Today's Sales</p>
                <p className="text-3xl font-bold text-teal-600">{stats.totalSales}</p>
                <p className="text-xs text-muted-foreground">Transactions today</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-6">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Today's Amount</p>
                <p className="text-3xl font-bold text-blue-600">₹{typeof stats.totalAmount === 'number' ? stats.totalAmount.toLocaleString() : stats.totalAmount}</p>
                <p className="text-xs text-muted-foreground">Sale value today</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-6">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Paid Today</p>
                <p className="text-3xl font-bold text-green-600">₹{typeof stats.paidAmount === 'number' ? stats.paidAmount.toLocaleString() : stats.paidAmount}</p>
                <p className="text-xs text-muted-foreground">Received today</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Outstanding Today</p>
                <p className="text-3xl font-bold text-red-600">₹{typeof stats.outstanding === 'number' ? stats.outstanding.toLocaleString() : stats.outstanding}</p>
                <p className="text-xs text-muted-foreground">Pending from today</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Collection Rate</p>
                <p className="text-3xl font-bold">{stats.completionRate}%</p>
                <p className="text-xs text-muted-foreground">Amount collected today</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Paid Sales</p>
                <p className="text-2xl font-bold text-green-600">{stats.paidCount}</p>
                <p className="text-xs text-muted-foreground">Fully paid today</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Partial Sales</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.partialCount}</p>
                <p className="text-xs text-muted-foreground">Partially paid today</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Unpaid Sales</p>
                <p className="text-2xl font-bold text-red-600">{stats.unpaidCount}</p>
                <p className="text-xs text-muted-foreground">Pending from today</p>
              </div>
            </CardContent>
          </Card>
        </>
      );
    }

    // Generic stats for other reports
    return Object.entries(stats)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => (
        <Card key={key}>
          <CardContent className="p-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground capitalize">
                {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
              </p>
              <p className="text-2xl font-bold">
                {typeof value === 'number' 
                  ? (key.includes('amount') || key.includes('value') || key.includes('total'))
                    ? `₹${value.toLocaleString()}`
                    : value.toLocaleString()
                  : String(value)
                }
              </p>
            </div>
          </CardContent>
        </Card>
      ));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="text-muted-foreground">View and analyze business data</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" className="gap-2" onClick={handleDownloadPDF}>
            <Download className="h-4 w-4" />
            PDF
          </Button>
          <Button className="gap-2 bg-teal-500 hover:bg-teal-600" onClick={handleExportCSV}>
            <Download className="h-4 w-4" />
            CSV
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b overflow-x-auto">
        {reportTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'text-teal-600 border-b-2 border-teal-600'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {renderStatsCards()}
      </div>

      {/* Report Content */}
      <Card>
        <CardHeader>
          <CardTitle>
            {activeTab === 'daily' && 'Daily Sales Report'}
            {activeTab === 'inventory' && 'Stock Report'}
            {activeTab === 'aging' && 'Aging Report'}
            {activeTab === 'services' && 'Services Report'}
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            {activeTab === 'daily' && 'Real-time sales transactions for today with payment status'}
            {activeTab === 'inventory' && 'Current stock levels and reorder list'}
            {activeTab === 'aging' && 'Customer outstanding amounts and aging'}
            {activeTab === 'services' && 'Services performance and statistics'}
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
            </div>
          ) : reportData.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {Object.keys(reportData[0]).map((header) => (
                      <TableHead key={header} className="font-semibold">
                        {header}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.map((row, idx) => (
                    <TableRow key={idx}>
                      {Object.values(row).map((cell: any, cellIdx) => (
                        <TableCell key={cellIdx}>
                          {cell || '-'}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No data available for this report</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}