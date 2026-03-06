// FILE: src/pages/Reports.tsx
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Download, RefreshCw, Filter, X } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import reportsService from "@/services/reportsService";
import { toast } from "sonner";

type ReportTab = 'daily' | 'aging' | 'services' | 'inventory';

interface StatsData {
  [key: string]: number | string;
}

export default function Reports() {
  const [activeTab, setActiveTab] = useState<ReportTab>('daily');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reportData, setReportData] = useState<any[]>([]);
  const [stats, setStats] = useState<StatsData | null>(null);

  // Filter state
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const reportTabs: { id: ReportTab; label: string }[] = [
    { id: 'daily', label: 'Daily' },
    { id: 'aging', label: 'Aging' },
    { id: 'services', label: 'Services' },
    { id: 'inventory', label: 'Inventory' },
  ];

  useEffect(() => {
    fetchReportData(activeTab);
    // Reset category filter when tab changes to non-aging
    if (activeTab !== 'aging') setCategoryFilter("all");
  }, [activeTab]);

  const getFilters = () => ({
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
    category: categoryFilter !== 'all' ? categoryFilter : undefined,
  });

  const fetchReportData = async (tab: ReportTab, customFilters?: { fromDate?: string; toDate?: string; category?: string }) => {
    setLoading(true);
    const filters = customFilters ?? getFilters();
    try {
      let response;
      switch (tab) {
        case 'daily':
          response = await reportsService.getDailyReport(filters);
          break;
        case 'inventory':
          response = await reportsService.getInventoryReport(filters);
          break;
        case 'aging':
          response = await reportsService.getAgingReport(filters);
          break;
        case 'services':
          response = await reportsService.getServicesReport(filters);
          break;
        default:
          return;
      }
      if (response.success) {
        setReportData(response.data || []);
        setStats(response.stats || null);
      } else {
        toast.error("Failed to load report");
        setReportData([]);
        setStats(null);
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

  const handleApplyFilters = () => {
    fetchReportData(activeTab, getFilters());
  };

  const handleClearFilters = () => {
    setFromDate("");
    setToDate("");
    setCategoryFilter("all");
    fetchReportData(activeTab, {});
  };

  const hasActiveFilters = fromDate || toDate || categoryFilter !== "all";

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
    return [
      headers.join(','),
      ...data.map(row =>
        headers.map(header => {
          const value = row[header];
          if (typeof value === 'string' && value.includes(',')) return `"${value}"`;
          return value || '';
        }).join(',')
      )
    ].join('\n');
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
                <p className="text-sm text-muted-foreground">Total Sales</p>
                <p className="text-3xl font-bold text-teal-600">{stats.totalSales}</p>
                <p className="text-xs text-muted-foreground">Transactions in period</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-6">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="text-3xl font-bold text-blue-600">₹{typeof stats.totalAmount === 'number' ? stats.totalAmount.toLocaleString() : stats.totalAmount}</p>
                <p className="text-xs text-muted-foreground">Sale value in period</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-6">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Paid</p>
                <p className="text-3xl font-bold text-green-600">₹{typeof stats.paidAmount === 'number' ? stats.paidAmount.toLocaleString() : stats.paidAmount}</p>
                <p className="text-xs text-muted-foreground">Received in period</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Outstanding</p>
                <p className="text-3xl font-bold text-red-600">₹{typeof stats.outstanding === 'number' ? stats.outstanding.toLocaleString() : stats.outstanding}</p>
                <p className="text-xs text-muted-foreground">Pending in period</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Collection Rate</p>
                <p className="text-3xl font-bold">{stats.completionRate}%</p>
                <p className="text-xs text-muted-foreground">Amount collected</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Paid Sales</p>
                <p className="text-2xl font-bold text-green-600">{stats.paidCount}</p>
                <p className="text-xs text-muted-foreground">Fully paid</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Partial Sales</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.partialCount}</p>
                <p className="text-xs text-muted-foreground">Partially paid</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Unpaid Sales</p>
                <p className="text-2xl font-bold text-red-600">{stats.unpaidCount}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
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
                  ? (
                    key.toLowerCase().includes('amount') ||
                    key.toLowerCase().includes('value') ||
                    key.toLowerCase().includes('price') ||
                    key.toLowerCase().includes('revenue') ||
                    key.toLowerCase().includes('collected') ||
                    (key.toLowerCase().includes('outstanding') && !key.toLowerCase().includes('days'))
                  )
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
            className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${activeTab === tab.id
              ? 'text-teal-600 border-b-2 border-teal-600'
              : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filter Bar */}
      <Card className="border-dashed">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Filter className="h-4 w-4" />
              Filters
            </div>

            {/* From Date */}
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">From Date</span>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="h-9 w-[150px]"
              />
            </div>

            {/* To Date */}
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">To Date</span>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="h-9 w-[150px]"
              />
            </div>

            {/* Category — only for Aging tab */}
            {activeTab === 'aging' && (
              <div className="flex flex-col gap-1 min-w-[160px]">
                <span className="text-xs text-muted-foreground">Customer Category</span>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="regular">Regular</SelectItem>
                    <SelectItem value="retailer">Retailer</SelectItem>
                    <SelectItem value="wholesaler">Wholesaler</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button
              className="h-9 bg-teal-500 hover:bg-teal-600 gap-2"
              onClick={handleApplyFilters}
            >
              <Filter className="h-4 w-4" />
              Apply
            </Button>

            {hasActiveFilters && (
              <Button variant="ghost" className="h-9 gap-2 text-muted-foreground" onClick={handleClearFilters}>
                <X className="h-4 w-4" />
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

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
            {activeTab === 'daily' && 'Sales transactions for selected period with payment status'}
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