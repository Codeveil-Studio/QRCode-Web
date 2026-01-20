-- Notification logs table schema
-- Logs all notification attempts for auditing and debugging purposes

-- Create table
CREATE TABLE IF NOT EXISTS "public"."notification_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid",
    "notification_type" "text" NOT NULL,
    "message_type" "text" NOT NULL,
    "recipient" "text" NOT NULL,
    "subject" "text",
    "message" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "error_message" "text",
    "sent_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "notification_logs_message_type_check" CHECK (("message_type" = ANY (ARRAY['critical_issue'::"text", 'normal_issue'::"text", 'daily_digest'::"text", 'weekly_digest'::"text", 'system'::"text"]))),
    CONSTRAINT "notification_logs_notification_type_check" CHECK (("notification_type" = ANY (ARRAY['sms'::"text", 'email'::"text"]))),
    CONSTRAINT "notification_logs_status_check" CHECK (("status" = ANY (ARRAY['sent'::"text", 'failed'::"text", 'pending'::"text"])))
);

-- Set table owner
ALTER TABLE "public"."notification_logs" OWNER TO "postgres";

-- Table comments
COMMENT ON TABLE "public"."notification_logs" IS 'Logs all notification attempts for auditing and debugging';
COMMENT ON COLUMN "public"."notification_logs"."notification_type" IS 'Type of notification: sms or email';
COMMENT ON COLUMN "public"."notification_logs"."message_type" IS 'Category of message sent';
COMMENT ON COLUMN "public"."notification_logs"."recipient" IS 'Email address or phone number of recipient';
COMMENT ON COLUMN "public"."notification_logs"."status" IS 'Delivery status of the notification';

-- Primary key constraint
ALTER TABLE ONLY "public"."notification_logs"
    ADD CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id");

-- Foreign key constraints
ALTER TABLE ONLY "public"."notification_logs"
    ADD CONSTRAINT "notification_logs_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE SET NULL;

-- Indexes
CREATE INDEX "idx_notification_logs_created_at" ON "public"."notification_logs" USING "btree" ("created_at" DESC);
CREATE INDEX "idx_notification_logs_org_id" ON "public"."notification_logs" USING "btree" ("org_id");
CREATE INDEX "idx_notification_logs_status" ON "public"."notification_logs" USING "btree" ("status");

 