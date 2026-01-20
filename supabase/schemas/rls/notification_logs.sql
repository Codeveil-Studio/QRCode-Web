-- RLS Policies for notification_logs table
-- Service can insert notification logs
-- Organization members can view their notification logs

-- Enable Row Level Security
ALTER TABLE "public"."notification_logs" ENABLE ROW LEVEL SECURITY;

-- Allow service role to insert notification logs
CREATE POLICY "Service can insert notification logs" ON "public"."notification_logs" 
    FOR INSERT 
    WITH CHECK (true);

-- Allow organization members to view their notification logs
CREATE POLICY "Org Users can view their notification logs" ON "public"."notification_logs" 
    FOR SELECT 
    USING (("public"."notification_logs"."org_id" IN ( SELECT "public"."org_members"."org_id"
       FROM "public"."org_members"
      WHERE ("public"."org_members"."user_id" = "auth"."uid"())))); 