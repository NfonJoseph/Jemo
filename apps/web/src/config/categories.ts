import {
  Smartphone,
  Shirt,
  Home,
  Laptop,
  Heart,
  ShoppingCart,
  Baby,
  Gamepad2,
  Music,
  Car,
  BookOpen,
  MoreHorizontal,
  type LucideIcon,
} from "lucide-react";

export interface Category {
  id: string;
  slug: string;
  labelKey: string;
  icon: LucideIcon;
  imageUrl: string;
}

export const categories: Category[] = [
  {
    id: "electronics",
    slug: "electronics",
    labelKey: "categories.electronics",
    icon: Smartphone,
    imageUrl: "/images/categories/electronics.jpg",
  },
  {
    id: "fashion",
    slug: "fashion",
    labelKey: "categories.fashion",
    icon: Shirt,
    imageUrl: "/images/categories/fashion.jpg",
  },
  {
    id: "home-garden",
    slug: "home-garden",
    labelKey: "categories.homeGarden",
    icon: Home,
    imageUrl: "/images/categories/home-garden.jpg",
  },
  {
    id: "computing",
    slug: "computing",
    labelKey: "categories.computing",
    icon: Laptop,
    imageUrl: "/images/categories/computing.jpg",
  },
  {
    id: "health-beauty",
    slug: "health-beauty",
    labelKey: "categories.healthBeauty",
    icon: Heart,
    imageUrl: "/images/categories/health-beauty.jpg",
  },
  {
    id: "supermarket",
    slug: "supermarket",
    labelKey: "categories.foodGrocery",
    icon: ShoppingCart,
    imageUrl: "/images/categories/supermarket.jpg",
  },
  {
    id: "baby-kids",
    slug: "baby-kids",
    labelKey: "categories.babyKids",
    icon: Baby,
    imageUrl: "/images/categories/baby-kids.jpg",
  },
  {
    id: "gaming",
    slug: "gaming",
    labelKey: "categories.gaming",
    icon: Gamepad2,
    imageUrl: "/images/categories/gaming.jpg",
  },
  {
    id: "sports-outdoors",
    slug: "sports-outdoors",
    labelKey: "categories.sportsOutdoors",
    icon: Music,
    imageUrl: "/images/categories/sports.jpg",
  },
  {
    id: "automotive",
    slug: "automotive",
    labelKey: "categories.automotive",
    icon: Car,
    imageUrl: "/images/categories/automotive.jpg",
  },
  {
    id: "books-stationery",
    slug: "books-stationery",
    labelKey: "categories.booksStationery",
    icon: BookOpen,
    imageUrl: "/images/categories/books.jpg",
  },
  {
    id: "other",
    slug: "other",
    labelKey: "categories.other",
    icon: MoreHorizontal,
    imageUrl: "/images/categories/other.jpg",
  },
];

// Get first N categories for sidebar display
export const getSidebarCategories = (count = 10) => categories.slice(0, count);

// Get all categories for the strip
export const getAllCategories = () => categories;
