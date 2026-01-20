-- Subscriptions table schema
-- Stores organization billing and subscription management data

-- Create table
CREATE TABLE IF NOT EXISTS "public"."subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "stripe_customer_id" "text",
    "stripe_subscription_id" "text",
    "stripe_product_id" "text",
    "stripe_price_id" "text",
    "subscription_item_id" "text",
    "current_asset_count" integer DEFAULT 0 NOT NULL,
    "stripe_base_price" numeric(10,4) DEFAULT 0 NOT NULL,
    "billing_cycle" "text" DEFAULT 'monthly'::"text" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "asset_limit" integer DEFAULT 0 NOT NULL,
    "volume_tier" integer DEFAULT 1 NOT NULL,
    "effective_unit_price" numeric(8,2) DEFAULT 0 NOT NULL,
    "total_monthly_cost" numeric(8,2) DEFAULT 0 NOT NULL,
    CONSTRAINT "subscriptions_asset_limit_check" CHECK (("asset_limit" >= 0)),
    CONSTRAINT "subscriptions_billing_cycle_check" CHECK (("billing_cycle" = ANY (ARRAY['monthly'::"text", 'annual'::"text"]))),
    CONSTRAINT "subscriptions_current_asset_count_check" CHECK (("current_asset_count" >= 0)),
    CONSTRAINT "subscriptions_effective_unit_price_check" CHECK (("effective_unit_price" >= (0)::numeric)),
    CONSTRAINT "subscriptions_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'canceled'::"text", 'past_due'::"text", 'unpaid'::"text", 'trialing'::"text"]))),
    CONSTRAINT "subscriptions_total_monthly_cost_check" CHECK (("total_monthly_cost" >= (0)::numeric)),
    CONSTRAINT "subscriptions_volume_tier_check" CHECK ((("volume_tier" >= 1) AND ("volume_tier" <= 4)))
);

-- Set table owner
ALTER TABLE "public"."subscriptions" OWNER TO "postgres";

-- Primary key constraint
ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id");

-- Unique constraints
ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_stripe_subscription_id_unique" UNIQUE ("stripe_subscription_id");

ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_subscription_item_id_unique" UNIQUE ("subscription_item_id");

-- Indexes
CREATE INDEX "idx_subscriptions_asset_limit" ON "public"."subscriptions" USING "btree" ("asset_limit");
CREATE INDEX "idx_subscriptions_billing_cycle" ON "public"."subscriptions" USING "btree" ("billing_cycle");
CREATE INDEX "idx_subscriptions_org_id" ON "public"."subscriptions" USING "btree" ("org_id");
CREATE INDEX "idx_subscriptions_status" ON "public"."subscriptions" USING "btree" ("status");
CREATE INDEX "idx_subscriptions_stripe_customer_id" ON "public"."subscriptions" USING "btree" ("stripe_customer_id");
CREATE INDEX "idx_subscriptions_stripe_subscription_id" ON "public"."subscriptions" USING "btree" ("stripe_subscription_id");
CREATE INDEX "idx_subscriptions_subscription_item_id" ON "public"."subscriptions" USING "btree" ("subscription_item_id");
CREATE INDEX "idx_subscriptions_volume_tier" ON "public"."subscriptions" USING "btree" ("volume_tier");

 