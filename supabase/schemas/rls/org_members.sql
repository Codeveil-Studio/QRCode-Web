-- RLS Policies for org_members table
-- Users can only see their own organization memberships

-- Enable Row Level Security
ALTER TABLE "public"."org_members" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_select_own" ON "public"."org_members" 
    FOR SELECT 
    USING (("auth"."uid"() = "public"."org_members"."user_id")); 