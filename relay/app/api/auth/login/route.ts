import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    // 1. Forward login request to Render backend
    const backendResponse = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await backendResponse.json();

    if (!backendResponse.ok || !data.success) {
      return NextResponse.json(
        { success: false, error: data.error || "Login failed" },
        { status: backendResponse.status }
      );
    }

    // 2. Create Next.js response
    const response = NextResponse.json({
      success: true,
      data: data.data,
    });

    // 3. Set cookies from Next.js (Same Domain)
    if (data.tokens) {
      const { accessToken, refreshToken } = data.tokens;

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
    console.error("Login route error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
