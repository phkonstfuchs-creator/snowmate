type ServiceWorkerRegistrar = Readonly<{
  register(
    scriptURL: string,
    options: { scope: string; updateViaCache: ServiceWorkerUpdateViaCache },
  ): Promise<unknown>;
}>;

type ServiceWorkerRuntime = Readonly<{
  isSecureContext: boolean;
  serviceWorker: ServiceWorkerRegistrar | null;
}>;

export type ServiceWorkerRegistrationResult =
  | "failed"
  | "insecure"
  | "registered"
  | "unsupported";

function browserRuntime(): ServiceWorkerRuntime {
  return {
    isSecureContext:
      typeof window !== "undefined" && window.isSecureContext === true,
    serviceWorker:
      typeof navigator !== "undefined" && "serviceWorker" in navigator
        ? navigator.serviceWorker
        : null,
  };
}

export async function registerPistlServiceWorker(
  runtime: ServiceWorkerRuntime = browserRuntime(),
): Promise<ServiceWorkerRegistrationResult> {
  if (!runtime.isSecureContext) {
    return "insecure";
  }
  if (!runtime.serviceWorker) {
    return "unsupported";
  }

  try {
    await runtime.serviceWorker.register("/sw.js", {
      scope: "/",
      updateViaCache: "none",
    });
    return "registered";
  } catch {
    return "failed";
  }
}
