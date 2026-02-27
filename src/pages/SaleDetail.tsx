// FILE: src/pages/SaleDetail.tsx (FIXED - Complete)
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Printer, Trash2, Loader2, User } from "lucide-react";
import { toast } from "sonner";
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
import salesService from "@/services/salesService";

interface SaleItem {
  description: string;
  quantity: number;
  amount: number;
}

interface Sale {
  _id: string;
  saleNumber: string;
  customerName: string;
  customerId: string;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  outstandingAmount?: number;
  status: 'paid' | 'unpaid' | 'partial';
  saleDate: string;
  createdAt: string;
  items: SaleItem[];
  notes?: string;
}

export default function SaleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const printRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [sale, setSale] = useState<Sale | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (id) {
      fetchSale();
    }
  }, [id]);

  // ✅ Auto-print if coming from Sales page with print flag
  useEffect(() => {
    if (location.state?.print && !loading && sale) {
      setTimeout(() => {
        handlePrint();
      }, 500);
    }
  }, [loading, sale, location.state]);

  const fetchSale = async () => {
    if (!id) {
      toast.error("Invalid sale ID");
      navigate("/sales");
      return;
    }

    setLoading(true);
    try {
      console.log('🔥 Fetching sale:', id);
      const response = await salesService.getSaleById(id);

      if (response.success && response.data) {
        setSale(response.data);
        console.log('✅ Sale fetched:', response.data.saleNumber);
      } else {
        toast.error("Sale not found");
        navigate("/sales");
      }
    } catch (error) {
      console.error("❌ Error fetching sale:", error);
      toast.error("Failed to load sale");
      navigate("/sales");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;

    try {
      const response = await salesService.deleteSale(id);
      if (response.success) {
        toast.success("Sale deleted successfully");
        navigate("/sales");
      } else {
        toast.error(response.message || "Failed to delete sale");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete sale");
    } finally {
      setDeleteDialogOpen(false);
    }
  };

  // ✅ Proper print functionality
  const handlePrint = () => {
    if (!printRef.current) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Failed to open print window");
      return;
    }

    const printContent = printRef.current.innerHTML;
    printWindow.document.write(`
      <html>
        <head>
          <title>Sale ${sale?.saleNumber}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 20px;
              color: #333;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 2px solid #0d9488;
              padding-bottom: 20px;
            }
            .sale-title {
              font-size: 24px;
              font-weight: bold;
              color: #0d9488;
            }
            .sale-number {
              font-size: 12px;
              color: #666;
              margin-top: 5px;
            }
            .details-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              margin-bottom: 30px;
              gap: 20px;
            }
            .detail-section {
              border: 1px solid #e5e7eb;
              padding: 15px;
              border-radius: 5px;
            }
            .detail-section h4 {
              margin: 0 0 10px 0;
              color: #0d9488;
              font-size: 14px;
            }
            .detail-section p {
              margin: 5px 0;
              font-size: 14px;
            }
            .detail-label {
              color: #666;
              font-weight: bold;
            }
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 30px;
              font-size: 14px;
            }
            .items-table th {
              background-color: #f3f4f6;
              padding: 10px;
              text-align: left;
              border: 1px solid #e5e7eb;
              font-weight: bold;
              color: #333;
            }
            .items-table td {
              padding: 10px;
              border: 1px solid #e5e7eb;
            }
            .items-table tr:nth-child(even) {
              background-color: #f9fafb;
            }
            .text-right {
              text-align: right;
            }
            .total-section {
              margin-left: auto;
              width: 300px;
              margin-bottom: 30px;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              padding: 10px 0;
              border-bottom: 1px solid #e5e7eb;
            }
            .total-row.final {
              font-size: 18px;
              font-weight: bold;
              color: #0d9488;
              border-top: 2px solid #0d9488;
              border-bottom: none;
              margin-top: 10px;
              padding-top: 15px;
            }
            .notes-section {
              background-color: #f3f4f6;
              padding: 15px;
              border-radius: 5px;
              margin-bottom: 30px;
              font-size: 13px;
            }
            .footer {
              text-align: center;
              font-size: 12px;
              color: #666;
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
            }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          ${printContent}
          <div class="footer">
            <p>This is a system-generated sale document. No signature required.</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
  };

  // ✅ Navigate to customer details
  const handleViewCustomer = () => {
    if (sale?.customerId) {
      navigate(`/customers/${sale.customerId}`);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Sale not found</p>
      </div>
    );
  }

  const balanceAmount = sale.balanceAmount || sale.outstandingAmount || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/sales")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{sale.saleNumber}</h1>
            <p className="text-muted-foreground">Sale Details</p>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Badge
            className={
              sale.status === "paid"
                ? "bg-green-100 text-green-700 h-fit"
                : sale.status === "partial"
                ? "bg-yellow-100 text-yellow-700 h-fit"
                : "bg-red-100 text-red-700 h-fit"
            }
          >
            {sale.status === "paid" ? "Paid" : sale.status === "partial" ? "Partial" : "Unpaid"}
          </Badge>
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2"
            onClick={handleViewCustomer}
          >
            <User className="h-4 w-4" />
            View Customer
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2" 
            onClick={handlePrint}
          >
            <Printer className="h-4 w-4" />
            Print
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Printable Content */}
      <div ref={printRef} className="space-y-6">
        <div className="grid gap-6 md:grid-cols-3">
          {/* Customer Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Customer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="font-semibold">{sale.customerName}</p>
            </CardContent>
          </Card>

          {/* Sale Amount */}
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Total Amount</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-600">
                ₹{sale.totalAmount.toLocaleString()}
              </p>
            </CardContent>
          </Card>

          {/* Balance */}
          <Card className={balanceAmount > 0 ? "border-red-200 bg-red-50" : "border-green-200 bg-green-50"}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                {balanceAmount > 0 ? "Balance Due" : "Fully Paid"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-3xl font-bold ${balanceAmount > 0 ? "text-red-600" : "text-green-600"}`}>
                ₹{balanceAmount.toLocaleString()}
              </p>
              {sale.paidAmount > 0 && (
                <p className="text-xs text-gray-600 mt-2">
                  Paid: ₹{sale.paidAmount.toLocaleString()}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sale Details */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Sale Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Sale Number:</span>
                <span className="font-mono font-semibold">{sale.saleNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Sale Date:</span>
                <span>{new Date(sale.saleDate).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className="font-semibold capitalize">{sale.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Created:</span>
                <span>{new Date(sale.createdAt).toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Payment Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Amount:</span>
                <span className="font-semibold">₹{sale.totalAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Paid Amount:</span>
                <span className="font-semibold text-green-600">₹{sale.paidAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-t pt-3">
                <span className="text-gray-700 font-medium">Balance:</span>
                <span className={`font-bold text-lg ${balanceAmount > 0 ? "text-red-600" : "text-green-600"}`}>
                  ₹{balanceAmount.toLocaleString()}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Items Table */}
        <Card>
          <CardHeader>
            <CardTitle>Sale Items</CardTitle>
          </CardHeader>
          <CardContent>
            {sale.items && sale.items.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 text-sm font-medium text-gray-600">Description</th>
                      <th className="text-right p-3 text-sm font-medium text-gray-600">Qty</th>
                      <th className="text-right p-3 text-sm font-medium text-gray-600">Rate (₹)</th>
                      <th className="text-right p-3 text-sm font-medium text-gray-600">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sale.items.map((item: SaleItem, index: number) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="p-3 text-sm">{item.description}</td>
                        <td className="p-3 text-sm text-right">{item.quantity}</td>
                        <td className="p-3 text-sm text-right">₹{item.amount.toLocaleString()}</td>
                        <td className="p-3 text-sm text-right font-semibold">
                          ₹{(item.quantity * item.amount).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">No items</p>
            )}
          </CardContent>
        </Card>

        {/* Notes */}
        {sale.notes && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{sale.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Sale</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete sale {sale.saleNumber}? 
              This action cannot be undone and will reverse the customer balance.
              {balanceAmount > 0 && (
                <span className="block mt-2 text-red-600 font-semibold">
                  ⚠️ Outstanding balance of ₹{balanceAmount.toLocaleString()} will be reversed
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
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