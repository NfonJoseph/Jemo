import { cn } from "@/lib/utils";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface SectionHeaderProps {
  title: string;
  viewAllHref?: string;
  viewAllText?: string;
  className?: string;
}

export function SectionHeader({
  title,
  viewAllHref,
  viewAllText = "View All",
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between mb-4", className)}>
      <h2 className="text-h3 text-gray-900">{title}</h2>
      {viewAllHref && (
        <Link
          href={viewAllHref}
          className="flex items-center gap-1 text-jemo-orange text-sm font-medium hover:underline tap-highlight-none"
        >
          {viewAllText}
          <ChevronRight className="w-4 h-4" />
        </Link>
      )}
    </div>
  );
}

