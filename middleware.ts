import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const session = request.cookies.get("__session"); // Firebase Hosting sometimes uses this, or custom cookie
  // For standard Firebase Client-side auth, we typically handle this in a Higher Order Component (HOC) or Layout
  // but we can check for a 'token' cookie if we set one up.
  
  // Since we are using Firebase Client SDK, we will implement client-side protection in Layout/HOC
  // but for actual production, we'd use Firebase Admin SDK with Server Actions or this middleware.
  
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
