// FILE: src/components/ReceivePaymentDialog.tsx - EXACT MATCH TO CREDITS.TSX
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, CheckCircle2 } from "lucide-react";
import api from "@/services/api";

interface ReceivePaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: {
    name: string;
    outstanding: number;
    _id?: string;
  };
  creditId?: string;
  onPaymentRecorded?: () => void;
  onSuccess?: () => void;
}

export function ReceivePaymentDialog({
  open,
  onOpenChange,
  customer,
  creditId,
  onPaymentRecorded,
  onSuccess,
}: ReceivePaymentDialogProps) {
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [note, setNote] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    const paymentAmount = parseFloat(amount);

    if (paymentAmount > customer.outstanding) {
      toast.error(
        `Payment must be between ₹0 and ₹${customer.outstanding}`
      );
      return;
    }

    setLoading(true);

    try {
      let endpoint = "";
      let payload: any = {
        amount: paymentAmount,
      };

      if (customer._id) {
        endpoint = `/customers/${customer._id}/receive-payment`;
        payload.paymentMode = paymentMethod;
        payload.remarks = note;
      } else if (creditId) {
        endpoint = `/credits/${creditId}/payment`;
        payload.paymentMethod = paymentMethod;
        payload.note = note;
      } else {
        throw new Error("No customer or credit ID available");
      }

      const response = await api.post(endpoint, payload);

      if (response.data.success) {
        toast.success("Payment recorded successfully");
        setAmount("");
        setPaymentMethod("cash");
        setNote("");
        onOpenChange(false);

        if (onPaymentRecorded) {
          onPaymentRecorded();
        }
        if (onSuccess) {
          onSuccess();
        }
      } else {
        toast.error(response.data.message || "Failed to record payment");
        setLoading(false);
      }
    } catch (error: any) {
      console.error("Payment error:", error);
      toast.error(error.response?.data?.message || "Failed to record payment");
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Receive Payment</DialogTitle>
          <DialogDescription>
            Record payment from {customer.name}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Outstanding Balance */}
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="text-sm text-red-900">Outstanding Balance</div>
              <div className="text-3xl font-bold text-red-600">
                ₹{customer.outstanding.toLocaleString()}
              </div>
              <div className="text-xs text-red-700 mt-1">Full amount outstanding</div>
            </div>

            {/* Payment Amount */}
            <div>
              <Label>Payment Amount (₹) *</Label>
              <Input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                disabled={loading}
              />
            </div>

            {/* Payment Method */}
            <div>
              <Label>Payment Method</Label>
              <Select
                value={paymentMethod}
                onValueChange={setPaymentMethod}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent side="bottom" align="start">
                  <SelectItem value="cash">💵 Cash</SelectItem>
                  <SelectItem value="upi">📱 UPI</SelectItem>
                  <SelectItem value="card">💳 Card</SelectItem>
                  <SelectItem value="bank_transfer">🏦 Bank Transfer</SelectItem>
                  <SelectItem value="cheque">📄 Cheque</SelectItem>
                  <SelectItem value="other">📋 Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Note */}
            <div>
              <Label>Note (Optional)</Label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add any notes..."
                rows={2}
                disabled={loading}
              />
            </div>


          </div>

          <DialogFooter className="gap-3 sm:gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              type="button"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-teal-500 hover:bg-teal-600"
              disabled={loading || !amount || parseFloat(amount) <= 0 || parseFloat(amount) > customer.outstanding}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Recording...
                </>
              ) : (
                "Record Payment"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}