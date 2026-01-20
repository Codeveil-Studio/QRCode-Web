import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Utility function to get image URL from Supabase storage
export const getIssueImageUrl = (imagePath: string | null): string | null => {
  if (!imagePath) return null;

  const { data } = supabase.storage
    .from("issue-images") // Replace with your actual bucket name
    .getPublicUrl(imagePath);

  return data.publicUrl;
};
