import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export const proxy = auth((req) => {
  const isAdminRoute = req.nextUrl.pathname.startsWith("/admin/");
  const isLoggedIn = !!req.auth;

  if (isAdminRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL("/admin", req.url));
  }
});

export const config = {
  matcher: ["/admin/:path+"],
};
