import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

async function proxyRequest(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const pathString = path.join("/");
  
  // Construct target URL
  // Assumes API_BASE_URL is like "https://backend.com" (no trailing slash)
  const targetUrl = `${API_BASE_URL}/api/${pathString}`;
  
  // Get access token from cookies
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("accessToken")?.value;

  // Prepare headers
  const headers = new Headers(req.headers);
  headers.delete("host");
  headers.delete("connection");
  // Remove accept-encoding to prevent backend from compressing response
  // This avoids ERR_CONTENT_DECODING_FAILED where we decode but forward the header
  headers.delete("accept-encoding");
  
  // Explicitly set Cookie header from Next.js cookies to ensure they are passed to backend
  // This is crucial for refreshToken and other cookie-based logic
  const cookieHeader = cookieStore.getAll().map(c => `${c.name}=${c.value}`).join('; ');
  if (cookieHeader) {
    headers.set('Cookie', cookieHeader);
  }

  // Add Authorization header as fallback/supplement
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  // Prepare body
  let body: BodyInit | null = null;
  if (req.method !== "GET" && req.method !== "HEAD") {
    const contentType = req.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      body = JSON.stringify(await req.json());
    } else {
      // For other content types, might need to handle streams or text
      // For now, simple JSON support is primary requirement
      try {
         body = await req.text();
      } catch (e) {
         body = null;
      }
    }
  }
  
  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: headers,
      body: body,
      // essential to not follow redirects automatically if backend redirects
      redirect: "manual", 
    });

    const responseData = await response.blob();
    
    // Clean up response headers
    const responseHeaders = new Headers(response.headers);
    responseHeaders.delete("content-encoding");
    responseHeaders.delete("content-length");
    responseHeaders.delete("transfer-encoding");
    
    // Also remove connection and keep-alive headers as they are hop-by-hop
    responseHeaders.delete("connection");
    responseHeaders.delete("keep-alive");

    // Remove Set-Cookie to prevent backend from confusing frontend auth
    // (Auth is handled by the login route BFF)
    responseHeaders.delete("set-cookie");

    return new NextResponse(responseData, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error(`Proxy error for ${pathString}:`, error);
    return NextResponse.json(
      { success: false, error: "Proxy request failed" },
      { status: 500 }
    );
  }
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const DELETE = proxyRequest;
export const PATCH = proxyRequest;
