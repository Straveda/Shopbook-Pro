// FILE: src/pages/Credits.tsx - UPDATED (Removed Service Dropdown, Auto-fill Amount)
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Send, Wallet, Calendar, Loader2, AlertCircle, Edit, MessageCircle, Phone, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import api from "@/services/api";

interface Customer {
  _id: string;
  name: string;
  phone: string;
  creditLimit?: number;
  outstandingAmount?: number;
  outstanding?: number;
  lastTransaction?: string;
  transactions?: any[];
  dueDate?: string;
}

interface CustomerWithStatus extends Customer {
  daysOverdue: number;
  status: 'pending' | 'overdue';
  serviceName?: string;
  givenOn?: string;
}

export default function Credits() {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<CustomerWithStatus[]>([]);
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [addCreditOpen, setAddCreditOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [editDueDateOpen, setEditDueDateOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithStatus | null>(null);
  const [selectedCustomerData, setSelectedCustomerData] = useState<Customer | null>(null);
  const [newDueDate, setNewDueDate] = useState<Date>();
  const [addingCredit, setAddingCredit] = useState(false);
  const [updatingDueDate, setUpdatingDueDate] = useState(false);
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [selectedCustomerForReminder, setSelectedCustomerForReminder] = useState<CustomerWithStatus | null>(null);

  // Bulk reminders state
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkChannel, setBulkChannel] = useState<'whatsapp' | 'sms'>('whatsapp');
  const [bulkSending, setBulkSending] = useState(false);
  const [bulkStep, setBulkStep] = useState<'select' | 'links'>('select');
  const [waLinks, setWaLinks] = useState<Array<{ name: string; phone: string; message: string; balance: number }>>([]);

  // Summary stats
  const [summary, setSummary] = useState({
    totalOutstanding: 0,
    overdueAmount: 0,
    activeCredits: 0
  });

  // Form data for new credit (removed serviceId)
  const [creditForm, setCreditForm] = useState({
    customerId: "",
    amount: "",
    dueDate: undefined as Date | undefined,
    note: ""
  });

  // Payment form
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    paymentMethod: "cash",
    note: ""
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const customersRes = await api.get('/customers') as { data: { success: boolean; data: Customer[] } };

      if (customersRes.data.success) {
        const allCust = customersRes.data.data || [];
        setAllCustomers(allCust);

        const customersWithBalance = allCust.filter((c: Customer) => {
          const outstanding = c.outstanding || c.outstandingAmount || 0;
          return outstanding > 0;
        });

        const customersWithStatus: CustomerWithStatus[] = customersWithBalance.map((customer: Customer) => {
          let daysOverdue = 0;
          let status: 'pending' | 'overdue' = 'pending';
          let dueDate = customer.dueDate;
          let givenOn = customer.lastTransaction || new Date().toISOString();

          // Check if overdue based on stored dueDate
          if (dueDate) {
            const dueDateObj = new Date(dueDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            dueDateObj.setHours(0, 0, 0, 0);

            const daysDiff = Math.floor((today.getTime() - dueDateObj.getTime()) / (1000 * 60 * 60 * 24));

            if (daysDiff > 0) {
              daysOverdue = daysDiff;
              status = 'overdue';
            } else {
              status = 'pending';
            }
          } else {
            status = 'pending';
            daysOverdue = 0;
          }

          let serviceName = 'Previous Credit';
          if (customer.transactions && customer.transactions.length > 0) {
            const lastDebit = customer.transactions
              .filter((t: any) => t.type === 'debit')
              .sort((a: any, b: any) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime())[0];

            if (lastDebit && lastDebit.description) {
              serviceName = lastDebit.description;
            }
          }

          const outstanding = customer.outstanding || customer.outstandingAmount || 0;

          return {
            ...customer,
            daysOverdue,
            status,
            serviceName,
            givenOn,
            dueDate,
            outstandingAmount: outstanding
          };
        });

        setCustomers(customersWithStatus);

        const totalOutstanding = customersWithStatus.reduce((sum, c) => sum + c.outstandingAmount, 0);
        const overdueCustomers = customersWithStatus.filter(c => c.status === 'overdue');
        const overdueAmount = overdueCustomers.reduce((sum, c) => sum + c.outstandingAmount, 0);

        setSummary({
          totalOutstanding,
          overdueAmount,
          activeCredits: customersWithStatus.length
        });
      }
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Handle customer selection and auto-fill amount
  const handleCustomerChange = (customerId: string) => {
    setCreditForm(prev => ({ ...prev, customerId }));

    const customer = allCustomers.find(c => c._id === customerId);
    if (customer) {
      setSelectedCustomerData(customer);
      // Auto-fill with credit limit
      setCreditForm(prev => ({
        ...prev,
        amount: customer.creditLimit?.toString() || ""
      }));
    }
  };

  const handleAddCredit = async () => {
    if (!creditForm.customerId || !creditForm.amount) {
      toast.error("Customer and amount are required");
      return;
    }

    const amountValue = parseFloat(creditForm.amount);
    if (amountValue <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }

    setAddingCredit(true);

    try {
      // Step 1: Add debit/credit
      const response = await api.post(`/customers/${creditForm.customerId}/debit`, {
        amount: amountValue,
        description: `Credit given${creditForm.note ? ` - ${creditForm.note}` : ''}`,
        date: new Date()
      }) as { data: { success: boolean; message?: string } };

      if (!response.data.success) {
        toast.error(response.data.message || "Failed to add credit");
        setAddingCredit(false);
        return;
      }

      // Step 2: If due date is selected, update it
      if (creditForm.dueDate) {
        try {
          await api.put(`/customers/${creditForm.customerId}/due-date`, {
            dueDate: creditForm.dueDate.toISOString()
          });
          toast.success("Credit added with due date");
        } catch (error) {
          toast.warning("Credit added but due date could not be set");
        }
      } else {
        toast.success("Credit added successfully");
      }

      setAddCreditOpen(false);
      setCreditForm({ customerId: "", amount: "", dueDate: undefined, note: "" });
      setSelectedCustomerData(null);
      setAddingCredit(false);

      // Refresh data after delay
      setTimeout(() => {
        fetchData();
      }, 800);
    } catch (error: any) {
      console.error('Add credit error:', error);
      toast.error(error.response?.data?.message || "Failed to add credit");
      setAddingCredit(false);
    }
  };

  const handleReceivePayment = async () => {
    if (!selectedCustomer || !paymentForm.amount) {
      toast.error("Please enter payment amount");
      return;
    }

    const amount = parseFloat(paymentForm.amount);
    if (amount <= 0 || amount > (selectedCustomer.outstandingAmount || 0)) {
      toast.error(`Payment must be between ₹0 and ₹${selectedCustomer.outstandingAmount}`);
      return;
    }

    try {
      const response = await api.post(`/customers/${selectedCustomer._id}/credit`, {
        amount: amount,
        description: `Payment received${paymentForm.note ? ` - ${paymentForm.note}` : ''}`
      }) as { data: { success: boolean; message?: string } };

      if (response.data.success) {
        toast.success("Payment recorded successfully");
        setPaymentDialogOpen(false);
        setPaymentForm({ amount: "", paymentMethod: "cash", note: "" });
        setSelectedCustomer(null);
        fetchData();
      } else {
        toast.error(response.data.message || "Failed to record payment");
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error(error.response?.data?.message || "Failed to record payment");
    }
  };

  const handleEditDueDate = (customer: CustomerWithStatus) => {
    setSelectedCustomer(customer);
    setNewDueDate(customer.dueDate ? new Date(customer.dueDate) : undefined);
    setEditDueDateOpen(true);
  };

  const handleUpdateDueDate = async () => {
    if (!selectedCustomer || !newDueDate) {
      toast.error("Please select a due date");
      return;
    }

    setUpdatingDueDate(true);

    try {
      const response = await api.put(`/customers/${selectedCustomer._id}/due-date`, {
        dueDate: newDueDate.toISOString()
      }) as { data: { success: boolean; message?: string } };

      if (response.data.success) {
        toast.success("Due date updated successfully");
        setEditDueDateOpen(false);
        setSelectedCustomer(null);
        setNewDueDate(undefined);
        setUpdatingDueDate(false);

        setTimeout(() => {
          fetchData();
        }, 800);
      } else {
        toast.error(response.data.message || "Failed to update due date");
        setUpdatingDueDate(false);
      }
    } catch (error: any) {
      console.error('Update due date error:', error);
      toast.error(error.response?.data?.message || "Failed to update due date");
      setUpdatingDueDate(false);
    }
  };

  const handleSendReminder = (customer: CustomerWithStatus) => {
    // Open WhatsApp directly with pre-filled message for this customer
    const outstanding = customer.outstandingAmount || 0;
    const dueDateStr = customer.dueDate
      ? new Date(customer.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      : 'Not set';
    const message = `Hi ${customer.name}, this is a payment reminder. You have an outstanding balance of Rs.${outstanding} for ${customer.serviceName || 'credit'}. Due date: ${dueDateStr}. Please make the payment at your earliest convenience. Thank you!`;
    // Clean phone: remove spaces, dashes, and ensure country code
    const phone = customer.phone.replace(/[\s\-()]/g, '').replace(/^0/, '91').replace(/^(?!91)/, '91');
    const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
  };

  const handleBulkReminders = () => {
    setBulkStep('select');
    setWaLinks([]);
    const overdueCustomers = customers.filter(c => c.status === 'overdue');
    if (overdueCustomers.length === 0) {
      toast.info("No overdue customers to send reminders");
      return;
    }
    setBulkDialogOpen(true);
  };

  const confirmBulkReminders = async () => {
    setBulkSending(true);
    try {
      const response = await api.post('/credits/reminders/bulk', {
        filter: 'all',       // Send to ALL customers with outstanding balance
        channel: bulkChannel
      }) as { data: { success: boolean; count: number; message?: string; customers?: Array<{ name: string; phone: string; message: string; balance: number }> } };

      if (response.data.success) {
        const customerList = response.data.customers || [];
        if (bulkChannel === 'whatsapp') {
          if (customerList.length > 0) {
            // Show WhatsApp links step
            setWaLinks(customerList);
            setBulkStep('links');
            toast.success(`${response.data.count} reminders ready! Open links below to send via WhatsApp.`);
          } else {
            toast.info('No customers with outstanding balance found.');
            setBulkDialogOpen(false);
          }
        } else {
          // SMS — just record in DB
          if (response.data.count > 0) {
            toast.success(`Recorded ${response.data.count} SMS reminders in database`);
          } else {
            toast.info('No customers with outstanding balance found.');
          }
          setBulkDialogOpen(false);
        }
        fetchData();
      } else {
        toast.error(response.data.message || "Failed to send reminders");
      }
    } catch (error: any) {
      console.error('Bulk reminders error:', error);
      toast.error(error.response?.data?.message || "Failed to send reminders");
    } finally {
      setBulkSending(false);
    }
  };


  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.phone.includes(searchQuery)
  );

  const getStatusBadge = (status: string) => {
    if (status === 'overdue') {
      return <Badge variant="destructive">Overdue</Badge>;
    }
    return <Badge variant="outline">Pending</Badge>;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Credit Book (Udhari)</h1>
          <p className="text-muted-foreground">Track and manage customer credits</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={handleBulkReminders}
          >
            <Send className="h-4 w-4" />
            Bulk Send Reminders
          </Button>
          <Button
            className="gap-2 bg-teal-500 hover:bg-teal-600"
            onClick={() => setAddCreditOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Add Credit
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-2 border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="text-sm font-medium text-gray-600 mb-2">Total Outstanding</div>
            <div className="text-3xl font-bold text-red-600">
              ₹{summary.totalOutstanding.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card className="border-2 border-orange-200 bg-orange-50">
          <CardContent className="p-6">
            <div className="text-sm font-medium text-gray-600 mb-2">Overdue Amount</div>
            <div className="text-3xl font-bold text-orange-600">
              ₹{summary.overdueAmount.toLocaleString()}
            </div>
            <div className="text-xs text-gray-600 mt-1">
              {customers.filter(c => c.status === 'overdue').length} customers
            </div>
          </CardContent>
        </Card>
        <Card className="border-2 border-teal-200 bg-teal-50">
          <CardContent className="p-6">
            <div className="text-sm font-medium text-gray-600 mb-2">Active Credits</div>
            <div className="text-3xl font-bold text-teal-600">{summary.activeCredits}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by customer name or phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Credits List */}
      <div className="grid gap-4">
        {filteredCustomers.map((customer) => (
          <Card key={customer._id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold">{customer.name}</h3>
                    {getStatusBadge(customer.status)}
                  </div>
                  <p className="text-sm text-muted-foreground">{customer.phone}</p>
                  <p className="text-sm text-teal-600">{customer.serviceName}</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-red-600">
                    ₹{customer.outstandingAmount.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    of ₹{customer.outstandingAmount.toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex gap-6 text-sm">
                  <div>
                    <div className="text-muted-foreground">Given On</div>
                    <div className="font-medium flex items-center gap-1 mt-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(customer.givenOn).toLocaleDateString('en-GB')}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground flex items-center gap-2">
                      Due Date
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0"
                        onClick={() => handleEditDueDate(customer)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className={`font-medium mt-1 flex items-center gap-1 ${customer.status === 'overdue' ? 'text-red-600' : ''}`}>
                      <Calendar className="h-3 w-3" />
                      {customer.dueDate ? new Date(customer.dueDate).toLocaleDateString('en-GB') : 'Not set'}
                      {customer.status === 'overdue' && customer.daysOverdue > 0 && (
                        <span className="text-red-600">({customer.daysOverdue} days overdue)</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => handleSendReminder(customer)}
                  >
                    <Send className="h-3 w-3" />
                    Send Reminder
                  </Button>
                  <Button
                    size="sm"
                    className="gap-2 bg-teal-500 hover:bg-teal-600"
                    onClick={() => {
                      setSelectedCustomer(customer);
                      setPaymentForm({ ...paymentForm, amount: customer.outstandingAmount.toString() });
                      setPaymentDialogOpen(true);
                    }}
                  >
                    <Wallet className="h-3 w-3" />
                    Receive Payment
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredCustomers.length === 0 && (
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            {searchQuery ? "No customers found matching your search" : "No customers with outstanding balance"}
          </p>
        </div>
      )}

      {/* Add Credit Dialog */}
      <Dialog open={addCreditOpen} onOpenChange={setAddCreditOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Credit (Udhari)</DialogTitle>
            <DialogDescription>Record a credit given to customer</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Customer *</Label>
              <Select
                value={creditForm.customerId}
                onValueChange={handleCustomerChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {allCustomers.map((customer) => (
                    <SelectItem key={customer._id} value={customer._id}>
                      <div className="flex flex-col">
                        <span>{customer.name} - {customer.phone}</span>
                        <span className="text-xs text-muted-foreground">
                          Credit Limit: ₹{customer.creditLimit?.toLocaleString() || 0}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>



            <div>
              <Label>Amount (₹) *</Label>
              <Input
                type="number"
                step="0.01"
                value={creditForm.amount}
                onChange={(e) => setCreditForm({ ...creditForm, amount: e.target.value })}
                placeholder="Enter amount"
                required
              />
              {selectedCustomerData && creditForm.amount && (
                <p className="text-xs text-muted-foreground mt-1">
                  Customer's credit limit: ₹{selectedCustomerData.creditLimit?.toLocaleString() || 0}
                </p>
              )}
            </div>

            <div>
              <Label>Due Date (Optional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !creditForm.dueDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {creditForm.dueDate ? format(creditForm.dueDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={creditForm.dueDate}
                    onSelect={(date) => setCreditForm({ ...creditForm, dueDate: date })}
                    initialFocus
                    disabled={(date) => date < new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label>Note (Optional)</Label>
              <Textarea
                value={creditForm.note}
                onChange={(e) => setCreditForm({ ...creditForm, note: e.target.value })}
                placeholder="Add any notes..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddCreditOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-teal-500 hover:bg-teal-600"
              onClick={handleAddCredit}
              disabled={addingCredit}
            >
              {addingCredit ? "Adding..." : "Add Credit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receive Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Receive Payment</DialogTitle>
            <DialogDescription>
              Record payment from {selectedCustomer?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600">Outstanding Balance</div>
              <div className="text-2xl font-bold text-red-600">
                ₹{selectedCustomer?.outstandingAmount.toLocaleString()}
              </div>
            </div>

            <div>
              <Label>Payment Amount (₹) *</Label>
              <Input
                type="number"
                step="0.01"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                placeholder="Enter amount"
              />
            </div>

            <div>
              <Label>Payment Method</Label>
              <Select
                value={paymentForm.paymentMethod}
                onValueChange={(value) => setPaymentForm({ ...paymentForm, paymentMethod: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Note (Optional)</Label>
              <Textarea
                value={paymentForm.note}
                onChange={(e) => setPaymentForm({ ...paymentForm, note: e.target.value })}
                placeholder="Add any notes..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-teal-500 hover:bg-teal-600"
              onClick={handleReceivePayment}
            >
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Due Date Dialog */}
      <Dialog open={editDueDateOpen} onOpenChange={setEditDueDateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Due Date</DialogTitle>
            <DialogDescription>
              Update payment due date for {selectedCustomer?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600">Customer</div>
              <div className="text-lg font-semibold">{selectedCustomer?.name}</div>
              <div className="text-sm text-muted-foreground mt-1">
                Outstanding: ₹{selectedCustomer?.outstandingAmount.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground mt-2">
                Current Due Date: {selectedCustomer?.dueDate ? new Date(selectedCustomer.dueDate).toLocaleDateString('en-GB') : 'Not set'}
              </div>
            </div>

            <div>
              <Label>New Due Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !newDueDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {newDueDate ? format(newDueDate, "PPP") : "Pick a due date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={newDueDate}
                    onSelect={setNewDueDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground mt-2">
                Customer needs to pay by this date
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDueDateOpen(false)} disabled={updatingDueDate}>
              Cancel
            </Button>
            <Button
              className="bg-teal-500 hover:bg-teal-600"
              onClick={handleUpdateDueDate}
              disabled={updatingDueDate}
            >
              {updatingDueDate ? "Updating..." : "Update Due Date"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Reminders Dialog – 2 steps */}
      <Dialog open={bulkDialogOpen} onOpenChange={(open) => { setBulkDialogOpen(open); if (!open) { setBulkStep('select'); setWaLinks([]); } }}>
        <DialogContent className={bulkStep === 'links' ? "sm:max-w-[520px]" : "sm:max-w-[425px]"}>
          {bulkStep === 'select' ? (
            <>
              <DialogHeader>
                <DialogTitle>Send Bulk Reminders</DialogTitle>
                <DialogDescription>
                  Notify {customers.filter(c => c.status === 'overdue').length} overdue customers
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Send Via:</Label>
                  <Select value={bulkChannel} onValueChange={(value: 'whatsapp' | 'sms') => setBulkChannel(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="whatsapp">
                        <div className="flex items-center gap-2">
                          <MessageCircle className="h-4 w-4 text-green-600" />
                          <span>WhatsApp</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="sms">
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-blue-600" />
                          <span>SMS / Text Message</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className={`border rounded-lg p-3 ${bulkChannel === 'whatsapp' ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'}`}>
                  <div className="flex gap-2">
                    <div className={`mt-0.5 ${bulkChannel === 'whatsapp' ? 'text-green-600' : 'text-blue-600'}`}>
                      {bulkChannel === 'whatsapp' ? <MessageCircle className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
                    </div>
                    <div className={`text-xs ${bulkChannel === 'whatsapp' ? 'text-green-800' : 'text-blue-800'}`}>
                      {bulkChannel === 'whatsapp' ? (
                        <>
                          <strong>WhatsApp:</strong> Reminders are recorded in the database. You'll get a list of WhatsApp links to send each customer's personalised message with one tap.
                        </>
                      ) : (
                        <>
                          <strong>SMS:</strong> Reminders will be recorded for all overdue customers in the database.
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setBulkDialogOpen(false)} disabled={bulkSending}>
                  Cancel
                </Button>
                <Button
                  onClick={confirmBulkReminders}
                  disabled={bulkSending}
                  className="bg-teal-600 hover:bg-teal-700"
                >
                  {bulkSending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send via {bulkChannel === 'whatsapp' ? 'WhatsApp' : 'SMS'}
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-green-600" />
                  WhatsApp Reminders Ready
                </DialogTitle>
                <DialogDescription>
                  {waLinks.length} customer{waLinks.length !== 1 ? 's' : ''} with outstanding balance — click below to send
                </DialogDescription>
              </DialogHeader>

              <div className="py-2">
                {/* Send All Button */}
                <a
                  href={`https://wa.me/${(waLinks[0]?.phone || '').replace(/[\s\-()]/g, '').replace(/^0/, '91').replace(/^(?!91)/, '91')}?text=${encodeURIComponent(waLinks[0]?.message || '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className={`flex items-center justify-center gap-2 w-full mb-4 px-4 py-3 rounded-lg font-semibold text-sm text-white ${waLinks.length > 0 ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-400 pointer-events-none'} transition-colors`}
                  onClick={(e) => {
                    // Open subsequent customers after a delay (browser allows first popup from direct click)
                    waLinks.slice(1).forEach((c, i) => {
                      setTimeout(() => {
                        const phone = c.phone.replace(/[\s\-()]/g, '').replace(/^0/, '91').replace(/^(?!91)/, '91');
                        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(c.message)}`, '_blank');
                      }, (i + 1) * 900);
                    });
                  }}
                >
                  <MessageCircle className="h-4 w-4" />
                  Send All {waLinks.length} via WhatsApp
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>

                <div className="text-xs text-muted-foreground mb-2 px-1">Or send individually:</div>
                <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                  {waLinks.map((customer, idx) => {
                    const cleanPhone = customer.phone.replace(/[\s\-()]/g, '').replace(/^0/, '91').replace(/^(?!91)/, '91');
                    const waHref = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(customer.message)}`;
                    return (
                      <div key={idx} className="flex items-center justify-between bg-gray-50 border rounded-lg px-3 py-2.5">
                        <div className="flex-1 min-w-0 mr-3">
                          <div className="font-medium text-sm truncate">{customer.name}</div>
                          <div className="text-xs text-muted-foreground">{customer.phone}</div>
                          <div className="text-xs font-semibold text-red-600 mt-0.5">₹{customer.balance.toLocaleString('en-IN')} due</div>
                        </div>
                        <a
                          href={waHref}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 shrink-0 bg-green-600 hover:bg-green-700 text-white text-xs font-medium px-3 py-2 rounded-md transition-colors"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          Open WhatsApp
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    );
                  })}
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => { setBulkStep('select'); setWaLinks([]); }}>
                  Back
                </Button>

                <Button onClick={() => { setBulkDialogOpen(false); setBulkStep('select'); setWaLinks([]); }} className="bg-teal-600 hover:bg-teal-700">
                  Done
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}