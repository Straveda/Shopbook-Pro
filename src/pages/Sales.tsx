// FILE: src/pages/Sales.tsx (CLEAN VERSION)
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Eye, Trash2, Loader2, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import salesService from "@/services/salesService";
import { toast } from "sonner";
import { NewSaleDialog } from "@/components/NewSaleDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface SaleRecord {
  _id: string;
  saleNumber: string;
  customerName: string;
  customerId: string;
  totalAmount: number;
  paidAmount: number;
  balanceAmount?: number;
  outstandingAmount?: number;
  status: 'paid' | 'unpaid' | 'partial';
  saleDate?: string;
  createdAt: string;
}

export default function Sales() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [newSaleDialogOpen, setNewSaleDialogOpen] = useState(false);
  const [saleToDelete, setSaleToDelete] = useState<SaleRecord | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'unpaid' | 'partial' | 'paid'>('all');
  const [stats, setStats] = useState({
    totalSales: 0,
    totalAmount: 0,
    paidAmount: 0,
    outstanding: 0
  });

  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSales = async () => {
    setLoading(true);
    try {
      console.log('🔄 Fetching sales...');
      const response = await salesService.getAllSales();
      
      if (response.success) {
        const salesData = Array.isArray(response.data) ? response.data : [];
        
        console.log('✅ Sales loaded:', salesData.length);
        
        setSales(salesData);
        
        // Calculate stats
        const totalSales = salesData.length;
        const totalAmount = salesData.reduce((sum, sale) => sum + (sale.totalAmount || 0), 0);
        const paidAmount = salesData.reduce((sum, sale) => sum + (sale.paidAmount || 0), 0);
        const outstanding = salesData.reduce((sum, sale) => {
          const outstandingAmt = sale.outstandingAmount ?? sale.balanceAmount ?? 0;
          return sum + outstandingAmt;
        }, 0);
        
        setStats({
          totalSales,
          totalAmount,
          paidAmount,
          outstanding
        });
      } else {
        console.error('❌ Response not successful:', response.message);
        toast.error(response.message || "Failed to load sales");
        setSales([]);
      }
    } catch (error) {
      console.error("❌ Error fetching sales:", error);
      toast.error("Failed to load sales");
      setSales([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchSales();
    setRefreshing(false);
    toast.success("Sales refreshed");
  };

  const handleDeleteClick = (sale: SaleRecord) => {
    setSaleToDelete(sale);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!saleToDelete) return;

    try {
      const response = await salesService.deleteSale(saleToDelete._id);
      if (response.success) {
        toast.success("Sale deleted successfully");
        await fetchSales();
      } else {
        toast.error(response.message || "Failed to delete sale");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete sale");
    } finally {
      setDeleteDialogOpen(false);
      setSaleToDelete(null);
    }
  };

  const filteredSales = sales.filter(sale => {
    const matchesSearch = 
      sale.saleNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sale.customerName?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = selectedStatus === 'all' || sale.status === selectedStatus;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-700 border-green-300">Paid</Badge>;
      case 'unpaid':
        return <Badge className="bg-red-100 text-red-700 border-red-300">Unpaid</Badge>;
      case 'partial':
        return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300">Partial</Badge>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
        <p className="ml-3 text-muted-foreground">Loading sales...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sales</h1>
          <p className="text-muted-foreground">Record and manage sales transactions</p>
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
          <Button 
            className="gap-2 bg-teal-500 hover:bg-teal-600" 
            onClick={() => setNewSaleDialogOpen(true)}
          >
            <Plus className="h-4 w-4" />
            New Sale
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Total Sales</p>
              <p className="text-3xl font-bold">{stats.totalSales}</p>
              <p className="text-xs text-muted-foreground">All time</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-teal-200 bg-teal-50">
          <CardContent className="p-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Total Amount</p>
              <p className="text-3xl font-bold text-teal-600">₹{stats.totalAmount.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">All sales</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Paid Amount</p>
              <p className="text-3xl font-bold text-blue-600">₹{stats.paidAmount.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Received</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Outstanding</p>
              <p className="text-3xl font-bold text-red-600">₹{stats.outstanding.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by customer name or sale number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Status Tabs */}
        <div className="flex gap-2 flex-wrap">
          {[
            { value: 'all', label: `All (${sales.length})` },
            { value: 'unpaid', label: `Unpaid (${sales.filter(s => s.status === 'unpaid').length})` },
            { value: 'partial', label: `Partial (${sales.filter(s => s.status === 'partial').length})` },
            { value: 'paid', label: `Paid (${sales.filter(s => s.status === 'paid').length})` }
          ].map(tab => (
            <button
              key={tab.value}
              onClick={() => setSelectedStatus(tab.value as any)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedStatus === tab.value
                  ? 'bg-teal-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sales List */}
      <div className="space-y-3">
        {filteredSales.length > 0 ? (
          filteredSales.map((sale) => {
            const outstandingAmount = sale.outstandingAmount ?? sale.balanceAmount ?? 0;
            
            return (
              <Card key={sale._id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex-1 space-y-2 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="text-lg font-semibold">{sale.saleNumber}</h3>
                        {getStatusBadge(sale.status)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Customer: {sale.customerName}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {sale.saleDate ? new Date(sale.saleDate).toLocaleDateString('en-IN') : 
                         new Date(sale.createdAt).toLocaleDateString('en-IN')}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Total</p>
                          <p className="font-semibold">₹{sale.totalAmount.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Paid</p>
                          <p className="font-semibold text-green-600">₹{sale.paidAmount.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Outstanding</p>
                          <p className="font-semibold text-red-600">₹{outstandingAmount.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => navigate(`/sales/${sale._id}`)}
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDeleteClick(sale)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {searchQuery ? "No sales found matching your search" : "No sales yet. Create one to get started!"}
            </p>
            {sales.length === 0 && !searchQuery && (
              <Button 
                className="mt-4 gap-2 bg-teal-500 hover:bg-teal-600" 
                onClick={() => setNewSaleDialogOpen(true)}
              >
                <Plus className="h-4 w-4" />
                Create Your First Sale
              </Button>
            )}
          </div>
        )}
      </div>

      {/* New Sale Dialog */}
      <NewSaleDialog
        open={newSaleDialogOpen}
        onOpenChange={setNewSaleDialogOpen}
        onSuccess={fetchSales}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Sale</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete sale {saleToDelete?.saleNumber}? This action cannot be undone.
              {saleToDelete && (saleToDelete.outstandingAmount ?? saleToDelete.balanceAmount ?? 0) > 0 && (
                <span className="block mt-2 text-red-600 font-semibold">
                  ⚠️ Outstanding amount: ₹{((saleToDelete.outstandingAmount ?? saleToDelete.balanceAmount ?? 0)).toLocaleString()}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}