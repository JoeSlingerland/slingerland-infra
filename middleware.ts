// import { updateSession } from "@/lib/supabase/middleware"
// import type { NextRequest } from "next/server"

// export async function middleware(request: NextRequest) {
//   if (request.nextUrl.pathname.startsWith("/auth/")) {
//     return
//   }

//   return await updateSession(request)
// }

// export const config = {
//   matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
// }

// Middleware temporarily disabled for debugging
export function middleware() {
  return
}

export const config = {
  matcher: [],
}
