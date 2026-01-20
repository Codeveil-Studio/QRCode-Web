-- Issues table schema
-- Stores asset-related issues reported by users

-- Create sequence
CREATE SEQUENCE IF NOT EXISTS "public"."issues_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE "public"."issues_id_seq" OWNER TO "postgres";

-- Create table
CREATE TABLE IF NOT EXISTS "public"."issues" (
    "id" integer NOT NULL,
    "uid" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "description" "text",
    "status" "text" DEFAULT 'open'::"text",
    "reported_by" "text",
    "contact_info" "text",
    "reported_at" timestamp with time zone DEFAULT "now"(),
    "resolved_at" timestamp with time zone,
    "internal_notes" "text",
    "is_critical" boolean DEFAULT false,
    "issue_type" "text",
    "tags" "text"[],
    "image_path" "text",
    "group_id" "uuid",
    "metadata" "jsonb",
    "urgency" "text" DEFAULT 'medium'::"text",
    "asset_id" "uuid",
    "confirmation_count" integer DEFAULT 0,
    CONSTRAINT "issues_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'in_progress'::"text", 'resolved'::"text"]))),
    CONSTRAINT "issues_urgency_check" CHECK (("urgency" = ANY (ARRAY['low'::"text", 'medium'::"text", 'high'::"text"])))
);

-- Set table owner
ALTER TABLE "public"."issues" OWNER TO "postgres";

-- Set default value for id column
ALTER TABLE ONLY "public"."issues" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."issues_id_seq"'::"regclass");

-- Set sequence ownership
ALTER SEQUENCE "public"."issues_id_seq" OWNED BY "public"."issues"."id";

-- Primary key constraint
ALTER TABLE ONLY "public"."issues"
    ADD CONSTRAINT "issues_pkey" PRIMARY KEY ("id");

-- Unique constraints
ALTER TABLE ONLY "public"."issues"
    ADD CONSTRAINT "issues_uid_key" UNIQUE ("uid");

-- Foreign key constraints
ALTER TABLE ONLY "public"."issues"
    ADD CONSTRAINT "issues_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("uid");

-- Indexes
CREATE INDEX "issues_reported_at_idx" ON "public"."issues" USING "btree" ("reported_at");
CREATE INDEX "issues_status_idx" ON "public"."issues" USING "btree" ("status");

 