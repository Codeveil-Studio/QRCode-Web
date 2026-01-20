-- Organizations table schema
-- Stores organizational entities that use the system

CREATE TABLE IF NOT EXISTS "public"."orgs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid"
);

-- Set table owner
ALTER TABLE "public"."orgs" OWNER TO "postgres";

-- Primary key constraint
ALTER TABLE ONLY "public"."orgs"
    ADD CONSTRAINT "orgs_pkey" PRIMARY KEY ("id");

-- Unique constraints
ALTER TABLE ONLY "public"."orgs"
    ADD CONSTRAINT "orgs_name_key" UNIQUE ("name");

ALTER TABLE ONLY "public"."orgs"
    ADD CONSTRAINT "orgs_created_by_key" UNIQUE ("created_by");

-- Foreign key constraints
ALTER TABLE ONLY "public"."orgs"
    ADD CONSTRAINT "orgs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");

 