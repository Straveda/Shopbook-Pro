import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Wallet, Search, UserPlus, Eye, Phone, Loader2,
  Download, Upload, Trash2, MoreVertical, ExternalLink, Filter, X
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AddCustomerDialog } from "@/components/AddCustomerDialog";
import { ReceivePaymentDialog } from "@/components/ReceivePaymentDialog";
import { toast } from "sonner";
import customerService, { Customer } from "@/services/customerService";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  regular: { label: "Regular", color: "bg-blue-100 text-blue-700 border-blue-200" },
  retailer: { label: "Retailer", color: "bg-purple-100 text-purple-700 border-purple-200" },
  wholesaler: { label: "Wholesaler", color: "bg-amber-100 text-amber-700 border-amber-200" },
};

export default function Customers() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  const [receivePaymentOpen, setReceivePaymentOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [exporting, setExporting] = useState(false);

  // Fetch customers
  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async (params?: {
    search?: string;
    category?: string;
    fromDate?: string;
    toDate?: string;
  }) => {
    setLoading(true);
    console.log("🔄 Fetching customers with params:", params);
    try {
      const response = await customerService.getAllCustomers(params || {});
      console.log("✅ API Raw Response:", response);

      if (response && response.success) {
        // Handle possible data nesting
        const dataList = Array.isArray(response.data)
          ? response.data
          : (response.data && typeof response.data === 'object' && Array.isArray((response.data as any).data))
            ? (response.data as any).data
            : [];

        console.log("📊 Set customers list:", dataList);
        setCustomers(dataList);
      } else {
        toast.error(response?.message || "Failed to fetch customers");
      }
    } catch (error) {
      console.error("❌ Error fetching customers:", error);
      toast.error("Error fetching customers");
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = () => {
    fetchCustomers({
      search: searchQuery || undefined,
      category: categoryFilter !== "all" ? categoryFilter : undefined,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
    });
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setCategoryFilter("all");
    setFromDate("");
    setToDate("");
    fetchCustomers({});
  };

  const hasActiveFilters = searchQuery || categoryFilter !== "all" || fromDate || toDate;

  const handleReceivePayment = (customer: Customer) => {
    setSelectedCustomer(customer);
    setReceivePaymentOpen(true);
  };

  const handleDeleteClick = (customer: Customer) => {
    setCustomerToDelete(customer);
    setDeleteDialogOpen(true);
  };

  const handleDeleteCustomer = async () => {
    if (!customerToDelete) return;
    try {
      const response = await customerService.deleteCustomer(customerToDelete._id);
      if (response.success) {
        toast.success("Customer deleted successfully");
        await fetchCustomers();
      } else {
        toast.error(response.message || "Failed to delete customer");
      }
    } catch (error) {
      console.error("Error deleting customer:", error);
      toast.error("Error deleting customer");
    } finally {
      setDeleteDialogOpen(false);
      setCustomerToDelete(null);
    }
  };

  const handleCustomerAdded = async () => {
    setAddCustomerOpen(false);
    await fetchCustomers();
    toast.success("Customer added successfully");
  };

  const handlePaymentReceived = async () => {
    setReceivePaymentOpen(false);
    setSelectedCustomer(null);
    await fetchCustomers();
    toast.success("Payment received successfully");
  };

  // Export to CSV
  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const headers = ["Name", "Phone", "Alt Phone", "Address", "City", "Category", "Credit Limit", "Outstanding", "Total Paid", "Last Transaction"];
      const rows = customers.map((customer) => [
        customer.name,
        customer.phone,
        customer.altPhone || "",
        customer.address || "",
        customer.city || "",
        customer.category || "regular",
        customer.creditLimit,
        customer.outstanding,
        customer.totalPaid,
        customer.lastTransaction ? new Date(customer.lastTransaction).toLocaleDateString() : "",
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map((row) =>
          row
            .map((cell) => {
              const cellStr = String(cell);
              return cellStr.includes(",") ? `"${cellStr}"` : cellStr;
            })
            .join(",")
        ),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `customers_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Customers exported successfully");
    } catch (error) {
      console.error("Error exporting CSV:", error);
      toast.error("Error exporting CSV");
    } finally {
      setExporting(false);
    }
  };

  // Import from CSV
  const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const lines = text.split("\n");
      const headers = lines[0].split(",");

      const idx = {
        name: headers.findIndex((h) => h.toLowerCase().includes("name")),
        phone: headers.findIndex((h) => h.toLowerCase() === "phone"),
        altPhone: headers.findIndex((h) => h.toLowerCase().includes("alt")),
        address: headers.findIndex((h) => h.toLowerCase().includes("address")),
        city: headers.findIndex((h) => h.toLowerCase().includes("city")),
        totalAmount: headers.findIndex((h) => h.toLowerCase().includes("total")),
        paymentType: headers.findIndex((h) => h.toLowerCase().includes("payment")),
        paidAmount: headers.findIndex((h) => h.toLowerCase().includes("paid")),
        dueDate: headers.findIndex((h) => h.toLowerCase().includes("due")),
        category: headers.findIndex((h) => h.toLowerCase().includes("category")),
      };

      let successCount = 0;
      let errorCount = 0;

      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const values = lines[i].split(",").map((v) => v.replace(/^"|"$/g, "").trim());

        const name = values[idx.name];
        const phone = values[idx.phone];
        const altPhone = values[idx.altPhone];
        const address = values[idx.address];
        const city = values[idx.city];
        const totalAmount = parseFloat(values[idx.totalAmount]);
        const paymentType = values[idx.paymentType]?.toLowerCase();
        const paidAmountValue = parseFloat(values[idx.paidAmount] || "0");
        const dueDateRaw = values[idx.dueDate];

        const categoryRaw = values[idx.category]?.toLowerCase() || 'regular';
        const validCategories = ['regular', 'retailer', 'wholesaler'];
        const category = validCategories.includes(categoryRaw as any) ? categoryRaw : 'regular';

        if (!name || !phone || phone.length !== 10 || !totalAmount) {
          errorCount++;
          continue;
        }

        let customerResponse;
        try {
          customerResponse = await customerService.addCustomer({
            name, phone,
            altPhone: altPhone || "",
            address: address || "",
            city: city || "",
            creditLimit: totalAmount,
            category
          });
        } catch {
          errorCount++;
          continue;
        }

        if (!(customerResponse && customerResponse.success)) {
          errorCount++;
          continue;
        }

        // Handle data nesting in response
        const responseData = (customerResponse as any).data;
        const customerId = responseData?._id || responseData?.customer?._id || (responseData?.data?._id);

        if (!customerId) {
          console.error("❌ Could not find customer ID in CSV import response:", customerResponse);
          errorCount++;
          continue;
        }

        let transactionData: any = {
          description: "Initial bill",
          amount: totalAmount,
          paymentType,
          paidAmount: paidAmountValue,
        };

        if (paymentType === "partial" || paymentType === "pending") {
          if (dueDateRaw) {
            transactionData.dueDate = new Date(dueDateRaw).toISOString();
          }
        }

        try {
          await customerService.addTransaction(customerId, transactionData);
          successCount++;
        } catch {
          errorCount++;
        }
      }

      toast.success(`Imported ${successCount} customers successfully${errorCount > 0 ? `, ${errorCount} failed` : ""}`);
      await fetchCustomers();
    } catch (error) {
      console.error("Error importing CSV:", error);
      toast.error("Error importing CSV file");
    }

    event.target.value = "";
  };

  // Client-side search fallback (for typing without pressing Apply)
  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.phone.includes(searchQuery)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Customers</h1>
          <p className="text-muted-foreground">Manage your customer database</p>
        </div>
        <Button className="gap-2 bg-teal-500 hover:bg-teal-600" onClick={() => setAddCustomerOpen(true)}>
          <UserPlus className="h-4 w-4" />
          Add Customer
        </Button>
      </div>

      {/* Search + Export/Import row */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleApplyFilters()}
            className="pl-10"
          />
        </div>
        <Button variant="outline" className="gap-2" onClick={handleExportCSV} disabled={exporting}>
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
        <div className="relative">
          <input
            type="file"
            accept=".csv"
            onChange={handleImportCSV}
            className="hidden"
            id="csv-import"
          />
          <label htmlFor="csv-import">
            <Button variant="outline" className="gap-2" asChild>
              <span>
                <Upload className="h-4 w-4" />
                Import CSV
              </span>
            </Button>
          </label>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="border-dashed">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Filter className="h-4 w-4" />
              Filters
            </div>

            {/* Category Filter */}
            <div className="flex flex-col gap-1 min-w-[160px]">
              <span className="text-xs text-muted-foreground">Category</span>
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

      <Card className="border-none shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Outstanding</TableHead>
              <TableHead>Last Transaction</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading customers...
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredCustomers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No customers found. Increase your reach or add your first customer!
                </TableCell>
              </TableRow>
            ) : (
              filteredCustomers.map((customer) => {
                const customerCategory = (customer.category || "regular").toLowerCase();
                const cat = CATEGORY_LABELS[customerCategory] || CATEGORY_LABELS.regular;
                return (
                  <TableRow key={customer._id} className="hover:bg-muted/30 transition-colors">
                    <TableCell>
                      <div className="font-medium text-base">{customer.name}</div>
                      <div className="text-xs text-muted-foreground">{customer.city || customer.address || 'No address'}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        {customer.phone}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cat.color}`}>
                        {cat.label}
                      </span>
                    </TableCell>
                    <TableCell>
                      {customer.outstanding > 0 ? (
                        <Badge variant="destructive" className="font-semibold">
                          ₹{customer.outstanding.toLocaleString()}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">
                          Clear
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {customer.lastTransaction ? new Date(customer.lastTransaction).toLocaleDateString() : "None"}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => navigate(`/customers/${customer._id}`)}
                          title="View Details"
                        >
                          <Eye className="h-4 w-4 text-blue-500" />
                        </Button>

                        {customer.outstanding > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-teal-600 hover:text-teal-700 hover:bg-teal-50"
                            onClick={() => handleReceivePayment(customer)}
                          >
                            <Wallet className="h-4 w-4 mr-1" />
                            Pay
                          </Button>
                        )}

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => navigate(`/customers/${customer._id}`)}>
                              <ExternalLink className="mr-2 h-4 w-4" /> View Details
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                              onClick={() => handleDeleteClick(customer)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      <AddCustomerDialog
        open={addCustomerOpen}
        onOpenChange={setAddCustomerOpen}
        onSuccess={handleCustomerAdded}
      />
      {selectedCustomer && (
        <ReceivePaymentDialog
          open={receivePaymentOpen}
          onOpenChange={setReceivePaymentOpen}
          customer={selectedCustomer}
          onSuccess={handlePaymentReceived}
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Customer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{customerToDelete?.name}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCustomer} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}