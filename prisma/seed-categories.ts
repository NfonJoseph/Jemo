import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CATEGORIES = [
  { slug: 'electronics', nameEn: 'Electronics', nameFr: 'Électronique', icon: 'Smartphone', sortOrder: 1 },
  { slug: 'fashion', nameEn: 'Fashion', nameFr: 'Mode', icon: 'Shirt', sortOrder: 2 },
  { slug: 'home-garden', nameEn: 'Home & Garden', nameFr: 'Maison & Jardin', icon: 'Home', sortOrder: 3 },
  { slug: 'computing', nameEn: 'Computing', nameFr: 'Informatique', icon: 'Laptop', sortOrder: 4 },
  { slug: 'health-beauty', nameEn: 'Health & Beauty', nameFr: 'Santé & Beauté', icon: 'Heart', sortOrder: 5 },
  { slug: 'supermarket', nameEn: 'Supermarket', nameFr: 'Supermarché', icon: 'ShoppingCart', sortOrder: 6 },
  { slug: 'baby-kids', nameEn: 'Baby & Kids', nameFr: 'Bébé & Enfants', icon: 'Baby', sortOrder: 7 },
  { slug: 'gaming', nameEn: 'Gaming', nameFr: 'Jeux Vidéo', icon: 'Gamepad2', sortOrder: 8 },
  { slug: 'sports-outdoors', nameEn: 'Sports & Outdoors', nameFr: 'Sports & Plein Air', icon: 'Dumbbell', sortOrder: 9 },
  { slug: 'automotive', nameEn: 'Automotive', nameFr: 'Automobile', icon: 'Car', sortOrder: 10 },
  { slug: 'books-stationery', nameEn: 'Books & Stationery', nameFr: 'Livres & Papeterie', icon: 'Book', sortOrder: 11 },
  { slug: 'phones-tablets', nameEn: 'Phones & Tablets', nameFr: 'Téléphones & Tablettes', icon: 'Tablet', sortOrder: 12 },
  { slug: 'appliances', nameEn: 'Appliances', nameFr: 'Électroménager', icon: 'Refrigerator', sortOrder: 13 },
  { slug: 'other', nameEn: 'Other', nameFr: 'Autre', icon: 'Package', sortOrder: 99 },
];

const ADMIN_SETTINGS = [
  {
    key: 'jemo_delivery_pricing',
    value: JSON.stringify({
      sameTownFee: 1500,
      otherCityFee: 2000,
    }),
    description: 'Jemo delivery pricing for same town and other city deliveries (in FCFA)',
  },
  {
    key: 'product_image_limits',
    value: JSON.stringify({
      minImages: 1,
      maxImages: 15,
      maxSizeBytes: 10 * 1024 * 1024, // 10MB
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    }),
    description: 'Product image upload limits and allowed types',
  },
];

async function main() {
  console.log('Seeding categories...');
  
  for (const cat of CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {
        nameEn: cat.nameEn,
        nameFr: cat.nameFr,
        icon: cat.icon,
        sortOrder: cat.sortOrder,
      },
      create: {
        name: cat.nameEn,
        nameEn: cat.nameEn,
        nameFr: cat.nameFr,
        slug: cat.slug,
        icon: cat.icon,
        sortOrder: cat.sortOrder,
      },
    });
    console.log(`  ✓ ${cat.nameEn}`);
  }

  console.log('\nSeeding admin settings...');
  
  for (const setting of ADMIN_SETTINGS) {
    await prisma.adminSettings.upsert({
      where: { key: setting.key },
      update: {
        value: setting.value,
        description: setting.description,
      },
      create: {
        key: setting.key,
        value: setting.value,
        description: setting.description,
      },
    });
    console.log(`  ✓ ${setting.key}`);
  }

  console.log('\n✅ Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
