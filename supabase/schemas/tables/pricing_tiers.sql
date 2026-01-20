-- Pricing tiers table schema
-- Stores subscription pricing tiers and their configurations

-- Create table
CREATE TABLE IF NOT EXISTS "public"."pricing_tiers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tier_number" integer NOT NULL,
    "tier_name" "text" NOT NULL,
    "min_assets" integer NOT NULL,
    "max_assets" integer,
    "monthly_price_pence" integer NOT NULL,
    "annual_price_pence" integer NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "display_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "pricing_tiers_annual_price_check" CHECK (("annual_price_pence" > 0)),
    CONSTRAINT "pricing_tiers_max_assets_check" CHECK ((("max_assets" IS NULL) OR ("max_assets" > "min_assets"))),
    CONSTRAINT "pricing_tiers_min_assets_check" CHECK (("min_assets" >= 0)),
    CONSTRAINT "pricing_tiers_monthly_price_check" CHECK (("monthly_price_pence" > 0))
);

-- Set table owner
ALTER TABLE "public"."pricing_tiers" OWNER TO "postgres";

-- Primary key constraint
ALTER TABLE ONLY "public"."pricing_tiers"
    ADD CONSTRAINT "pricing_tiers_pkey" PRIMARY KEY ("id");

-- Unique constraints
ALTER TABLE ONLY "public"."pricing_tiers"
    ADD CONSTRAINT "pricing_tiers_tier_number_unique" UNIQUE ("tier_number");

-- Indexes
CREATE INDEX "idx_pricing_tiers_display_order" ON "public"."pricing_tiers" USING "btree" ("display_order");
CREATE INDEX "idx_pricing_tiers_is_active" ON "public"."pricing_tiers" USING "btree" ("is_active");
CREATE INDEX "idx_pricing_tiers_tier_number" ON "public"."pricing_tiers" USING "btree" ("tier_number");

 