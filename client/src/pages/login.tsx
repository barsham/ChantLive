import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Megaphone } from "lucide-react";
import { Link, useLocation, useSearch } from "wouter";
import { AppVersion } from "@/components/app-version";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { ApiRequestError, apiRequest, queryClient } from "@/lib/queryClient";
import { AccountActivation } from "@/components/account-activation";
import { clearPendingActivation, readPendingActivation, rememberPendingActivation, type PendingActivation } from "@/lib/pending-activation";

export default function Login() {
  const initialPending = readPendingActivation();
  const [email, setEmail] = useState(() => initialPending?.email ?? "");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pendingActivation, setPendingActivation] = useState<PendingActivation | null>(initialPending);
  const [showActivation, setShowActivation] = useState(false);
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const search = useSearch();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/admin");
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (!email && pendingActivation?.email) setEmail(pendingActivation.email);
  }, [email, pendingActivation]);

  useEffect(() => {
    const params = new URLSearchParams(search);
    if (params.get("verified") === "true") {
      toast({ title: "Email verified!", description: "Your email has been verified. You can now sign in." });
    }
    if (params.get("error") === "invalid_token") {
      toast({ title: "Invalid link", description: "This verification link is invalid or has already been used.", variant: "destructive" });
    }
    if (params.get("error") === "expired_token") {
      toast({ title: "Link expired", description: "This verification link has expired. Please register again to get a new one.", variant: "destructive" });
    }
  }, [search, toast]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    try {
      await apiRequest("POST", "/api/auth/login", { email, password });
      clearPendingActivation();
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      navigate("/admin");
    } catch (err: any) {
      if ((err instanceof ApiRequestError && err.code === "EMAIL_NOT_VERIFIED") || err?.message === "Email not verified") {
        const normalizedEmail = email.trim().toLowerCase();
        const existingPending = readPendingActivation();
        const pending = existingPending?.email === normalizedEmail
          ? existingPending
          : rememberPendingActivation(normalizedEmail, null);
        setPendingActivation(pending);
        setShowActivation(true);
        return;
      }
      const message = err?.message || "Login failed. Please try again.";
      toast({ title: "Sign in failed", description: message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }

  if (showActivation && pendingActivation) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <AccountActivation
              email={pendingActivation.email}
              sentAt={pendingActivation.sentAt}
              onSent={(sentAt) => setPendingActivation({ ...pendingActivation, sentAt })}
              onSignIn={() => setShowActivation(false)}
              onUseDifferentEmail={() => {
                clearPendingActivation();
                setPendingActivation(null);
                navigate("/register");
              }}
            />
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
          <h1 className="text-2xl font-semibold tracking-tight">Sign in to your ChantLive account</h1>
          <p className="text-sm text-muted-foreground">
            Access your admin dashboard to manage demonstrations, update chants live, and share participant QR codes.
          </p>
        </CardHeader>
        <CardContent>
          {pendingActivation && (
            <div className="mb-4 rounded-lg border border-amber-600/30 bg-amber-500/5 p-3 text-sm" role="status" data-testid="pending-activation-reminder">
              <p className="font-medium">Still waiting to verify {pendingActivation.email}?</p>
              <p className="mt-1 text-muted-foreground">You can resend the activation email without completing registration again.</p>
              <Button variant="ghost" className="mt-1 h-11 px-0 text-primary hover:bg-transparent" onClick={() => setShowActivation(true)} data-testid="button-open-activation-centre">
                Open activation help
              </Button>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                data-testid="input-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                data-testid="input-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-login">
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <div className="mt-3 text-right text-sm">
            <Link href="/forgot-password" className="text-primary" data-testid="link-forgot-password">
              Forgot password?
            </Link>
          </div>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link href="/register" className="text-primary font-medium" data-testid="link-register">
              Create one
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
