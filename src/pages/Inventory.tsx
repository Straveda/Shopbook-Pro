// FILE: src/pages/Inventory.tsx
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Edit2, Trash2, Loader2, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
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
import inventoryService from "@/services/inventoryService";
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

export default function Inventory() {
  const [searchQuery, setSearchQuery] = useState("");
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [itemToDelete, setItemToDelete] = useState<any>(null);
  const [toastMessage, setToastMessage] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    itemName: "",
    itemCode: "",
    quantity: "",
    reorderLevel: "",
    purchasePrice: "",
    sellingPrice: "",
    unit: "piece"
  });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ message, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const response = await inventoryService.getAllInventory();
      console.log('Inventory response:', response);
      
      if (response.success && response.data) {
        const items = Array.isArray(response.data) ? response.data : [];
        setInventory(items);
      } else {
        showToast("Failed to load inventory", "error");
        setInventory([]);
      }
    } catch (error) {
      console.error("Error fetching inventory:", error);
      showToast("Failed to load inventory", "error");
      setInventory([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = () => {
    setEditingItem(null);
    setFormData({
      itemName: "",
      itemCode: "",
      quantity: "",
      reorderLevel: "",
      purchasePrice: "",
      sellingPrice: "",
      unit: "piece"
    });
    setDialogOpen(true);
  };

  const handleEditItem = (item: any) => {
    setEditingItem(item);
    setFormData({
      itemName: item.itemName,
      itemCode: item.itemCode,
      quantity: item.quantity.toString(),
      reorderLevel: item.reorderLevel.toString(),
      purchasePrice: item.purchasePrice.toString(),
      sellingPrice: item.sellingPrice.toString(),
      unit: item.unit
    });
    setDialogOpen(true);
  };

  const handleDeleteClick = (item: any) => {
    setItemToDelete(item);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.itemName || !formData.itemCode || !formData.quantity || !formData.purchasePrice || !formData.sellingPrice) {
      showToast("Please fill all required fields", "error");
      return;
    }

    setSubmitting(true);

    try {
      let response;

      if (editingItem) {
        response = await inventoryService.updateInventory(editingItem._id, {
          itemName: formData.itemName,
          itemCode: formData.itemCode,
          quantity: parseInt(formData.quantity),
          reorderLevel: parseInt(formData.reorderLevel),
          purchasePrice: parseFloat(formData.purchasePrice),
          sellingPrice: parseFloat(formData.sellingPrice),
          unit: formData.unit
        });
      } else {
        response = await inventoryService.addInventory({
          itemName: formData.itemName,
          itemCode: formData.itemCode,
          quantity: parseInt(formData.quantity),
          reorderLevel: parseInt(formData.reorderLevel),
          purchasePrice: parseFloat(formData.purchasePrice),
          sellingPrice: parseFloat(formData.sellingPrice),
          unit: formData.unit
        });
      }

      if (response.success) {
        showToast(
          editingItem 
            ? "Item updated successfully" 
            : "Item added successfully",
          "success"
        );
        setDialogOpen(false);
        await fetchInventory();
      } else {
        showToast(response.message || "Failed to save item", "error");
      }
    } catch (error: any) {
      console.error("Error saving item:", error);
      showToast(error.message || "Failed to save item", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      const response = await inventoryService.deleteInventory(itemToDelete._id);
      if (response.success) {
        showToast("Item deleted successfully", "success");
        setDeleteDialogOpen(false);
        await fetchInventory();
      } else {
        showToast(response.message || "Failed to delete item", "error");
      }
    } catch (error: any) {
      console.error("Error deleting item:", error);
      showToast(error.message || "Failed to delete item", "error");
    }
  };

  const getLowStockItems = () => {
    return inventory.filter(item => item.quantity <= item.reorderLevel);
  };

  const filteredInventory = inventory.filter((item) => {
    return (
      item.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.itemCode.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const getStockStatus = (item: any) => {
    if (item.quantity <= item.reorderLevel) {
      return { status: "low", color: "text-red-600", bgColor: "bg-red-50", badge: "Low Stock" };
    } else if (item.quantity <= item.reorderLevel * 1.5) {
      return { status: "medium", color: "text-yellow-600", bgColor: "bg-yellow-50", badge: "Medium" };
    }
    return { status: "good", color: "text-green-600", bgColor: "bg-green-50", badge: "In Stock" };
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
      </div>
    );
  }

  const lowStockItems = getLowStockItems();

  return (
    <div className="space-y-6">
      {toastMessage && <Toast message={toastMessage.message} type={toastMessage.type} />}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Inventory</h1>
          <p className="text-muted-foreground">Manage your shop inventory and stock levels</p>
        </div>
        <Button className="gap-2 bg-teal-500 hover:bg-teal-600" onClick={handleAddItem}>
          <Plus className="h-4 w-4" />
          Add Item
        </Button>
      </div>

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-900">Low Stock Alert</h3>
                <p className="text-sm text-yellow-800 mt-1">
                  {lowStockItems.length} item{lowStockItems.length > 1 ? 's' : ''} below reorder level
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {lowStockItems.map(item => (
                    <Badge key={item._id} variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                      {item.itemName} - Only {item.quantity} {item.unit}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by item name or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Inventory Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredInventory.length > 0 ? (
          filteredInventory.map((item) => {
            const statusInfo = getStockStatus(item);
            const profit = item.sellingPrice - item.purchasePrice;
            const profitMargin = ((profit / item.purchasePrice) * 100).toFixed(1);

            return (
              <Card key={item._id} className={`hover:shadow-md transition-shadow border-l-4 ${
                statusInfo.status === 'low' ? 'border-l-red-500' :
                statusInfo.status === 'medium' ? 'border-l-yellow-500' :
                'border-l-teal-700'
              }`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold">{item.itemName}</h3>
                      <Badge variant="outline" className="mt-1">
                        {item.itemCode}
                      </Badge>
                    </div>
                    <Badge className={`${statusInfo.bgColor} ${statusInfo.color} border-0`}>
                      {statusInfo.badge}
                    </Badge>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Current Stock:</span>
                      <span className="font-semibold">{item.quantity} {item.unit}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Reorder Level:</span>
                      <span className="font-semibold">{item.reorderLevel} {item.unit}</span>
                    </div>
                    <div className="flex justify-between text-sm pt-2 border-t">
                      <span className="text-muted-foreground">Purchase Price:</span>
                      <span className="font-semibold">₹{item.purchasePrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Selling Price:</span>
                      <span className="font-semibold text-teal-600">₹{item.sellingPrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Profit/Unit:</span>
                      <span className="font-semibold text-teal-700">₹{profit.toFixed(2)} ({profitMargin}%)</span>
                    </div>
                    <div className="flex justify-between text-sm pt-2 border-t">
                      <span className="text-muted-foreground">Total Value:</span>
                      <span className="font-bold text-teal-600">₹{(item.quantity * item.purchasePrice).toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-2"
                      onClick={() => handleEditItem(item)}
                      disabled={submitting}
                    >
                      <Edit2 className="h-3 w-3" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleDeleteClick(item)}
                      disabled={submitting}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <div className="col-span-full text-center py-12">
            <p className="text-muted-foreground">
              {searchQuery ? "No items found matching your search" : "No inventory items yet. Add one to get started!"}
            </p>
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Edit Inventory Item" : "Add New Inventory Item"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="itemName">Item Name *</Label>
              <Input
                id="itemName"
                value={formData.itemName}
                onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
                placeholder="e.g., A4 Paper (Ream)"
                disabled={submitting}
              />
            </div>

            <div>
              <Label htmlFor="itemCode">Item Code *</Label>
              <Input
                id="itemCode"
                value={formData.itemCode}
                onChange={(e) => setFormData({ ...formData, itemCode: e.target.value.toUpperCase() })}
                placeholder="e.g., A4P500"
                maxLength={20}
                disabled={submitting}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="quantity">Quantity *</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="0"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  placeholder="0"
                  disabled={submitting}
                />
              </div>

              <div>
                <Label htmlFor="reorderLevel">Reorder Level *</Label>
                <Input
                  id="reorderLevel"
                  type="number"
                  min="0"
                  value={formData.reorderLevel}
                  onChange={(e) => setFormData({ ...formData, reorderLevel: e.target.value })}
                  placeholder="0"
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="purchasePrice">Purchase Price (₹) *</Label>
                <Input
                  id="purchasePrice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.purchasePrice}
                  onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                  placeholder="0.00"
                  disabled={submitting}
                />
              </div>

              <div>
                <Label htmlFor="sellingPrice">Selling Price (₹) *</Label>
                <Input
                  id="sellingPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.sellingPrice}
                  onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                  placeholder="0.00"
                  disabled={submitting}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="unit">Unit</Label>
              <Input
                id="unit"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                placeholder="e.g., piece, ream, box"
                disabled={submitting}
              />
            </div>

            {formData.purchasePrice && formData.sellingPrice && (
              <div className="p-3 bg-teal-50 rounded-lg">
                <div className="text-sm text-gray-600">Profit per unit:</div>
                <div className="text-2xl font-bold text-teal-600">
                  ₹{(parseFloat(formData.sellingPrice) - parseFloat(formData.purchasePrice)).toFixed(2)}
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  Margin: {(((parseFloat(formData.sellingPrice) - parseFloat(formData.purchasePrice)) / parseFloat(formData.purchasePrice)) * 100).toFixed(1)}%
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
              {submitting ? "Saving..." : editingItem ? "Update Item" : "Add Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{itemToDelete?.itemName}"? This action cannot be undone.
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