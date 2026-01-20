import { Router, RequestHandler } from 'express';
import sgMail from '@sendgrid/mail';
import { optionalAuthMiddleware, AuthRequest } from '../middleware/auth';
import { adminClient } from '../utils/supabase';

const router = Router();

interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  timestamp: string;
}

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

// Controller function for support contact
const submitContactForm = async (req: AuthRequest, res: any) => {
  try {
    const { name, email, subject, message, priority, timestamp }: ContactFormData = req.body;
    
    // Get user and organization metadata if authenticated
    let userMetadata = null;
    let organizationMetadata = null;
    
    if (req.user) {
      userMetadata = {
        id: req.user.id,
        email: req.user.email,
        full_name: req.user.full_name,
        created_at: req.user.created_at,
        last_sign_in: req.user.updated_at
      };
      
      // Fetch organization information
      try {
        const { data: orgMember, error: orgError } = await adminClient
          .from("org_members")
          .select("org_id, role, orgs(id, name, created_at)")
          .eq("user_id", req.user.id)
          .single();
          
        if (!orgError && orgMember) {
          organizationMetadata = {
            org_id: orgMember.org_id,
            org_name: (orgMember.orgs as any)?.name,
            org_created_at: (orgMember.orgs as any)?.created_at,
            user_role: orgMember.role
          };
        }
      } catch (error) {
        console.warn('Could not fetch organization data:', error);
      }
    }

    // Validate required fields
    if (!name || !email || !subject || !message) {
      res.status(400).json({
        error: 'Missing required fields: name, email, subject, and message are required'
      });
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({
        error: 'Invalid email format'
      });
      return;
    }

    // Generate unique ticket ID
    const ticketId = `TICKET-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Prepare email content for support team
    const supportEmailBody = `
New Support Request

Contact Information:
Name: ${name}
Email: ${email}
Priority: ${priority.toUpperCase()}
Ticket ID: ${ticketId}
Submitted: ${timestamp}

${userMetadata ? `
User Account Information:
User ID: ${userMetadata.id}
Account Email: ${userMetadata.email}
Full Name: ${userMetadata.full_name || 'Not provided'}
Account Created: ${userMetadata.created_at}
Last Sign In: ${userMetadata.last_sign_in || 'Unknown'}
` : 'User Status: Not authenticated (Guest user)'}

${organizationMetadata ? `
Organization Information:
Organization ID: ${organizationMetadata.org_id}
Organization Name: ${organizationMetadata.org_name}
Organization Created: ${organizationMetadata.org_created_at}
User Role in Organization: ${organizationMetadata.user_role}
` : (userMetadata ? 'Organization: No organization membership found' : '')}

Request Details:
Subject: ${subject}

Message:
${message}

System Information:
User Agent: ${req.headers['user-agent'] || 'Not available'}
IP Address: ${req.ip || req.connection.remoteAddress || 'Unknown'}
Request Time: ${new Date().toISOString()}

---
This email was automatically generated from the support contact form.
Reply directly to this email to respond to the customer.
    `;

    // Prepare confirmation email for customer
    const customerEmailBody = `
Hi ${name},

Thank you for contacting our support team. We have received your request and will get back to you as soon as possible.

Your Request Details:
Ticket ID: ${ticketId}
Subject: ${subject}
Priority: ${priority}
Submitted: ${timestamp}

Our typical response times:
- High Priority: Within 2-4 hours
- Medium Priority: Within 24 hours
- Low Priority: Within 48 hours

If you need to add more information to this request, please reply to this email and include your ticket ID (${ticketId}) in the subject line.

Best regards,
Support Team
    `;

    // Send emails using SendGrid
    try {
      // Send email to support team
      await sgMail.send({
        from: {
          email: process.env.SUPPORT_FROM_EMAIL || 'support@yourcompany.com',
          name: 'Support System'
        },
        to: {
          email: process.env.SUPPORT_EMAIL || 'support@yourcompany.com',
          name: 'Support Team'
        },
        replyTo: {
          email: email,
          name: name
        },
        subject: subject + " - " + priority,
        text: supportEmailBody,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333; border-bottom: 2px solid #000; padding-bottom: 10px;">
              New Support Request
            </h2>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #666; margin-top: 0;">Contact Information</h3>
              <p><strong>Name:</strong> ${name}</p>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Priority:</strong> <span style="color: ${priority === 'high' ? '#dc3545' : priority === 'medium' ? '#ffc107' : '#28a745'}; font-weight: bold; text-transform: uppercase;">${priority}</span></p>
              <p><strong>Ticket ID:</strong> ${ticketId}</p>
              <p><strong>Submitted:</strong> ${timestamp}</p>
            </div>
            
            ${userMetadata ? `
            <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #1976d2; margin-top: 0;">User Account Information</h3>
              <p><strong>User ID:</strong> ${userMetadata.id}</p>
              <p><strong>Account Email:</strong> ${userMetadata.email}</p>
              <p><strong>Full Name:</strong> ${userMetadata.full_name || 'Not provided'}</p>
              <p><strong>Account Created:</strong> ${userMetadata.created_at}</p>
              <p><strong>Last Sign In:</strong> ${userMetadata.last_sign_in || 'Unknown'}</p>
            </div>
            ` : `
            <div style="background-color: #fff3e0; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #f57c00; margin-top: 0;">User Status</h3>
              <p style="color: #e65100;"><strong>Not authenticated (Guest user)</strong></p>
            </div>
            `}
            
            ${organizationMetadata ? `
            <div style="background-color: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #388e3c; margin-top: 0;">Organization Information</h3>
              <p><strong>Organization ID:</strong> ${organizationMetadata.org_id}</p>
              <p><strong>Organization Name:</strong> ${organizationMetadata.org_name}</p>
              <p><strong>Organization Created:</strong> ${organizationMetadata.org_created_at}</p>
              <p><strong>User Role:</strong> ${organizationMetadata.user_role}</p>
            </div>
            ` : (userMetadata ? `
            <div style="background-color: #fce4ec; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #c2185b; margin-top: 0;">Organization</h3>
              <p style="color: #ad1457;">No organization membership found</p>
            </div>
            ` : '')}
            
            <div style="background-color: #f3e5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #7b1fa2; margin-top: 0;">System Information</h3>
              <p><strong>User Agent:</strong> ${req.headers['user-agent'] || 'Not available'}</p>
              <p><strong>IP Address:</strong> ${req.ip || req.connection.remoteAddress || 'Unknown'}</p>
              <p><strong>Request Time:</strong> ${new Date().toISOString()}</p>
            </div>
            
            <div style="margin: 20px 0;">
              <h3 style="color: #666;">Subject</h3>
              <p style="background-color: #e9ecef; padding: 15px; border-radius: 4px; border-left: 4px solid #000;">
                ${subject}
              </p>
            </div>
            
            <div style="margin: 20px 0;">
              <h3 style="color: #666;">Message</h3>
              <div style="background-color: #ffffff; border: 1px solid #dee2e6; padding: 20px; border-radius: 4px; white-space: pre-wrap;">
${message}
              </div>
            </div>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; color: #6c757d; font-size: 12px;">
              <p>This email was automatically generated from the support contact form.</p>
              <p>Reply directly to this email to respond to the customer.</p>
            </div>
          </div>
        `
      });

      // Send confirmation email to customer
      await sgMail.send({
        from: {
          email: process.env.SUPPORT_FROM_EMAIL || 'support@yourcompany.com',
          name: 'Support Team'
        },
        to: {
          email: email,
          name: name
        },
        subject: `Support Request Received - ${ticketId}`,
        text: customerEmailBody,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333; border-bottom: 2px solid #000; padding-bottom: 10px;">
              Support Request Received
            </h2>
            
            <p>Hi ${name},</p>
            
            <p>Thank you for contacting our support team. We have received your request and will get back to you as soon as possible.</p>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #666; margin-top: 0;">Your Request Details</h3>
              <p><strong>Ticket ID:</strong> ${ticketId}</p>
              <p><strong>Subject:</strong> ${subject}</p>
              <p><strong>Priority:</strong> ${priority}</p>
              <p><strong>Submitted:</strong> ${timestamp}</p>
            </div>
            
            <p>Our typical response times:</p>
            <ul>
              <li><strong>High Priority:</strong> Within 2-4 hours</li>
              <li><strong>Medium Priority:</strong> Within 24 hours</li>
              <li><strong>Low Priority:</strong> Within 48 hours</li>
            </ul>
            
            <p>If you need to add more information to this request, please reply to this email and include your ticket ID (${ticketId}) in the subject line.</p>
            
            <p>Best regards,<br>Support Team</p>
          </div>
        `
      });

    } catch (emailError) {
      console.error('Error sending emails:', emailError);
      // Still log the request even if email fails
      console.log(`Support request submitted but email failed: ${ticketId}`, {
        name,
        email,
        subject,
        priority,
        timestamp,
        ticketId,
        emailError: emailError instanceof Error ? emailError.message : String(emailError)
      });
      
      res.status(500).json({
        error: 'Support request received but email notification failed. We will still process your request manually.'
      });
      return;
    }

    // Log the support request with metadata
    console.log(`Support request submitted: ${ticketId}`, {
      ticketId,
      contactInfo: { name, email, subject, priority, timestamp },
      userMetadata,
      organizationMetadata,
      systemInfo: {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip || req.connection.remoteAddress,
        requestTime: new Date().toISOString()
      }
    });

    res.status(200).json({
      success: true,
      message: 'Support request submitted successfully',
      ticketId,
      timestamp
    });

  } catch (error) {
    console.error('Error processing support request:', error);
    res.status(500).json({
      error: 'Failed to submit support request. Please try again later.'
    });
  }
};

// POST /api/support/contact - Submit support contact form (with optional authentication)
router.post('/contact', optionalAuthMiddleware, submitContactForm);

export default router; 