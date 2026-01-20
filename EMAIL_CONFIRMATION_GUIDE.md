# Email Confirmation Implementation Guide

## Overview

Relay already has a complete email confirmation system built-in. When a user signs up, they automatically receive an email confirmation link that they must click to verify their email address.

## How It Works

### Step-by-Step Flow

1. **User Signs Up**

   - User fills out signup form with email and password
   - Frontend calls `/api/auth/signup` endpoint
   - Backend creates user account with Supabase
   - Supabase automatically sends a confirmation email

2. **Confirmation Email Sent**

   - Supabase sends email using the template at `supabase/email-templates/confirm-signup.html`
   - Email contains a link that redirects to `/auth/confirm`
   - The link includes authentication tokens

3. **User Clicks Email Link**

   - User is redirected to `/auth/confirm` page
   - Frontend extracts tokens from URL hash
   - Frontend calls `/api/auth/confirm-with-access-token` with the tokens
   - Backend verifies tokens and sets authentication cookies
   - User is authenticated and redirected to complete organization setup

4. **During Signup Process**
   - If email is not confirmed, user sees EmailConfirmation component
   - Component polls every 10 seconds to check confirmation status
   - When confirmed, automatically moves to organization setup

## Technical Implementation

### Backend (relay-backend/src/controllers/authcontroller.ts)

The signup controller (lines 127-195) handles the initial signup:

```typescript
export const signup: RequestHandler = async (req, res) => {
  // Creates user with Supabase admin client
  const { data, error } = await adminClient.auth.signUp({
    email,
    password,
    options: {
      data: { first_name: firstName, last_name: lastName },
      emailRedirectTo: `${process.env.FRONTEND_URL}/auth/confirm`, // ← Redirection after confirmation
    },
  });

  // Returns whether email confirmation is needed
  res.json({
    success: true,
    data: {
      user: { id: data.user.id, email: data.user.email },
      needsEmailConfirmation: !data.user.email_confirmed_at, // ← Determines if confirmation needed
    },
  });
};
```

**Key points:**

- Supabase automatically sends the confirmation email
- `emailRedirectTo` specifies where to redirect after confirmation
- `needsEmailConfirmation` indicates if the email needs verification

### Frontend Flow

#### 1. Signup Page (`relay/app/auth/signup/page.tsx`)

Handles the multi-step signup process:

```
Account Form → Email Confirmation → Organization Selection → Organization Setup
```

- If `needsEmailConfirmation` is true, shows EmailConfirmation component
- If false, proceeds directly to organization setup

#### 2. Email Confirmation Component (`relay/app/auth/components/email-confirmation.tsx`)

Shows a waiting screen with instructions:

- Tells user to check their email
- Provides "Resend confirmation email" button (60-second cooldown)
- Automatically checks confirmation status every 10 seconds
- Progresses to next step when email is confirmed

#### 3. Confirmation Handler (`relay/app/auth/confirm/page.tsx`)

Handles the redirect from the email link:

- Parses authentication tokens from URL hash
- Calls backend to authenticate user
- Sets cookies for authentication
- Redirects to organization setup if needed, otherwise to dashboard

### API Endpoints

#### Signup (`POST /api/auth/signup`)

- Creates user account
- Sends confirmation email automatically
- Returns `needsEmailConfirmation` status

#### Resend Confirmation (`POST /api/auth/resend-confirmation`)

- Resends the confirmation email
- Rate-limited by Supabase

#### Check Confirmation Status (`GET /api/auth/check-email-confirmation/:userId`)

- Checks if user's email is confirmed
- Returns `emailConfirmed` boolean

#### Confirm with Access Token (`POST /api/auth/confirm-with-access-token`)

- Verifies tokens from email link
- Sets authentication cookies
- Returns user data and organization status

## Email Template

Located at: `supabase/email-templates/confirm-signup.html`

This is the HTML template used for confirmation emails. Customize it as needed.

## Configuration

### Environment Variables

Make sure these are set in your `.env` file:

```env
# Backend needs to know where to redirect after confirmation
FRONTEND_URL=http://localhost:3000  # or your production URL

# Supabase configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Supabase Email Settings

1. Go to Supabase Dashboard → Authentication → Email Templates
2. Configure the "Confirm signup" template
3. Set up your SMTP settings (or use Supabase's default email service)

### Important Supabase Settings

In your Supabase project settings:

1. **Authentication → Email Auth**
   - Enable "Confirm email" toggle (usually enabled by default)
   - Set "Enable email confirmations" to ON
2. **Authentication → URL Configuration**
   - Set "Site URL" to your frontend URL
   - Add redirect URLs for email confirmations

## User Experience

### What Users See:

1. **Signup Form** - Basic registration details
2. **Email Confirmation Screen** - "Check your email" with instructions
3. **Auto-advancement** - Automatically moves to next step when email is confirmed
4. **Organization Setup** - Complete organization creation

### Features:

- ✅ Automatic email sending on signup
- ✅ Resend confirmation button (60s cooldown)
- ✅ Automatic status checking (every 10 seconds)
- ✅ Seamless flow to organization setup
- ✅ Beautiful UI with loading states
- ✅ Error handling and retry mechanisms

## Troubleshooting

### Emails Not Sending

1. Check Supabase email configuration
2. Verify SMTP settings if using custom email
3. Check spam folder
4. Verify FRONTEND_URL environment variable

### Confirmation Link Not Working

1. Ensure `/auth/confirm` route exists
2. Check that tokens are being passed correctly
3. Verify CORS settings in Supabase
4. Check browser console for errors

### User Stuck on Confirmation Screen

1. Check network requests to `/api/auth/check-email-confirmation`
2. Verify user ID is correct
3. Check Supabase logs for errors
4. Use resend confirmation button

## Summary

**Email confirmation is already fully implemented!** When users sign up:

1. They automatically receive a confirmation email
2. They're shown a waiting screen with instructions
3. They click the link in their email
4. They're redirected back to complete setup
5. The system automatically detects confirmation and advances the flow

The system polls for confirmation status every 10 seconds, so users don't need to manually refresh - it detects when they've confirmed their email and automatically proceeds.
