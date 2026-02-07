import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"


const protectedRoutes = [
  "/projects",
  "/projects/*",
  "/dashboard",
  "/project/*"

]

const authMiddleware = auth((req) => {
  const { nextUrl } = req
  const isLoggedIn = !!req.auth
  const hostname = req.headers.get("host") || ""
  const { pathname } = nextUrl

  // Handle Main Domain Redirect (devsarena.in/blogs -> blogs.devsarena.in)
  if (hostname === "devsarena.in" && pathname.startsWith("/blogs")) {
    const newPath = pathname.replace(/^\/blogs/, "") || "/"
    return NextResponse.redirect(new URL(newPath, "https://blogs.devsarena.in"))
  }

  // Check Protected Routes
  const isProtectedRoute = protectedRoutes.some((route) => {
    if (route.endsWith("/*")) {
      const baseRoute = route.slice(0, -2)
      return pathname.startsWith(baseRoute)
    }
    return pathname === route || pathname.startsWith(`${route}/`)
  })
  
  if (isProtectedRoute && !isLoggedIn) {
    const loginUrl = new URL("/login", nextUrl)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Prepare Request Headers (if logged in)
  const requestHeaders = new Headers(req.headers)
  if (isLoggedIn && req.auth?.user?.id) {
    requestHeaders.set("x-user-id", req.auth.user.id)
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
})


export default async function middleware(req: NextRequest) {
  const { nextUrl } = req
  const hostname = req.headers.get("host") || ""
  const { pathname } = nextUrl

  // 1. Handle Blog Subdomain Logic (Bypasses Auth)
  if (hostname === "blogs.devsarena.in") {
    if (pathname === "/") {
      return NextResponse.rewrite(new URL("/blogs", req.url))
    }
    if (!pathname.startsWith("/blogs")) {
      return NextResponse.rewrite(new URL(`/blogs${pathname}`, req.url))
    }
    return NextResponse.next()
  }

  //@ts-ignore
  return authMiddleware(req)
}


export const config = {
  matcher: [

    "/((?!_next/static|_next/image|favicon.ico|logos).*)",
  ],
}