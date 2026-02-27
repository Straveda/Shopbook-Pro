// src/hooks/useCreditBook.ts
import { useState, useCallback, useEffect } from 'react';
import creditBookService, { Credit, CreditFilters, CreditSummary } from '@/services/creditBookService';
import { toast } from 'sonner';

export const useCreditBook = (initialFilters?: CreditFilters) => {
  const [credits, setCredits] = useState<Credit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0
  });

  // Fetch credits
  const fetchCredits = useCallback(async (filters?: CreditFilters) => {
    setLoading(true);
    setError(null);
    try {
      const response = await creditBookService.getCredits(filters || initialFilters);
      setCredits(response.data || []);
      setPagination(response.pagination || pagination);
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [initialFilters]);

  // Create credit
  const createCredit = useCallback(async (creditData: Partial<Credit>) => {
    setLoading(true);
    try {
      const response = await creditBookService.createCredit(creditData);
      toast.success('Credit added successfully!');
      await fetchCredits(initialFilters);
      return response.data;
    } catch (err: any) {
      toast.error(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchCredits, initialFilters]);

  // Update credit
  const updateCredit = useCallback(async (id: string, updates: Partial<Credit>) => {
    setLoading(true);
    try {
      const response = await creditBookService.updateCredit(id, updates);
      toast.success('Credit updated successfully!');
      await fetchCredits(initialFilters);
      return response.data;
    } catch (err: any) {
      toast.error(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchCredits, initialFilters]);

  // Delete credit
  const deleteCredit = useCallback(async (id: string) => {
    setLoading(true);
    try {
      await creditBookService.deleteCredit(id);
      toast.success('Credit deleted successfully!');
      await fetchCredits(initialFilters);
    } catch (err: any) {
      toast.error(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchCredits, initialFilters]);

  // Record payment
  const recordPayment = useCallback(async (
    creditId: string,
    paymentData: { amount: number; paymentMethod?: string; note?: string }
  ) => {
    setLoading(true);
    try {
      const response = await creditBookService.recordPayment(creditId, paymentData);
      toast.success('Payment recorded successfully!');
      await fetchCredits(initialFilters);
      return response.data;
    } catch (err: any) {
      toast.error(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchCredits, initialFilters]);

  // Send reminder
  const sendReminder = useCallback(async (
    creditId: string,
    reminderData?: { channel?: 'whatsapp' | 'sms' | 'email'; message?: string }
  ) => {
    try {
      const response = await creditBookService.sendReminder(creditId, reminderData);
      toast.success(response.message || 'Reminder sent successfully!');
      await fetchCredits(initialFilters);
      return response;
    } catch (err: any) {
      toast.error(err.message);
      throw err;
    }
  }, [fetchCredits, initialFilters]);

  // Send bulk reminders
  const sendBulkReminders = useCallback(async (filter?: 'overdue' | 'all') => {
    try {
      const response = await creditBookService.sendBulkReminders(filter);
      toast.success(response.message || 'Bulk reminders sent successfully!');
      await fetchCredits(initialFilters);
      return response;
    } catch (err: any) {
      toast.error(err.message);
      throw err;
    }
  }, [fetchCredits, initialFilters]);

  // Refresh data
  const refresh = useCallback(() => {
    fetchCredits(initialFilters);
  }, [fetchCredits, initialFilters]);

  // Load data on mount
  useEffect(() => {
    fetchCredits(initialFilters);
  }, []);

  return {
    credits,
    loading,
    error,
    pagination,
    fetchCredits,
    createCredit,
    updateCredit,
    deleteCredit,
    recordPayment,
    sendReminder,
    sendBulkReminders,
    refresh
  };
};

// Hook for credit summary
export const useCreditSummary = (filters?: {
  customerId?: string;
  startDate?: string;
  endDate?: string;
}) => {
  const [summary, setSummary] = useState<CreditSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await creditBookService.getSummary(filters);
      setSummary(response.data);
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return {
    summary,
    loading,
    error,
    refresh: fetchSummary
  };
};

// Hook for single credit
export const useCredit = (creditId: string | undefined) => {
  const [credit, setCredit] = useState<Credit | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCredit = useCallback(async () => {
    if (!creditId) return;
    
    setLoading(true);
    setError(null);
    try {
      const response = await creditBookService.getCreditById(creditId);
      setCredit(response.data);
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [creditId]);

  useEffect(() => {
    fetchCredit();
  }, [fetchCredit]);

  return {
    credit,
    loading,
    error,
    refresh: fetchCredit
  };
};

// Hook for customer-specific credits
export const useCustomerCredits = (customerId: string | undefined) => {
  const [summary, setSummary] = useState<any>(null);
  const [credits, setCredits] = useState<Credit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCustomerData = useCallback(async () => {
    if (!customerId) return;
    
    setLoading(true);
    setError(null);
    try {
      const response = await creditBookService.getCustomerSummary(customerId);
      setSummary(response.data.summary);
      setCredits(response.data.credits || []);
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    fetchCustomerData();
  }, [fetchCustomerData]);

  return {
    summary,
    credits,
    loading,
    error,
    refresh: fetchCustomerData
  };
};