-- RLS Policies for orgs table
-- Organizations can only be seen by their members

-- Enable Row Level Security
ALTER TABLE "public"."orgs" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orgs_select_for_member" ON "public"."orgs" 
    FOR SELECT 
    USING ((EXISTS ( SELECT 1
       FROM "public"."org_members"
      WHERE (("public"."org_members"."user_id" = "auth"."uid"()) AND ("public"."org_members"."org_id" = "public"."orgs"."id"))))); 