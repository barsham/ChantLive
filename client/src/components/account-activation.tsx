import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, Mail, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import {
  ACTIVATION_LINK_LIFETIME_MS,
  ACTIVATION_RESEND_COOLDOWN_MS,
  rememberPendingActivation,
} from "@/lib/pending-activation";

type AccountActivationProps = {
  email: string;
  sentAt: number | null;
  onSent: (sentAt: number) => void;
  onSignIn: () => void;
  onUseDifferentEmail: () => void;
};

type ResendState = "idle" | "sending" | "sent" | "error";

export function AccountActivation({
  email,
  sentAt,
  onSent,
  onSignIn,
  onUseDifferentEmail,
}: AccountActivationProps) {
  const [now, setNow] = useState(Date.now());
  const [resendState, setResendState] = useState<ResendState>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const resendAvailableAt = sentAt ? sentAt + ACTIVATION_RESEND_COOLDOWN_MS : 0;
  const secondsRemaining = Math.max(0, Math.ceil((resendAvailableAt - now) / 1000));
  const expiresAt = useMemo(() => sentAt ? new Date(sentAt + ACTIVATION_LINK_LIFETIME_MS) : null, [sentAt]);

  useEffect(() => {
    if (secondsRemaining <= 0) return;
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [secondsRemaining]);

  async function resendVerification() {
    setResendState("sending");
    setStatusMessage("Sending a fresh verification link…");
    try {
      const response = await apiRequest("POST", "/api/auth/resend-verification", { email });
      const data = await response.json();
      const nextSentAt = Date.now();
      rememberPendingActivation(email, nextSentAt);
      onSent(nextSentAt);
      setNow(nextSentAt);
      setResendState("sent");
      setStatusMessage(data.message ?? "A fresh verification link has been requested.");
    } catch (error: any) {
      setResendState("error");
      setStatusMessage(error instanceof TypeError
        ? "ChantLive couldn't reach the email service. Your account is unchanged; reconnect and try again."
        : error?.message ?? "The verification email could not be sent. Please try again.");
    }
  }

  return (
    <div className="space-y-5 text-left" data-testid="account-activation-centre">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-green-500/10">
          <Mail className="h-6 w-6 text-green-700" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-semibold">Check your email to activate your account</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We sent the verification link to
          <strong className="mt-1 block break-all text-foreground" data-testid="text-activation-email">{email}</strong>
        </p>
      </div>

      <ol className="space-y-3 rounded-lg border bg-muted/30 p-4 text-sm" aria-label="Account activation steps">
        <li className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">1</span>
          <span>Open the newest email from ChantLive. Check spam or quarantine if it is not in your inbox.</span>
        </li>
        <li className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">2</span>
          <span>Select <strong>Verify Email</strong>. The link is valid for 24 hours and older links can be ignored.</span>
        </li>
        <li className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">3</span>
          <span>Return to ChantLive and sign in with the password you created.</span>
        </li>
      </ol>

      <div className="flex items-start gap-2 text-xs text-muted-foreground">
        <Clock3 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <p>
          {expiresAt
            ? <>Current link expires around {expiresAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}. Resending creates a fresh link.</>
            : <>A fresh link will be valid for 24 hours. Request one below if you no longer have the original email.</>}
        </p>
      </div>

      {statusMessage && (
        <div
          className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${resendState === "error" ? "border-destructive/40 bg-destructive/5 text-destructive" : "border-emerald-600/30 bg-emerald-500/5 text-emerald-800"}`}
          role={resendState === "error" ? "alert" : "status"}
          aria-live="polite"
          data-testid="status-activation-resend"
        >
          {resendState === "sent" ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> : <RefreshCw className={`mt-0.5 h-4 w-4 shrink-0 ${resendState === "sending" ? "animate-spin" : ""}`} aria-hidden="true" />}
          <span>{statusMessage}</span>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Button className="min-h-11" onClick={onSignIn} data-testid="button-activation-sign-in">
          I verified — sign in
        </Button>
        <Button
          variant="outline"
          className="min-h-11"
          onClick={resendVerification}
          disabled={resendState === "sending" || secondsRemaining > 0}
          data-testid="button-resend-verification"
        >
          <RefreshCw className={resendState === "sending" ? "animate-spin" : ""} aria-hidden="true" />
          {resendState === "sending" ? "Sending…" : secondsRemaining > 0 ? `Resend in ${secondsRemaining}s` : "Resend verification"}
        </Button>
      </div>

      <Button variant="ghost" className="min-h-11 w-full" onClick={onUseDifferentEmail} data-testid="button-correct-activation-email">
        Wrong email? Use a different address
      </Button>

      <div className="flex items-start gap-2 rounded-lg border p-3 text-xs text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        <p>Resend responses do not reveal whether an address has an account. ChantLive never shares your organiser email with participants.</p>
      </div>
    </div>
  );
}
