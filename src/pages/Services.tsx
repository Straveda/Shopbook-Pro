import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Edit2, Trash2, Loader2, CheckCircle, XCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import serviceService from "@/services/serviceService";

// Simple toast notification component
const Toast = ({ message, type }: { message: string; type: 'success' | 'error' }) => (
  <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg ${
    type === 'success' ? 'bg-teal-600 text-white' : 'bg-red-500 text-white'
  }`}>
    {type === 'success' ? <CheckCircle className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
    <span>{message}</span>
  </div>
);

// Service categories
const SERVICE_CATEGORIES = [
  "Printing",
  "Photocopy",
  "Lamination",
  "Binding",
  "Scanning",
  "Other"
];

export default function Services() {
  const [searchQuery, setSearchQuery] = useState("");
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);
  const [serviceToDelete, setServiceToDelete] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [toastMessage, setToastMessage] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    category: "Printing",
    price: "",
    tax: "18"
  });

  // Simple toast function
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ message, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    fetchServices();
  }, []);

  // ✅ Fetch from API
  const fetchServices = async () => {
    setLoading(true);
    try {
      console.log('🔥 Fetching services from API...');
      const response = await serviceService.getAllServices();
      
      if (response.success && response.data) {
        setServices(response.data);
        console.log('✅ Services loaded:', response.data.length);
      } else {
        console.warn('No services found:', response.message);
        setServices([]);
      }
    } catch (error) {
      console.error("Error fetching services:", error);
      showToast("Failed to load services", "error");
      setServices([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddService = () => {
    setEditingService(null);
    setFormData({
      name: "",
      code: "",
      category: "Printing",
      price: "",
      tax: "18"
    });
    setDialogOpen(true);
  };

  const handleEditService = (service: any) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      code: service.code,
      category: service.category,
      price: service.price.toString(),
      tax: service.tax.toString()
    });
    setDialogOpen(true);
  };

  const handleDeleteClick = (service: any) => {
    setServiceToDelete(service);
    setDeleteDialogOpen(true);
  };

  // ✅ Submit to API
  const handleSubmit = async () => {
    if (!formData.name || !formData.code || !formData.price) {
      showToast("Please fill all required fields", "error");
      return;
    }

    setSubmitting(true);

    try {
      let response;

      if (editingService) {
        // ✅ Update existing service
        response = await serviceService.updateService(editingService._id, {
          name: formData.name,
          code: formData.code,
          category: formData.category,
          price: parseFloat(formData.price),
          tax: parseFloat(formData.tax)
        });
      } else {
        // ✅ Create new service
        response = await serviceService.createService({
          name: formData.name,
          code: formData.code,
          category: formData.category,
          price: parseFloat(formData.price),
          tax: parseFloat(formData.tax)
        });
      }
      
      if (response.success) {
        showToast(
          editingService 
            ? "Service updated successfully" 
            : "Service added successfully",
          "success"
        );
        setDialogOpen(false);
        await fetchServices();
      } else {
        showToast(response.message || "Failed to save service", "error");
      }
    } catch (error: any) {
      console.error("Error saving service:", error);
      showToast(error.message || "Failed to save service", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // ✅ Delete from API
  const handleDeleteConfirm = async () => {
    try {
      const response = await serviceService.deleteService(serviceToDelete._id);
      
      if (response.success) {
        showToast("Service deleted successfully", "success");
        setDeleteDialogOpen(false);
        await fetchServices();
      } else {
        showToast(response.message || "Failed to delete service", "error");
      }
    } catch (error: any) {
      console.error("Error deleting service:", error);
      showToast(error.message || "Failed to delete service", "error");
    }
  };

  // Filter services
  const filteredServices = services.filter((service) => {
    const matchesSearch = 
      service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.code.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === "all" || service.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Group services by category
  const groupedServices = filteredServices.reduce((acc, service) => {
    if (!acc[service.category]) {
      acc[service.category] = [];
    }
    acc[service.category].push(service);
    return acc;
  }, {} as Record<string, any[]>);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && <Toast message={toastMessage.message} type={toastMessage.type} />}
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Services</h1>
          <p className="text-muted-foreground">Manage your service catalog</p>
        </div>
        <Button className="gap-2 bg-teal-500 hover:bg-teal-600" onClick={handleAddService}>
          <Plus className="h-4 w-4" />
          Add Service
        </Button>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {SERVICE_CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Services by Category */}
      <div className="space-y-6">
        {Object.entries(groupedServices).map(([category, categoryServices]) => (
          <div key={category}>
            <h2 className="text-xl font-semibold mb-4">{category}</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {categoryServices.map((service) => (
                <Card key={service._id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold">{service.name}</h3>
                        <Badge variant="outline" className="mt-1">
                          {service.code}
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Price:</span>
                        <span className="font-semibold">₹{service.price.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Tax:</span>
                        <span className="font-semibold">{service.tax}%</span>
                      </div>
                      <div className="flex justify-between text-sm pt-2 border-t">
                        <span className="text-muted-foreground">Total (incl. tax):</span>
                        <span className="font-bold text-teal-600">
                          ₹{(service.price * (1 + service.tax / 100)).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 gap-2"
                        onClick={() => handleEditService(service)}
                        disabled={submitting}
                      >
                        <Edit2 className="h-3 w-3" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDeleteClick(service)}
                        disabled={submitting}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}

        {filteredServices.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {searchQuery
                ? "No services found matching your search"
                : "No services yet. Add one to get started!"}
            </p>
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingService ? "Edit Service" : "Add New Service"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Service Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., A4 Black & White Print"
                disabled={submitting}
              />
            </div>

            <div>
              <Label htmlFor="code">Service Code *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="e.g., A4BW"
                maxLength={10}
                disabled={submitting}
              />
            </div>

            <div>
              <Label htmlFor="category">Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
                disabled={submitting}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SERVICE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="price">Price (₹) *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="0.00"
                  disabled={submitting}
                />
              </div>

              <div>
                <Label htmlFor="tax">Tax (%) *</Label>
                <Input
                  id="tax"
                  type="number"
                  step="1"
                  min="0"
                  max="100"
                  value={formData.tax}
                  onChange={(e) => setFormData({ ...formData, tax: e.target.value })}
                  placeholder="18"
                  disabled={submitting}
                />
              </div>
            </div>

            {formData.price && formData.tax && (
              <div className="p-3 bg-teal-50 rounded-lg">
                <div className="text-sm text-gray-600">Final Price (incl. tax):</div>
                <div className="text-2xl font-bold text-teal-600">
                  ₹{(parseFloat(formData.price) * (1 + parseFloat(formData.tax) / 100)).toFixed(2)}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setDialogOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button 
              className="bg-teal-500 hover:bg-teal-600" 
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? "Saving..." : editingService ? "Update Service" : "Add Service"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Service</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{serviceToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
              disabled={submitting}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}