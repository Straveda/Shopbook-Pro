import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import api from "@/services/api";

interface AddCreditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preSelectedCustomer?: { id: string; name: string };
  onCreditAdded?: () => void;
}

interface Customer {
  _id: string;
  name: string;
  phone: string;
  creditLimit?: number;
  outstanding?: number;
  outstandingAmount?: number;
}

export function AddCreditDialog({ open, onOpenChange, preSelectedCustomer, onCreditAdded }: AddCreditDialogProps) {
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [dueDate, setDueDate] = useState<Date>();
  const [selectedCustomerData, setSelectedCustomerData] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    customerId: preSelectedCustomer?.id || "",
    amount: "",
    note: "",
  });

  // Fetch customers from database when dialog opens
  useEffect(() => {
    const fetchCustomers = async () => {
      if (!open) return;
      
      setLoadingCustomers(true);
      try {
        const response = await api.get('/customers');
        if (response.data.success && response.data.data) {
          setCustomers(response.data.data);
          
          // If pre-selected customer, set the data
          if (preSelectedCustomer?.id) {
            const found = response.data.data.find((c: Customer) => c._id === preSelectedCustomer.id);
            if (found) {
              setSelectedCustomerData(found);
              setFormData(prev => ({ 
                ...prev, 
                customerId: preSelectedCustomer.id,
                amount: found.creditLimit?.toString() || ""
              }));
            }
          }
        } else {
          toast.error('Failed to load customers');
        }
      } catch (error: any) {
        console.error('Failed to fetch customers:', error);
        toast.error(error.response?.data?.message || 'Failed to load customers');
      } finally {
        setLoadingCustomers(false);
      }
    };

    fetchCustomers();
  }, [open]);

  // Handle customer selection and auto-fill amount
  const handleCustomerChange = (customerId: string) => {
    setFormData(prev => ({ ...prev, customerId }));
    
    const customer = customers.find(c => c._id === customerId);
    if (customer) {
      setSelectedCustomerData(customer);
      // Auto-fill with credit limit
      setFormData(prev => ({ 
        ...prev, 
        amount: customer.creditLimit?.toString() || ""
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.customerId || !formData.amount) {
      toast.error("Please select customer and enter amount");
      return;
    }

    const amountValue = parseFloat(formData.amount);
    if (amountValue <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }

    setLoading(true);
    
    try {
      // Add debit (credit) to customer account
      const response = await api.post(
        `/customers/${formData.customerId}/debit`,
        {
          amount: amountValue,
          description: `Credit given${formData.note ? ` - ${formData.note}` : ''}`
        }
      );

      if (response.data.success) {
        // If due date is selected, update it
        if (dueDate) {
          try {
            await api.put(`/customers/${formData.customerId}/due-date`, {
              dueDate: dueDate.toISOString()
            });
          } catch (error) {
            console.error('Could not set due date:', error);
            toast.warning("Credit added but due date could not be set");
          }
        }

        toast.success("Credit added successfully!");
        
        // Reset form
        setFormData({ 
          customerId: preSelectedCustomer?.id || "", 
          amount: "", 
          note: "" 
        });
        setDueDate(undefined);
        setSelectedCustomerData(null);
        onOpenChange(false);
        
        if (onCreditAdded) {
          onCreditAdded();
        }
      } else {
        toast.error(response.data.message || 'Failed to add credit');
      }
    } catch (error: any) {
      console.error('Add credit error:', error);
      toast.error(error.response?.data?.message || 'Failed to add credit');
    } finally {
      setLoading(false);
    }
  };

  const currentOutstanding = selectedCustomerData?.outstanding || selectedCustomerData?.outstandingAmount || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Credit (Udhari)</DialogTitle>
          <DialogDescription>
            Record a credit given to customer
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="customer">Customer *</Label>
              <Select
                value={formData.customerId}
                onValueChange={handleCustomerChange}
                disabled={!!preSelectedCustomer || loadingCustomers}
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                    loadingCustomers 
                      ? "Loading customers..." 
                      : customers.length === 0 
                        ? "No customers found"
                        : "Select customer"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
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

            {/* Customer Info Card */}
            {selectedCustomerData && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="space-y-1">
                  <p className="text-sm font-medium">{selectedCustomerData.name}</p>
                  <p className="text-sm text-muted-foreground">📱 {selectedCustomerData.phone}</p>
                  <div className="flex justify-between pt-2 border-t border-blue-100 mt-2">
                    <span className="text-sm text-muted-foreground">Credit Limit:</span>
                    <span className="text-sm font-semibold">₹{selectedCustomerData.creditLimit?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Outstanding:</span>
                    <span className="text-sm font-semibold text-red-600">₹{currentOutstanding.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="amount">Amount (₹) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="Enter amount"
                required
              />
              {selectedCustomerData && formData.amount && (
                <p className="text-xs text-muted-foreground">
                  Customer's credit limit: ₹{selectedCustomerData.creditLimit?.toLocaleString() || 0}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Due Date (Optional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dueDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={setDueDate}
                    initialFocus
                    disabled={(date) => date < new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">Note (Optional)</Label>
              <Textarea
                id="note"
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                placeholder="Add any notes..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || loadingCustomers} className="bg-teal-500 hover:bg-teal-600">
              {loading ? "Adding..." : "Add Credit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}