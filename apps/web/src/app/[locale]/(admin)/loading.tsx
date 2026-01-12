import { SkeletonPageHeader, SkeletonList } from "@/components/ui/skeleton";

export default function AdminLoading() {
  return (
    <div className="container-main py-8">
      <SkeletonPageHeader />
      <SkeletonList count={8} />
    </div>
  );
}
