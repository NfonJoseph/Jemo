/**
 * Product Categories
 * These should match the database categories table
 */
export const PRODUCT_CATEGORIES = [
  {
    slug: 'electronics',
    nameEn: 'Electronics',
    nameFr: 'Électronique',
    icon: 'Smartphone',
  },
  {
    slug: 'fashion',
    nameEn: 'Fashion',
    nameFr: 'Mode',
    icon: 'Shirt',
  },
  {
    slug: 'home-garden',
    nameEn: 'Home & Garden',
    nameFr: 'Maison & Jardin',
    icon: 'Home',
  },
  {
    slug: 'computing',
    nameEn: 'Computing',
    nameFr: 'Informatique',
    icon: 'Laptop',
  },
  {
    slug: 'health-beauty',
    nameEn: 'Health & Beauty',
    nameFr: 'Santé & Beauté',
    icon: 'Heart',
  },
  {
    slug: 'supermarket',
    nameEn: 'Supermarket',
    nameFr: 'Supermarché',
    icon: 'ShoppingCart',
  },
  {
    slug: 'baby-kids',
    nameEn: 'Baby & Kids',
    nameFr: 'Bébé & Enfants',
    icon: 'Baby',
  },
  {
    slug: 'gaming',
    nameEn: 'Gaming',
    nameFr: 'Jeux Vidéo',
    icon: 'Gamepad2',
  },
  {
    slug: 'sports-outdoors',
    nameEn: 'Sports & Outdoors',
    nameFr: 'Sports & Plein Air',
    icon: 'Dumbbell',
  },
  {
    slug: 'automotive',
    nameEn: 'Automotive',
    nameFr: 'Automobile',
    icon: 'Car',
  },
  {
    slug: 'books-stationery',
    nameEn: 'Books & Stationery',
    nameFr: 'Livres & Papeterie',
    icon: 'Book',
  },
  {
    slug: 'phones-tablets',
    nameEn: 'Phones & Tablets',
    nameFr: 'Téléphones & Tablettes',
    icon: 'Tablet',
  },
  {
    slug: 'appliances',
    nameEn: 'Appliances',
    nameFr: 'Électroménager',
    icon: 'Refrigerator',
  },
  {
    slug: 'other',
    nameEn: 'Other',
    nameFr: 'Autre',
    icon: 'Package',
  },
] as const;

export type CategorySlug = typeof PRODUCT_CATEGORIES[number]['slug'];
