import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import api from "@/services/api";
import { Customer } from "@/services/customerService";

interface EditCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer;
  onSuccess?: () => void;
}

export function EditCustomerDialog({
  open,
  onOpenChange,
  customer,
  onSuccess
}: EditCustomerDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: customer.name,
    phone: customer.phone,
    altPhone: customer.altPhone || "",
    address: customer.address || "",
    city: customer.city || "",
    creditLimit: customer.creditLimit.toString(),
  });
  
  const [paymentType, setPaymentType] = useState<'full' | 'partial' | 'pending'>('full');
  const [paidAmount, setPaidAmount] = useState('');
  const [dueDate, setDueDate] = useState<Date>();

  useEffect(() => {
    if (customer && open) {
      setFormData({
        name: customer.name,
        phone: customer.phone,
        altPhone: customer.altPhone || "",
        address: customer.address || "",
        city: customer.city || "",
        creditLimit: customer.creditLimit.toString(),
      });

      // Determine payment type based on outstanding balance
      if (customer.outstanding === 0) {
        setPaymentType('full');
        setPaidAmount('');
      } else if (customer.outstanding > 0 && customer.outstanding < customer.creditLimit) {
        setPaymentType('partial');
        setPaidAmount((customer.creditLimit - customer.outstanding).toString());
      } else {
        setPaymentType('pending');
        setPaidAmount('');
      }

      if (customer.dueDate) {
        setDueDate(new Date(customer.dueDate));
      }
    }
  }, [customer, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.phone) {
      toast.error("Name and phone number are required");
      return;
    }

    if (formData.phone.length !== 10) {
      toast.error("Phone number must be 10 digits");
      return;
    }

    if (!formData.creditLimit) {
      toast.error("Credit limit is required");
      return;
    }

    const creditLimit = parseFloat(formData.creditLimit);
    if (isNaN(creditLimit) || creditLimit < 0) {
      toast.error("Credit limit must be a valid number");
      return;
    }

    // Validate paid amount for partial payment
    if (paymentType === 'partial') {
      if (!paidAmount) {
        toast.error("Please enter amount paid");
        return;
      }

      const paid = parseFloat(paidAmount);
      if (isNaN(paid) || paid <= 0) {
        toast.error("Paid amount must be greater than 0");
        return;
      }

      if (paid > creditLimit) {
        toast.error("Paid amount cannot exceed credit limit");
        return;
      }
    }

    // Validate due date for partial/pending
    if ((paymentType === 'partial' || paymentType === 'pending') && !dueDate) {
      toast.error("Please select a due date for partial/pending payment");
      return;
    }

    setLoading(true);

    try {
      // Step 1: Update basic customer info
      const customerUpdateData = {
        name: formData.name.trim(),
        phone: formData.phone,
        altPhone: formData.altPhone || "",
        address: formData.address.trim(),
        city: formData.city.trim(),
        creditLimit,
      };

      await api.put(`/customers/${customer._id}`, customerUpdateData);

      // Step 2: Update payment status and due date
      let newOutstanding = 0;
      let newTotalPaid = 0;

      if (paymentType === 'full') {
        newOutstanding = 0;
        newTotalPaid = creditLimit;
      } else if (paymentType === 'partial') {
        const paid = parseFloat(paidAmount);
        newOutstanding = creditLimit - paid;
        newTotalPaid = paid;
      } else if (paymentType === 'pending') {
        newOutstanding = creditLimit;
        newTotalPaid = 0;
      }

      // Update outstanding amount via credit endpoint if needed
      const outstandingDifference = newOutstanding - customer.outstanding;
      
      if (outstandingDifference !== 0) {
        if (outstandingDifference > 0) {
          // Need to add more debt
          await api.post(`/customers/${customer._id}/debit`, {
            amount: outstandingDifference,
            description: "Amount adjustment",
            date: new Date().toISOString()
          });
        } else {
          // Need to record payment
          await api.post(`/customers/${customer._id}/credit`, {
            amount: Math.abs(outstandingDifference),
            description: "Amount adjustment",
            date: new Date().toISOString()
          });
        }
      }

      // Step 3: Update due date
      if ((paymentType === 'partial' || paymentType === 'pending') && dueDate) {
        try {
          await api.put(`/customers/${customer._id}/due-date`, {
            dueDate: dueDate.toISOString()
          });
        } catch (error) {
          console.error('Could not set due date:', error);
          toast.warning("Customer updated but due date could not be set.");
        }
      } else if (paymentType === 'full') {
        // Clear due date for full payment
        try {
          await api.put(`/customers/${customer._id}/due-date`, {
            dueDate: null
          });
        } catch (error) {
          console.error('Could not clear due date:', error);
        }
      }

      toast.success("Customer updated successfully");
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.response?.data?.message || "Failed to update customer");
    } finally {
      setLoading(false);
    }
  };

  const creditLimit = formData.creditLimit ? parseFloat(formData.creditLimit) : 0;
  const paid = paidAmount ? parseFloat(paidAmount) : 0;
  const remaining = creditLimit - paid;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Customer</DialogTitle>
          <DialogDescription>
            Update customer information and payment details
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Customer Details */}
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter customer name"
                  required
                  disabled={loading}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                    placeholder="9876543210"
                    maxLength={10}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="altPhone">Alternate Phone</Label>
                  <Input
                    id="altPhone"
                    type="tel"
                    value={formData.altPhone}
                    onChange={(e) => setFormData({ ...formData, altPhone: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                    placeholder="9876543210"
                    maxLength={10}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Enter address"
                  rows={2}
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="City"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Total Amount (Credit Limit) Section */}
            <div className="space-y-2">
              <Label htmlFor="creditLimit">Total Amount (₹) *</Label>
              <Input
                id="creditLimit"
                type="number"
                value={formData.creditLimit}
                onChange={(e) => setFormData({ ...formData, creditLimit: e.target.value })}
                placeholder="5000"
                required
                disabled={loading}
              />
            </div>

            {/* Payment Type Section */}
            {formData.creditLimit && (
              <div className="space-y-3 pt-4 border-t">
                <h3 className="font-semibold text-sm">Payment Status</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="paymentType">Payment Status</Label>
                  <Select value={paymentType} onValueChange={(value: any) => setPaymentType(value)} disabled={loading}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full">Full Payment - Paid All ₹{creditLimit.toLocaleString()} (Clear)</SelectItem>
                      <SelectItem value="partial">Partial Payment - Paid Some, Rest Pending</SelectItem>
                      <SelectItem value="pending">No Payment Yet - Completely Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {paymentType === 'partial' && (
                  <div className="space-y-2">
                    <Label htmlFor="paidAmount">Amount Paid (₹) *</Label>
                    <Input
                      id="paidAmount"
                      type="number"
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(e.target.value)}
                      placeholder="How much paid?"
                      max={formData.creditLimit}
                      disabled={loading}
                    />
                    {remaining > 0 && (
                      <p className="text-sm text-muted-foreground">
                        Remaining to pay: ₹{remaining.toLocaleString()}
                      </p>
                    )}
                  </div>
                )}

                {/* Due Date for Partial/Pending */}
                {(paymentType === 'partial' || paymentType === 'pending') && (
                  <div className="space-y-2">
                    <Label>Due Date *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !dueDate && "text-muted-foreground"
                          )}
                          disabled={loading}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dueDate ? format(dueDate, "PPP") : "Pick a due date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dueDate}
                          onSelect={setDueDate}
                          initialFocus
                          disabled={(date) => date < new Date()}
                        />
                      </PopoverContent>
                    </Popover>
                    <p className="text-xs text-muted-foreground">
                      Customer needs to pay by this date
                    </p>
                  </div>
                )}

                {/* Outstanding Summary */}
                <div className="mt-4 p-3 rounded-lg border-2">
                  {paymentType === 'full' && (
                    <div className="bg-green-50 border-green-200">
                      <p className="text-xs text-green-600 mb-1 font-medium">✓ FULL PAYMENT</p>
                      <p className="text-sm font-medium">Total: ₹{creditLimit.toLocaleString()}</p>
                      <p className="text-sm font-medium text-green-600">Paid: ₹{creditLimit.toLocaleString()}</p>
                      <p className="text-lg font-bold text-green-600 mt-2">Outstanding: ₹0 ✓ CLEAR</p>
                    </div>
                  )}

                  {paymentType === 'partial' && (
                    <div className="bg-yellow-50 border-yellow-200">
                      <p className="text-xs text-yellow-600 mb-1 font-medium">⚠ PARTIAL PAYMENT</p>
                      <p className="text-sm font-medium">Total: ₹{creditLimit.toLocaleString()}</p>
                      <p className="text-sm font-medium text-green-600">Paid: ₹{paid.toLocaleString() || '0'}</p>
                      <p className="text-lg font-bold text-red-600 mt-2">Outstanding: ₹{remaining.toLocaleString() || creditLimit.toLocaleString()}</p>
                      {dueDate && (
                        <p className="text-xs text-yellow-700 mt-2">Due by: {format(dueDate, "PPP")}</p>
                      )}
                    </div>
                  )}

                  {paymentType === 'pending' && (
                    <div className="bg-red-50 border-red-200">
                      <p className="text-xs text-red-600 mb-1 font-medium">✗ PENDING PAYMENT</p>
                      <p className="text-sm font-medium">Total: ₹{creditLimit.toLocaleString()}</p>
                      <p className="text-sm font-medium text-red-600">Paid: ₹0</p>
                      <p className="text-lg font-bold text-red-600 mt-2">Outstanding: ₹{creditLimit.toLocaleString()}</p>
                      {dueDate && (
                        <p className="text-xs text-red-700 mt-2">Due by: {format(dueDate, "PPP")}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-teal-500 hover:bg-teal-600">
              {loading ? "Updating..." : "Update Customer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}