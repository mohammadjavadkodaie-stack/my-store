-- CreateTable
CREATE TABLE "SiteStatus" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteStatusAudit" (
    "id" SERIAL NOT NULL,
    "enabled" BOOLEAN NOT NULL,
    "ip" VARCHAR(64) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SiteStatusAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SiteStatusAudit_createdAt_idx" ON "SiteStatusAudit"("createdAt");
