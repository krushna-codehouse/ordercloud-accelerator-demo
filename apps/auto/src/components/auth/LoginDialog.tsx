import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useOrderCloudContext, queryClient } from "@ordercloud/react-sdk";
import { OrderCloudError } from "ordercloud-javascript-sdk";
import { Loader2, LogIn } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AutoMark } from "@/components/brand/Logo";

export function LoginDialog({ children }: { children: React.ReactNode }) {
  const { login } = useOrderCloudContext();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await login(username, password, remember);
      await queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      toast.success("Welcome back to Helix Auto");
      setOpen(false);
      setUsername("");
      setPassword("");
    } catch (error) {
      const message =
        error instanceof OrderCloudError
          ? "Those credentials didn't work. Please try again."
          : "Unable to sign in right now. Please try again.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="items-center text-center">
          <AutoMark size={40} className="mb-1" />
          <DialogTitle>Sign in to Helix Auto</DialogTitle>
          <DialogDescription>
            Track orders, save your bag and check out faster.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="mt-2 space-y-4">
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
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="size-4 accent-[var(--brand)]"
            />
            Keep me signed in
          </label>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <LogIn className="size-4" />
            )}
            Sign in
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Browsing as a guest is enabled for this demo — you can shop without
            an account.
          </p>
          <p className="text-center text-sm">
            Don&apos;t have an account?{" "}
            <button
              type="button"
              className="font-medium text-primary underline"
              onClick={() => {
                setOpen(false);
                navigate("/signup");
              }}
            >
              Sign up
            </button>
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}
