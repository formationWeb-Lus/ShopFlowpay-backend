/*
  Warnings:

  - Added the required column `updatedAt` to the `MerchantPaymentConfig` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Subscription` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PaymentConfigStatus" AS ENUM ('PENDING', 'ACTIVE', 'DISABLED');

-- AlterTable
ALTER TABLE "MerchantPaymentConfig" ADD COLUMN     "status" "PaymentConfigStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "ProductPaymentConfig" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "paymentConfigId" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductPaymentConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductPaymentConfig_productId_paymentConfigId_key" ON "ProductPaymentConfig"("productId", "paymentConfigId");

-- AddForeignKey
ALTER TABLE "ProductPaymentConfig" ADD CONSTRAINT "ProductPaymentConfig_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductPaymentConfig" ADD CONSTRAINT "ProductPaymentConfig_paymentConfigId_fkey" FOREIGN KEY ("paymentConfigId") REFERENCES "MerchantPaymentConfig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
