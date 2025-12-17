import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MaterialCard } from "@/components/ui/material-card";
import { LokYodhaLogo } from "@/components/LokYodhaLogo";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { useEffect } from "react";

type Props = {
  redirectAfterAuth?: string;
};

export default function AuthPage({ redirectAfterAuth = "/dashboard" }: Props) {
  const { isAuthenticated, signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [stage, setStage] = useState<"email" | "otp">("email");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // MODIFY: redirect only when definitively authenticated; debounce multiple triggers
  const [redirected, setRedirected] = useState(false);
  useEffect(() => {
    if (isAuthenticated && !redirected) {
      setRedirected(true);
      navigate(redirectAfterAuth);
    }
  }, [isAuthenticated, redirected, navigate, redirectAfterAuth]);

  // REMOVE: immediate navigate in render that caused the loop
  // if (isAuthenticated) {
  //   navigate(redirectAfterAuth);
  //   return null;
  // }

  const handleRequestOtp = async () => {
    // ... keep existing validation
    if (loading) return; // prevent double submissions
    const e = email.trim().toLowerCase();
    if (!e || !e.includes("@")) {
      toast.error("Please enter a valid email.");
      return;
    }
    setLoading(true);
    try {
      await signIn("email-otp", { email: e, flow: "email_otp", step: "request" } as any);
      setStage("otp");
      toast.success("OTP sent. Check your inbox.");
    } catch (err: any) {
      toast.error(`Failed to send OTP: ${err?.message ?? "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    // ... keep existing validation
    if (loading) return;
    const code = otp.trim();
    if (code.length < 4) {
      toast.error("Enter the 4-6 digit OTP from your email.");
      return;
    }
    setLoading(true);
    try {
      await signIn("email-otp", { email, code, flow: "email_otp", step: "verify" } as any);
      toast.success("Signed in successfully!");
      // redirect handled by effect after hydration
    } catch (err: any) {
      toast.error(`OTP verification failed: ${err?.message ?? "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await signIn("anonymous", {} as any);
      toast.success("Continuing as guest");
      // redirect handled by effect after hydration
    } catch (err: any) {
      toast.error(`Guest login failed: ${err?.message ?? "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-blue-50">
      <MaterialCard elevation={3} className="w-full max-w-md p-6">
        <div className="flex items-center justify-center mb-6">
          <LokYodhaLogo minimal animated />
        </div>

        {stage === "email" && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Email</label>
              <Input
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <Button className="w-full" disabled={loading} onClick={handleRequestOtp}>
              {loading ? "Sending OTP..." : "Send OTP"}
            </Button>

            <div className="relative my-4">
              <div className="h-px bg-border" />
              <span className="absolute left-1/2 -translate-x-1/2 -top-3 bg-card px-2 text-xs text-muted-foreground">
                or
              </span>
            </div>

            <Button variant="secondary" className="w-full" disabled={loading} onClick={handleGuestLogin}>
              {loading ? "Starting guest session..." : "Continue as Guest"}
            </Button>

            <p className="text-xs text-muted-foreground mt-2">
              We'll email you a one-time code. No password required.
            </p>
          </div>
        )}

        {stage === "otp" && (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              We sent a code to <span className="font-medium text-foreground">{email}</span>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">OTP Code</label>
              <Input
                inputMode="numeric"
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
              />
            </div>
            <Button className="w-full" disabled={loading} onClick={handleVerifyOtp}>
              {loading ? "Verifying..." : "Verify & Continue"}
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              disabled={loading}
              onClick={() => setStage("email")}
            >
              Back
            </Button>
          </div>
        )}
      </MaterialCard>
    </div>
  );
}