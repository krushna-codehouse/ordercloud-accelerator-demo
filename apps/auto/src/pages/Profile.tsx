import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Me } from "ordercloud-javascript-sdk";
import { queryClient, useOrderCloudContext } from "@ordercloud/react-sdk";
import { ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/hooks/use-current-user";

export default function Profile() {
  const { isLoggedIn } = useOrderCloudContext();
  const navigate = useNavigate();
  const { data: user, isLoading } = useCurrentUser();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isLoading && !isLoggedIn) navigate("/", { replace: true });
  }, [isLoading, isLoggedIn, navigate]);

  useEffect(() => {
    setFirstName(user?.FirstName ?? "");
    setLastName(user?.LastName ?? "");
  }, [user]);

  const hasChanges =
    !!user && (firstName !== (user.FirstName ?? "") || lastName !== (user.LastName ?? ""));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await Me.Patch({ FirstName: firstName, LastName: lastName });
      await queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      toast.success("Profile updated");
    } catch {
      toast.error("Couldn't save your changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading || !user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <Skeleton className="mb-8 h-8 w-40" />
        <Skeleton className="h-80 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:py-12">
      <nav className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link to="/" className="hover:text-foreground">
          Home
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="text-foreground">Your profile</span>
      </nav>

      <h1 className="mb-8 font-display text-3xl font-bold tracking-tight">
        Your profile
      </h1>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
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

            <Separator />

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-muted-foreground">
                  Email
                </Label>
                <Input id="email" value={user.Email ?? ""} disabled />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-muted-foreground">
                  Phone
                </Label>
                <Input id="phone" value={user.Phone ?? "Not set"} disabled />
              </div>
            </div>
            <p className="-mt-2 text-xs text-muted-foreground">
              Email and phone can&apos;t be changed here — contact support if these need updating.
            </p>

            <Button type="submit" disabled={saving || !hasChanges}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              Save changes
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
