import api from './api';

export interface UserProfile {
    id: string;
    name: string;
    email: string;
    createdAt: string;
}

export interface UpdateProfileData {
    name?: string;
    email?: string;
}

export interface ChangePasswordData {
    currentPassword: string;
    newPassword: string;
}

const authService = {
    getProfile: async (): Promise<UserProfile> => {
        const response = await api.get('/auth/profile');
        return (response.data as any).user;
    },

    updateProfile: async (data: UpdateProfileData): Promise<{ message: string; user: { name: string; email: string } }> => {
        const response = await api.put('/auth/profile', data);
        return response.data as any;
    },

    changePassword: async (data: ChangePasswordData): Promise<{ message: string }> => {
        const response = await api.put('/auth/change-password', data);
        return response.data as any;
    }
};

export default authService;
