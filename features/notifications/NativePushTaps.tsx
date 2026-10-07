"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { onNativePushTap } from "./native-push";

/* In the iPhone app, tapping a push notice opens its page. Renders nothing. */
export default function NativePushTaps() {
  const router = useRouter();
  useEffect(() => onNativePushTap((path) => router.push(path)), [router]);
  return null;
}
