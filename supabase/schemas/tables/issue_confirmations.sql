-- Issue confirmations table schema
-- Stores additional confirmations from users about existing issues

-- Create sequence
CREATE SEQUENCE IF NOT EXISTS "public"."issue_confirmations_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE "public"."issue_confirmations_id_seq" OWNER TO "postgres";

-- Create table
CREATE TABLE IF NOT EXISTS "public"."issue_confirmations" (
    "id" integer NOT NULL,
    "uid" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "issue_id" integer NOT NULL,
    "reporter_name" "text",
    "reporter_email" "text",
    "contact_info" "text",
    "message" "text",
    "confirmed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "metadata" "jsonb"
);

-- Set table owner
ALTER TABLE "public"."issue_confirmations" OWNER TO "postgres";

-- Set default value for id column
ALTER TABLE ONLY "public"."issue_confirmations" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."issue_confirmations_id_seq"'::"regclass");

-- Set sequence ownership
ALTER SEQUENCE "public"."issue_confirmations_id_seq" OWNED BY "public"."issue_confirmations"."id";

-- Primary key constraint
ALTER TABLE ONLY "public"."issue_confirmations"
    ADD CONSTRAINT "issue_confirmations_pkey" PRIMARY KEY ("id");

-- Unique constraints
ALTER TABLE ONLY "public"."issue_confirmations"
    ADD CONSTRAINT "issue_confirmations_uid_key" UNIQUE ("uid");

-- Foreign key constraints
ALTER TABLE ONLY "public"."issue_confirmations"
    ADD CONSTRAINT "issue_confirmations_issue_id_fkey" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE CASCADE;

-- Indexes
CREATE INDEX "idx_issue_confirmations_confirmed_at" ON "public"."issue_confirmations" USING "btree" ("confirmed_at");
CREATE INDEX "idx_issue_confirmations_issue_id" ON "public"."issue_confirmations" USING "btree" ("issue_id");

 