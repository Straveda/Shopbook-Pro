import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Phone, MapPin, Wallet, FileText, Loader, Edit, Trash2, CheckCircle, AlertCircle } from "lucide-react";
import { ReceivePaymentDialog } from "@/components/ReceivePaymentDialog";
import { EditCustomerDialog } from "@/components/EditCustomerDialog";
import { EditTransactionDialog } from "@/components/EditTransactionDialog";
import { toast } from "sonner";
import customerService, { Customer } from "@/services/customerService";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface LedgerEntry {
  _id: string;
  customerId: string;
  date: string;
  type: 'Credit' | 'Payment';
  description: string;
  debit: number;
  credit: number;
  balance: number;
  paymentMode?: string;
  remarks?: string;
}

interface Note {
  _id: string;
  customerId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [receivePaymentOpen, setReceivePaymentOpen] = useState(false);
  const [editCustomerOpen, setEditCustomerOpen] = useState(false);
  const [editTransactionOpen, setEditTransactionOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<LedgerEntry | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);

  useEffect(() => {
    fetchCustomerDetails();
  }, [id]);

  const fetchCustomerDetails = async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      const response = await customerService.getCustomerById(id);
      if (response.success) {
        const customerData = response.data as any;
        setCustomer(customerData);
        setLedger(customerData.ledger || []);
        setNotes(customerData.notes || []);
      } else {
        toast.error(response.message || "Failed to fetch customer details");
        navigate("/customers");
      }
    } catch (error) {
      console.error("Error fetching customer:", error);
      toast.error("Error fetching customer details");
      navigate("/customers");
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    if (!customer) return;
    
    setExportingPDF(true);
    try {
      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text("Customer Statement", 105, 20, { align: "center" });
      
      // Customer Details
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text(`Customer: ${customer.name}`, 20, 35);
      doc.text(`Phone: ${customer.phone}`, 20, 42);
      if (customer.address) {
        doc.text(`Address: ${customer.address}${customer.city ? `, ${customer.city}` : ''}`, 20, 49);
      }
      
      // Financial Summary
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Financial Summary", 20, 60);
      doc.setFont("helvetica", "normal");
      doc.text(`Credit Limit: ₹${customer.creditLimit.toLocaleString()}`, 20, 67);
      doc.text(`Outstanding: ₹${customer.outstanding.toLocaleString()}`, 20, 74);
      doc.text(`Total Paid: ₹${customer.totalPaid.toLocaleString()}`, 20, 81);
      
      if (customer.dueDate) {
        doc.text(`Due Date: ${new Date(customer.dueDate).toLocaleDateString()}`, 20, 88);
      }
      
      // Ledger Table
      if (ledger.length > 0) {
        const tableData = ledger.map(entry => [
          new Date(entry.date).toLocaleDateString(),
          entry.type,
          entry.description,
          entry.debit > 0 ? `₹${entry.debit.toLocaleString()}` : '-',
          entry.credit > 0 ? `₹${entry.credit.toLocaleString()}` : '-',
          `₹${entry.balance.toLocaleString()}`
        ]);
        
        autoTable(doc, {
          startY: 95,
          head: [['Date', 'Type', 'Description', 'Debit', 'Credit', 'Balance']],
          body: tableData,
          theme: 'striped',
          headStyles: { fillColor: [20, 184, 166] },
          styles: { fontSize: 9 }
        });
      }
      
      // Footer
      doc.setFontSize(8);
      doc.text(
        `Generated on ${new Date().toLocaleString()}`,
        105,
        doc.internal.pageSize.height - 10,
        { align: "center" }
      );
      
      // Save PDF
      doc.save(`${customer.name}_statement_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success("PDF exported successfully");
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast.error("Failed to export PDF");
    } finally {
      setExportingPDF(false);
    }
  };

  const handlePaymentReceived = async () => {
    setReceivePaymentOpen(false);
    await fetchCustomerDetails();
  };

  const handleCustomerUpdated = async () => {
    setEditCustomerOpen(false);
    await fetchCustomerDetails();
  };

  const handleTransactionUpdated = async () => {
    setEditTransactionOpen(false);
    setSelectedTransaction(null);
    await fetchCustomerDetails();
  };

  const handleEditTransaction = (entry: LedgerEntry) => {
    setSelectedTransaction(entry);
    setEditTransactionOpen(true);
  };

  const handleDeleteCustomer = async () => {
    if (!customer) return;

    try {
      const response = await customerService.deleteCustomer(customer._id);
      if (response.success) {
        toast.success("Customer deleted successfully");
        navigate("/customers");
      } else {
        toast.error(response.message || "Failed to delete customer");
      }
    } catch (error) {
      console.error("Error deleting customer:", error);
      toast.error("Error deleting customer");
    } finally {
      setDeleteDialogOpen(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !customer) return;

    setNoteSaving(true);
    try {
      const response = await customerService.addNote(customer._id, {
        content: newNote
      });

      if (response.success) {
        toast.success("Note added successfully");
        setNewNote("");
        await fetchCustomerDetails();
      } else {
        toast.error(response.message || "Failed to add note");
      }
    } catch (error) {
      console.error("Error adding note:", error);
      toast.error("Error adding note");
    } finally {
      setNoteSaving(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!customer) return;

    try {
      const response = await customerService.deleteNote(customer._id, noteId);

      if (response.success) {
        toast.success("Note deleted successfully");
        await fetchCustomerDetails();
      } else {
        toast.error(response.message || "Failed to delete note");
      }
    } catch (error) {
      console.error("Error deleting note:", error);
      toast.error("Error deleting note");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <Loader className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading customer details...</p>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Customer not found</p>
        <Button onClick={() => navigate("/customers")} className="mt-4">
          Back to Customers
        </Button>
      </div>
    );
  }

  const availableCredit = customer.creditLimit - customer.outstanding;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/customers")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">{customer.name}</h1>
            <p className="text-muted-foreground">Customer Details</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2"
            onClick={() => setEditCustomerOpen(true)}
          >
            <Edit className="h-4 w-4" />
            Edit
          </Button>
          <Button 
            variant="destructive" 
            size="sm" 
            className="gap-2"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{customer.phone}</span>
            </div>
            {customer.altPhone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{customer.altPhone}</span>
              </div>
            )}
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
              <span>
                {customer.address}
                {customer.city && `, ${customer.city}`}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Outstanding Balance */}
        <Card className="border-2 border-destructive/20 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-sm">Outstanding Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${customer.outstanding > 0 ? 'text-destructive' : 'text-green-600'}`}>
              ₹{customer.outstanding.toLocaleString()}
            </div>
            {customer.dueDate && customer.outstanding > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                Due: {new Date(customer.dueDate).toLocaleDateString()}
              </p>
            )}
            {customer.outstanding > 0 && (
              <Button 
                size="sm" 
                className="mt-4 gap-2 w-full bg-teal-500 hover:bg-teal-600" 
                onClick={() => setReceivePaymentOpen(true)}
              >
                <Wallet className="h-3 w-3" />
                Receive Payment
              </Button>
            )}
            {customer.outstanding === 0 && (
              <Badge className="mt-4 w-full justify-center" variant="outline">
                ✓ All Clear
              </Badge>
            )}
          </CardContent>
        </Card>

        {/* Credit Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Credit Limit</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Credit Limit</p>
              <p className="text-2xl font-bold">
                ₹{customer.creditLimit.toLocaleString()}
              </p>
            </div>
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground mb-1">Available Credit</p>
              <p className={`text-lg font-semibold ${availableCredit >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                ₹{availableCredit.toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="ledger" className="space-y-4">
        <TabsList>
          <TabsTrigger value="ledger">Ledger</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        {/* Ledger Tab */}
        <TabsContent value="ledger">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Account Ledger</CardTitle>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleExportPDF}
                disabled={exportingPDF}
              >
                <FileText className="h-4 w-4 mr-2" />
                {exportingPDF ? "Exporting..." : "Export PDF"}
              </Button>
            </CardHeader>
            <CardContent>
              {ledger.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 text-xs font-medium text-muted-foreground">Date</th>
                        <th className="text-left p-3 text-xs font-medium text-muted-foreground">Type</th>
                        <th className="text-left p-3 text-xs font-medium text-muted-foreground">Description</th>
                        <th className="text-right p-3 text-xs font-medium text-muted-foreground">Debit (₹)</th>
                        <th className="text-right p-3 text-xs font-medium text-muted-foreground">Credit (₹)</th>
                        <th className="text-right p-3 text-xs font-medium text-muted-foreground">Balance (₹)</th>
                        <th className="text-center p-3 text-xs font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ledger.map((entry) => (
                        <tr key={entry._id} className="border-b hover:bg-muted/50">
                          <td className="p-3 text-sm">
                            {new Date(entry.date).toLocaleDateString()}
                          </td>
                          <td className="p-3">
                            <Badge variant={entry.type === "Payment" ? "default" : "outline"}>
                              {entry.type}
                            </Badge>
                          </td>
                          <td className="p-3 text-sm">{entry.description}</td>
                          <td className="p-3 text-sm text-right text-destructive font-medium">
                            {entry.debit > 0 ? entry.debit.toLocaleString() : "-"}
                          </td>
                          <td className="p-3 text-sm text-right text-green-600 font-medium">
                            {entry.credit > 0 ? entry.credit.toLocaleString() : "-"}
                          </td>
                          <td className="p-3 text-sm text-right font-bold">
                            {entry.balance.toLocaleString()}
                          </td>
                          <td className="p-3 text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditTransaction(entry)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No ledger entries</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle>Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              {ledger.length > 0 ? (
                <div className="space-y-3">
                  {ledger.map((entry) => (
                    <div key={entry._id} className="p-4 border rounded-lg hover:bg-muted/50 transition">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {entry.type === "Credit" ? (
                              <AlertCircle className="h-4 w-4 text-destructive" />
                            ) : (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            )}
                            <span className="font-medium">{entry.description}</span>
                            <Badge variant={entry.type === "Payment" ? "default" : "outline"}>
                              {entry.type}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {new Date(entry.date).toLocaleDateString()}
                            {entry.paymentMode && ` • ${entry.paymentMode}`}
                          </p>
                          {entry.remarks && (
                            <p className="text-sm text-muted-foreground mt-1">{entry.remarks}</p>
                          )}
                        </div>
                        <div className="text-right flex flex-col items-end gap-2">
                          <div>
                            {entry.debit > 0 && (
                              <p className="text-sm font-semibold text-destructive">
                                ₹{entry.debit.toLocaleString()}
                              </p>
                            )}
                            {entry.credit > 0 && (
                              <p className="text-sm font-semibold text-green-600">
                                ₹{entry.credit.toLocaleString()}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              Balance: ₹{entry.balance.toLocaleString()}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditTransaction(entry)}
                            className="gap-1"
                          >
                            <Edit className="h-3 w-3" />
                            Edit
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No transactions</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes">
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add Note Section */}
              <div className="space-y-2 pb-4 border-b">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add a note..."
                  className="w-full p-3 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  rows={3}
                />
                <Button 
                  onClick={handleAddNote}
                  disabled={!newNote.trim() || noteSaving}
                  size="sm"
                >
                  {noteSaving ? "Saving..." : "Save Note"}
                </Button>
              </div>

              {/* Notes List */}
              {notes.length > 0 ? (
                <div className="space-y-3">
                  {notes.map((note) => (
                    <div key={note._id} className="p-4 border rounded-lg bg-muted/30">
                      <div className="flex items-start justify-between mb-2">
                        <p className="text-sm text-muted-foreground">
                          {new Date(note.createdAt).toLocaleDateString()}
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteNote(note._id)}
                          className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                        >
                          ✕
                        </Button>
                      </div>
                      <p className="text-sm">{note.content}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No notes yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      {customer && customer.outstanding > 0 && (
        <ReceivePaymentDialog
          open={receivePaymentOpen}
          onOpenChange={setReceivePaymentOpen}
          customer={customer}
          onSuccess={handlePaymentReceived}
        />
      )}

      {customer && (
        <EditCustomerDialog
          open={editCustomerOpen}
          onOpenChange={setEditCustomerOpen}
          customer={customer}
          onSuccess={handleCustomerUpdated}
        />
      )}

      {selectedTransaction && customer && (
        <EditTransactionDialog
          open={editTransactionOpen}
          onOpenChange={setEditTransactionOpen}
          transaction={selectedTransaction}
          customer={customer}
          onSuccess={handleTransactionUpdated}
        />
      )}

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Customer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{customer?.name}</strong>? This action cannot be undone.
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