import { useState } from "react";
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
import customerService from "@/services/customerService";
import api from "@/services/api";

interface AddCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AddCustomerDialog({ open, onOpenChange, onSuccess }: AddCustomerDialogProps) {
  const [loading, setLoading] = useState(false);
  const [paymentType, setPaymentType] = useState<'full' | 'partial' | 'pending'>('full');
  const [dueDate, setDueDate] = useState<Date>();
  const [category, setCategory] = useState<'regular' | 'retailer' | 'wholesaler'>('regular');
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    altPhone: "",
    address: "",
    city: "",
    totalAmount: "",
    paidAmount: "",
  });

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

    if (!formData.totalAmount) {
      toast.error("Total amount is required");
      return;
    }

    const totalAmount = parseFloat(formData.totalAmount);
    if (isNaN(totalAmount) || totalAmount <= 0) {
      toast.error("Total amount must be greater than 0");
      return;
    }

    // Validate paid amount for partial payment
    if (paymentType === 'partial') {
      if (!formData.paidAmount) {
        toast.error("Please enter amount paid");
        return;
      }

      const paidAmount = parseFloat(formData.paidAmount);
      if (isNaN(paidAmount) || paidAmount <= 0) {
        toast.error("Paid amount must be greater than 0");
        return;
      }

      if (paidAmount > totalAmount) {
        toast.error("Paid amount cannot exceed total amount");
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
      // Step 1: Create customer
      const customerResponse = await customerService.addCustomer({
        name: formData.name,
        phone: formData.phone,
        altPhone: formData.altPhone,
        address: formData.address,
        city: formData.city,
        creditLimit: totalAmount,
        category,
      });

      if (!(customerResponse && customerResponse.success)) {
        toast.error(customerResponse?.message || "Failed to create customer");
        setLoading(false);
        return;
      }

      console.log('✅ Customer Create Response:', customerResponse);

      // Handle data nesting in response
      const responseData = (customerResponse as any).data;
      const customerId = responseData?._id || responseData?.customer?._id || (responseData?.data?._id);

      if (!customerId) {
        console.error("❌ Could not find customer ID in response:", customerResponse);
        toast.error("Customer created but system lost connection. Please refresh the page.");
        setLoading(false);
        onOpenChange(false);
        onSuccess?.();
        return;
      }

      // Step 2: Determine payment type and amounts
      let paidAmountValue = 0;

      if (paymentType === 'full') {
        paidAmountValue = totalAmount;
      } else if (paymentType === 'partial') {
        paidAmountValue = parseFloat(formData.paidAmount);
      } else if (paymentType === 'pending') {
        paidAmountValue = 0;
      }

      const transactionData = {
        description: "Initial bill",
        amount: totalAmount,
        paymentType: paymentType,
        paidAmount: paidAmountValue,
        dueDate: (paymentType === 'partial' || paymentType === 'pending') && dueDate
          ? dueDate.toISOString()
          : undefined
      };

      const transactionResponse = await customerService.addTransaction(customerId, transactionData);

      if (!transactionResponse.success) {
        toast.error(transactionResponse.message || "Failed to add transaction");
        setLoading(false);
        return;
      }

      // Step 3: Update customer with due date if needed ✅ IMPORTANT - MUST DO THIS
      if ((paymentType === 'partial' || paymentType === 'pending') && dueDate) {
        try {
          console.log('📝 Setting due date for customer:', customerId, dueDate.toISOString());
          const dueDateResponse = await api.put<any>(`/customers/${customerId}/due-date`, {
            dueDate: dueDate.toISOString()
          });
          console.log('✅ Due date response:', dueDateResponse.data);
          if (dueDateResponse.data?.success) {
            console.log('✅ Due date set successfully for customer:', dueDate.toISOString());
          }
        } catch (error: any) {
          console.error('⚠️ Could not set due date:', error);
          toast.warning("Customer created but due date could not be set. You can edit it later.");
        }
      } else if (paymentType === 'full') {
        // ✅ For full payment, also clear due date if it exists
        try {
          await api.put(`/customers/${customerId}/due-date`, {
            dueDate: null
          });
        } catch (error) {
          console.error('⚠️ Could not clear due date:', error);
        }
      }

      await new Promise(resolve => setTimeout(resolve, 500));

      toast.success(`Customer ${formData.name} added successfully!`);

      // Reset form
      setFormData({
        name: "",
        phone: "",
        altPhone: "",
        address: "",
        city: "",
        totalAmount: "",
        paidAmount: "",
      });
      setPaymentType('full');
      setDueDate(undefined);
      setCategory('regular');

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error:", error);
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const totalAmount = formData.totalAmount ? parseFloat(formData.totalAmount) : 0;
  const paidAmount = formData.paidAmount ? parseFloat(formData.paidAmount) : 0;
  const remaining = totalAmount - paidAmount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Customer</DialogTitle>
          <DialogDescription>
            Enter customer details and payment information
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

              <div className="space-y-2">
                <Label htmlFor="category">Customer Category</Label>
                <Select value={category} onValueChange={(value: any) => setCategory(value)} disabled={loading}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="regular">Regular Customer</SelectItem>
                    <SelectItem value="retailer">Retailer</SelectItem>
                    <SelectItem value="wholesaler">Wholesaler</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Total Amount Section */}
            <div className="space-y-2">
              <Label htmlFor="totalAmount">Total Amount (₹) *</Label>
              <Input
                id="totalAmount"
                type="number"
                value={formData.totalAmount}
                onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
                placeholder="5000"
                required
                disabled={loading}
              />
            </div>

            {/* Payment Type Section */}
            {formData.totalAmount && (
              <div className="space-y-3 pt-4 border-t">
                <h3 className="font-semibold text-sm">Payment Status</h3>

                <div className="space-y-2">
                  <Label htmlFor="paymentType">How did customer pay?</Label>
                  <Select value={paymentType} onValueChange={(value: any) => setPaymentType(value)} disabled={loading}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full">Full Payment - Paid All ₹{totalAmount.toLocaleString()} (Clear)</SelectItem>
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
                      value={formData.paidAmount}
                      onChange={(e) => setFormData({ ...formData, paidAmount: e.target.value })}
                      placeholder="How much paid?"
                      max={formData.totalAmount}
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
                      <p className="text-sm font-medium">Total: ₹{totalAmount.toLocaleString()}</p>
                      <p className="text-sm font-medium text-green-600">Paid: ₹{totalAmount.toLocaleString()}</p>
                      <p className="text-lg font-bold text-green-600 mt-2">Outstanding: ₹0 ✓ CLEAR</p>
                    </div>
                  )}

                  {paymentType === 'partial' && (
                    <div className="bg-yellow-50 border-yellow-200">
                      <p className="text-xs text-yellow-600 mb-1 font-medium">⚠ PARTIAL PAYMENT</p>
                      <p className="text-sm font-medium">Total: ₹{totalAmount.toLocaleString()}</p>
                      <p className="text-sm font-medium text-green-600">Paid: ₹{paidAmount.toLocaleString() || '0'}</p>
                      <p className="text-lg font-bold text-red-600 mt-2">Outstanding: ₹{remaining.toLocaleString() || totalAmount.toLocaleString()}</p>
                      {dueDate && (
                        <p className="text-xs text-yellow-700 mt-2">Due by: {format(dueDate, "PPP")}</p>
                      )}
                    </div>
                  )}

                  {paymentType === 'pending' && (
                    <div className="bg-red-50 border-red-200">
                      <p className="text-xs text-red-600 mb-1 font-medium">✗ PENDING PAYMENT</p>
                      <p className="text-sm font-medium">Total: ₹{totalAmount.toLocaleString()}</p>
                      <p className="text-sm font-medium text-red-600">Paid: ₹0</p>
                      <p className="text-lg font-bold text-red-600 mt-2">Outstanding: ₹{totalAmount.toLocaleString()}</p>
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
              {loading ? "Adding..." : "Add Customer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}