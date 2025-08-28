import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { pageRoutes, protectedRoutes, publicRoutes } from "./utils/routes";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const token = req.cookies.get("next-auth.session-token")?.value;

  let userData = null;

  // Verify token if available
  if (token && process.env.NEXTAUTH_SECRET) {
    try {
      const { payload } = await jwtVerify(
        token,
        new TextEncoder().encode(process.env.NEXTAUTH_SECRET)
      );
      userData = payload;
    } catch (error) {
      console.error("Token verification failed:", error);
    }
  }

  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );
  const isPublicRoute = publicRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // 1. Handle No Token
  if (!token) {
    // Allow public routes without a token
    if (isPublicRoute) {
      return NextResponse.next();
    }
    // Redirect to login for protected routes
    if (isProtectedRoute) {
      return NextResponse.redirect(new URL(pageRoutes.login, req.url));
    }
    return NextResponse.next();
  }

  // 2. Handle Token but Profile Incomplete
  if (
    token &&
    userData &&
    "isProfileComplete" in userData &&
    userData.isProfileComplete === false
  ) {
    console.error("Profile incomplete", userData);
    // Allow access to profile setup
    if (pathname === pageRoutes.profileSetup) {
      return NextResponse.next();
    }
    // Redirect all other routes (protected/public) to profile setup
    if (pathname !== pageRoutes.profileSetup) {
      return NextResponse.redirect(new URL(pageRoutes.profileSetup, req.url));
    }
  }

  // 3. Handle Token and Profile Complete
  console.log(
    token,
    userData?.isProfileComplete,
    "pathname",
    pathname,
    "isPublic",
    isPublicRoute
  );
  if (token && userData?.isProfileComplete) {
    // Redirect away from profile setup
    if (pathname === pageRoutes.profileSetup) {
      return NextResponse.redirect(new URL(pageRoutes.profile, req.url));
    }
    // Allow protected routes
    if (isProtectedRoute) {
      return NextResponse.next();
    }
    // Redirect public routes to profile
    // Private useres should also be able to access public routes.
    //if (isPublicRoute) {
    //  return NextResponse.redirect(new URL(pageRoutes.landing, req.url));
    //}
  }

  // if (!token && pathname !== pageRoutes.customLogin) {
  //   return NextResponse.redirect(new URL(pageRoutes.customLogin, req.url));
  // }
  // Default: Allow other requests
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
