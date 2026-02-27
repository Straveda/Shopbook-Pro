// FILE: src/components/NewSaleDialog.tsx (FIXED - Walk-in customers now saved to sales)
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plus, Trash2, Loader2, Printer } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import customerService from "@/services/customerService";
import salesService from "@/services/salesService";
import serviceService from "@/services/serviceService";
import { Card } from "@/components/ui/card";

interface NewSaleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface SaleItem {
  id: string;
  serviceId?: string;
  description: string;
  quantity: number;
  amount: number;
}

interface Service {
  _id: string;
  name: string;
  price: number;
}

interface Customer {
  _id: string;
  name: string;
  phone?: string;
}

export function NewSaleDialog({ open, onOpenChange, onSuccess }: NewSaleDialogProps) {
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [loadingServices, setLoadingServices] = useState(false);
  
  const [paymentType, setPaymentType] = useState<'full' | 'partial' | 'pending'>('pending');
  const [paidAmount, setPaidAmount] = useState("");
  const [dueDate, setDueDate] = useState<Date>();
  
  const [formData, setFormData] = useState({
    customerId: "",
    customerName: "",
    saleDate: new Date().toISOString().split('T')[0],
    notes: "",
  });

  const [items, setItems] = useState<SaleItem[]>([]);
  const [newItem, setNewItem] = useState({
    serviceId: "",
    description: "",
    quantity: 1,
    amount: 0,
  });

  useEffect(() => {
    if (open) {
      fetchCustomers();
      fetchServices();
      setPaymentType('pending');
      setPaidAmount("");
      setDueDate(undefined);
    }
  }, [open]);

  const fetchCustomers = async () => {
    setLoadingCustomers(true);
    try {
      const response = await customerService.getAllCustomers();
      if (response.success && response.data) {
        setCustomers(response.data);
      } else {
        setCustomers([]);
      }
    } catch (error) {
      setCustomers([]);
    } finally {
      setLoadingCustomers(false);
    }
  };

  const fetchServices = async () => {
    setLoadingServices(true);
    try {
      const response = await serviceService.getAllServices();
      if (response.success && response.data) {
        setServices(response.data);
      }
    } catch (error) {
      setServices([]);
    } finally {
      setLoadingServices(false);
    }
  };

  const handleCustomerChange = (customerId: string) => {
    if (customerId === "walk-in") {
      setFormData({
        ...formData,
        customerId: "walk-in",
        customerName: "Walk-in Customer",
      });
    } else {
      const selectedCustomer = customers.find(c => c._id === customerId);
      setFormData({
        ...formData,
        customerId,
        customerName: selectedCustomer?.name || "",
      });
    }
  };

  const handleServiceChange = (serviceId: string) => {
    const selectedService = services.find(s => s._id === serviceId);
    if (selectedService) {
      setNewItem({
        serviceId,
        description: selectedService.name,
        quantity: 1,
        amount: selectedService.price,
      });
    }
  };

  const handleAddItem = () => {
    if (!newItem.description || newItem.amount <= 0) {
      toast.error("Please fill in item description and amount");
      return;
    }

    const item: SaleItem = {
      id: Date.now().toString(),
      serviceId: newItem.serviceId || undefined,
      description: newItem.description,
      quantity: newItem.quantity,
      amount: parseFloat(String(newItem.amount)),
    };

    setItems([...items, item]);
    setNewItem({ serviceId: "", description: "", quantity: 1, amount: 0 });
    toast.success("Item added");
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const subtotal = items.reduce((sum, item) => sum + (item.amount * item.quantity), 0);
  const gst = subtotal * 0.18;
  const totalAmount = subtotal + gst;

  const paidAmountValue = paymentType === 'full' 
    ? totalAmount 
    : paymentType === 'partial' 
    ? parseFloat(paidAmount) || 0 
    : 0;
  const remainingAmount = totalAmount - paidAmountValue;

  const isWalkIn = formData.customerId === "walk-in";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.customerId) {
      toast.error("Please select a customer or choose walk-in");
      return;
    }

    if (items.length === 0) {
      toast.error("Please add at least one item");
      return;
    }

    if (isWalkIn && paymentType === 'pending') {
      toast.error("Walk-in customers cannot have pending payments. Please select Full or Partial payment.");
      return;
    }

    if (paymentType === 'partial') {
      if (!paidAmount || parseFloat(paidAmount) <= 0) {
        toast.error("Please enter amount paid");
        return;
      }
      if (parseFloat(paidAmount) >= totalAmount) {
        toast.error("Paid amount must be less than total for partial payment");
        return;
      }
    }

    if (!isWalkIn && (paymentType === 'partial' || paymentType === 'pending') && !dueDate) {
      toast.error("Please select a due date");
      return;
    }

    setLoading(true);

    try {
      // ✅ FIXED: Create sale for walk-in customers too
      if (isWalkIn) {
        // Create walk-in sale WITHOUT customer linkage
        const walkInSaleData = {
          customerId: null, // No customer ID
          customerName: "Walk-in Customer",
          items: items,
          totalAmount: totalAmount,
          paidAmount: paidAmountValue,
          balanceAmount: remainingAmount,
          outstandingAmount: remainingAmount,
          status: paymentType === 'full' ? 'paid' : 'partial',
          saleDate: formData.saleDate,
          notes: formData.notes || undefined,
        };

        const response = await salesService.createWalkInSale(walkInSaleData);
        
        if (response.success) {
          toast.success(`Walk-in sale ${response.data.saleNumber} - ₹${totalAmount.toFixed(2)} ${paymentType === 'full' ? 'Paid ✓' : 'Partial payment'}`);
          resetForm();
          onOpenChange(false);
          if (onSuccess) onSuccess();
        } else {
          toast.error(response.message || "Failed to create walk-in sale");
        }
        
        setLoading(false);
        return;
      }

      // Regular customer flow (existing code)
      const saleData = {
        customerId: formData.customerId,
        customerName: formData.customerName,
        items: items,
        totalAmount: totalAmount,
        saleDate: formData.saleDate,
        notes: formData.notes || undefined,
      };

      const saleResponse = await salesService.createSale(saleData);
      
      if (!saleResponse.success) {
        toast.error(saleResponse.message || "Failed to create sale");
        setLoading(false);
        return;
      }

      const saleId = saleResponse.data._id;
      const saleNumber = saleResponse.data.saleNumber;

      if (paymentType === 'full' || paymentType === 'partial') {
        if (paidAmountValue > 0) {
          try {
            await salesService.recordPayment(saleId, {
              amount: paidAmountValue,
              paymentMode: 'Cash',
              remarks: paymentType === 'full' ? 'Full payment' : 'Partial payment'
            });
          } catch (paymentError) {
            toast.warning("Sale created but payment recording failed");
          }
        }
      }

      if ((paymentType === 'partial' || paymentType === 'pending') && dueDate) {
        try {
          await api.put(`/customers/${formData.customerId}/due-date`, {
            dueDate: dueDate.toISOString()
          });
        } catch (error) {
          toast.warning("Due date could not be set");
        }
      } else if (paymentType === 'full') {
        try {
          await api.put(`/customers/${formData.customerId}/due-date`, {
            dueDate: null
          });
        } catch (error) {
          console.error('Could not clear due date');
        }
      }

      if (paymentType === 'full') {
        toast.success(`Sale ${saleNumber} - Fully Paid ✓`);
      } else if (paymentType === 'partial') {
        toast.success(`Sale ${saleNumber} - ₹${remainingAmount.toFixed(2)} pending`);
      } else {
        toast.success(`Sale ${saleNumber} - Payment Pending`);
      }

      resetForm();
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || "Failed to create sale";
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAndPrint = async () => {
    if (!formData.customerId || items.length === 0) {
      toast.error("Please select customer and add items");
      return;
    }

    if (isWalkIn && paymentType === 'pending') {
      toast.error("Walk-in customers cannot have pending payments");
      return;
    }

    if (paymentType === 'partial' && (!paidAmount || parseFloat(paidAmount) <= 0)) {
      toast.error("Please enter amount paid");
      return;
    }

    if (!isWalkIn && (paymentType === 'partial' || paymentType === 'pending') && !dueDate) {
      toast.error("Please select a due date");
      return;
    }

    setLoading(true);

    try {
      if (isWalkIn) {
        // Walk-in with print not supported yet
        toast.info("Print feature not available for walk-in sales");
        await handleSubmit(new Event('submit') as any);
        setLoading(false);
        return;
      }

      const saleData = {
        customerId: formData.customerId,
        customerName: formData.customerName,
        items: items,
        totalAmount: totalAmount,
        saleDate: formData.saleDate,
        notes: formData.notes || undefined,
      };

      const saleResponse = await salesService.createSale(saleData);
      
      if (!saleResponse.success) {
        toast.error(saleResponse.message || "Failed to create sale");
        setLoading(false);
        return;
      }

      const saleId = saleResponse.data._id;

      if (paymentType === 'full' || paymentType === 'partial') {
        if (paidAmountValue > 0) {
          try {
            await salesService.recordPayment(saleId, {
              amount: paidAmountValue,
              paymentMode: 'Cash',
              remarks: paymentType === 'full' ? 'Full payment' : 'Partial payment'
            });
          } catch (error) {
            console.error('Payment error');
          }
        }
      }

      if ((paymentType === 'partial' || paymentType === 'pending') && dueDate) {
        try {
          await api.put(`/customers/${formData.customerId}/due-date`, {
            dueDate: dueDate.toISOString()
          });
        } catch (error) {
          console.error('Could not set due date');
        }
      } else if (paymentType === 'full') {
        try {
          await api.put(`/customers/${formData.customerId}/due-date`, { dueDate: null });
        } catch (error) {
          console.error('Could not clear due date');
        }
      }

      toast.success(`Sale created! Opening print...`);
      
      resetForm();
      onOpenChange(false);
      if (onSuccess) onSuccess();

      setTimeout(() => {
        window.open(`/sales/${saleId}?print=true`, '_blank');
      }, 300);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to create sale");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      customerId: "",
      customerName: "",
      saleDate: new Date().toISOString().split('T')[0],
      notes: "",
    });
    setItems([]);
    setNewItem({ serviceId: "", description: "", quantity: 1, amount: 0 });
    setPaymentType('pending');
    setPaidAmount("");
    setDueDate(undefined);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Sale</DialogTitle>
          <DialogDescription>
            Record sale with payment details - choose customer or walk-in
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {/* Customer Selection with Walk-in Option */}
          <div className="space-y-2">
            <Label htmlFor="customer" className="font-semibold">Customer *</Label>
            {loadingCustomers ? (
              <div className="flex items-center gap-2 p-3 border rounded">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Loading...</span>
              </div>
            ) : (
              <Select value={formData.customerId} onValueChange={handleCustomerChange} disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder="Select customer or walk-in" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="walk-in">
                    <span className="font-medium text-teal-600">🚶 Walk-in Customer</span>
                  </SelectItem>
                  {customers.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 border-t mt-1">
                        REGISTERED CUSTOMERS
                      </div>
                      {customers.map((c) => (
                        <SelectItem key={c._id} value={c._id}>
                          {c.name}{c.phone && ` - ${c.phone}`}
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
            )}
            {isWalkIn && (
              <p className="text-xs text-amber-600 flex items-center gap-1">
                <span>⚠️</span> Walk-in customers cannot have pending payments
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="saleDate">Sale Date</Label>
            <Input
              id="saleDate"
              type="date"
              value={formData.saleDate}
              onChange={(e) => setFormData({ ...formData, saleDate: e.target.value })}
              disabled={loading}
            />
          </div>

          {services.length > 0 && (
            <div className="space-y-2 border-t pt-4">
              <Label>Quick Select Services</Label>
              <div className="flex gap-2">
                <Select value={newItem.serviceId} onValueChange={handleServiceChange} disabled={loading}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose service..." />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((s) => (
                      <SelectItem key={s._id} value={s._id}>
                        {s.name} - ₹{s.price}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min="1"
                  value={newItem.quantity}
                  onChange={(e) => setNewItem({ ...newItem, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                  placeholder="Qty"
                  className="w-20"
                />
                <Button type="button" variant="outline" onClick={handleAddItem} disabled={!newItem.description}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-3 border-t pt-4">
            <Label className="font-semibold">Items *</Label>
            <Card className="p-3 bg-gray-50">
              <div className="space-y-3">
                <Input
                  value={newItem.description}
                  onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                  placeholder="Description"
                />
                <div className="grid grid-cols-3 gap-3">
                  <Input
                    type="number"
                    min="1"
                    value={newItem.quantity}
                    onChange={(e) => setNewItem({ ...newItem, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                    placeholder="Qty"
                  />
                  <Input
                    type="number"
                    step="0.01"
                    value={newItem.amount}
                    onChange={(e) => setNewItem({ ...newItem, amount: parseFloat(e.target.value) || 0 })}
                    placeholder="Rate"
                  />
                  <div className="flex items-center justify-center bg-white border rounded px-2">
                    ₹{(newItem.quantity * newItem.amount).toFixed(2)}
                  </div>
                </div>
                <Button type="button" variant="outline" className="w-full" onClick={handleAddItem} disabled={!newItem.description || newItem.amount <= 0}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>
            </Card>

            {items.length > 0 && (
              <div className="border rounded p-3 bg-white">
                <h4 className="font-semibold text-sm mb-2">Items ({items.length})</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {items.map((item) => (
                    <div key={item.id} className="flex justify-between items-center p-2 bg-gray-50 border rounded">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{item.description}</p>
                        <p className="text-xs text-gray-600">
                          {item.quantity} × ₹{item.amount} = ₹{(item.quantity * item.amount).toFixed(2)}
                        </p>
                      </div>
                      <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveItem(item.id)} className="text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="border-t mt-3 pt-2 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>₹{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>GST (18%):</span>
                    <span>₹{gst.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-base">
                    <span>Total:</span>
                    <span className="text-teal-600">₹{totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {items.length > 0 && totalAmount > 0 && (
            <div className="space-y-3 pt-4 border-t">
              <h3 className="font-semibold">Payment Status</h3>
              <Select value={paymentType} onValueChange={(v: any) => setPaymentType(v)} disabled={loading}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">Full Payment - ₹{totalAmount.toFixed(2)} (Clear)</SelectItem>
                  <SelectItem value="partial">Partial Payment - Some Paid</SelectItem>
                  {!isWalkIn && (
                    <SelectItem value="pending">No Payment - Pending</SelectItem>
                  )}
                </SelectContent>
              </Select>

              {paymentType === 'partial' && (
                <div>
                  <Label>Amount Paid (₹) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    placeholder="Amount paid"
                    max={totalAmount}
                  />
                  {parseFloat(paidAmount) > 0 && (
                    <p className="text-sm text-gray-600 mt-1">
                      Remaining: ₹{remainingAmount.toFixed(2)}
                    </p>
                  )}
                </div>
              )}

              {!isWalkIn && (paymentType === 'partial' || paymentType === 'pending') && (
                <div>
                  <Label>Due Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn("w-full justify-start", !dueDate && "text-muted-foreground")}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dueDate ? format(dueDate, "PPP") : "Pick due date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={dueDate} onSelect={setDueDate} disabled={(date) => date < new Date()} />
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              <div className="p-3 border-2 rounded">
                {paymentType === 'full' && (
                  <div className="bg-green-50">
                    <p className="text-xs text-green-600 font-medium mb-1">✓ FULL PAYMENT</p>
                    <p className="text-sm">Total: ₹{totalAmount.toFixed(2)}</p>
                    <p className="text-sm text-green-600">Paid: ₹{totalAmount.toFixed(2)}</p>
                    <p className="text-lg font-bold text-green-600 mt-2">Outstanding: ₹0 ✓</p>
                  </div>
                )}
                {paymentType === 'partial' && (
                  <div className="bg-yellow-50">
                    <p className="text-xs text-yellow-600 font-medium mb-1">⚠ PARTIAL PAYMENT</p>
                    <p className="text-sm">Total: ₹{totalAmount.toFixed(2)}</p>
                    <p className="text-sm text-green-600">Paid: ₹{paidAmountValue.toFixed(2)}</p>
                    <p className="text-lg font-bold text-red-600 mt-2">Outstanding: ₹{remainingAmount.toFixed(2)}</p>
                    {!isWalkIn && dueDate && <p className="text-xs text-yellow-700 mt-2">Due: {format(dueDate, "PPP")}</p>}
                  </div>
                )}
                {paymentType === 'pending' && !isWalkIn && (
                  <div className="bg-red-50">
                    <p className="text-xs text-red-600 font-medium mb-1">✗ PENDING PAYMENT</p>
                    <p className="text-sm">Total: ₹{totalAmount.toFixed(2)}</p>
                    <p className="text-sm text-red-600">Paid: ₹0</p>
                    <p className="text-lg font-bold text-red-600 mt-2">Outstanding: ₹{totalAmount.toFixed(2)}</p>
                    {dueDate && <p className="text-xs text-red-700 mt-2">Due: {format(dueDate, "PPP")}</p>}
                  </div>
                )}
              </div>
            </div>
          )}

          <div>
            <Label>Notes (Optional)</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Add notes..."
              rows={2}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => { resetForm(); onOpenChange(false); }}>
              Cancel
            </Button>
            {!isWalkIn && (
              <Button type="button" variant="outline" onClick={handleSaveAndPrint} disabled={loading || items.length === 0} className="gap-2">
                <Printer className="h-4 w-4" />
                Save & Print
              </Button>
            )}
            <Button type="submit" disabled={loading || items.length === 0} className="bg-teal-500 hover:bg-teal-600">
              {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Creating...</> : "Complete Sale"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}