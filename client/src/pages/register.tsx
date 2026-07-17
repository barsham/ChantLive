import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Mail, Megaphone, ShieldCheck } from "lucide-react";
import { Link, useLocation } from "wouter";
import { AppVersion } from "@/components/app-version";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const { toast } = useToast();
  const [, navigate] = useLocation();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({ title: "Passwords don't match", description: "Please make sure both passwords are the same.", variant: "destructive" });
      return;
    }

    if (password.length < 8) {
      toast({ title: "Password too short", description: "Password must be at least 8 characters.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const res = await apiRequest("POST", "/api/auth/register", { name, email, password });
      const data = await res.json();
      setSuccess(true);
      setSuccessMessage(data.message);
    } catch (err: any) {
      const message = err?.message || "Registration failed. Please try again.";
      toast({ title: "Registration failed", description: message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <div className="w-12 h-12 rounded-md bg-green-500/10 flex items-center justify-center mx-auto mb-4">
              <Mail className="w-6 h-6 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Check your email</h2>
            <p className="text-muted-foreground text-sm mb-6">{successMessage}</p>
            <Button variant="outline" onClick={() => navigate("/login")} data-testid="button-go-login">
              Go to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Link href="/">
            <div className="flex items-center justify-center mb-4 cursor-pointer">
              <span className="flex items-center gap-2 text-xl font-bold"><Megaphone className="w-6 h-6 text-orange-500" />ChantLive</span>
              <AppVersion className="ml-2" />
            </div>
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">Create your ChantLive admin account</h1>
          <p className="text-sm text-muted-foreground">
            Register to organize demonstrations, build chant sequences, and control live participant screens from one place.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                autoCapitalize="words"
                required
                data-testid="input-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                autoCapitalize="none"
                inputMode="email"
                spellCheck={false}
                required
                aria-describedby="email-privacy-note"
                data-testid="input-email"
              />
              <p className="text-xs text-muted-foreground" id="email-privacy-note">
                Used for admin sign-in, verification, and account recovery. Participants never see your email.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type={showPasswords ? "text" : "password"}
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
                minLength={8}
                data-testid="input-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type={showPasswords ? "text" : "password"}
                placeholder="Repeat your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
                minLength={8}
                data-testid="input-confirm-password"
              />
              {confirmPassword && (
                <p
                  className={password === confirmPassword ? "text-xs text-emerald-700" : "text-xs text-destructive"}
                  role="status"
                  aria-live="polite"
                  data-testid="text-password-match"
                >
                  {password === confirmPassword ? "Passwords match." : "Passwords do not match yet."}
                </p>
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setShowPasswords((visible) => !visible)}
              aria-pressed={showPasswords}
              data-testid="button-toggle-passwords"
            >
              {showPasswords ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
              {showPasswords ? "Hide passwords" : "Show passwords"}
            </Button>
            <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-register">
              {isLoading ? "Creating account..." : "Create Account"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary font-medium" data-testid="link-login">
              Sign in
            </Link>
          </div>
          <div className="mt-5 flex items-start gap-2 rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground" data-testid="text-registration-privacy">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <p>Your account controls organiser tools only. Participants join event links anonymously without creating an account.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
