-- CreateTable
CREATE TABLE "DiscountBandSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "bandEnabled" BOOLEAN NOT NULL DEFAULT true,
    "timerEnabled" BOOLEAN NOT NULL DEFAULT false,
    "timerEndsAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscountBandSettings_pkey" PRIMARY KEY ("id")
);
