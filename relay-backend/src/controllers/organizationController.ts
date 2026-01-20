import { Response } from "express";
import { body, validationResult } from "express-validator";
import { adminClient, supabase, getAuthenticatedSupabase } from "../utils/supabase";
import { AuthRequest } from "../middleware/auth";

// Validation rules
export const validateOrganizationCreation = [
  body("name")
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Organization name must be between 1 and 100 characters"),
  body("userId").optional().isUUID().withMessage("Valid user ID is required"),
];

export const validateInviteCreation = [
  body("email")
    .optional()
    .isEmail()
    .withMessage("Must be a valid email address"),
  body("maxUses")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Max uses must be between 1 and 100"),
];

export const validateInviteCode = [
  body("inviteCode")
    .isString()
    .trim()
    .isLength({ min: 1, max: 10 })
    .withMessage("Invite code is required"),
];

export const validateJoinWithInvite = [
  body("inviteCode")
    .isString()
    .trim()
    .isLength({ min: 1, max: 10 })
    .withMessage("Invite code is required"),
  body("userId").isUUID().withMessage("Valid user ID is required"),
];

// Generate random invite code
const generateInviteCode = (): string => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// POST /api/organizations/create - Create new organization
export const createOrganization = async (
  req: AuthRequest,
  res: Response
  ): Promise<void> => {
  try {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        error: "Validation error",
        details: errors.array(),
      });
      return;
    }

    const { name, userId: bodyUserId } = req.body;
    const userId = req.user?.id || bodyUserId;
    const normalizedName = typeof name === "string" ? name.trim() : "";

    if (!userId) {
      res.status(401).json({
        success: false,
        error: "User not authenticated",
      });
      return;
    }

    const { data: existingByUser, error: existingByUserError } = await adminClient
      .from("orgs")
      .select("id, name, created_by")
      .eq("created_by", userId)
      .maybeSingle();

    if (existingByUserError) {
      console.error("Error checking existing organization:", existingByUserError);
      res.status(500).json({
        success: false,
        error: "Failed to create organization",
      });
      return;
    }

    if (existingByUser) {
      const { error: memberUpsertError } = await adminClient
        .from("org_members")
        .upsert(
          {
            org_id: existingByUser.id,
            user_id: userId,
            role: "admin",
          },
          { onConflict: "org_id,user_id" }
        );

      if (memberUpsertError) {
        console.error("Error ensuring user membership:", memberUpsertError);
        res.status(500).json({
          success: false,
          error: "Failed to add user to organization",
        });
        return;
      }

      await adminClient
        .from("organization_notification_preferences")
        .upsert(
          {
            org_id: existingByUser.id,
            critical_issue_default_channel: "both",
            normal_issue_default_channel: "email",
            allow_user_overrides: true,
            notify_issue_reporter: false,
          },
          { onConflict: "org_id" }
        );

      const { data: existingSubscription } = await adminClient
        .from("subscriptions")
        .select("id")
        .eq("org_id", existingByUser.id)
        .maybeSingle();

      if (!existingSubscription) {
        await adminClient.from("subscriptions").insert({
          org_id: existingByUser.id,
          current_asset_count: 0,
          asset_limit: 10,
          billing_cycle: "monthly",
          status: "active",
          volume_tier: 1,
          effective_unit_price: 0,
          total_monthly_cost: 0,
          created_by: userId,
        });
      }

      res.json({
        success: true,
        data: {
          orgId: existingByUser.id,
          name: existingByUser.name,
        },
      });
      return;
    }

    const { data: existingByName, error: existingByNameError } = await adminClient
      .from("orgs")
      .select("id, created_by")
      .eq("name", normalizedName)
      .maybeSingle();

    if (existingByNameError) {
      console.error("Error checking organization name:", existingByNameError);
      res.status(500).json({
        success: false,
        error: "Failed to create organization",
      });
      return;
    }

    if (existingByName) {
      res.status(409).json({
        success: false,
        error: "Organization name already exists",
      });
      return;
    }

    const { data: org, error: orgError } = await adminClient
      .from("orgs")
      .insert({
        name: normalizedName,
        created_by: userId,
      })
      .select("id, name")
      .single();

    if (orgError) {
      console.error("Error creating organization:", orgError);
      res.status(500).json({
        success: false,
        error: "Failed to create organization",
      });
      return;
    }

    // Add user as owner to the organization
    const { error: memberError } = await adminClient.from("org_members").insert({
      org_id: org.id,
      user_id: userId,
      role: "admin",
    });

    if (memberError) {
      console.error("Error adding user to organization:", memberError);

      // Cleanup: Remove the organization if member creation failed
      await adminClient.from("orgs").delete().eq("id", org.id);

      res.status(500).json({
        success: false,
        error: "Failed to add user to organization",
      });
      return;
    }

    // Create default notification preferences for the organization
    const { error: notificationError } = await adminClient
      .from("organization_notification_preferences")
      .insert({
        org_id: org.id,
        critical_issue_default_channel: "both",
        normal_issue_default_channel: "email",
        allow_user_overrides: true,
        notify_issue_reporter: false,
      });

    if (notificationError) {
      console.error(
        "Error creating notification preferences:",
        notificationError
      );
      // Don't fail the organization creation, just log the error
    }

    // Create free subscription with 10 assets for new organization
    const { error: subscriptionError } = await adminClient
      .from("subscriptions")
      .insert({
        org_id: org.id,
        current_asset_count: 0,
        asset_limit: 10,
        billing_cycle: 'monthly',
        status: 'active',
        volume_tier: 1,
        effective_unit_price: 0,
        total_monthly_cost: 0,
        created_by: userId,
        // Stripe fields remain NULL for free subscription
      });

    if (subscriptionError) {
      console.error("Error creating free subscription:", subscriptionError);
      // Don't fail the organization creation, just log the error
    }

    res.json({
      success: true,
      data: {
        orgId: org.id,
        name: org.name,
      },
    });
  } catch (error) {
    console.error("Error in createOrganization:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

// POST /api/organizations/create-invite - Create invite code for organization
export const createInvite = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        error: "Validation error",
        details: errors.array(),
      });
      return;
    }

    const userId = req.user?.id;
    if (!userId || !req.accessToken) {
      res.status(401).json({
        success: false,
        error: "User not authenticated",
      });
      return;
    }

    const { email, maxUses = 1 } = req.body;

    const authenticatedSupabase = getAuthenticatedSupabase(req.accessToken);

    // Get user's organization and verify they're an admin
    const { data: orgMember, error: memberError } = await authenticatedSupabase
      .from("org_members")
      .select("org_id, role, orgs(name)")
      .eq("user_id", userId)
      .single();

    if (memberError || !orgMember) {
      res.status(403).json({
        success: false,
        error: "No organization found or access denied",
      });
      return;
    }

    if (orgMember.role !== "admin") {
      res.status(403).json({
        success: false,
        error: "Only organization admins can create invites",
      });
      return;
    }

    // Generate unique invite code
    let inviteCode = generateInviteCode();
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
      const { data: existing } = await authenticatedSupabase
        .from("invite_codes")
        .select("id")
        .eq("code", inviteCode)
        .single();

      if (!existing) {
        isUnique = true;
      } else {
        inviteCode = generateInviteCode();
        attempts++;
      }
    }

    if (!isUnique) {
      res.status(500).json({
        success: false,
        error: "Failed to generate unique invite code",
      });
      return;
    }

    // Create invite code (expires in 24 hours)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const { data: invite, error: inviteError } = await authenticatedSupabase
      .from("invite_codes")
      .insert({
        code: inviteCode,
        org_id: orgMember.org_id,
        invited_by: userId,
        email: email || null,
        max_uses: maxUses,
        expires_at: expiresAt.toISOString(),
      })
      .select("*")
      .single();

    if (inviteError) {
      console.error("Error creating invite:", inviteError);
      res.status(500).json({
        success: false,
        error: "Failed to create invite",
      });
      return;
    }

    res.json({
      success: true,
      data: {
        inviteCode: invite.code,
        orgName: (orgMember.orgs as any)?.name,
        expiresAt: invite.expires_at,
        maxUses: invite.max_uses,
      },
    });
  } catch (error) {
    console.error("Error in createInvite:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

// POST /api/organizations/validate-invite - Validate and get invite info
export const validateInvite = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        error: "Validation error",
        details: errors.array(),
      });
      return;
    }

    const { inviteCode } = req.body;

    // Find invite code
    const { data: invite, error: inviteError } = await supabase
      .from("invite_codes")
      .select(
        `
        *,
        orgs(id, name)
      `
      )
      .eq("code", inviteCode)
      .eq("is_active", true)
      .single();

    if (inviteError || !invite) {
      res.status(404).json({
        success: false,
        error: "Invalid invite code",
      });
      return;
    }

    // Check if invite has expired
    const now = new Date();
    const expiresAt = new Date(invite.expires_at);
    if (now > expiresAt) {
      res.status(400).json({
        success: false,
        error: "Invite code has expired",
      });
      return;
    }

    // Check if invite has reached max uses
    if (invite.current_uses >= invite.max_uses) {
      res.status(400).json({
        success: false,
        error: "Invite code has reached maximum uses",
      });
      return;
    }

    res.json({
      success: true,
      data: {
        orgId: invite.org_id,
        orgName: (invite.orgs as any)?.name,
        expiresAt: invite.expires_at,
        remainingUses: invite.max_uses - invite.current_uses,
      },
    });
  } catch (error) {
    console.error("Error in validateInvite:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

// POST /api/organizations/join-with-invite - Join organization using invite code
export const joinWithInvite = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        error: "Validation error",
        details: errors.array(),
      });
      return;
    }

    const { inviteCode, userId } = req.body;

    // First validate the invite (reuse validation logic)
    const { data: invite, error: inviteError } = await supabase
      .from("invite_codes")
      .select(
        `
        *,
        orgs(id, name)
      `
      )
      .eq("code", inviteCode)
      .eq("is_active", true)
      .single();

    if (inviteError || !invite) {
      res.status(404).json({
        success: false,
        error: "Invalid invite code",
      });
      return;
    }

    // Check if invite has expired
    const now = new Date();
    const expiresAt = new Date(invite.expires_at);
    if (now > expiresAt) {
      res.status(400).json({
        success: false,
        error: "Invite code has expired",
      });
      return;
    }

    // Check if invite has reached max uses
    if (invite.current_uses >= invite.max_uses) {
      res.status(400).json({
        success: false,
        error: "Invite code has reached maximum uses",
      });
      return;
    }

    // Check if invite has a specific email and validate it matches the user's email
    if (invite.email) {
      // Get user's email from auth system
      const { data: userData, error: userError } = await supabase.auth.admin
        .getUserById(userId);

      if (userError || !userData.user) {
        res.status(400).json({
          success: false,
          error: "Unable to verify user information",
        });
        return;
      }

      if (userData.user.email?.toLowerCase() !== invite.email.toLowerCase()) {
        res.status(403).json({
          success: false,
          error: "This invite code is for a different email address",
        });
        return;
      }
    }

    // Check if user is already a member of this organization
    const { data: existingMember } = await supabase
      .from("org_members")
      .select("id")
      .eq("org_id", invite.org_id)
      .eq("user_id", userId)
      .single();

    if (existingMember) {
      res.status(400).json({
        success: false,
        error: "You are already a member of this organization",
      });
      return;
    }

    // Add user to organization
    const { error: memberError } = await supabase.from("org_members").insert({
      org_id: invite.org_id,
      user_id: userId,
      role: "member",
    });

    if (memberError) {
      console.error("Error adding user to organization:", memberError);
      res.status(500).json({
        success: false,
        error: "Failed to join organization",
      });
      return;
    }

    // Increment invite usage count
    await supabase
      .from("invite_codes")
      .update({ current_uses: invite.current_uses + 1 })
      .eq("id", invite.id);

    res.json({
      success: true,
      data: {
        orgId: invite.org_id,
        orgName: (invite.orgs as any)?.name,
        role: "member",
      },
    });
  } catch (error) {
    console.error("Error in joinWithInvite:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

// GET /api/organizations/check-email-domain - Check if email domain has existing organization
export const checkEmailDomain = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { email } = req.query;

    if (!email || typeof email !== "string") {
      res.status(400).json({
        success: false,
        error: "Email parameter is required",
      });
      return;
    }

    const domain = email.split("@")[1];
    if (!domain) {
      res.status(400).json({
        success: false,
        error: "Invalid email format",
      });
      return;
    }

    // Check if domain is associated with any organization
    const { data: orgDomain, error: domainError } = await adminClient
      .from("org_email_domains")
      .select(
        `
        org_id,
        orgs(id, name)
      `
      )
      .eq("domain", domain)
      .single();

    if (domainError) {
      if (domainError.code === "PGRST205") {
        res.json({
          success: true,
          data: {
            hasOrganization: false,
          },
        });
        return;
      }
      if (domainError.code === "PGRST116") {
        res.json({
          success: true,
          data: {
            hasOrganization: false,
          },
        });
        return;
      }
      console.error("Error checking email domain:", domainError);
      res.status(500).json({
        success: false,
        error: "Failed to check email domain",
      });
      return;
    }

    if (!orgDomain) {
      res.json({
        success: true,
        data: {
          hasOrganization: false,
        },
      });
      return;
    }

    res.json({
      success: true,
      data: {
        hasOrganization: true,
        orgId: orgDomain.org_id,
        orgName: (orgDomain.orgs as any)?.name,
      },
    });
  } catch (error) {
    console.error("Error in checkEmailDomain:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

// GET /api/organizations/subscription-status - Check subscription status for user's organization
export const checkSubscriptionStatus = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId || !req.accessToken) {
      res.status(401).json({
        success: false,
        error: "User not authenticated",
      });
      return;
    }

    const authenticatedSupabase = getAuthenticatedSupabase(req.accessToken);

    // Get user's organization
    const { data: orgMember, error: orgError } = await authenticatedSupabase
      .from("org_members")
      .select("org_id, orgs(name)")
      .eq("user_id", userId)
      .single();

    if (orgError || !orgMember) {
      res.json({
        success: true,
        data: {
          hasActiveSubscription: false,
          subscriptionStatus: "no_organization",
          orgId: null,
          requiresSubscription: true,
          trialInfo: null,
        },
      });
      return;
    }

    const orgId = orgMember.org_id;

    // Check for active subscription
    const { data: subscription, error: subError } = await authenticatedSupabase
      .from("subscriptions")
      .select("*")
      .eq("org_id", orgId)
      .eq("status", "active")
      .single();
    console.log("Subscription:", subscription);
    if (subError && subError.code !== "PGRST116") {
      // PGRST116 is "not found" error, which is expected if no subscription exists
      console.error("Error checking subscription:", subError);
    }

    const hasActiveSubscription =
      !!subscription && subscription.status === "active";

    // Check if this is a free subscription (without Stripe integration)
    const isFreeSubscription = subscription && !subscription.stripe_subscription_id;
    
    // Organizations with either paid or free subscriptions should not require subscription setup
    const requiresSubscription = !hasActiveSubscription;

    res.json({
      success: true,
      data: {
        hasActiveSubscription,
        subscriptionStatus: subscription ? subscription.status : "none",
        orgId: orgId,
        orgName: (orgMember.orgs as any)?.name,
        requiresSubscription,
        trialInfo: null, // Can be expanded to include trial information
        isFreeSubscription: isFreeSubscription,
        assetLimit: subscription?.asset_limit || 0,
      },
    });
  } catch (error) {
    console.error("Error in checkSubscriptionStatus:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};
