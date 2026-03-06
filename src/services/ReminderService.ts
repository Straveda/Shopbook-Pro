import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const reminderService = {
  // Get all reminders for logged-in user
  getAllReminders: async (): Promise<ApiResponse> => {
    const response = await api.get('/reminders');
    return response.data as ApiResponse;
  },

  // Get single reminder by ID
  getReminder: async (id: string): Promise<ApiResponse> => {
    const response = await api.get(`/reminders/${id}`);
    return response.data as ApiResponse;
  },

  // Create new reminder
  createReminder: async (data: {
    customerId: string;
    customerName?: string;
    customerPhone?: string;
    message: string;
    reminderDate: Date;
    channel?: 'whatsapp' | 'sms';
    status?: string;
  }): Promise<ApiResponse> => {
    const response = await api.post('/reminders', data);
    return response.data as ApiResponse;
  },

  // Update reminder
  updateReminder: async (id: string, data: {
    message?: string;
    reminderDate?: Date;
    status?: string;
  }): Promise<ApiResponse> => {
    const response = await api.put(`/reminders/${id}`, data);
    return response.data as ApiResponse;
  },

  // Delete reminder
  deleteReminder: async (id: string): Promise<ApiResponse> => {
    const response = await api.delete(`/reminders/${id}`);
    return response.data as ApiResponse;
  },

  // Mark reminder as completed
  completeReminder: async (id: string): Promise<ApiResponse> => {
    const response = await api.patch(`/reminders/${id}/complete`);
    return response.data as ApiResponse;
  },

  // Send reminder now
  sendReminder: async (id: string): Promise<ApiResponse> => {
    const response = await api.post(`/reminders/${id}/send`);
    return response.data as ApiResponse;
  },

  // Get upcoming reminders (next 7 days)
  getUpcomingReminders: async (): Promise<ApiResponse> => {
    const response = await api.get('/reminders/upcoming/week');
    return response.data as ApiResponse;
  },

  // Send bulk reminders to overdue customers
  sendBulkReminders: async (filter?: 'overdue' | 'all', channel: 'whatsapp' | 'sms' = 'whatsapp'): Promise<ApiResponse> => {
    const response = await api.post('/reminders/bulk-send', { filter, channel });
    return response.data as ApiResponse;
  },
};

export default reminderService;