// // export { default } from "next-auth/middleware";
// import { withAuth } from "next-auth/middleware";
// import { NextResponse } from "next/server";

// const allowedOrigins = ["http://localhost:3000"];
// export default withAuth(
//   function middleware(request) {
//     const origin = request.headers.get("origin");
//     const { pathname } = request.nextUrl;
//     // if (request.nextUrl.pathname.startsWith("/dashboard/power-bi")) {
//     //   return NextResponse.rewrite(new URL(pathname, request.url));
//     // }
//     // if (request.nextUrl.pathname.startsWith("/api/v1")) {
//     //   return NextResponse.rewrite(new URL(pathname, request.url));
//     // }
//   },
//   {
//     callbacks: {
//       authorized({ token }) {
//         return token;
//       },
//     },
//   }
// );
// export const config = {
//   matcher: [
//     "/",
//     "/dashboard/power-bi",
//     "/dashboard/grants/:path*",
//     "/dashboard/roles/:path*",
//     // "/dashboard/schools/:path*",
//     // "/dashboard/teachers/:path*",
//     "/dashboard/users/:path*",
//     // "/dashboard/live-enrollment/:path*",
//     "/dashboard/cms/:path*",
//   ],
// };
