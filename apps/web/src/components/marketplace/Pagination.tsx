"use client";

import { useTranslations } from "@/lib/translations";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  disabled = false,
}: PaginationProps) {
  const t = useTranslations("common");

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-4 mt-8">
      <Button
        variant="secondary"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={disabled || currentPage <= 1}
        className="gap-1"
      >
        <ChevronLeft className="w-4 h-4" />
        <span className="hidden sm:inline">{t("previous")}</span>
      </Button>

      <span className="text-body text-gray-700">
        {t("page")} <span className="font-semibold">{currentPage}</span> {t("of")}{" "}
        <span className="font-semibold">{totalPages}</span>
      </span>

      <Button
        variant="secondary"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={disabled || currentPage >= totalPages}
        className="gap-1"
      >
        <span className="hidden sm:inline">{t("next")}</span>
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
}
