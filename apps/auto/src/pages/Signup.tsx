import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useOrderCloudContext, queryClient } from "@ordercloud/react-sdk";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { API_URL } from "@/constants";
import { AutoMark } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type AccountType = "personal" | "trade";

interface RegisterResult {
  success: boolean;
  error?: string;
}

export default function Signup() {
  const { login } = useOrderCloudContext();
  const navigate = useNavigate();
  const [accountType, setAccountType] = useState<AccountType>("personal");
  const [submitting, setSubmitting] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [abn, setAbn] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Passwords don't match.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountType,
          username,
          password,
          email,
          firstName,
          lastName,
          phone: phone || undefined,
          companyName: accountType === "trade" ? companyName : undefined,
          abn: accountType === "trade" ? abn : undefined,
          message: accountType === "trade" ? message : undefined,
        }),
      });
      const result = (await response.json()) as RegisterResult;

      if (!result.success) {
        toast.error(result.error ?? "Couldn't create your account. Please try again.");
        return;
      }

      await login(username, password);
      await queryClient.invalidateQueries({ queryKey: ["currentUser"] });

      if (accountType === "trade") {
        toast.success("Thanks! Our trade team will review your request and be in touch.");
      } else {
        toast.success("Welcome to Helix Auto");
      }
      navigate("/");
    } catch {
      toast.error("Couldn't create your account. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-10 sm:px-6 lg:py-14">
      <div className="mb-8 flex flex-col items-center text-center">
        <AutoMark size={40} className="mb-3" />
        <h1 className="font-display text-2xl font-bold tracking-tight">
          Create your account
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track orders, save your bag and check out faster.
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          <Tabs
            value={accountType}
            onValueChange={(v) => setAccountType(v as AccountType)}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="personal">Personal</TabsTrigger>
              <TabsTrigger value="trade">Trade account</TabsTrigger>
            </TabsList>

            <form onSubmit={handleSubmit} className="mt-2 space-y-4">
              {accountType === "trade" && (
                <p className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
                  Trade accounts are reviewed by our team before trade pricing is
                  applied — you can still sign in and shop right away while that
                  happens.
                </p>
              )}

              {accountType === "trade" && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="companyName">Company name</Label>
                    <Input
                      id="companyName"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="abn">ABN (optional)</Label>
                    <Input id="abn" value={abn} onChange={(e) => setAbn(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />
                  </div>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName">First name</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastName">Last name</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword">Confirm password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                </div>
              </div>

              {accountType === "trade" && (
                <div className="space-y-1.5">
                  <Label htmlFor="message">
                    Tell us about your business (optional)
                  </Label>
                  <Textarea
                    id="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="What do you buy, how often, approximate volume…"
                  />
                </div>
              )}

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <UserPlus className="size-4" />
                )}
                {accountType === "trade" ? "Submit trade request" : "Create account"}
              </Button>
            </form>
          </Tabs>
        </CardContent>
      </Card>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link to="/" className="font-medium text-primary underline">
          Sign in from the header
        </Link>
      </p>
    </div>
  );
}
