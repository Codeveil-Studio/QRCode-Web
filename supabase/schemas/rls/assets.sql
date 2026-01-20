-- RLS Policies for assets table
-- Assets can only be accessed by organization members

-- Enable Row Level Security
ALTER TABLE "public"."assets" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "assets_crud_by_org_member" ON "public"."assets" 
    USING ((EXISTS ( SELECT 1
       FROM ("public"."asset_types"
         JOIN "public"."org_members" USING ("org_id"))
      WHERE (("public"."asset_types"."id" = "public"."assets"."type") AND ("public"."org_members"."user_id" = "auth"."uid"()))))) 
    WITH CHECK ((EXISTS ( SELECT 1
       FROM ("public"."asset_types"
         JOIN "public"."org_members" USING ("org_id"))
      WHERE (("public"."asset_types"."id" = "public"."assets"."type") AND ("public"."org_members"."user_id" = "auth"."uid"()))))); 