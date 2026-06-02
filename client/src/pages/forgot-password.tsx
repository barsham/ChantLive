import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Megaphone } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    try {
      await apiRequest("POST", "/api/auth/forgot-password", { email });
      toast({ title: "Check your inbox", description: "If the account exists, a reset link has been sent." });
    } catch (err: any) {
      toast({ title: "Request failed", description: err?.message ?? "Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4 text-xl font-bold">
            <Megaphone className="w-6 h-6 text-orange-500 mr-2" />ChantLive
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Reset your ChantLive password</h1>
          <p className="text-sm text-muted-foreground">
            Enter your email address to receive a secure reset link and restore access to your admin dashboard.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required data-testid="input-forgot-email" />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-forgot-submit">
              {isLoading ? "Sending..." : "Send reset link"}
            </Button>
          </form>
          <div className="mt-6 text-center text-sm">
            <Link href="/login" className="text-primary">Back to sign in</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
