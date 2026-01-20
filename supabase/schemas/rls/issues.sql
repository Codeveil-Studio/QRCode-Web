-- RLS Policies for issues table
-- Issues can be inserted by anyone (anonymous and authenticated users)
-- Issues can be viewed/managed by organization members

-- Enable Row Level Security
ALTER TABLE "public"."issues" ENABLE ROW LEVEL SECURITY;

-- Allow public issue reporting
CREATE POLICY "Enable insert for anon and authenticated users only" ON "public"."issues" 
    FOR INSERT TO "authenticated", "anon" 
    WITH CHECK (true);

-- Allow organization members to view and manage issues for their assets
CREATE POLICY "issues_crud_for_org_member" ON "public"."issues" 
    USING ((EXISTS ( SELECT 1
       FROM (("public"."assets"
         JOIN "public"."asset_types" ON (("public"."assets"."type" = "public"."asset_types"."id")))
         JOIN "public"."org_members" ON (("public"."asset_types"."org_id" = "public"."org_members"."org_id")))
      WHERE (("public"."assets"."uid" = "public"."issues"."asset_id") AND ("public"."org_members"."user_id" = "auth"."uid"()))))) 
    WITH CHECK ((EXISTS ( SELECT 1
       FROM (("public"."assets"
         JOIN "public"."asset_types" ON (("public"."assets"."type" = "public"."asset_types"."id")))
         JOIN "public"."org_members" ON (("public"."asset_types"."org_id" = "public"."org_members"."org_id")))
      WHERE (("public"."assets"."uid" = "public"."issues"."asset_id") AND ("public"."org_members"."user_id" = "auth"."uid"()))))); 