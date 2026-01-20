-- RLS Policies for pricing_tiers table
-- Pricing tiers are generally readable by authenticated users
-- Only service role can modify pricing tiers

-- Enable Row Level Security
ALTER TABLE "public"."pricing_tiers" ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view active pricing tiers
CREATE POLICY "authenticated_users_can_view_active_pricing_tiers" ON "public"."pricing_tiers" 
    FOR SELECT TO "authenticated" 
    USING (("is_active" = true));

-- Allow service role full access
CREATE POLICY "service_role_full_access_pricing_tiers" ON "public"."pricing_tiers" 
    TO "service_role" 
    USING (true) 
    WITH CHECK (true); 