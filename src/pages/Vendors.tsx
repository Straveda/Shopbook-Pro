// FILE: src/pages/Vendors.tsx
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Edit2, Trash2, Loader2, CheckCircle, XCircle, Phone, MapPin, Mail } from "lucide-react";
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
import vendorService from "@/services/vendorService";
import { toast } from "sonner";

// Toast Component
const Toast = ({ message, type }: { message: string; type: 'success' | 'error' }) => (
  <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg ${
    type === 'success' ? 'bg-teal-600 text-white' : 'bg-red-500 text-white'
  }`}>
    {type === 'success' ? <CheckCircle className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
    <span>{message}</span>
  </div>
);

export default function Vendors() {
  const [searchQuery, setSearchQuery] = useState("");
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<any>(null);
  const [vendorToDelete, setVendorToDelete] = useState<any>(null);
  const [toastMessage, setToastMessage] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    vendorName: "",
    vendorCode: "",
    contactPerson: "",
    email: "",
    phone: "",
    alternatePhone: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    paymentTerms: "30 days",
    isActive: true
  });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ message, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const response = await vendorService.getAllVendors();
      if (response.success && response.data) {
        setVendors(response.data);
      } else {
        showToast("Failed to load vendors", "error");
        setVendors([]);
      }
    } catch (error) {
      console.error("Error fetching vendors:", error);
      showToast("Failed to load vendors", "error");
      setVendors([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddVendor = () => {
    setEditingVendor(null);
    setFormData({
      vendorName: "",
      vendorCode: "",
      contactPerson: "",
      email: "",
      phone: "",
      alternatePhone: "",
      address: "",
      city: "",
      state: "",
      pincode: "",
      paymentTerms: "30 days",
      isActive: true
    });
    setDialogOpen(true);
  };

  const handleEditVendor = (vendor: any) => {
    setEditingVendor(vendor);
    setFormData({
      vendorName: vendor.vendorName,
      vendorCode: vendor.vendorCode,
      contactPerson: vendor.contactPerson,
      email: vendor.email,
      phone: vendor.phone,
      alternatePhone: vendor.alternatePhone || "",
      address: vendor.address || "",
      city: vendor.city || "",
      state: vendor.state || "",
      pincode: vendor.pincode || "",
      paymentTerms: vendor.paymentTerms || "30 days",
      isActive: vendor.isActive !== false
    });
    setDialogOpen(true);
  };

  const handleDeleteClick = (vendor: any) => {
    setVendorToDelete(vendor);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.vendorName || !formData.vendorCode || !formData.phone) {
      showToast("Please fill all required fields", "error");
      return;
    }

    setSubmitting(true);

    try {
      let response;

      if (editingVendor) {
        response = await vendorService.updateVendor(editingVendor._id, {
          vendorName: formData.vendorName,
          vendorCode: formData.vendorCode,
          contactPerson: formData.contactPerson,
          email: formData.email,
          phone: formData.phone,
          alternatePhone: formData.alternatePhone,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode,
          paymentTerms: formData.paymentTerms,
          isActive: formData.isActive
        });
      } else {
        response = await vendorService.addVendor({
          vendorName: formData.vendorName,
          vendorCode: formData.vendorCode,
          contactPerson: formData.contactPerson,
          email: formData.email,
          phone: formData.phone,
          alternatePhone: formData.alternatePhone,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode,
          paymentTerms: formData.paymentTerms,
          isActive: formData.isActive
        });
      }

      if (response.success) {
        showToast(
          editingVendor 
            ? "Vendor updated successfully" 
            : "Vendor added successfully",
          "success"
        );
        setDialogOpen(false);
        await fetchVendors();
      } else {
        showToast(response.message || "Failed to save vendor", "error");
      }
    } catch (error: any) {
      console.error("Error saving vendor:", error);
      showToast(error.message || "Failed to save vendor", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      const response = await vendorService.deleteVendor(vendorToDelete._id);
      if (response.success) {
        showToast("Vendor deleted successfully", "success");
        setDeleteDialogOpen(false);
        await fetchVendors();
      } else {
        showToast(response.message || "Failed to delete vendor", "error");
      }
    } catch (error: any) {
      console.error("Error deleting vendor:", error);
      showToast(error.message || "Failed to delete vendor", "error");
    }
  };

  const filteredVendors = vendors.filter((vendor) => {
    return (
      vendor.vendorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vendor.vendorCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vendor.phone.includes(searchQuery)
    );
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {toastMessage && <Toast message={toastMessage.message} type={toastMessage.type} />}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Vendors</h1>
          <p className="text-muted-foreground">Manage your vendor database</p>
        </div>
        <Button className="gap-2 bg-teal-500 hover:bg-teal-600" onClick={handleAddVendor}>
          <Plus className="h-4 w-4" />
          Add Vendor
        </Button>
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by vendor name, code, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Vendors Grid */}
      <div className="grid gap-4">
        {filteredVendors.length > 0 ? (
          filteredVendors.map((vendor) => (
            <Card key={vendor._id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex-1 space-y-2 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-lg font-semibold truncate">{vendor.vendorName}</h3>
                      <Badge variant="outline" className="whitespace-nowrap">
                        {vendor.vendorCode}
                      </Badge>
                      {vendor.isActive ? (
                        <Badge className="bg-teal-100 text-teal-700 border-teal-200 whitespace-nowrap">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="whitespace-nowrap">
                          Inactive
                        </Badge>
                      )}
                    </div>

                    {vendor.contactPerson && (
                      <div className="text-sm text-muted-foreground">
                        Contact: {vendor.contactPerson}
                      </div>
                    )}

                    <div className="flex gap-4 text-sm text-muted-foreground flex-wrap">
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3 flex-shrink-0" />
                        {vendor.phone}
                      </div>
                      {vendor.email && (
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3 flex-shrink-0" />
                          {vendor.email}
                        </div>
                      )}
                      {vendor.address && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 flex-shrink-0" />
                          {vendor.address}
                        </div>
                      )}
                    </div>

                    {vendor.paymentTerms && (
                      <div className="text-xs text-muted-foreground">
                        Payment Terms: {vendor.paymentTerms}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 flex-wrap justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => handleEditVendor(vendor)}
                    >
                      <Edit2 className="h-4 w-4" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleDeleteClick(vendor)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <div className="flex justify-center mb-4">
              <div className="text-5xl">🏢</div>
            </div>
            <p className="text-muted-foreground">
              {searchQuery ? "No vendors found matching your search" : "No vendors yet. Add your first vendor to get started."}
            </p>
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingVendor ? "Edit Vendor" : "Add New Vendor"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="vendorName">Vendor Name *</Label>
                <Input
                  id="vendorName"
                  value={formData.vendorName}
                  onChange={(e) => setFormData({ ...formData, vendorName: e.target.value })}
                  placeholder="e.g., ABC Supplies"
                  disabled={submitting}
                />
              </div>

              <div>
                <Label htmlFor="vendorCode">Vendor Code *</Label>
                <Input
                  id="vendorCode"
                  value={formData.vendorCode}
                  onChange={(e) => setFormData({ ...formData, vendorCode: e.target.value.toUpperCase() })}
                  placeholder="e.g., VND001"
                  maxLength={20}
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contactPerson">Contact Person</Label>
                <Input
                  id="contactPerson"
                  value={formData.contactPerson}
                  onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                  placeholder="e.g., John Doe"
                  disabled={submitting}
                />
              </div>

              <div>
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="e.g., 9876543210"
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="e.g., vendor@example.com"
                  disabled={submitting}
                />
              </div>

              <div>
                <Label htmlFor="alternatePhone">Alternate Phone</Label>
                <Input
                  id="alternatePhone"
                  value={formData.alternatePhone}
                  onChange={(e) => setFormData({ ...formData, alternatePhone: e.target.value })}
                  placeholder="e.g., 9876543211"
                  disabled={submitting}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="e.g., 123 Main Street"
                disabled={submitting}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="e.g., Mumbai"
                  disabled={submitting}
                />
              </div>

              <div>
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  placeholder="e.g., Maharashtra"
                  disabled={submitting}
                />
              </div>

              <div>
                <Label htmlFor="pincode">Pincode</Label>
                <Input
                  id="pincode"
                  value={formData.pincode}
                  onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                  placeholder="e.g., 400001"
                  disabled={submitting}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="paymentTerms">Payment Terms</Label>
              <Input
                id="paymentTerms"
                value={formData.paymentTerms}
                onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                placeholder="e.g., Net 30, COD, etc."
                disabled={submitting}
              />
            </div>
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
              {submitting ? "Saving..." : editingVendor ? "Update Vendor" : "Add Vendor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Vendor</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{vendorToDelete?.vendorName}"? This action cannot be undone.
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