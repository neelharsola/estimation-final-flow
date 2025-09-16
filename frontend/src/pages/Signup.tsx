import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { Link } from "react-router-dom";
import { Eye, EyeOff, UserPlus } from "lucide-react";
import { toast as sonnerToast } from "sonner";

const Signup = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    
    if (!name.trim()) {
      const msg = "Name is required";
      setError(msg);
      sonnerToast.error(msg);
      return;
    }
    if (password !== confirmPassword) {
      const msg = "Passwords do not match";
      setError(msg);
      sonnerToast.error(msg);
      return;
    }
    if (password.length < 8) {
      const msg = "Password must be at least 8 characters";
      setError(msg);
      sonnerToast.error(msg);
      return;
    }
    
    setLoading(true);
    try {
      await api.auth.signup({ name: name.trim(), email, password, role: "Estimator" });
      const successMsg = "Account created successfully! You can now sign in.";
      setSuccess(successMsg);
      sonnerToast.success(successMsg);
      setTimeout(() => (window.location.href = "/login"), 1500);
    } catch (err: any) {
      const errorMessage = err?.message || "Signup failed";
      setError(errorMessage);
      sonnerToast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-background to-muted">
      <Card className="w-full max-w-4xl p-0 overflow-hidden">
        <div className="grid md:grid-cols-2">
          <div className="p-8 bg-card">
            <div className="space-y-1 mb-6">
              <h1 className="text-2xl font-semibold tracking-tight">Create account</h1>
              <p className="text-sm text-muted-foreground">Sign up to get started</p>
            </div>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">Use at least 8 characters.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm Password</Label>
                <div className="relative">
                  <Input id="confirm" type={showConfirm ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showConfirm ? "Hide password" : "Show password"}
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              {error && <div className="text-sm text-red-500">{error}</div>}
              {success && <div className="text-sm text-green-600">{success}</div>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Creating..." : "Create account"}
              </Button>
            </form>
            <div className="text-sm text-center text-muted-foreground mt-4">
              Already have an account? <Link to="/login" className="text-primary hover:underline">Sign in</Link>
            </div>
          </div>
          <div className="hidden md:flex items-center justify-center p-8 bg-primary text-primary-foreground">
            <div className="max-w-sm text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-xl bg-primary-foreground/10 flex items-center justify-center">
                <UserPlus className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-semibold">Join Estimation Pro Max</h2>
              <p className="text-sm opacity-90">Create an account to start importing estimations and managing pricing.</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Signup;
