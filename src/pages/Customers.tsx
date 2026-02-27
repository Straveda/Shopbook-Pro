import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, UserPlus, Eye, Phone, MapPin, Loader, Download, Upload, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AddCustomerDialog } from "@/components/AddCustomerDialog";
import { ReceivePaymentDialog } from "@/components/ReceivePaymentDialog";
import { toast } from "sonner";
import customerService, { Customer } from "@/services/customerService";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Customers() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
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

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const response = await customerService.getAllCustomers();
      if (response.success) {
        setCustomers(response.data as Customer[]);
      } else {
        toast.error(response.message || "Failed to fetch customers");
      }
    } catch (error) {
      console.error("Error fetching customers:", error);
      toast.error("Error fetching customers");
    } finally {
      setLoading(false);
    }
  };

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
      const headers = ["Name", "Phone", "Alt Phone", "Address", "City", "Credit Limit", "Outstanding", "Total Paid", "Last Transaction"];
      const rows = customers.map((customer) => [
        customer.name,
        customer.phone,
        customer.altPhone || "",
        customer.address || "",
        customer.city || "",
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

    // Find column indices
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
      const paymentType = values[idx.paymentType]?.toLowerCase(); // full | partial | pending
      const paidAmountValue = parseFloat(values[idx.paidAmount] || "0");
      const dueDateRaw = values[idx.dueDate];

      if (!name || !phone || phone.length !== 10 || !totalAmount) {
        errorCount++;
        continue;
      }

      // 1. Create customer
      let customerResponse;
      try {
        customerResponse = await customerService.addCustomer({
          name,
          phone,
          altPhone: altPhone || "",
          address: address || "",
          city: city || "",
          creditLimit: totalAmount
        });
      } catch {
        errorCount++;
        continue;
      }

      if (!customerResponse?.success) {
        errorCount++;
        continue;
      }

      const customerId = customerResponse.data._id;

      // 2. Create transaction
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

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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

      <div className="grid gap-4">
        {filteredCustomers.map((customer) => (
          <Card key={customer._id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold">{customer.name}</h3>
                    {customer.outstanding > 0 && (
                      <Badge variant="destructive">
                        ₹{customer.outstanding.toLocaleString()} Outstanding
                      </Badge>
                    )}
                    {customer.outstanding === 0 && (
                      <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                        Clear
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {customer.phone}
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {customer.city || customer.address}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Last transaction: {customer.lastTransaction ? new Date(customer.lastTransaction).toLocaleDateString() : "No transactions"}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => navigate(`/customers/${customer._id}`)}
                  >
                    <Eye className="h-4 w-4" />
                    View Details
                  </Button>
                  {customer.outstanding > 0 && (
                    <Button size="sm" className="gap-2 bg-teal-500 hover:bg-teal-600" onClick={() => handleReceivePayment(customer)}>
                      Receive Payment
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="destructive"
                    className="gap-2"
                    onClick={() => handleDeleteClick(customer)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredCustomers.length === 0 && !loading && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No customers found</p>
        </div>
      )}

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
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDeleteCustomer} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Delete
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}