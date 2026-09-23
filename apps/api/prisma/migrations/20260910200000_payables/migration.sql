CREATE TABLE "payables" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "category_id" UUID,
  "title" VARCHAR(160) NOT NULL,
  "payee" VARCHAR(160),
  "total_amount" DECIMAL(19,4) NOT NULL,
  "installment_count" INTEGER NOT NULL,
  "frequency" VARCHAR(20) NOT NULL DEFAULT 'MONTHLY',
  "notes" VARCHAR(1000),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "payables_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "payable_installments" (
  "id" UUID NOT NULL,
  "payable_id" UUID NOT NULL,
  "number" INTEGER NOT NULL,
  "due_date" DATE NOT NULL,
  "amount" DECIMAL(19,4) NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  "paid_at" DATE,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "payLKpayable_installments_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "payables_user_id_created_at_idx" ON "payables"("user_id", "created_at");
CREATE UNIQUE INDEX "payable_installments_payable_id_number_key" ON "payable_installments"("payable_id", "number");
CREATE INDEX "payable_installments_due_date_status_idx" ON "payable_installments"("due_date", "status");
ALTER TABLE "payables" ADD CONSTRAINT "payables_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payables" ADD CONSTRAINT "payables_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payable_installments" ADD CONSTRAINT "payable_installments_payable_id_fkey" FOREIGN KEY ("payable_id") REFERENCES "payables"("id") ON DELETE CASCADE ON UPDATE CASCADE;
