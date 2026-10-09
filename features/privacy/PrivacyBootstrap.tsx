"use client";

import { useEffect, useRef } from "react";
import {
  createPostHogAnalytics,
  type ConsentBoundAnalytics,
} from "./posthog";
import {
  registerPistlServiceWorker,
  type ServiceWorkerRegistrationResult,
} from "./service-worker-registration";

type PrivacyBootstrapProps = Readonly<{
  analytics?: ConsentBoundAnalytics;
  registerServiceWorker?: () => Promise<ServiceWorkerRegistrationResult>;
}>;

export default function PrivacyBootstrap({
  analytics,
  registerServiceWorker = registerPistlServiceWorker,
}: PrivacyBootstrapProps) {
  const analyticsRef = useRef<ConsentBoundAnalytics | null>(analytics ?? null);

  useEffect(() => {
    const client = analyticsRef.current ?? createPostHogAnalytics();
    analyticsRef.current = client;
    const analyticsEnabled = client.sync();
    let active = true;

    void registerServiceWorker().then((result) => {
      if (active && analyticsEnabled && result === "registered") {
        client.capture("pwa_service_worker_registered", { result });
      }
    });

    return () => {
      active = false;
    };
  }, [registerServiceWorker]);

  return null;
}
