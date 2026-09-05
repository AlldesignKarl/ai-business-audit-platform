import { withAuth } from "next-auth/middleware";

/**
 * Protege todas las rutas del dashboard y de negocio con sesión válida.
 * La autorización fina por rol/organización se aplica además a nivel de
 * Server Component / Route Handler vía requireRole/assertSameOrganization.
 */
export default withAuth({
  pages: { signIn: "/login" },
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/businesses/:path*",
    "/clients/:path*",
    "/settings/:path*",
    "/approvals/:path*",
    "/system-health/:path*",
    "/discovery/:path*",
    "/ai-agents/:path*",
  ],
};
