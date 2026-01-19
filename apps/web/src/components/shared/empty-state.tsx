import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Package, Search, ShoppingCart, AlertCircle, Heart, Inbox } from "lucide-react";
import Link from "next/link";

type EmptyStateType = "products" | "search" | "cart" | "error" | "generic" | "favorites" | "empty";

const icons: Record<EmptyStateType, React.ReactNode> = {
  products: <Package className="w-16 h-16 text-gray-300" />,
  search: <Search className="w-16 h-16 text-gray-300" />,
  cart: <ShoppingCart className="w-16 h-16 text-gray-300" />,
  error: <AlertCircle className="w-16 h-16 text-gray-300" />,
  generic: <Package className="w-16 h-16 text-gray-300" />,
  favorites: <Heart className="w-16 h-16 text-gray-300" />,
  empty: <Inbox className="w-16 h-16 text-gray-300" />,
};

interface EmptyStateProps {
  type?: EmptyStateType;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  type = "generic",
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  className,
}: EmptyStateProps) {
  const isDev = process.env.NODE_ENV === "development";

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 px-4 text-center",
        className
      )}
    >
      <div className="mb-4">{icons[type]}</div>
      <h3 className="text-h3 text-gray-900 mb-2">{title}</h3>
      {description && (
        <p className="text-body text-gray-500 mb-4 max-w-sm">{description}</p>
      )}
      {type === "error" && isDev && (
        <p className="text-small text-gray-400 mb-4">Dev: Check API URL / CORS in console</p>
      )}
      {actionLabel && actionHref && (
        <Button asChild>
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      )}
      {actionLabel && onAction && !actionHref && (
        <Button onClick={onAction}>{actionLabel}</Button>
      )}
    </div>
  );
}

