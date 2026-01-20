-- RLS Policies for asset_types table
-- Standard asset types can be accessed by authenticated users
-- Organization-specific asset types can only be accessed by org members

-- Enable Row Level Security
ALTER TABLE "public"."asset_types" ENABLE ROW LEVEL SECURITY;

-- Allow access to standard (global) asset types
CREATE POLICY "Access to Standard Asset Types" ON "public"."asset_types" 
    FOR SELECT TO "authenticated" 
    USING (("org_id" IS NULL));

-- Allow CRUD access to organization-specific asset types by org members
CREATE POLICY "asset_types_crud_by_org_member" ON "public"."asset_types" 
    USING ((EXISTS ( SELECT 1
       FROM "public"."org_members"
      WHERE (("public"."org_members"."user_id" = "auth"."uid"()) AND ("public"."org_members"."org_id" = "public"."asset_types"."org_id"))))) 
    WITH CHECK ((EXISTS ( SELECT 1
       FROM "public"."org_members"
      WHERE (("public"."org_members"."user_id" = "auth"."uid"()) AND ("public"."org_members"."org_id" = "public"."asset_types"."org_id"))))); 