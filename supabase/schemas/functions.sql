-- Database Functions Schema
-- This file contains all custom functions used throughout the application

-- Function to update issue confirmation count
-- Used by triggers to automatically maintain confirmation counts on issues
CREATE OR REPLACE FUNCTION "public"."update_issue_confirmation_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE issues 
    SET confirmation_count = confirmation_count + 1 
    WHERE id = NEW.issue_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE issues 
    SET confirmation_count = confirmation_count - 1 
    WHERE id = OLD.issue_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Set function owner
ALTER FUNCTION "public"."update_issue_confirmation_count"() OWNER TO "postgres";

-- Function to update updated_at timestamp
-- Used by triggers to automatically set updated_at on record modifications
CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Set function owner
ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres"; 