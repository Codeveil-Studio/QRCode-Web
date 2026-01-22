import { Request, Response } from "express";
import { body, validationResult } from "express-validator";
import { AuthRequest, optionalAuthMiddleware } from "../middleware/auth";
import {
  supabase,
  getAuthenticatedSupabase,
  adminClient,
} from "../utils/supabase";
import { Issue, ApiResponse } from "../types";
import { sendIssueNotification } from "./notificationsController";
import {
  sendNotification,
  formatIssueReporterConfirmation,
  formatIssueReporterSubject,
} from "../utils/notifications";

// Validation rules for issue creation/update
export const validateIssue = [
  body("asset_id")
    .optional()
    .isUUID()
    .withMessage("Asset ID must be a valid UUID"),
  body("description")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage(
      "Description is required and must be between 1-1000 characters"
    ),
  body("issue_type").optional().isString().trim().isLength({ max: 100 }),
  body("urgency").optional().isIn(["low", "medium", "high"]),
  body("status").optional().isIn(["open", "in_progress", "resolved"]),
  body("reported_by").optional().isString().trim().isLength({ max: 100 }),
  body("contact_info").optional().isString().trim().isLength({ max: 200 }),
  body("internal_notes").optional().isString().trim().isLength({ max: 1000 }),
  body("is_critical").optional().isBoolean(),
  body("tags").optional().isArray(),
  body("metadata").optional().isObject(),
];

// Validation rules for issue reporting (public endpoint)
export const validateIssueReport = [
  body("assetUid").isUUID().withMessage("Asset UID must be a valid UUID"),
  body("issueType").optional({ nullable: true }).isString().trim().isLength({ min: 0, max: 100 }),
  body("urgency").optional().isIn(["low", "medium", "high"]),
  body("description")
    .optional({ nullable: true })
    .isString()
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage("Description must be between 1-1000 characters if provided"),
  body("reporterName")
    .optional({ nullable: true })
    .isString()
    .trim()
    .isLength({ max: 100 }),
  body("reporterEmail")
    .optional({ nullable: true })
    .isEmail()
    .withMessage("Valid email required"),
  body("isCritical").optional({ nullable: true }).isBoolean(),
  body("imagePath").optional({ nullable: true }).isString().trim(),
];

// Validation rules for issue confirmation/opt-in (public endpoint)
export const validateIssueConfirmation = [
  body("reporter_name")
    .optional({ nullable: true })
    .isString()
    .isLength({ max: 255 })
    .withMessage("Reporter name must be a string with max 255 characters"),
  body("reporter_email")
    .optional({ nullable: true })
    .isEmail()
    .isLength({ max: 255 })
    .withMessage(
      "Reporter email must be a valid email with max 255 characters"
    ),
  body("message")
    .optional({ nullable: true })
    .isString()
    .isLength({ max: 1000 })
    .withMessage("Message must be a string with max 1000 characters"),
  body("metadata")
    .optional()
    .isObject()
    .withMessage("Metadata must be an object"),
];

// Validation rules for updating issue confirmation (public endpoint)
export const validateIssueConfirmationUpdate = [
  body("reporter_name")
    .optional({ nullable: true })
    .isString()
    .isLength({ max: 255 })
    .withMessage("Reporter name must be a string with max 255 characters"),
  body("reporter_email")
    .optional({ nullable: true })
    .isEmail()
    .isLength({ max: 255 })
    .withMessage(
      "Reporter email must be a valid email with max 255 characters"
    ),
  body("message")
    .optional({ nullable: true })
    .isString()
    .isLength({ max: 1000 })
    .withMessage("Message must be a string with max 1000 characters"),
  body("metadata")
    .optional()
    .isObject()
    .withMessage("Metadata must be an object"),
];

