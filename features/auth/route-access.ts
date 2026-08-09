const protectedRouteRoots = [
  "/feed",
  "/profile",
  "/map",
  "/crew",
  "/carpool",
  "/events",
  "/people",
] as const;

const signedOutOnlyRoutes = new Set(["/login", "/signup"]);

function isRouteWithin(pathname: string, routeRoot: string): boolean {
  return pathname === routeRoot || pathname.startsWith(`${routeRoot}/`);
}

export function getAuthRedirect(
  pathname: string,
  isAuthenticated: boolean,
): string | null {
  if (isAuthenticated && signedOutOnlyRoutes.has(pathname)) {
    return "/feed";
  }

  if (
    !isAuthenticated &&
    protectedRouteRoots.some((routeRoot) =>
      isRouteWithin(pathname, routeRoot),
    )
  ) {
    return "/login";
  }

  return null;
}
