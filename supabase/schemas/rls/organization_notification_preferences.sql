-- RLS Policies for organization_notification_preferences table
-- Organization admins can insert and update notification preferences
-- All organization members can view notification preferences

-- Enable Row Level Security
ALTER TABLE "public"."organization_notification_preferences" ENABLE ROW LEVEL SECURITY;

-- Allow organization admins to insert notification preferences
CREATE POLICY "Org admins can insert notification preferences" ON "public"."organization_notification_preferences" 
    FOR INSERT 
    WITH CHECK (("public"."organization_notification_preferences"."org_id" IN ( SELECT "public"."org_members"."org_id"
       FROM "public"."org_members"
      WHERE (("public"."org_members"."user_id" = "auth"."uid"()) AND ("public"."org_members"."role" = 'admin'::"text")))));

-- Allow organization admins to update notification preferences
CREATE POLICY "Org admins can update notification preferences" ON "public"."organization_notification_preferences" 
    FOR UPDATE 
    USING (("public"."organization_notification_preferences"."org_id" IN ( SELECT "public"."org_members"."org_id"
       FROM "public"."org_members"
      WHERE (("public"."org_members"."user_id" = "auth"."uid"()) AND ("public"."org_members"."role" = 'admin'::"text")))));

-- Allow all organization members to view notification preferences
CREATE POLICY "Users can view org notification preferences" ON "public"."organization_notification_preferences" 
    FOR SELECT 
    USING (("public"."organization_notification_preferences"."org_id" IN ( SELECT "public"."org_members"."org_id"
       FROM "public"."org_members"
      WHERE ("public"."org_members"."user_id" = "auth"."uid"())))); 