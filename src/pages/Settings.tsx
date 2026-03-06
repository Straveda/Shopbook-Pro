import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Lock, Save, Loader2, ShieldCheck, Mail } from 'lucide-react';
import authService, { UserProfile } from '@/services/authService';
import { toast } from "sonner";

export default function Settings() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Profile Form States
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  // Password Form States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const data = await authService.getProfile();
      setProfile(data);
      setName(data.name);
      setEmail(data.email);
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error("Failed to load profile information");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) {
      toast.error("Name and Email are required");
      return;
    }

    try {
      setSaving(true);
      const res = await authService.updateProfile({ name, email });
      toast.success(res.message || "Profile updated successfully");

      // Update local storage user data
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({ ...storedUser, name, email }));

      setProfile(prev => prev ? { ...prev, name, email } : null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("All password fields are required");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }

    try {
      setSaving(true);
      const res = await authService.changePassword({ currentPassword, newPassword });
      toast.success(res.message || "Password changed successfully");

      // Clear password fields
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to change password");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account settings and security preferences</p>
      </div>

      <div className="w-full">
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <TabsTrigger value="profile" className="flex items-center gap-2 rounded-md transition-all duration-200">
              <User className="w-4 h-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2 rounded-md transition-all duration-200">
              <Lock className="w-4 h-4" />
              Security
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="focus-visible:outline-none animate-in slide-in-from-left-4 duration-300">
            <Card className="border-none shadow-lg overflow-hidden border border-gray-100/50 dark:border-gray-800/50">
              <CardHeader className="bg-gray-50/50 dark:bg-gray-800/20 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-teal-600" />
                  <div>
                    <CardTitle>Profile Information</CardTitle>
                    <CardDescription>Update your shop's official contact details.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <form onSubmit={handleUpdateProfile}>
                <CardContent className="pt-6 space-y-6">
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-sm font-semibold">Full Name</Label>
                      <div className="relative group">
                        <User className="absolute left-3 top-3 w-4 h-4 text-gray-400 group-focus-within:text-teal-500 transition-colors" />
                        <Input
                          id="name"
                          placeholder="Your Name"
                          className="pl-10 h-10 border-gray-200 dark:border-gray-700 focus:ring-teal-500/20 focus:border-teal-500"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm font-semibold">Email Address</Label>
                      <div className="relative group">
                        <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400 group-focus-within:text-teal-500 transition-colors" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="Email Address"
                          className="pl-10 h-10 border-gray-200 dark:border-gray-700 focus:ring-teal-500/20 focus:border-teal-500"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                      </div>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1 px-1">
                        <ShieldCheck className="w-3 h-3 text-teal-500" />
                        Changing your email requires re-login next session.
                      </p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="bg-gray-50/30 dark:bg-gray-800/10 border-t border-gray-100 dark:border-gray-800 py-4 flex justify-end">
                  <Button
                    type="submit"
                    className="bg-teal-600 hover:bg-teal-700 text-white min-w-[120px] transition-all transform active:scale-95"
                    disabled={saving}
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                    Save Changes
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="focus-visible:outline-none animate-in slide-in-from-right-4 duration-300">
            <Card className="border-none shadow-lg overflow-hidden border border-gray-100/50 dark:border-gray-800/50">
              <CardHeader className="bg-gray-50/50 dark:bg-gray-800/20 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <Lock className="w-5 h-5 text-teal-600" />
                  <div>
                    <CardTitle>Security Settings</CardTitle>
                    <CardDescription>Keep your account safe with a strong password.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <form onSubmit={handleChangePassword}>
                <CardContent className="pt-6 space-y-6">
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="current" className="text-sm font-semibold">Current Password</Label>
                      <div className="relative group">
                        <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-400 group-focus-within:text-teal-500 transition-colors" />
                        <Input
                          id="current"
                          type="password"
                          className="pl-10 h-10 border-gray-200 dark:border-gray-700 focus:ring-teal-500/20 focus:border-teal-500"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new" className="text-sm font-semibold">New Password</Label>
                      <div className="relative group">
                        <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-400 group-focus-within:text-teal-500 transition-colors" />
                        <Input
                          id="new"
                          type="password"
                          className="pl-10 h-10 border-gray-200 dark:border-gray-700 focus:ring-teal-500/20 focus:border-teal-500"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm" className="text-sm font-semibold">Confirm New Password</Label>
                      <div className="relative group">
                        <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-400 group-focus-within:text-teal-500 transition-colors" />
                        <Input
                          id="confirm"
                          type="password"
                          className="pl-10 h-10 border-gray-200 dark:border-gray-700 focus:ring-teal-500/20 focus:border-teal-500"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="bg-gray-50/30 dark:bg-gray-800/10 border-t border-gray-100 dark:border-gray-800 py-4 flex justify-end">
                  <Button
                    type="submit"
                    className="bg-teal-600 hover:bg-teal-700 text-white min-w-[120px] transition-all transform active:scale-95"
                    disabled={saving}
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
                    Update Password
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
