import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { access_token, refresh_token } = body;

    // 1. Forward request to Render backend
    const backendResponse = await fetch(`${API_BASE_URL}/api/auth/confirm-with-access-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ access_token, refresh_token }),
    });

    const data = await backendResponse.json();

    if (!backendResponse.ok || !data.success) {
      return NextResponse.json(
        { success: false, error: data.error || "Confirmation failed" },
        { status: backendResponse.status }
      );
    }

    // 2. Create Next.js response
    const response = NextResponse.json({
      success: true,
      data: data.data,
    });

    // 3. Set cookies from Next.js (Same Domain)
    // We use the tokens returned by backend (or the ones passed in if backend didn't return new ones, 
    // but we modified backend to return them)
    const tokens = data.tokens || { accessToken: access_token, refreshToken: refresh_token };

    if (tokens) {
      const { accessToken, refreshToken } = tokens;

      // Common cookie options
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production", // Secure in production
        sameSite: "lax" as const, // Lax is sufficient for same-site navigation
        path: "/",
      };

      // Set accessToken
      response.cookies.set("accessToken", accessToken, {
        ...cookieOptions,
        maxAge: 60 * 60, // 1 hour
      });

      // Set refreshToken
      response.cookies.set("refreshToken", refreshToken, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60, // 7 days
      });
    }

    return response;
  } catch (error) {
    console.error("Confirm with token route error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
