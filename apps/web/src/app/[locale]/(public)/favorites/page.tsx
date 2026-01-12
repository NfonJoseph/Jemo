import { Heart } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function FavoritesPage() {
  return (
    <div className="py-12">
      <div className="container-main">
        <div className="flex flex-col items-center justify-center text-center py-16">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
            <Heart className="w-10 h-10 text-gray-400" />
          </div>
          <h1 className="text-h2 text-gray-900 mb-2">Favorites</h1>
          <p className="text-body text-gray-500 mb-6 max-w-md">
            This feature is coming soon! You&apos;ll be able to save your favorite 
            products and easily find them later.
          </p>
          <Button asChild className="bg-jemo-orange hover:bg-jemo-orange/90">
            <Link href="/products">Browse Products</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

