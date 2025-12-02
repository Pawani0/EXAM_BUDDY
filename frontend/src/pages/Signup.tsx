import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { ThemeBackground } from "@/components/student/ThemeBackground";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, GraduationCap, Users } from "lucide-react";
import { toast } from "sonner";
import type { Role } from "@/lib/useAuth";

const Signup = () => {
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>("student");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName || !trimmedEmail || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters long");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${apiBaseUrl}/auth/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          full_name: trimmedName,
          email: trimmedEmail,
          password,
          role,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const message = errorData?.detail || errorData?.error || "Unable to create your account.";
        toast.error(message);
        return;
      }

      toast.success(`Account created as ${role}! Redirecting...`);
      setFullName("");
      setEmail("");
      setPassword("");
      setTimeout(() => navigate("/login"), 1500);
    } catch (error) {
      console.error("Signup failed", error);
      toast.error("We couldn't reach the server. Please try again in a moment.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <ThemeBackground />
      <Header showAuth={false} />

      <div className="max-w-md mx-auto px-6 py-16 animate-fade-in relative z-10">
        <div className="relative overflow-hidden glass-card rounded-3xl p-8">
          <div className="absolute -top-20 -right-20 h-60 w-60 rounded-full bg-primary/30 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-secondary/20 blur-3xl" />
          
          <div className="relative">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-2">Get Started</h1>
              <p className="text-muted-foreground">Create your account to begin learning</p>
            </div>

            {/* Role Selection */}
            <div className="mb-6">
              <Label className="mb-3 block">Choose your role</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole("student")}
                  className={`p-4 rounded-xl border transition-all duration-300 ${
                    role === "student"
                      ? "bg-primary/20 border-primary"
                      : "bg-card/30 border-white/10 hover:border-white/20"
                  }`}
                >
                  <GraduationCap className="h-6 w-6 mx-auto mb-2" />
                  <div className="font-semibold text-sm">Student</div>
                  <div className="text-xs text-muted-foreground">Access resources</div>
                </button>

                <button
                  type="button"
                  onClick={() => setRole("teacher")}
                  className={`p-4 rounded-xl border transition-all duration-300 ${
                    role === "teacher"
                      ? "bg-primary/20 border-primary"
                      : "bg-card/30 border-white/10 hover:border-white/20"
                  }`}
                >
                  <Users className="h-6 w-6 mx-auto mb-2" />
                  <div className="font-semibold text-sm">Teacher</div>
                  <div className="text-xs text-muted-foreground">Manage content</div>
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="bg-card/30 border-white/10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-card/30 border-white/10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-card/30 border-white/10"
                />
              </div>

              <div className="flex items-center justify-between text-sm pt-2">
                <Link
                  to="/login"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Already have an account?
                </Link>
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full gap-2 bg-primary hover:bg-primary/90"
                disabled={isLoading}
              >
                <UserPlus className="h-5 w-5" />
                {isLoading ? "Creating..." : "Create Account"}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-6">
              By signing up, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
