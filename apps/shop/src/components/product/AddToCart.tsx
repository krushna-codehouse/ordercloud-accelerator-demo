import { useState } from "react";
import { Check, Loader2, Plus, ShoppingBag } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button, type ButtonProps } from "@/components/ui/button";
import { useCart } from "@/hooks/use-cart";

interface AddToCartProps {
  productID: string;
  name?: string;
  quantity?: number;
  inventoryRecordID?: string;
  disabled?: boolean;
  iconOnly?: boolean;
  label?: string;
  className?: string;
  size?: ButtonProps["size"];
  variant?: ButtonProps["variant"];
}

export function AddToCart({
  productID,
  name,
  quantity = 1,
  inventoryRecordID,
  disabled,
  iconOnly = false,
  label = "Add to bag",
  className,
  size,
  variant = "default",
}: AddToCartProps) {
  const { addItem } = useCart();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;
    setLoading(true);
    try {
      await addItem(productID, quantity, {
        name,
        inventoryRecordID,
        silent: iconOnly,
      });
      if (iconOnly) {
        setDone(true);
        setTimeout(() => setDone(false), 1400);
      }
    } catch {
      toast.error("Couldn't add this to your bag. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (iconOnly) {
    return (
      <Button
        size={size ?? "icon"}
        variant={variant}
        disabled={disabled || loading}
        onClick={handleClick}
        aria-label={label}
        className={cn("shadow-md", className)}
      >
        {loading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : done ? (
          <Check className="size-4" />
        ) : (
          <Plus className="size-4" />
        )}
      </Button>
    );
  }

  return (
    <Button
      size={size ?? "lg"}
      variant={variant}
      disabled={disabled || loading}
      onClick={handleClick}
      className={className}
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <ShoppingBag className="size-4" />
      )}
      {label}
    </Button>
  );
}
