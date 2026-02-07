import { NextResponse } from "next/server"
import { auth } from "@/auth"

const protectedRoutes = [
  "/projects",
  "/projects/*",
  "/dashboard",
  "/project/*"

]

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const { pathname } = req.nextUrl
  const url = req.nextUrl;
  const hostname = req.headers.get('host');

  //? Blogs check and redirect
if (hostname === 'blogs.devsarena.in') {
    if (url.pathname === '/') {
      url.pathname = '/blogs';
      return NextResponse.rewrite(url);
    }
    if (!url.pathname.startsWith('/blogs')) {
      url.pathname = `/blogs${url.pathname}`;
      return NextResponse.rewrite(url);
    }
  }

  if (hostname === 'devsarena.in' && url.pathname.startsWith('/blogs')) {
    const newPath = url.pathname.replace(/^\/blogs/, '') || '/';
    return NextResponse.redirect(new URL(newPath, 'https://blogs.devsarena.in'));
  }

  
  const isProtectedRoute = protectedRoutes.some((route) => {
    if (route.endsWith("/*")) {
      const baseRoute = route.slice(0, -2)
      return pathname.startsWith(baseRoute)
    }
    return pathname === route || pathname.startsWith(`${route}/`)
  })
  console.log("DEBUG REQ AUTH AND IS LOGGED In ", req.auth, isLoggedIn)
  if (isProtectedRoute && !isLoggedIn) {
    const loginUrl = new URL("/login", req.nextUrl)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (isLoggedIn && req.auth?.user?.id) {
    const newHeaders = new Headers(req.headers)

    newHeaders.set("x-user-id", req.auth.user.id)

    // Return the response with the new modified headers
    return NextResponse.next({
      request: {
        headers: newHeaders,
      },
    })
  }

  // Default return if no specific action needed
  return NextResponse.next()
})

export const config = {
  matcher: [

    "/((?!_next/static|_next/image|favicon.ico|logos).*)",
  ],
}