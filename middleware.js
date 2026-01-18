import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getToken } from "next-auth/jwt"; 

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

export async function middleware(req) {
  // const token = req.cookies.get("token")?.value;
  const url = req.nextUrl.clone();
    const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (token) {
    return NextResponse.next(); // User logged in → allow
  }

  // If not logged in, redirect to /auth/login
  if (!token) {
    url.pathname = "auth/";
    return NextResponse.redirect(new URL(url.pathname, req.url));
  }

  try {
    await jwtVerify(token, secret);
    return NextResponse.next(); // ✅ valid token → allow access
  } catch (err) {
    console.error("JWT verification failed:", err);
    url.pathname = "auth/";
    return NextResponse.redirect(new URL(url.pathname, req.url));
  }
}

export const config = {
  matcher: ["/"], // protects homepage; add more paths if needed
};

