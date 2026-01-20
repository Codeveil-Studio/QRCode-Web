import { createClient, SupabaseClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;

// Anon client - for public operations (no authentication required)
export const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Admin client - for administrative operations (uses service role key)
export const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Legacy export for backward compatibility
export const supabase = adminClient;

// Factory function to create authenticated client for specific user operations
export const createAuthenticatedClient = (
  accessToken: string
): SupabaseClient => {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

// Helper function to verify JWT token and get user using admin client
export const verifyAndGetUser = async (accessToken: string) => {
  try {
    // Use admin client to verify the token
    const { data, error } = await adminClient.auth.getUser(accessToken);

    if (error || !data.user) {
      throw new Error("Invalid or expired token");
    }

    return data.user;
  } catch (error) {
    throw new Error("Token verification failed");
  }
};

// Helper function to get authenticated supabase client for a user
export const getAuthenticatedSupabase = (accessToken: string) => {
  return createAuthenticatedClient(accessToken);
};

// Client selection helper based on operation type
export const getSupabaseClient = {
  // For public operations that don't require authentication
  anon: () => anonClient,

  // For administrative operations (user management, etc.)
  admin: () => adminClient,

  // For user-specific operations
  authenticated: (accessToken: string) =>
    createAuthenticatedClient(accessToken),
};