// GET /api/issues - Get all issues for authenticated user
export const getAllIssues = async (
  req: AuthRequest,
  res: Response<ApiResponse<Issue[]>>
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const accessToken = req.accessToken;

    if (!userId || !accessToken) {
      res.status(401).json({
        success: false,
        error: "User not authenticated",
      });
      return;
    }

    const authenticatedSupabase = getAuthenticatedSupabase(accessToken);

    // First, get the user's organization
    const { data: orgMember, error: orgError } = await authenticatedSupabase
      .from("org_members")
      .select("org_id")
      .eq("user_id", userId)
      .single();

    if (orgError || !orgMember?.org_id) {
      // Fallback to user-level issues if no organization
      const { data: issues, error } = await authenticatedSupabase
        .from("issues")
        .select(
          `
          *,
          assets!issues_asset_id_fkey(
            user_id,
            name,
            location,
            uid,
            asset_types(name)
          )
        `
        )
        .eq("assets.user_id", userId)
        .order("reported_at", { ascending: false });

      if (error) {
        console.error("Error fetching user issues:", error);
        res.status(500).json({
          success: false,
          error: "Failed to fetch issues",
        });
        return;
      }

      // Generate image URLs for issues with image_path
      const issuesWithImageUrls = await Promise.all(
        issues?.map(async (issue) => {
          if (issue.image_path) {
            const { data: imageData, error: urlError } =
              await supabase.storage
                .from("issue-attachments")
                .createSignedUrl(issue.image_path, 3600);

            if (urlError) {
              console.error("Error generating signed URL:", urlError);
              return issue;
            }

            return {
              ...issue,
              image_url: imageData.signedUrl,
            };
          }
          return issue;
        }) || []
      );

      res.json({
        success: true,
        data: issuesWithImageUrls,
      });
      return;
    }

    const orgId = orgMember.org_id;

    // Get all users in the organization
    const { data: orgUsers, error: usersError } = await authenticatedSupabase
      .from("org_members")
      .select("user_id")
      .eq("org_id", orgId);

    if (usersError) {
      console.error("Error fetching organization users:", usersError);
      res.status(500).json({
        success: false,
        error: "Failed to fetch organization users",
      });
      return;
    }

    const userIds = orgUsers?.map((user) => user.user_id) || [];

    if (userIds.length === 0) {
      res.json({
        success: true,
        data: [],
      });
      return;
    }

    // Query all issues for assets owned by users in the organization
    const { data: issues, error } = await authenticatedSupabase
      .from("issues")
      .select(
        `
        *,
        assets!issues_asset_id_fkey(
          user_id,
          name,
          location,
          uid,
          asset_types(name)
        )
      `
      )
      .in("assets.user_id", userIds)
      .order("reported_at", { ascending: false });

    if (error) {
      console.error("Error fetching organization issues:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch issues",
      });
      return;
    }

    // Generate image URLs for issues with image_path
    const issuesWithImageUrls = await Promise.all(
      issues?.map(async (issue) => {
        if (issue.image_path) {
          const { data: imageData, error: urlError } =
            await supabase.storage
              .from("issue-attachments")
              .createSignedUrl(issue.image_path, 3600); // URL expires in 1 hour (3600 seconds)

          if (urlError) {
            console.error("Error generating signed URL:", urlError);
            return issue;
          }

          return {
            ...issue,
            image_url: imageData.signedUrl,
          };
        }
        return issue;
      }) || []
    );

    res.json({
      success: true,
      data: issuesWithImageUrls,
    });
  } catch (error) {
    console.error("Error in getAllIssues:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

// GET /api/issues/:id - Get specific issue by ID
export const getIssueById = async (
  req: AuthRequest,
  res: Response<ApiResponse<Issue>>
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const accessToken = req.accessToken;
    const { id } = req.params;

    if (!userId || !accessToken) {
      res.status(401).json({
        success: false,
        error: "User not authenticated",
      });
      return;
    }

    const authenticatedSupabase = getAuthenticatedSupabase(accessToken);

    // First, get the user's organization
    const { data: orgMember, error: orgError } = await authenticatedSupabase
      .from("org_members")
      .select("org_id")
      .eq("user_id", userId)
      .single();

    if (orgError || !orgMember?.org_id) {
      // Fallback to user-level access if no organization
      const { data: issue, error } = await authenticatedSupabase
        .from("issues")
        .select(
          `
          *,
          assets!issues_asset_id_fkey(
            user_id,
            name,
            location,
            uid,
            asset_types(name)
          )
        `
        )
        .eq("id", id)
        .eq("assets.user_id", userId)
        .single();

      if (error) {
        console.error("Error fetching user issue:", error);
        res.status(404).json({
          success: false,
          error: "Issue not found",
        });
        return;
      }

      if (issue.image_path) {
        const { data: imageData, error: urlError } = await supabase.storage
          .from("issue-attachments")
          .createSignedUrl(issue.image_path, 3600);

        if (!urlError && imageData) {
          (issue as any).image_url = imageData.signedUrl;
        }
      }

      res.json({
        success: true,
        data: issue,
      });
      return;
    }

    const orgId = orgMember.org_id;

    // Get all users in the organization
    const { data: orgUsers, error: usersError } = await authenticatedSupabase
      .from("org_members")
      .select("user_id")
      .eq("org_id", orgId);

    if (usersError) {
      console.error("Error fetching organization users:", usersError);
      res.status(500).json({
        success: false,
        error: "Failed to fetch organization users",
      });
      return;
    }

    const userIds = orgUsers?.map((user) => user.user_id) || [];

    // Get issue if its asset belongs to any user in the organization
    const { data: issue, error } = await authenticatedSupabase
      .from("issues")
      .select(
        `
        *,
        assets!issues_asset_id_fkey(
          user_id,
          name,
          location,
          uid,
          asset_types(name)
        )
      `
      )
      .eq("id", id)
      .in("assets.user_id", userIds)
      .single();

    if (error) {
      console.error("Error fetching organization issue:", error);
      res.status(404).json({
        success: false,
        error: "Issue not found",
      });
      return;
    }

    if (issue.image_path) {
      const { data: imageData, error: urlError } = await supabase.storage
        .from("issue-attachments")
        .createSignedUrl(issue.image_path, 3600);

      if (!urlError && imageData) {
        (issue as any).image_url = imageData.signedUrl;
      }
    }

    res.json({
      success: true,
      data: issue,
    });
  } catch (error) {
    console.error("Error in getIssueById:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

// POST /api/issues - Create new issue (authenticated)
export const createIssue = async (
  req: AuthRequest,
  res: Response<ApiResponse<Issue>>
): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        error: "Validation failed",
        data: errors.array() as any,
      });
      return;
    }

    const userId = req.user?.id;
    const accessToken = req.accessToken;

    if (!userId || !accessToken) {
      res.status(401).json({
        success: false,
        error: "User not authenticated",
      });
      return;
    }

    const authenticatedSupabase = getAuthenticatedSupabase(accessToken);

    const {
      asset_id,
      description,
      issue_type,
      urgency,
      status,
      reported_by,
      contact_info,
      internal_notes,
      is_critical,
      tags,
      metadata,
    } = req.body;

    const { data: issue, error } = await authenticatedSupabase
      .from("issues")
      .insert([
        {
          asset_id: asset_id || null,
          description: description?.trim() || null,
          issue_type: issue_type || null,
          urgency: urgency || "medium",
          status: status || "open",
          reported_by: reported_by?.trim() || null,
          contact_info: contact_info?.trim() || null,
          internal_notes: internal_notes?.trim() || null,
          is_critical: is_critical || false,
          tags: tags || null,
          metadata: metadata || null,
        },
      ])
      .select(
        `
        *,
        assets!issues_asset_id_fkey(
          name,
          location,
          uid,
          asset_types(name)
        )
      `
      )
      .single();

    if (error) {
      console.error("Error creating issue:", error);
      res.status(500).json({
        success: false,
        error: "Failed to create issue",
      });
      return;
    }

    // Send notification for the new issue (don't fail if notification fails)
    try {
      // Get user's organization
      const { data: orgMember } = await authenticatedSupabase
        .from("org_members")
        .select("org_id")
        .eq("user_id", userId)
        .single();

      if (orgMember?.org_id && issue?.assets?.name) {
        // Get authenticated user's contact details from auth.users
        const { data: userData, error: userError } =
          await adminClient.auth.admin.getUserById(userId);

        let userEmail = "";
        let userPhone = "";

        if (!userError && userData?.user) {
          userEmail = userData.user.email || "";
          userPhone = userData.user.phone || "";
        }

        await sendIssueNotification(
          orgMember.org_id,
          issue.assets.name,
          issue.description || "No description provided",
          issue.uid,
          issue.is_critical || false,
          userEmail,
          userPhone
        );
      }
    } catch (notificationError: any) {
      console.error("Error sending issue notification:", notificationError);
      // Don't fail the request if notification fails
    }

    res.status(201).json({
      success: true,
      data: issue,
      message: "Issue created successfully",
    });
  } catch (error) {
    console.error("Error in createIssue:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

// PUT /api/issues/:id - Update issue
export const updateIssue = async (
  req: AuthRequest,
  res: Response<ApiResponse<Issue>>
): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        error: "Validation failed",
        data: errors.array() as any,
      });
      return;
    }

    const userId = req.user?.id;
    const accessToken = req.accessToken;
    const { id } = req.params;

    if (!userId || !accessToken) {
      res.status(401).json({
        success: false,
        error: "User not authenticated",
      });
      return;
    }

    const authenticatedSupabase = getAuthenticatedSupabase(accessToken);

    const {
      description,
      issue_type,
      urgency,
      status,
      reported_by,
      contact_info,
      internal_notes,
      is_critical,
      tags,
      metadata,
    } = req.body;

    const { data: existingIssue } = await authenticatedSupabase
      .from("issues")
      .select("*, assets!issues_asset_id_fkey(user_id)")
      .eq("id", id)
      .single();

    if (!existingIssue) {
      res.status(404).json({
        success: false,
        error: "Issue not found",
      });
      return;
    }

    const updateData: any = {};
    if (description !== undefined)
      updateData.description = description?.trim() || null;
    if (issue_type !== undefined) updateData.issue_type = issue_type;
    if (urgency !== undefined) updateData.urgency = urgency;
    if (status !== undefined) updateData.status = status;
    if (reported_by !== undefined)
      updateData.reported_by = reported_by?.trim() || null;
    if (contact_info !== undefined)
      updateData.contact_info = contact_info?.trim() || null;
    if (internal_notes !== undefined)
      updateData.internal_notes = internal_notes?.trim() || null;
    if (is_critical !== undefined) updateData.is_critical = is_critical;
    if (tags !== undefined) updateData.tags = tags;
    if (metadata !== undefined) updateData.metadata = metadata;
    if (status == "resolved") updateData.resolved_at = new Date().toISOString();

    const { data: issue, error } = await authenticatedSupabase
      .from("issues")
      .update(updateData)
      .eq("id", id)
      .select(
        `
        *,
        assets!issues_asset_id_fkey(
          name,
          location,
          uid,
          asset_types(name)
        )
      `
      )
      .single();

    if (error) {
      console.error("Error updating issue:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update issue",
      });
      return;
    }

    res.json({
      success: true,
      data: issue,
      message: "Issue updated successfully",
    });
  } catch (error) {
    console.error("Error in updateIssue:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

// DELETE /api/issues/:id - Delete issue
export const deleteIssue = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const accessToken = req.accessToken;
    const { id } = req.params;

    if (!userId || !accessToken) {
      res.status(401).json({
        success: false,
        error: "User not authenticated",
      });
      return;
    }

    const authenticatedSupabase = getAuthenticatedSupabase(accessToken);

    // First verify the issue belongs to the user
    const { data: existingIssue } = await authenticatedSupabase
      .from("issues")
      .select("*, assets!issues_asset_id_fkey(user_id)")
      .eq("id", id)
      .eq("assets.user_id", userId)
      .single();

    if (!existingIssue) {
      res.status(404).json({
        success: false,
        error: "Issue not found",
      });
      return;
    }

    const { error } = await authenticatedSupabase
      .from("issues")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting issue:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete issue",
      });
      return;
    }

    res.json({
      success: true,
      message: "Issue deleted successfully",
    });
  } catch (error) {
    console.error("Error in deleteIssue:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

// POST /api/issues/report - Report a new issue (public endpoint)
export const reportIssue = async (
  req: Request,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    console.log(errors);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        error: "Validation failed",
        data: errors.array() as any,
      });
      return;
    }

    const {
      assetUid,
      issueType,
      urgency,
      description,
      reporterName,
      reporterEmail,
      isCritical,
      imagePath,
      metadata,
    } = req.body;

    // Validate required fields - need assetUid
    if (!assetUid) {
      res.status(400).json({
        success: false,
        error: "Missing required fields (need assetUid)",
      });
      return;
    }

    // Check if asset exists
    const { data: assetExists, error: assetError } = await supabase
      .from("assets")
      .select("id")
      .eq("uid", assetUid)
      .single();

    if (assetError || !assetExists) {
      res.status(404).json({
        success: false,
        error: "Asset not found",
      });
      return;
    }

    // Prepare contact info
    const contactInfo = [reporterName, reporterEmail]
      .filter(Boolean)
      .join(" - ");

    // Merge provided metadata with source info
    const enhancedMetadata = {
      ...(metadata || {}),
      reporter_email: reporterEmail?.trim() || null,
      source: "qr_scan",
      submitted_at: new Date().toISOString(),
    };

    // Map urgency to valid values (database constraint only allows low, medium, high)
    let mappedUrgency = urgency || "medium";
    if (urgency === "critical") {
      mappedUrgency = "high"; // Map critical to high since DB doesn't support critical
    }

    // Determine if issue is critical (use is_critical flag for critical urgency)
    const isIssueCritical = isCritical || urgency === "critical";

    // Create issue report using existing issues table
    const { data, error } = await supabase
      .from("issues")
      .insert([
        {
          asset_id: assetUid, // This references assets.uid due to foreign key constraint
          description: description?.trim() || null,
          issue_type: issueType || null,
          urgency: mappedUrgency,
          reported_by: reporterName?.trim() || null,
          contact_info: contactInfo || null,
          is_critical: isIssueCritical,
          status: "open",
          image_path: imagePath || null,
          metadata: enhancedMetadata,
        },
      ])
      .select("uid");

    if (error) {
      console.error("Error creating issue report:", error);
      res.status(500).json({
        success: false,
        error: "Failed to create issue report",
      });
      return;
    }

    // Send notification for the reported issue (don't fail if notification fails)
    try {
      // Get asset owner information
      const { data: asset } = await adminClient
        .from("assets")
        .select("user_id, name")
        .eq("uid", assetUid)
        .single();

      if (asset?.user_id) {
        // Get asset owner's organization
        const { data: orgMember } = await adminClient
          .from("org_members")
          .select("org_id")
          .eq("user_id", asset.user_id)
          .single();

        if (orgMember?.org_id && data?.[0]) {
          // Get asset owner's contact details from auth.users
          const { data: userData, error: userError } =
            await adminClient.auth.admin.getUserById(asset.user_id);

          let ownerEmail = "";
          let ownerPhone = "";

          if (!userError && userData?.user) {
            ownerEmail = userData.user.email || "";
            ownerPhone = userData.user.phone || "";
          }

          await sendIssueNotification(
            orgMember.org_id,
            asset.name || "Unknown Asset",
            description || "Issue reported via QR code",
            data[0].uid,
            isIssueCritical,
            ownerEmail,
            ownerPhone
          );

          // Send confirmation email to issue reporter if enabled and email provided
          if (reporterEmail && orgMember?.org_id) {
            try {
              // Check if organization has enabled issue reporter notifications
              const { data: orgPrefs } = await adminClient
                .from("organization_notification_preferences")
                .select("notify_issue_reporter")
                .eq("org_id", orgMember.org_id)
                .single();

              const shouldNotifyReporter =
                orgPrefs?.notify_issue_reporter || false;

              if (shouldNotifyReporter) {
                const confirmationMessage = formatIssueReporterConfirmation(
                  asset.name || "Unknown Asset",
                  description || "Issue reported via QR code",
                  data[0].uid,
                  reporterName
                );

                const confirmationSubject = formatIssueReporterSubject(
                  asset.name || "Unknown Asset"
                );

                await sendNotification({
                  orgId: orgMember.org_id,
                  type: "email",
                  messageType: "system",
                  recipient: reporterEmail,
                  subject: confirmationSubject,
                  message: confirmationMessage,
                });

                console.log(
                  `Confirmation email sent to issue reporter: ${reporterEmail}`
                );
              }
            } catch (confirmationError: any) {
              console.error(
                "Error sending confirmation email to issue reporter:",
                confirmationError
              );
              // Don't fail the request if confirmation email fails
            }
          }
        }
      }
    } catch (notificationError: any) {
      console.error(
        "Error sending issue notification for reported issue:",
        notificationError
      );
      // Don't fail the request if notification fails
    }

    res.json({
      success: true,
      message: isIssueCritical
        ? "Critical issue reported successfully!"
        : "Issue reported successfully!",
    });
  } catch (error) {
    console.error("Error in report-issue API:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

// GET /api/issues/asset/:assetUid - Get issues for a specific asset
export const getAssetIssues = async (
  req: AuthRequest,
  res: Response<ApiResponse<Issue[]>>
): Promise<void> => {
  try {
    const { assetUid } = req.params;
    const userId = req.user?.id;
    const accessToken = req.accessToken;

    if (!userId || !accessToken) {
      res.status(401).json({
        success: false,
        error: "User not authenticated",
      });
      return;
    }

    if (!assetUid) {
      res.status(400).json({
        success: false,
        error: "Asset UID is required",
      });
      return;
    }

    const authenticatedSupabase = getAuthenticatedSupabase(accessToken);

    // First, get the user's organization
    const { data: orgMember, error: orgError } = await authenticatedSupabase
      .from("org_members")
      .select("org_id")
      .eq("user_id", userId)
      .single();

    if (orgError || !orgMember?.org_id) {
      // Fallback to user-level access if no organization
      const { data: issues, error } = await authenticatedSupabase
        .from("issues")
        .select(
          `
          *,
          assets!issues_asset_id_fkey(
            user_id,
            name,
            location,
            uid
          )
        `
        )
        .eq("asset_id", assetUid) // asset_id in issues table references assets.uid
        .eq("assets.user_id", userId)
        .order("reported_at", { ascending: false });

      if (error) {
        console.error("Error fetching user asset issues:", error);
        res.status(500).json({
          success: false,
          error: "Failed to fetch asset issues",
        });
        return;
      }

      res.json({
        success: true,
        data: issues || [],
      });
      return;
    }

    const orgId = orgMember.org_id;

    // Get all users in the organization
    const { data: orgUsers, error: usersError } = await authenticatedSupabase
      .from("org_members")
      .select("user_id")
      .eq("org_id", orgId);

    if (usersError) {
      console.error("Error fetching organization users:", usersError);
      res.status(500).json({
        success: false,
        error: "Failed to fetch organization users",
      });
      return;
    }

    const userIds = orgUsers?.map((user) => user.user_id) || [];

    // Query issues for the specific asset if it belongs to any user in the organization
    const { data: issues, error } = await authenticatedSupabase
      .from("issues")
      .select(
        `
        *,
        assets!issues_asset_id_fkey(
          user_id,
          name,
          location,
          uid
        )
      `
      )
      .eq("asset_id", assetUid) // asset_id in issues table references assets.uid
      .in("assets.user_id", userIds)
      .order("reported_at", { ascending: false });

    if (error) {
      console.error("Error fetching organization asset issues:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch asset issues",
      });
      return;
    }

    res.json({
      success: true,
      data: issues || [],
    });
  } catch (error) {
    console.error("Error in get asset issues:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

// GET /api/issues/asset/:assetUid/public - Get issues for a specific asset (public endpoint for report page)
export const getAssetIssuesPublic = async (
  req: Request,
  res: Response<ApiResponse<{ openIssues: Issue[]; resolvedIssues: Issue[] }>>
): Promise<void> => {
  try {
    const { assetUid } = req.params;

    if (!assetUid) {
      res.status(400).json({
        success: false,
        error: "Asset UID is required",
      });
      return;
    }

    // Check if asset exists
    const { data: asset, error: assetError } = await supabase
      .from("assets")
      .select("id")
      .eq("uid", assetUid)
      .single();

    if (assetError || !asset) {
      res.status(404).json({
        success: false,
        error: "Asset not found",
      });
      return;
    }

    // Use the public supabase instance (no authentication required)
    // RLS policies should be set up to allow anonymous access to necessary data

    // Get open issues with confirmation counts
    const { data: openIssues, error: openError } = await supabase
      .from("issues")
      .select(
        `
        id,
        uid,
        
        description,
        status,
        reported_at,
        resolved_at,
        urgency,
        issue_type,
        is_critical,
        confirmation_count,
        assets!issues_asset_id_fkey(
          name,
          location,
          uid
        )
      `
      )
      .eq("asset_id", assetUid) // asset_id in issues table references assets.uid
      .in("status", ["open", "in_progress"])
      .order("reported_at", { ascending: false });

    if (openError) {
      console.error("Error fetching open issues:", openError);
      res.status(500).json({
        success: false,
        error: "Failed to fetch open issues",
      });
      return;
    }

    // Get last 2 resolved issues with confirmation counts
    const { data: resolvedIssues, error: resolvedError } = await supabase
      .from("issues")
      .select(
        `
        id,
        uid,
        asset_id,
        description,
        status,
        reported_at,
        resolved_at,
        urgency,
        issue_type,
        is_critical,
        confirmation_count,
        assets!issues_asset_id_fkey(
          name,
          location,
          uid
        )
      `
      )
      .eq("asset_id", assetUid) // asset_id in issues table references assets.uid
      .eq("status", "resolved")
      .order("resolved_at", { ascending: false })
      .limit(2);

    if (resolvedError) {
      console.error("Error fetching resolved issues:", resolvedError);
      res.status(500).json({
        success: false,
        error: "Failed to fetch resolved issues",
      });
      return;
    }

    res.json({
      success: true,
      data: {
        openIssues:
          openIssues?.map((issue) => ({
            ...issue,
            asset_id: issue.assets?.[0]?.uid || null,
          })) || [],
        resolvedIssues:
          resolvedIssues?.map((issue) => ({
            ...issue,
            asset_id: issue.assets?.[0]?.uid || null,
          })) || [],
      },
    });
  } catch (error) {
    console.error("Error in getAssetIssuesPublic:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

// POST /api/issues/:uid/opt-in - Confirm/opt-in to an existing issue (public endpoint)
export const confirmIssue = async (
  req: Request,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    // Check for validation errors
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        error: "Validation failed",
        data: errors.array() as any,
      });
      return;
    }

    const { uid } = req.params;
    const { reporter_name, reporter_email, message, metadata } = req.body;

    // Validate issue exists and is open
    const { data: existingIssue, error: issueError } = await supabase
      .from("issues")
      .select("id, status")
      .eq("uid", uid)
      .single();

    if (issueError || !existingIssue) {
      res.status(404).json({
        success: false,
        error: "Issue not found",
      });
      return;
    }

    if (existingIssue.status === "resolved") {
      res.status(400).json({
        success: false,
        error: "Cannot confirm a resolved issue",
      });
      return;
    }

    // Prepare contact info
    const contactInfo = [reporter_name, reporter_email]
      .filter(Boolean)
      .join(" - ");

    // Merge provided metadata with source info
    const enhancedMetadata = {
      ...(metadata || {}),
      reporter_email: reporter_email?.trim() || null,
      source: "qr_scan_confirmation",
      submitted_at: new Date().toISOString(),
    };

    // Create issue confirmation
    const { data, error } = await supabase
      .from("issue_confirmations")
      .insert([
        {
          issue_id: existingIssue.id,
          reporter_name: reporter_name?.trim() || null,
          reporter_email: reporter_email?.trim() || null,
          contact_info: contactInfo || null,
          message: message?.trim() || null,
          metadata: enhancedMetadata,
        },
      ])
      .select("uid");

    if (error) {
      console.error("Error creating issue confirmation:", error);
      res.status(500).json({
        success: false,
        error: "Failed to confirm issue",
      });
      return;
    }

    const confirmationUid = data?.[0]?.uid;

    res.json({
      success: true,
      message: "Issue confirmation recorded successfully!",
      data: {
        confirmation_uid: confirmationUid,
      },
    });
  } catch (error) {
    console.error("Error in confirm-issue API:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

// PUT /api/confirmations/:uid - Update an existing issue confirmation (public endpoint)
export const updateIssueConfirmation = async (
  req: Request,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    // Check for validation errors
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        error: "Validation failed",
        data: errors.array() as any,
      });
      return;
    }

    const { uid } = req.params;
    const { reporter_name, reporter_email, message, metadata } = req.body;

    // Validate confirmation exists
    const { data: existingConfirmation, error: confirmationError } =
      await supabase
        .from("issue_confirmations")
        .select("id, issue_id, metadata")
        .eq("uid", uid)
        .single();

    if (confirmationError || !existingConfirmation) {
      res.status(404).json({
        success: false,
        error: "Confirmation not found",
      });
      return;
    }

    // Prepare contact info
    const contactInfo = [reporter_name, reporter_email]
      .filter(Boolean)
      .join(" - ");

    // Merge provided metadata with existing metadata and source info
    const enhancedMetadata = {
      ...(existingConfirmation.metadata || {}),
      ...(metadata || {}),
      reporter_email: reporter_email?.trim() || null,
      updated_at: new Date().toISOString(),
    };

    // Update the confirmation
    const { error: updateError } = await supabase
      .from("issue_confirmations")
      .update({
        reporter_name: reporter_name?.trim() || null,
        reporter_email: reporter_email?.trim() || null,
        contact_info: contactInfo || null,
        message: message?.trim() || null,
        metadata: enhancedMetadata,
      })
      .eq("uid", uid);

    if (updateError) {
      console.error("Error updating issue confirmation:", updateError);
      res.status(500).json({
        success: false,
        error: "Failed to update confirmation",
      });
      return;
    }

    res.json({
      success: true,
      message: "Issue confirmation updated successfully!",
    });
  } catch (error) {
    console.error("Error in update confirmation API:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

// POST /api/issues/upload-image - Upload image for issue reporting (public endpoint)
export const uploadIssueImage = async (
  req: Request,
  res: Response<ApiResponse<{ path: string }>>
): Promise<void> => {
  try {
    const file = req.file;
    const assetId = req.body.assetId;

    if (!file) {
      res.status(400).json({
        success: false,
        error: "No file uploaded",
      });
      return;
    }

    if (!assetId) {
      res.status(400).json({
        success: false,
        error: "Asset ID required",
      });
      return;
    }

    // Check if asset exists
    const { data: assetExists, error: assetError } = await supabase
      .from("assets")
      .select("id")
      .eq("uid", assetId)
      .single();

    if (assetError || !assetExists) {
      res.status(404).json({
        success: false,
        error: "Asset not found",
      });
      return;
    }

    // Validate file type (already done by multer, but double-check)
    if (!file.mimetype.startsWith("image/")) {
      res.status(400).json({
        success: false,
        error: "File must be an image",
      });
      return;
    }

    // Validate file size (max 10MB, already enforced by multer)
    if (file.size > 10 * 1024 * 1024) {
      res.status(400).json({
        success: false,
        error: "File size must be less than 10MB",
      });
      return;
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileExt = file.originalname.split(".").pop() || "jpg";
    const filename = `${assetId}-${timestamp}.${fileExt}`;
    const filePath = `issue-images/${filename}`;

    // Ensure bucket exists
    const { error: getBucketError } = await supabase.storage.getBucket(
      "issue-attachments"
    );

    if (getBucketError) {
      console.log(
        "Bucket 'issue-attachments' not found or error, attempting to create..."
      );
      const { error: createBucketError } = await supabase.storage.createBucket(
        "issue-attachments",
        {
          public: true,
          fileSizeLimit: 10485760, // 10MB
          allowedMimeTypes: [
            "image/png",
            "image/jpeg",
            "image/jpg",
            "image/gif",
            "image/webp",
          ],
        }
      );

      if (createBucketError) {
        console.error(
          "Failed to create bucket 'issue-attachments':",
          createBucketError
        );
        // Continue to try upload, in case it was a false negative on getBucket
      } else {
        console.log("Bucket 'issue-attachments' created successfully.");
      }
    }

    // Upload to Supabase storage (public anonymous uploads allowed)
    const { data, error } = await supabase.storage
      .from("issue-attachments")
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) {
      console.error("Supabase storage error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to upload image to storage",
      });
      return;
    }

    // Return the path for the frontend to use in issue reporting
    res.json({
      success: true,
      data: { path: filePath },
      message: "Image uploaded successfully",
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    res.status(500).json({
      success: false,
      error: "Failed to upload file",
    });
  }
};
