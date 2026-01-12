import { SkeletonPageHeader, SkeletonProductGrid } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="container-main py-8">
      <SkeletonPageHeader />
      <SkeletonProductGrid count={8} />
    </div>
  );
}
