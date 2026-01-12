import { SkeletonPageHeader, SkeletonProductGrid } from "@/components/ui/skeleton";

export default function MarketplaceLoading() {
  return (
    <div className="container-main py-8">
      <SkeletonPageHeader />
      <div className="flex gap-6">
        <aside className="hidden lg:block w-64 flex-shrink-0">
          <div className="space-y-4">
            <div className="h-10 bg-gray-200 rounded animate-pulse" />
            <div className="h-32 bg-gray-200 rounded animate-pulse" />
            <div className="h-32 bg-gray-200 rounded animate-pulse" />
          </div>
        </aside>
        <main className="flex-1">
          <SkeletonProductGrid count={12} />
        </main>
      </div>
    </div>
  );
}
