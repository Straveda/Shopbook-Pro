import { useState, useCallback, useEffect } from 'react';
import customerService, { Customer } from '@/services/customerService';
import { toast } from 'sonner';

interface UseCustomersReturn {
  customers: Customer[];
  loading: boolean;
  error: string | null;
  addCustomer: (customerData: any) => Promise<boolean>;
  updateCustomer: (id: string, customerData: any) => Promise<boolean>;
  deleteCustomer: (id: string) => Promise<boolean>;
  fetchCustomers: (search?: string) => Promise<void>;
  receivePayment: (customerId: string, amount: number, paymentMode: string, remarks?: string) => Promise<boolean>;
  addTransaction: (customerId: string, description: string, amount: number, paymentType: 'full' | 'partial' | 'pending', paidAmount?: number) => Promise<boolean>;
}

export const useCustomers = (): UseCustomersReturn => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch customers
  const fetchCustomers = useCallback(
    async (search?: string) => {
      setLoading(true);
      setError(null);
      try {
        const response = await customerService.getAllCustomers(search);
        if (response.success) {
          setCustomers(response.data as Customer[] || []);
        } else {
          const errorMsg = response.message || 'Failed to fetch customers';
          setError(errorMsg);
          toast.error(errorMsg);
        }
      } catch (err: any) {
        const errorMsg = err.response?.data?.message || err.message || 'Failed to fetch customers';
        setError(errorMsg);
        toast.error(errorMsg);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Initial fetch
  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Add customer
  const addCustomer = useCallback(
    async (customerData: any): Promise<boolean> => {
      try {
        const response = await customerService.addCustomer(customerData);
        if (response.success) {
          toast.success(response.message || 'Customer added successfully');
          await fetchCustomers();
          return true;
        } else {
          toast.error(response.message || 'Failed to add customer');
          return false;
        }
      } catch (err: any) {
        const errorMsg = err.response?.data?.message || err.message || 'Failed to add customer';
        toast.error(errorMsg);
        return false;
      }
    },
    [fetchCustomers]
  );

  // Update customer
  const updateCustomer = useCallback(
    async (id: string, customerData: any): Promise<boolean> => {
      try {
        const response = await customerService.updateCustomer(id, customerData);
        if (response.success) {
          toast.success(response.message || 'Customer updated successfully');
          await fetchCustomers();
          return true;
        } else {
          toast.error(response.message || 'Failed to update customer');
          return false;
        }
      } catch (err: any) {
        const errorMsg = err.response?.data?.message || err.message || 'Failed to update customer';
        toast.error(errorMsg);
        return false;
      }
    },
    [fetchCustomers]
  );

  // Delete customer
  const deleteCustomer = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const response = await customerService.deleteCustomer(id);
        if (response.success) {
          toast.success(response.message || 'Customer deleted successfully');
          await fetchCustomers();
          return true;
        } else {
          toast.error(response.message || 'Failed to delete customer');
          return false;
        }
      } catch (err: any) {
        const errorMsg = err.response?.data?.message || err.message || 'Failed to delete customer';
        toast.error(errorMsg);
        return false;
      }
    },
    [fetchCustomers]
  );

  // Receive payment
  const receivePayment = useCallback(
    async (customerId: string, amount: number, paymentMode: string, remarks?: string): Promise<boolean> => {
      try {
        const response = await customerService.receivePayment(customerId, {
          amount,
          paymentMode,
          remarks: remarks || ''
        });
        if (response.success) {
          toast.success(response.message || 'Payment received successfully');
          await fetchCustomers();
          return true;
        } else {
          toast.error(response.message || 'Failed to receive payment');
          return false;
        }
      } catch (err: any) {
        const errorMsg = err.response?.data?.message || err.message || 'Failed to receive payment';
        toast.error(errorMsg);
        return false;
      }
    },
    [fetchCustomers]
  );

  // Add transaction
  const addTransaction = useCallback(
    async (customerId: string, description: string, amount: number, paymentType: 'full' | 'partial' | 'pending', paidAmount?: number): Promise<boolean> => {
      try {
        const response = await customerService.addTransaction(customerId, {
          description,
          amount,
          paymentType,
          paidAmount: paidAmount || 0
        });
        if (response.success) {
          toast.success(response.message || 'Transaction added successfully');
          await fetchCustomers();
          return true;
        } else {
          toast.error(response.message || 'Failed to add transaction');
          return false;
        }
      } catch (err: any) {
        const errorMsg = err.response?.data?.message || err.message || 'Failed to add transaction';
        toast.error(errorMsg);
        return false;
      }
    },
    [fetchCustomers]
  );

  return {
    customers,
    loading,
    error,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    fetchCustomers,
    receivePayment,
    addTransaction,
  };
};