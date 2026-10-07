import type { DispatchIdentity } from "./dispatch-identity";

interface DispatchDependencies {
  authenticate: (token: string) => Promise<DispatchIdentity | null>;
  dispatch: (identity: DispatchIdentity) => Promise<void>;
}

export function createDispatchHandler({ authenticate, dispatch }: DispatchDependencies) {
  return async (request: Request): Promise<Response> => {
    if (request.method !== "POST") return new Response(null, { status: 405 });
    const authorization = request.headers.get("authorization");
    if (!authorization || authorization.length > 8192 || !/^Bearer [A-Za-z0-9_.-]+$/.test(authorization)) {
      return new Response(null, { status: 401 });
    }
    try {
      const identity = await authenticate(authorization.slice(7));
      if (!identity) return new Response(null, { status: 401 });
      await dispatch(identity);
      return new Response(null, { status: 204 });
    } catch {
      return new Response(null, { status: 503 });
    }
  };
}
