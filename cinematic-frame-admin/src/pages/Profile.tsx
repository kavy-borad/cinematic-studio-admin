import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { updateProfile, changePassword } from "@/lib/api";
import { User, Lock, Save, Loader2, Shield } from "lucide-react";
import { useUIStore } from "@/store/sidebar";

export default function Profile() {
  const { admin, setAuth } = useAuth();
  const setHeaderInfo = useUIStore((s) => s.setHeaderInfo);

  useEffect(() => {
    setHeaderInfo("Admin Profile", "Manage your personal information and security settings.");
  }, [setHeaderInfo]);
  
  // Profile info state
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: admin?.name || "",
    email: admin?.email || "",
  });

  // Password state
  const [passLoading, setPassLoading] = useState(false);
  const [passForm, setPassForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileForm.name || !profileForm.email) {
      toast.error("Name and Email are required");
      return;
    }

    setProfileLoading(true);
    try {
      const res = await updateProfile({ username: profileForm.name, email: profileForm.email });
      if (res.success) {
        toast.success("Profile updated successfully");
        // Update local context
        if (admin) {
          const updatedAdmin = { ...admin, name: profileForm.name, email: profileForm.email };
          setAuth(updatedAdmin, localStorage.getItem("admin_token") || "");
          localStorage.setItem("admin_user", JSON.stringify(updatedAdmin));
        }
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update profile");
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passForm.newPassword !== passForm.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (passForm.newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }

    setPassLoading(true);
    try {
      const res = await changePassword(passForm.currentPassword, passForm.newPassword);
      if (res.success) {
        toast.success("Password changed successfully");
        setPassForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to change password");
    } finally {
      setPassLoading(false);
    }
  };

  return (
    <div className="p-6 lg:p-10 space-y-8 max-w-6xl mx-auto">
      <div className="flex flex-col gap-6 ">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Personal Info Card */}
          <Card className="lg:col-span-7 border-border/40 shadow-xl bg-card/30 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="h-4 w-4 text-primary" />
                Personal Information
              </CardTitle>
              <CardDescription>Update your name and professional email address.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input 
                    id="name" 
                    value={profileForm.name} 
                    onChange={e => setProfileForm({...profileForm, name: e.target.value})}
                    placeholder="John Doe"
                    disabled={profileLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input 
                    id="email" 
                    type="email"
                    value={profileForm.email} 
                    onChange={e => setProfileForm({...profileForm, email: e.target.value})}
                    placeholder="admin@aura.com"
                    disabled={profileLoading}
                  />
                </div>
                <Button type="submit" className="w-full gap-2" disabled={profileLoading}>
                  {profileLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Changes
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Security Card */}
          <Card className="lg:col-span-5 border-border/40 shadow-xl bg-card/30 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Lock className="h-4 w-4 text-primary" />
                Security Settings
              </CardTitle>
              <CardDescription>Secure your account with a strong password.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input 
                    id="currentPassword" 
                    type="password"
                    value={passForm.currentPassword}
                    onChange={e => setPassForm({...passForm, currentPassword: e.target.value})}
                    placeholder="Enter current password"
                    disabled={passLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input 
                    id="newPassword" 
                    type="password"
                    value={passForm.newPassword}
                    onChange={e => setPassForm({...passForm, newPassword: e.target.value})}
                    placeholder="Minimum 6 characters"
                    disabled={passLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input 
                    id="confirmPassword" 
                    type="password"
                    value={passForm.confirmPassword}
                    onChange={e => setPassForm({...passForm, confirmPassword: e.target.value})}
                    placeholder="Confirm your new password"
                    disabled={passLoading}
                  />
                </div>
                <Button type="submit" variant="secondary" className="w-full gap-2 border-primary/20 hover:border-primary/50" disabled={passLoading}>
                  {passLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                  Update Password
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
