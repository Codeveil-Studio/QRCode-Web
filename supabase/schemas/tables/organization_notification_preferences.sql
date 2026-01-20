-- Organization notification preferences table schema
-- Stores notification preferences at the organization level

-- Create table
CREATE TABLE IF NOT EXISTS "public"."organization_notification_preferences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "critical_issue_default_channel" "text" DEFAULT 'both'::"text" NOT NULL,
    "normal_issue_default_channel" "text" DEFAULT 'email'::"text" NOT NULL,
    "allow_user_overrides" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "org_mobile_no" character varying(15),
    "is_verified_no" boolean DEFAULT false NOT NULL,
    "notify_issue_reporter" boolean DEFAULT false NOT NULL,
    CONSTRAINT "organization_notification_pr_critical_issue_default_chann_check" CHECK (("critical_issue_default_channel" = ANY (ARRAY['sms'::"text", 'email'::"text", 'both'::"text"]))),
    CONSTRAINT "organization_notification_pr_normal_issue_default_channel_check" CHECK (("normal_issue_default_channel" = ANY (ARRAY['email'::"text", 'sms'::"text", 'both'::"text", 'none'::"text"]))),
    CONSTRAINT "organization_notification_preferences_org_mobile_no_check" CHECK ((("org_mobile_no")::"text" ~ '^\+?[1-9]\d{9,14}$'::"text"))
);

-- Set table owner
ALTER TABLE "public"."organization_notification_preferences" OWNER TO "postgres";

-- Table comments
COMMENT ON TABLE "public"."organization_notification_preferences" IS 'Stores notification preferences at the organization level';
COMMENT ON COLUMN "public"."organization_notification_preferences"."critical_issue_default_channel" IS 'Default notification channel for critical issues';
COMMENT ON COLUMN "public"."organization_notification_preferences"."normal_issue_default_channel" IS 'Default notification channel for normal issues';
COMMENT ON COLUMN "public"."organization_notification_preferences"."allow_user_overrides" IS 'Whether users can override organization defaults';

-- Primary key constraint
ALTER TABLE ONLY "public"."organization_notification_preferences"
    ADD CONSTRAINT "organization_notification_preferences_pkey" PRIMARY KEY ("id");

-- Unique constraints
ALTER TABLE ONLY "public"."organization_notification_preferences"
    ADD CONSTRAINT "organization_notification_preferences_org_id_key" UNIQUE ("org_id");

-- Foreign key constraints
ALTER TABLE ONLY "public"."organization_notification_preferences"
    ADD CONSTRAINT "organization_notification_preferences_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;

-- Indexes
CREATE INDEX "idx_org_notification_prefs_org_id" ON "public"."organization_notification_preferences" USING "btree" ("org_id");

 