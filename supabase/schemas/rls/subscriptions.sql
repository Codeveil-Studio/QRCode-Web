-- RLS Policies for subscriptions table
-- Organizations can only access their own subscription data
-- Service role can access all subscription data

-- Enable Row Level Security
ALTER TABLE "public"."subscriptions" ENABLE ROW LEVEL SECURITY;

-- Allow organization members to view their subscription
CREATE POLICY "org_members_can_view_own_subscription" ON "public"."subscriptions" 
    FOR SELECT 
    USING (("public"."subscriptions"."org_id" IN ( SELECT "public"."org_members"."org_id"
       FROM "public"."org_members"
      WHERE ("public"."org_members"."user_id" = "auth"."uid"()))));

-- Allow organization admins to update their subscription
CREATE POLICY "org_admins_can_update_own_subscription" ON "public"."subscriptions" 
    FOR UPDATE 
    USING (("public"."subscriptions"."org_id" IN ( SELECT "public"."org_members"."org_id"
       FROM "public"."org_members"
      WHERE (("public"."org_members"."user_id" = "auth"."uid"()) AND ("public"."org_members"."role" = 'admin'::"text")))));

-- Allow service role full access for billing operations
CREATE POLICY "service_role_full_access_subscriptions" ON "public"."subscriptions" 
    TO "service_role" 
    USING (true) 
    WITH CHECK (true); 