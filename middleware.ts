import { withAuth } from "next-auth/middleware";

export default withAuth({
  callbacks: {
    authorized: ({ token, req }) => {
      const path = req.nextUrl.pathname;
      if (path.startsWith("/admin")) return token?.role === "ADMIN";
      return Boolean(token);
    },
  },
});

export const config = {
  matcher: ["/dashboard/:path*", "/products/:path*", "/opportunities/:path*", "/reports/:path*", "/admin/:path*"],
};
