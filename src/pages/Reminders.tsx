import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Search,
  MessageCircle,
  Phone,
  Calendar,
  Loader2,
  CheckCircle2,
  Copy,
  Edit2,
  RefreshCw,
  Send,
  Mail
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import customerService from "@/services/customerService";
import reminderService from "@/services/ReminderService";
import { formatDistanceToNow } from "date-fns";

interface Customer {
  _id: string;
  name: string;
  phone: string;
  address?: string;
  outstandingAmount: number;
  creditLimit: number;
  lastTransaction?: Date;
}

export default function ManualReminders() {
  const [searchQuery, setSearchQuery] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [customMessage, setCustomMessage] = useState<{ [key: string]: string }>({});
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const [sentReminders, setSentReminders] = useState<Set<string>>(new Set());

  // Send Method Dialog State
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [selectedCustomerForSend, setSelectedCustomerForSend] = useState<Customer | null>(null);
  const [sendMethod, setSendMethod] = useState<'whatsapp' | 'sms'>('whatsapp');

  useEffect(() => {
    fetchCustomers();
    loadSentReminders();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const response = await customerService.getAllCustomers();
      if (response.success && response.data) {
        const customersWithDebt = response.data.filter(
          (customer: Customer) => customer.outstandingAmount > 0
        );
        setCustomers(customersWithDebt);
      } else {
        toast.error("Failed to load customers");
      }
    } catch (error: any) {
      console.error("Error fetching customers:", error);
      toast.error("Failed to load customers");
    } finally {
      setLoading(false);
    }
  };

  const loadSentReminders = () => {
    const today = new Date().toDateString();
    const stored = localStorage.getItem(`reminders_sent_${today}`);
    if (stored) {
      setSentReminders(new Set(JSON.parse(stored)));
    }
  };

  const markAsSent = (customerId: string) => {
    const today = new Date().toDateString();
    const newSet = new Set(sentReminders);
    newSet.add(customerId);
    setSentReminders(newSet);
    localStorage.setItem(`reminders_sent_${today}`, JSON.stringify([...newSet]));
  };

  const generateMessage = (customer: Customer) => {
    if (customMessage[customer._id]) {
      return customMessage[customer._id];
    }

    const daysOverdue = customer.lastTransaction
      ? Math.floor((new Date().getTime() - new Date(customer.lastTransaction).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    let message = `Hello ${customer.name},\n\n`;

    if (daysOverdue > 30) {
      message += `This is a friendly reminder about your outstanding payment of ₹${customer.outstandingAmount.toLocaleString()}.\n\n`;
      message += `It has been ${daysOverdue} days since your last transaction. `;
    } else {
      message += `You have an outstanding balance of ₹${customer.outstandingAmount.toLocaleString()}. `;
    }

    message += `Please settle your payment at your earliest convenience.\n\n`;
    message += `Thank you for your business!\n`;
    message += `- ShopBook`;

    return message;
  };

  const openSendDialog = (customer: Customer) => {
    setSelectedCustomerForSend(customer);
    setSendMethod('whatsapp');
    setSendDialogOpen(true);
  };

  const handleSendReminder = () => {
    if (!selectedCustomerForSend) return;

    const message = generateMessage(selectedCustomerForSend);
    const phone = selectedCustomerForSend.phone.replace(/\D/g, '');
    const formattedPhone = phone.length === 10 ? `91${phone}` : phone;

    console.log(`📱 [Redirect] Method: ${sendMethod}, Phone: ${formattedPhone}, Name: ${selectedCustomerForSend.name}`);

    let redirectUrl = '';
    if (sendMethod === 'whatsapp') {
      const encodedMessage = encodeURIComponent(message);
      // Use wa.me for more reliable deep-linking
      redirectUrl = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
    } else {
      redirectUrl = `sms:${formattedPhone}?body=${encodeURIComponent(message)}`;
    }

    console.log(`🔗 [Redirect] URL: ${redirectUrl}`);

    // Try opening in new window/tab
    if (sendMethod === 'whatsapp') {
      const newWin = window.open(redirectUrl, '_blank');
      if (!newWin || newWin.closed || typeof newWin.closed === 'undefined') {
        // Fallback for popup blockers
        window.location.href = redirectUrl;
      }
    } else {
      window.location.href = redirectUrl;
    }

    // Show toast with manual link fallback in case everything fails
    toast.success(
      <div className="flex flex-col gap-1">
        <span className="font-medium">
          {sendMethod === 'whatsapp' ? 'WhatsApp opened' : 'SMS app opened'} for {selectedCustomerForSend.name}
        </span>
        <a
          href={redirectUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-600 underline hover:text-blue-800"
          onClick={(e) => e.stopPropagation()}
        >
          Click here if it didn't open automatically
        </a>
      </div>,
      { duration: 6000 }
    );

    // Persist reminder to DB in the background
    reminderService.createReminder({
      customerId: selectedCustomerForSend._id,
      customerName: selectedCustomerForSend.name,
      customerPhone: selectedCustomerForSend.phone,
      message,
      reminderDate: new Date(),
      channel: sendMethod,
      status: 'sent',
    }).catch((err: any) => console.warn('Could not save reminder to DB:', err));

    markAsSent(selectedCustomerForSend._id);
    setSendDialogOpen(false);
    setSelectedCustomerForSend(null);
  };

  const copyMessage = (customer: Customer) => {
    const message = generateMessage(customer);
    navigator.clipboard.writeText(message);
    toast.success("Message copied to clipboard!");
  };

  const copyPhone = (phone: string) => {
    navigator.clipboard.writeText(phone);
    toast.success("Phone number copied!");
  };

  const updateCustomMessage = (customerId: string, message: string) => {
    setCustomMessage(prev => ({
      ...prev,
      [customerId]: message
    }));
  };

  const resetMessage = (customerId: string) => {
    setCustomMessage(prev => {
      const updated = { ...prev };
      delete updated[customerId];
      return updated;
    });
    setEditingMessage(null);
    toast.success("Message reset to default");
  };

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.phone.includes(searchQuery)
  );

  const getDaysOverdue = (lastTransaction?: Date) => {
    if (!lastTransaction) return "No transaction history";
    const days = Math.floor(
      (new Date().getTime() - new Date(lastTransaction).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (days <= 7) return "Recent";
    if (days <= 30) return `${days} days ago`;
    return `${days} days overdue`;
  };

  const totalOutstanding = filteredCustomers.reduce((sum, c) => sum + c.outstandingAmount, 0);
  const remindersToSend = filteredCustomers.length;
  const remindersSent = filteredCustomers.filter(c => sentReminders.has(c._id)).length;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Send Payment Reminders</h1>
          <p className="text-muted-foreground">
            Send reminders via WhatsApp or SMS - Choose your preferred method
          </p>
        </div>
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => {
            setSentReminders(new Set());
            localStorage.removeItem(`reminders_sent_${new Date().toDateString()}`);
            toast.success("Reset today's sent reminders");
          }}
        >
          <RefreshCw className="h-4 w-4" />
          Reset Today
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-2 border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="text-sm font-medium text-gray-600 mb-2">
              Total Outstanding
            </div>
            <div className="text-3xl font-bold text-red-600">
              ₹{totalOutstanding.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card className="border-2 border-orange-200 bg-orange-50">
          <CardContent className="p-6">
            <div className="text-sm font-medium text-gray-600 mb-2">
              Reminders to Send
            </div>
            <div className="text-3xl font-bold text-orange-600">
              {remindersToSend - remindersSent}
            </div>
          </CardContent>
        </Card>
        <Card className="border-2 border-green-200 bg-green-50">
          <CardContent className="p-6">
            <div className="text-sm font-medium text-gray-600 mb-2">
              Sent Today
            </div>
            <div className="text-3xl font-bold text-green-600">
              {remindersSent}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by customer name or phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="grid gap-4">
        {filteredCustomers.map((customer) => {
          const isSent = sentReminders.has(customer._id);
          const isEditing = editingMessage === customer._id;
          const message = generateMessage(customer);

          return (
            <Card
              key={customer._id}
              className={`hover:shadow-md transition-shadow ${isSent ? 'bg-green-50 border-green-200' : ''
                }`}
            >
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Customer Header */}
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold">{customer.name}</h3>
                        {isSent && (
                          <Badge className="bg-green-100 text-green-700 border-green-300">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Sent Today
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        <span>{customer.phone}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2"
                          onClick={() => copyPhone(customer.phone)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      {customer.address && (
                        <p className="text-sm text-muted-foreground">{customer.address}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-red-600">
                        ₹{customer.outstandingAmount.toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">Outstanding</div>
                    </div>
                  </div>

                  {/* Status Info */}
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {getDaysOverdue(customer.lastTransaction)}
                      </span>
                    </div>
                    {customer.creditLimit > 0 && (
                      <div className="text-muted-foreground">
                        Credit Limit: ₹{customer.creditLimit.toLocaleString()}
                      </div>
                    )}
                  </div>

                  {/* Message Preview/Edit */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Message Preview:</Label>
                      <div className="flex gap-2">
                        {customMessage[customer._id] && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => resetMessage(customer._id)}
                          >
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Reset
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => setEditingMessage(isEditing ? null : customer._id)}
                        >
                          <Edit2 className="h-3 w-3 mr-1" />
                          {isEditing ? 'Done' : 'Edit'}
                        </Button>
                      </div>
                    </div>

                    {isEditing ? (
                      <Textarea
                        value={message}
                        onChange={(e) => updateCustomMessage(customer._id, e.target.value)}
                        rows={6}
                        className="text-sm font-mono"
                      />
                    ) : (
                      <div className="bg-gray-50 p-3 rounded-md border text-sm whitespace-pre-wrap font-mono">
                        {message}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      className="flex-1 gap-2 bg-teal-700 hover:bg-teal-600"
                      onClick={() => openSendDialog(customer)}
                    >
                      <Send className="h-4 w-4" />
                      Send Reminder
                    </Button>
                    <Button
                      variant="outline"
                      className="gap-2"
                      onClick={() => copyMessage(customer)}
                    >
                      <Copy className="h-4 w-4" />
                      Copy
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {!loading && filteredCustomers.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {searchQuery
              ? "No customers found matching your search"
              : "No customers with outstanding balance"}
          </p>
        </div>
      )}

      {/* Send Method Selection Dialog */}
      <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Choose Sending Method</DialogTitle>
            <DialogDescription>
              Select how you want to send the reminder to {selectedCustomerForSend?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Send Via:</Label>
              <Select value={sendMethod} onValueChange={(value: 'whatsapp' | 'sms') => setSendMethod(value)}>
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

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex gap-2">
                <div className="text-blue-600 mt-0.5">
                  {sendMethod === 'whatsapp' ? <MessageCircle className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
                </div>
                <div className="text-xs text-blue-800">
                  {sendMethod === 'whatsapp' ? (
                    <>
                      <strong>WhatsApp:</strong> Opens WhatsApp with the message ready. Customer must have WhatsApp installed.
                    </>
                  ) : (
                    <>
                      <strong>SMS:</strong> Opens your default messaging app. Works for any phone number, even without WhatsApp.
                    </>
                  )}
                </div>
              </div>
            </div>

            {selectedCustomerForSend && (
              <div className="bg-gray-50 p-3 rounded-lg border">
                <div className="text-xs text-gray-600 mb-1">Customer Details:</div>
                <div className="font-semibold">{selectedCustomerForSend.name}</div>
                <div className="text-sm text-gray-600">{selectedCustomerForSend.phone}</div>
                <div className="text-sm font-semibold text-red-600 mt-1">
                  Outstanding: ₹{selectedCustomerForSend.outstandingAmount.toLocaleString()}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSendDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSendReminder}
              className="bg-teal-600 hover:bg-teal-700"
            >
              <Send className="h-4 w-4 mr-2" />
              Send via {sendMethod === 'whatsapp' ? 'WhatsApp' : 'SMS'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {filteredCustomers.length > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <MessageCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-blue-900">
                  💡 How it works:
                </p>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>1. Review and edit the message if needed</li>
                  <li>2. Click "Send Reminder" button</li>
                  <li>3. Choose WhatsApp or SMS based on customer preference</li>
                  <li>4. The app/WhatsApp opens with message ready - just press Send!</li>
                  <li>5. Reminder is marked as sent automatically</li>
                </ul>
                <p className="text-xs text-blue-700 mt-2">
                  ✓ 100% Free • Works on desktop and mobile • Use WhatsApp for customers with the app, SMS for everyone else
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <label className={className}>{children}</label>;
}