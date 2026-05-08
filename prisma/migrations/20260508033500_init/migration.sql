-- CreateTable
CREATE TABLE "kv_entries" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kv_entries_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "kv_entries_expiresAt_idx" ON "kv_entries"("expiresAt");
