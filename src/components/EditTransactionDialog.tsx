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

interface EditTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: LedgerEntry;
  customer: Customer;
  onSuccess?: () => void;
}

export function EditTransactionDialog({ 
  open, 
  onOpenChange, 
  transaction, 
  customer,
  onSuccess 
}: EditTransactionDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    description: transaction.description,
    amount: transaction.type === 'Credit' ? transaction.debit.toString() : transaction.credit.toString(),
    paymentMode: transaction.paymentMode || 'cash',
    remarks: transaction.remarks || '',
    date: new Date(transaction.date),
  });
  const [paymentType, setPaymentType] = useState<'full' | 'partial' | 'pending'>('full');
  const [paidAmount, setPaidAmount] = useState('');
  const [dueDate, setDueDate] = useState<Date>();

  useEffect(() => {
    if (transaction) {
      setFormData({
        description: transaction.description,
        amount: transaction.type === 'Credit' ? transaction.debit.toString() : transaction.credit.toString(),
        paymentMode: transaction.paymentMode || 'cash',
        remarks: transaction.remarks || '',
        date: new Date(transaction.date),
      });
      
      if (transaction.type === 'Credit') {
        const totalAmount = transaction.debit;
        const paid = 0;
        
        if (paid === 0) {
          setPaymentType('pending');
        } else if (paid < totalAmount) {
          setPaymentType('partial');
          setPaidAmount(paid.toString());
        } else {
          setPaymentType('full');
        }
      }
      
      if (customer.dueDate) {
        setDueDate(new Date(customer.dueDate));
      }
    }
  }, [transaction, customer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.description || !formData.amount) {
      toast.error("Description and amount are required");
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }

    if (transaction.type === 'Credit' && paymentType === 'partial') {
      if (!paidAmount) {
        toast.error("Please enter amount paid");
        return;
      }

      const paid = parseFloat(paidAmount);
      if (isNaN(paid) || paid <= 0) {
        toast.error("Paid amount must be greater than 0");
        return;
      }

      if (paid > amount) {
        toast.error("Paid amount cannot exceed total amount");
        return;
      }
    }

    if (transaction.type === 'Credit' && (paymentType === 'partial' || paymentType === 'pending') && !dueDate) {
      toast.error("Please select a due date");
      return;
    }

    setLoading(true);
    
    try {
      const updateData: any = {
        description: formData.description,
        amount,
        date: formData.date.toISOString(),
      };

      if (transaction.type === 'Payment') {
        updateData.paymentMode = formData.paymentMode;
        updateData.remarks = formData.remarks;
      } else {
        updateData.paymentType = paymentType;
        
        if (paymentType === 'partial') {
          updateData.paidAmount = parseFloat(paidAmount);
        } else if (paymentType === 'full') {
          updateData.paidAmount = amount;
        } else {
          updateData.paidAmount = 0;
        }
        
        if ((paymentType === 'partial' || paymentType === 'pending') && dueDate) {
          updateData.dueDate = dueDate.toISOString();
        }
      }

      const response = await api.put(`/customers/${customer._id}/transaction/${transaction._id}`, updateData);

      if (response.data.success) {
        toast.success("Transaction updated successfully");
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error(response.data.message || "Failed to update transaction");
      }
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.response?.data?.message || "Failed to update transaction");
    } finally {
      setLoading(false);
    }
  };

  const totalAmount = formData.amount ? parseFloat(formData.amount) : 0;
  const paid = paidAmount ? parseFloat(paidAmount) : 0;
  const remaining = totalAmount - paid;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Transaction</DialogTitle>
          <DialogDescription>
            Update transaction details for {customer.name}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Date */}
            <div className="space-y-2">
              <Label>Transaction Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.date ? format(formData.date, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.date}
                    onSelect={(date) => date && setFormData({ ...formData, date })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter description"
                required
              />
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (₹) *</Label>
              <Input
                id="amount"
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="Enter amount"
                required
              />
            </div>

            {/* Payment-specific fields */}
            {transaction.type === 'Payment' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="paymentMode">Payment Method</Label>
                  <Select
                    value={formData.paymentMode}
                    onValueChange={(value) => setFormData({ ...formData, paymentMode: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">💵 Cash</SelectItem>
                      <SelectItem value="upi">📱 UPI</SelectItem>
                      <SelectItem value="card">💳 Card</SelectItem>
                      <SelectItem value="bank_transfer">🏦 Bank Transfer</SelectItem>
                      <SelectItem value="cheque">📄 Cheque</SelectItem>
                      <SelectItem value="other">📋 Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="remarks">Remarks</Label>
                  <Textarea
                    id="remarks"
                    value={formData.remarks}
                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                    placeholder="Add any notes..."
                    rows={2}
                  />
                </div>
              </>
            )}

            {/* Credit-specific fields (Payment Type) */}
            {transaction.type === 'Credit' && (
              <div className="space-y-3 pt-4 border-t">
                <h3 className="font-semibold text-sm">Payment Status</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="paymentType">How was payment made?</Label>
                  <Select value={paymentType} onValueChange={(value: any) => setPaymentType(value)}>
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
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(e.target.value)}
                      placeholder="How much paid?"
                      max={formData.amount}
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
                      <p className="text-sm font-medium text-green-600">Paid: ₹{paid.toLocaleString() || '0'}</p>
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
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-teal-500 hover:bg-teal-600">
              {loading ? "Updating..." : "Update Transaction"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}