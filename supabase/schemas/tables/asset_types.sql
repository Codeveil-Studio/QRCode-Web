-- Asset types table schema
-- Stores categories and types of assets that can be managed

-- Create sequence
CREATE SEQUENCE IF NOT EXISTS "public"."types_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE "public"."types_id_seq" OWNER TO "postgres";

-- Create table
CREATE TABLE IF NOT EXISTS "public"."asset_types" (
    "id" integer NOT NULL,
    "uid" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "category" "text",
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "org_id" "uuid",
    "is_custom" boolean DEFAULT false NOT NULL,
    "created_by" "uuid"
);

-- Set table owner
ALTER TABLE "public"."asset_types" OWNER TO "postgres";

-- Set default value for id column
ALTER TABLE ONLY "public"."asset_types" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."types_id_seq"'::"regclass");

-- Set sequence ownership
ALTER SEQUENCE "public"."types_id_seq" OWNED BY "public"."asset_types"."id";

-- Primary key constraint
ALTER TABLE ONLY "public"."asset_types"
    ADD CONSTRAINT "types_pkey" PRIMARY KEY ("id");

-- Unique constraints
ALTER TABLE ONLY "public"."asset_types"
    ADD CONSTRAINT "types_uid_key" UNIQUE ("uid");

ALTER TABLE ONLY "public"."asset_types"
    ADD CONSTRAINT "types_name_org_key" UNIQUE ("name", "org_id");

-- Foreign key constraints
ALTER TABLE ONLY "public"."asset_types"
    ADD CONSTRAINT "types_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");

ALTER TABLE ONLY "public"."asset_types"
    ADD CONSTRAINT "types_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;

 