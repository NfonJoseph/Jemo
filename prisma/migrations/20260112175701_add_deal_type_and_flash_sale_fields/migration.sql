-- CreateEnum
CREATE TYPE "DealType" AS ENUM ('TODAYS_DEAL', 'FLASH_SALE');

-- CreateEnum
CREATE TYPE "ProductCategory" AS ENUM ('ELECTRONICS', 'FASHION', 'HOME_GARDEN', 'COMPUTING', 'HEALTH_BEAUTY', 'SUPERMARKET', 'BABY_KIDS', 'GAMING', 'SPORTS_OUTDOORS', 'AUTOMOTIVE', 'BOOKS_STATIONERY', 'OTHER');

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "category" "ProductCategory" NOT NULL DEFAULT 'OTHER',
ADD COLUMN     "dealType" "DealType" NOT NULL DEFAULT 'TODAYS_DEAL',
ADD COLUMN     "descriptionEn" TEXT,
ADD COLUMN     "descriptionFr" TEXT,
ADD COLUMN     "flashSaleDiscountPercent" INTEGER,
ADD COLUMN     "flashSaleEndAt" TIMESTAMP(3),
ADD COLUMN     "flashSalePrice" DECIMAL(10,2),
ADD COLUMN     "flashSaleStartAt" TIMESTAMP(3),
ADD COLUMN     "nameEn" TEXT,
ADD COLUMN     "nameFr" TEXT;
