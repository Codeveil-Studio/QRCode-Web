-- RLS Policies for issue_confirmations table
-- Issue confirmations can be inserted by public (anonymous users)
-- Issue confirmations can be viewed by organization members

-- Enable Row Level Security
ALTER TABLE "public"."issue_confirmations" ENABLE ROW LEVEL SECURITY;

-- Allow public to confirm issues
CREATE POLICY "Insert for Public (through anon)" ON "public"."issue_confirmations" 
    FOR INSERT TO "anon" 
    WITH CHECK (true);

-- Allow organization members to view and manage issue confirmations
CREATE POLICY "issue_confirmations_crud_for_org_member" ON "public"."issue_confirmations" 
    USING ((EXISTS ( SELECT 1
       FROM ((("public"."issues"
         JOIN "public"."assets" ON (("public"."assets"."uid" = "public"."issues"."asset_id")))
         JOIN "public"."asset_types" ON (("public"."assets"."type" = "public"."asset_types"."id")))
         JOIN "public"."org_members" ON (("public"."asset_types"."org_id" = "public"."org_members"."org_id")))
      WHERE (("public"."issues"."id" = "public"."issue_confirmations"."issue_id") AND ("public"."org_members"."user_id" = "auth"."uid"()))))) 
    WITH CHECK ((EXISTS ( SELECT 1
       FROM ((("public"."issues"
         JOIN "public"."assets" ON (("public"."assets"."uid" = "public"."issues"."asset_id")))
         JOIN "public"."asset_types" ON (("public"."assets"."type" = "public"."asset_types"."id")))
         JOIN "public"."org_members" ON (("public"."asset_types"."org_id" = "public"."org_members"."org_id")))
      WHERE (("public"."issues"."id" = "public"."issue_confirmations"."issue_id") AND ("public"."org_members"."user_id" = "auth"."uid"()))))); 