import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";
import { User, Save, Lock } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

export default function Settings() {
  const { toast } = useToast();
  const { user, loading, refreshUser } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
    }
  }, [user]);

  const handleSave = async () => {
    if (!name.trim()) {
      sonnerToast.error("Name cannot be empty");
      return;
    }
    
    try {
      setSaving(true);
      await api.users.updateMe({ name: name.trim() });
      await refreshUser(); // Refresh user data after update
      sonnerToast.success("Profile updated successfully");
    } catch (e: any) {
      console.error("Profile update error:", e);
      let errorMessage = "Could not update profile";
      try {
        const errorData = JSON.parse(e.message);
        errorMessage = errorData.detail || errorMessage;
      } catch {
        errorMessage = e.message || errorMessage;
      }
      sonnerToast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!oldPassword.trim()) {
      sonnerToast.error("Please enter your current password");
      return;
    }
    if (newPassword.length < 8) {
      sonnerToast.error("New password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      sonnerToast.error("New passwords do not match");
      return;
    }
    if (oldPassword === newPassword) {
      sonnerToast.error("New password must be different from current password");
      return;
    }
    
    try {
      setChangingPassword(true);
      await api.auth.changePassword(oldPassword, newPassword);
      sonnerToast.success("Password changed successfully");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e: any) {
      console.error("Password change error:", e);
      let errorMessage = "Could not change password";
      try {
        const errorData = JSON.parse(e.message);
        errorMessage = errorData.detail || errorMessage;
      } catch {
        errorMessage = e.message || errorMessage;
      }
      sonnerToast.error(errorMessage);
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Manage your profile</p>
        </div>
        <Button onClick={handleSave} className="gap-2 btn-primary" disabled={saving || loading}>
          <Save className="w-4 h-4" />
          Save Changes
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Settings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Settings */}
          <Card className="card-elevated">
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                <CardTitle>Profile Information</CardTitle>
              </div>
              <CardDescription>Update your personal information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" value={email} disabled />
              </div>
            </CardContent>
          </Card>

          {/* Change Password */}
          <Card className="card-elevated">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-primary" />
                <CardTitle>Change Password</CardTitle>
              </div>
              <CardDescription>Update your account password</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="old">Current Password</Label>
                <Input id="old" type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new">New Password</Label>
                <Input id="new" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm New Password</Label>
                <Input id="confirm" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              </div>
              <div className="flex justify-end">
                <Button onClick={handleChangePassword} disabled={loading || changingPassword}>
                  {changingPassword ? "Updating..." : "Update Password"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        {/* Sidebar (empty for now) */}
        <div className="space-y-6"></div>
      </div>
    </div>
  );
}