-- Assets table schema
-- Stores individual assets managed by organizations

-- Create sequence
CREATE SEQUENCE IF NOT EXISTS "public"."items_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE "public"."items_id_seq" OWNER TO "postgres";

-- Create table
CREATE TABLE IF NOT EXISTS "public"."assets" (
    "id" integer NOT NULL,
    "uid" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "location" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "type" integer,
    "tags" "text"[],
    "metadata" "jsonb",
    "last_maintenance_at" timestamp with time zone,
    "status" "text" DEFAULT 'active'::"text"
);

-- Set table owner
ALTER TABLE "public"."assets" OWNER TO "postgres";

-- Set default value for id column
ALTER TABLE ONLY "public"."assets" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."items_id_seq"'::"regclass");

-- Set sequence ownership
ALTER SEQUENCE "public"."items_id_seq" OWNED BY "public"."assets"."id";

-- Primary key constraint
ALTER TABLE ONLY "public"."assets"
    ADD CONSTRAINT "items_pkey" PRIMARY KEY ("id");

-- Unique constraints
ALTER TABLE ONLY "public"."assets"
    ADD CONSTRAINT "items_uid_key" UNIQUE ("uid");

-- Foreign key constraints
ALTER TABLE ONLY "public"."assets"
    ADD CONSTRAINT "items_type_fkey" FOREIGN KEY ("type") REFERENCES "public"."asset_types"("id");

ALTER TABLE ONLY "public"."assets"
    ADD CONSTRAINT "items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

-- Indexes
CREATE INDEX "items_created_at_idx" ON "public"."assets" USING "btree" ("created_at");
CREATE INDEX "items_user_id_idx" ON "public"."assets" USING "btree" ("user_id");

 