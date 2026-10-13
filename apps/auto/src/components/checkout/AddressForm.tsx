import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import type { Address } from "ordercloud-javascript-sdk";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const CHECKOUT_ADDRESS_KEY = "helix-checkout-address";

function loadSaved(): Partial<AddressFormValues> {
  try {
    const raw = sessionStorage.getItem(CHECKOUT_ADDRESS_KEY);
    return raw ? (JSON.parse(raw) as Partial<AddressFormValues>) : {};
  } catch {
    return {};
  }
}

const schema = z.object({
  FirstName: z.string().min(1, "Required"),
  LastName: z.string().min(1, "Required"),
  Email: z.string().email("Enter a valid email"),
  Phone: z.string().optional(),
  Street1: z.string().min(1, "Required"),
  Street2: z.string().optional(),
  City: z.string().min(1, "Required"),
  State: z.string().min(1, "Required"),
  Zip: z.string().min(1, "Required"),
  Country: z.string().min(2, "Use a 2-letter code").max(2),
});

export type AddressFormValues = z.infer<typeof schema>;

interface AddressFormProps {
  defaultValues?: Partial<AddressFormValues>;
  onSubmit: (address: Address, email: string) => void | Promise<void>;
  submitting?: boolean;
  submitLabel?: string;
}

export function AddressForm({
  defaultValues,
  onSubmit,
  submitting,
  submitLabel = "Continue to shipping",
}: AddressFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<AddressFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      Country: "AU",
      ...loadSaved(),
      ...defaultValues,
    },
  });

  // Persist every change to sessionStorage so a refresh restores the form.
  const values = watch();
  useEffect(() => {
    try {
      sessionStorage.setItem(CHECKOUT_ADDRESS_KEY, JSON.stringify(values));
    } catch { /* quota exceeded or private-browsing restriction */ }
  }, [values]);

  const submit = handleSubmit(async (values) => {
    const { Email, ...address } = values;
    await onSubmit(address as Address, Email);
  });

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First name" error={errors.FirstName?.message}>
          <Input {...register("FirstName")} autoComplete="given-name" />
        </Field>
        <Field label="Last name" error={errors.LastName?.message}>
          <Input {...register("LastName")} autoComplete="family-name" />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Email" error={errors.Email?.message}>
          <Input type="email" {...register("Email")} autoComplete="email" />
        </Field>
        <Field label="Phone" error={errors.Phone?.message}>
          <Input {...register("Phone")} autoComplete="tel" />
        </Field>
      </div>

      <Field label="Address" error={errors.Street1?.message}>
        <Input
          {...register("Street1")}
          placeholder="Street address"
          autoComplete="address-line1"
        />
      </Field>
      <Field label="Apartment, suite, etc. (optional)">
        <Input {...register("Street2")} autoComplete="address-line2" />
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="City" error={errors.City?.message}>
          <Input {...register("City")} autoComplete="address-level2" />
        </Field>
        <Field label="State" error={errors.State?.message}>
          <Input {...register("State")} autoComplete="address-level1" />
        </Field>
        <Field label="Postcode" error={errors.Zip?.message}>
          <Input {...register("Zip")} autoComplete="postal-code" />
        </Field>
      </div>

      <Field label="Country" error={errors.Country?.message}>
        <Input
          {...register("Country")}
          placeholder="AU"
          className="uppercase"
          maxLength={2}
        />
      </Field>

      <Button type="submit" size="lg" className="w-full" disabled={submitting}>
        {submitting && <Loader2 className="size-4 animate-spin" />}
        {submitLabel}
      </Button>
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className={cn(error && "text-destructive")}>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
