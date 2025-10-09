import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

export async function middleware(req) {
  const token = req.cookies.get("token")?.value;
  const url = req.nextUrl.clone();

  // Redirect unauthenticated users
  if (!token) {
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  try {
    await jwtVerify(token, secret);
    return NextResponse.next(); // ✅ allow request
  } catch (err) {
    console.error("JWT verification failed:", err);
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: ["/dashboard/:path*","/home"],
};
