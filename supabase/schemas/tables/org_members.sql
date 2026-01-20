-- Organization members table schema
-- Stores membership relationships between users and organizations

-- Create sequence
CREATE SEQUENCE IF NOT EXISTS "public"."org_members_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE "public"."org_members_id_seq" OWNER TO "postgres";

-- Create table
CREATE TABLE IF NOT EXISTS "public"."org_members" (
    "id" integer NOT NULL,
    "org_id" "uuid",
    "user_id" "uuid",
    "role" "text" DEFAULT 'member'::"text",
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "org_members_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'member'::"text"])))
);

-- Set table owner
ALTER TABLE "public"."org_members" OWNER TO "postgres";

-- Set default value for id column
ALTER TABLE ONLY "public"."org_members" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."org_members_id_seq"'::"regclass");

-- Set sequence ownership
ALTER SEQUENCE "public"."org_members_id_seq" OWNED BY "public"."org_members"."id";

-- Primary key constraint
ALTER TABLE ONLY "public"."org_members"
    ADD CONSTRAINT "org_members_pkey" PRIMARY KEY ("id");

-- Unique constraints
ALTER TABLE ONLY "public"."org_members"
    ADD CONSTRAINT "org_members_org_id_user_id_key" UNIQUE ("org_id", "user_id");

-- Foreign key constraints
ALTER TABLE ONLY "public"."org_members"
    ADD CONSTRAINT "org_members_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."org_members"
    ADD CONSTRAINT "org_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");

 