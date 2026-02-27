import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, MessageSquare, Phone } from "lucide-react";
import reminderService from "@/services/reminderService";
import customerService from "@/services/customerService";

interface CreateReminderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateReminderDialog({ open, onOpenChange, onSuccess }: CreateReminderDialogProps) {
  const [loading, setLoading] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    customerId: "",
    message: "",
    reminderDate: "",
    channel: "whatsapp" as "whatsapp" | "sms"
  });

  useEffect(() => {
    if (open) {
      fetchCustomersWithOutstanding();
    }
  }, [open]);

  const fetchCustomersWithOutstanding = async () => {
    setLoadingCustomers(true);
    try {
      const response = await customerService.getAllCustomers();
      if (response.success && response.data) {
        // Filter customers with outstanding amount > 0
        const customersWithDebt = response.data.filter(
          (customer: any) => customer.outstandingAmount > 0
        );
        setCustomers(customersWithDebt);
      }
    } catch (error) {
      console.error("Error fetching customers:", error);
      toast.error("Failed to load customers");
    } finally {
      setLoadingCustomers(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.customerId || !formData.message || !formData.reminderDate) {
      toast.error("Please fill all required fields");
      return;
    }

    setLoading(true);
    try {
      const selectedCustomer = customers.find(c => c._id === formData.customerId);
      
      const response = await reminderService.createReminder({
        customerId: formData.customerId,
        customerName: selectedCustomer?.name,
        customerPhone: selectedCustomer?.phone,
        message: formData.message,
        reminderDate: new Date(formData.reminderDate),
        channel: formData.channel
      });

      if (response.success) {
        toast.success("Reminder created successfully");
        onSuccess();
        onOpenChange(false);
        resetForm();
      } else {
        toast.error(response.message || "Failed to create reminder");
      }
    } catch (error: any) {
      console.error("Error creating reminder:", error);
      toast.error(error.response?.data?.message || "Failed to create reminder");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      customerId: "",
      message: "",
      reminderDate: "",
      channel: "whatsapp"
    });
  };

  const handleCustomerChange = (customerId: string) => {
    const customer = customers.find(c => c._id === customerId);
    if (customer) {
      const defaultMessage = `Payment reminder: You have an outstanding balance of â‚¹${customer.outstandingAmount.toLocaleString()}. Please settle your payment at your earliest convenience. Thank you!`;
      setFormData(prev => ({
        ...prev,
        customerId,
        message: defaultMessage
      }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Payment Reminder</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="customer">Select Customer *</Label>
            {loadingCustomers ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-teal-500" />
              </div>
            ) : customers.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                No customers with outstanding balance
              </p>
            ) : (
              <Select
                value={formData.customerId}
                onValueChange={handleCustomerChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer._id} value={customer._id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{customer.name}</span>
                        <span className="text-red-600 ml-4">
                          â‚¹{customer.outstandingAmount.toLocaleString()}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="channel">Channel *</Label>
            <Select
              value={formData.channel}
              onValueChange={(value: "whatsapp" | "sms") => 
                setFormData(prev => ({ ...prev, channel: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="whatsapp">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    WhatsApp
                  </div>
                </SelectItem>
                <SelectItem value="sms">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    SMS
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reminderDate">Reminder Date & Time *</Label>
            <Input
              id="reminderDate"
              type="datetime-local"
              value={formData.reminderDate}
              onChange={(e) => setFormData(prev => ({ ...prev, reminderDate: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message *</Label>
            <Textarea
              id="message"
              placeholder="Enter reminder message..."
              value={formData.message}
              onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
              rows={4}
              required
            />
            <p className="text-xs text-muted-foreground">
              This message will be sent to the customer via {formData.channel === 'whatsapp' ? 'WhatsApp' : 'SMS'}
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || customers.length === 0}
              className="bg-teal-500 hover:bg-teal-600"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Reminder"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}