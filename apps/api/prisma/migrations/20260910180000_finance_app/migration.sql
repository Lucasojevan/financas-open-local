ALTER TYPE "ConnectionKind" ADD VALUE 'PLUGGY';
ALTER TYPE "ConnectionKind" ADD VALUE 'MANUAL';
CREATE TABLE "provider_connections" (
  "id" UUID NOT NULL, "user_id" UUID NOT NULL, "item_id" TEXT NOT NULL,
  "name" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'PENDING',
  "last_sync" TIMESTAMP(3), "error" TEXT, "sandbox" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "provider_connections_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "provider_connections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "provider_connections_item_id_key" ON "provider_connections"("item_id");
CREATE INDEX "provider_connections_user_id_idx" ON "provider_connections"("user_id");
ALTER TABLE "accounts" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'manual', ADD COLUMN "connection_id" UUID;
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "provider_connections"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "categories" ADD COLUMN "budget" DECIMAL(19,4) NOT NULL DEFAULT 0;
ALTER TABLE "cards" ADD COLUMN "close_day" INTEGER;
CREATE TABLE "webhook_jobs" (
  "id" UUID NOT NULL, "event_id" TEXT NOT NULL, "event" TEXT NOT NULL, "item_id" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING', "attempts" INTEGER NOT NULL DEFAULT 0,
  "available_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "webhook_jobs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "webhook_jobs_event_id_key" ON "webhook_jobs"("event_id");
CREATE INDEX "webhook_jobs_status_available_at_idx" ON "webhook_jobs"("status", "available_at");
