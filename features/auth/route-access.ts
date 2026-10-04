const protectedRouteRoots = [
  "/feed",
  "/profile",
  "/map",
  "/crew",
  "/carpool",
  "/events",
  "/people",
  "/reset-password",
  "/login/verify",
] as const;

const signedOutOnlyRoutes = new Set(["/login", "/signup", "/signup/verify", "/forgot-password"]);

const MFA_ROUTE = "/login/verify";

function isRouteWithin(pathname: string, routeRoot: string): boolean {
  return pathname === routeRoot || pathname.startsWith(`${routeRoot}/`);
}

export function isProtectedRoute(pathname: string): boolean {
  return protectedRouteRoots.some((routeRoot) => isRouteWithin(pathname, routeRoot));
}

/* needsSecondFactor: signed in with the password, but the account has
   2FA and the session has not passed it yet. Such a session reaches
   only the code screen. The database enforces the same rule. */
export function getAuthRedirect(
  pathname: string,
  isAuthenticated: boolean,
  needsSecondFactor = false,
): string | null {
  if (!isAuthenticated) {
    return isProtectedRoute(pathname) ? "/login" : null;
  }

  if (needsSecondFactor) {
    if (pathname === MFA_ROUTE) return null;
    if (isProtectedRoute(pathname) || signedOutOnlyRoutes.has(pathname)) return MFA_ROUTE;
    return null;
  }

  if (pathname === MFA_ROUTE || signedOutOnlyRoutes.has(pathname)) {
    return "/feed";
  }

  return null;
}
