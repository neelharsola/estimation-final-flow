import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Shield } from "lucide-react";
import { toast as sonnerToast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      sonnerToast.success("Welcome back!");
      navigate("/");
    } catch (err: any) {
      const errorMessage = err?.message || "Login failed";
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
              <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
              <p className="text-sm text-muted-foreground">Sign in to continue</p>
            </div>
            <form onSubmit={onSubmit} className="space-y-4">
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
              </div>
              {error && <div className="text-sm text-red-500">{error}</div>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in..." : "Sign in"}
              </Button>
            </form>
            <div className="text-sm text-center text-muted-foreground mt-4">
              New here? <Link to="/signup" className="text-primary hover:underline">Create an account</Link>
            </div>
          </div>
          <div className="hidden md:flex items-center justify-center p-8 bg-primary text-primary-foreground">
            <div className="max-w-sm text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-xl bg-primary-foreground/10 flex items-center justify-center">
                <Shield className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-semibold">Estimation Pro Max</h2>
              <p className="text-sm opacity-90">Plan estimations, configure pricing, and manage users with role-based access.</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Index;
