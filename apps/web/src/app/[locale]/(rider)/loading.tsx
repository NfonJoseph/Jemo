import { SkeletonPageHeader, SkeletonList } from "@/components/ui/skeleton";

export default function RiderLoading() {
  return (
    <div className="container-main py-8">
      <SkeletonPageHeader />
      <SkeletonList count={6} />
    </div>
  );
}
