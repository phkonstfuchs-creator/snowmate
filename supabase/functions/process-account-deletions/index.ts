import { createClient } from "npm:@supabase/supabase-js@2.110.8";

import {
  type ClaimedAccountDeletionJob,
  type ClaimedAnalyticsErasureJob,
  type DatabaseDeletionStatus,
  deleteBrevoContact,
  DeletionProviderError,
  type DeletionStepStatus,
  processAccountDeletionJob,
  processAnalyticsErasureJob,
  queuePosthogErasure,
  secretsMatch,
} from "../_shared/account-deletion-worker.ts";

const jsonHeaders = {
  "cache-control": "private, no-store",
  "content-type": "application/json; charset=utf-8",
};

const providerTimeoutMs = 10_000;

function fetchWithTimeout(
  input: string | URL | Request,
  init: RequestInit = {},
): Promise<Response> {
  const timeoutSignal = AbortSignal.timeout(providerTimeoutMs);
  const signal = init.signal
    ? AbortSignal.any([init.signal, timeoutSignal])
    : timeoutSignal;

  return fetch(input, { ...init, signal });
}

function jsonResponse(
  status: number,
  body: Record<string, unknown>,
  extraHeaders: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...jsonHeaders, ...extraHeaders },
  });
}

function requiredEnvironment(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) {
    throw new DeletionProviderError(`${name.toLowerCase()}_missing`);
  }
  return value;
}

function optionalEnvironment(name: string): string | undefined {
  const value = Deno.env.get(name)?.trim();
  return value || undefined;
}

function secretSupabaseKey(): string {
  const currentKeys = optionalEnvironment("SUPABASE_SECRET_KEYS");
  if (currentKeys) {
    try {
      const parsed = JSON.parse(currentKeys) as Record<string, unknown>;
      if (typeof parsed.default === "string" && parsed.default.length > 0) {
        return parsed.default;
      }
    } catch {
      throw new DeletionProviderError("supabase_secret_keys_invalid");
    }
  }

  return requiredEnvironment("SUPABASE_SERVICE_ROLE_KEY");
}

function isStepStatus(value: unknown): value is DeletionStepStatus {
  return ["pending", "skipped", "completed", "failed"].includes(
    String(value),
  );
}

function isDatabaseStatus(value: unknown): value is DatabaseDeletionStatus {
  return ["pending", "completed", "failed"].includes(String(value));
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function parseClaimedJob(value: unknown): ClaimedAccountDeletionJob {
  if (!value || typeof value !== "object") {
    throw new DeletionProviderError("deletion_job_invalid");
  }

  const row = value as Record<string, unknown>;
  if (
    typeof row.id !== "string" ||
    typeof row.lease_token !== "string" ||
    row.lease_token.length === 0 ||
    typeof row.hard_deadline_at !== "string" ||
    !Number.isFinite(Date.parse(row.hard_deadline_at)) ||
    !isStepStatus(row.storage_status) ||
    !isDatabaseStatus(row.database_status) ||
    !isStepStatus(row.brevo_status) ||
    !isStepStatus(row.posthog_status)
  ) {
    throw new DeletionProviderError("deletion_job_invalid");
  }

  return {
    id: row.id,
    leaseToken: row.lease_token,
    userId: nullableString(row.user_id),
    email: nullableString(row.email),
    avatarPath: nullableString(row.avatar_path),
    analyticsId: nullableString(row.analytics_id),
    hardDeadlineAt: row.hard_deadline_at,
    storageStatus: row.storage_status,
    databaseStatus: row.database_status,
    brevoStatus: row.brevo_status,
    posthogStatus: row.posthog_status,
  };
}

function parseClaimedAnalyticsJob(value: unknown): ClaimedAnalyticsErasureJob {
  if (!value || typeof value !== "object") {
    throw new DeletionProviderError("analytics_erasure_job_invalid");
  }

  const row = value as Record<string, unknown>;
  if (
    typeof row.id !== "string" ||
    typeof row.lease_token !== "string" ||
    row.lease_token.length === 0 ||
    typeof row.analytics_id !== "string" ||
    row.analytics_id.length === 0
  ) {
    throw new DeletionProviderError("analytics_erasure_job_invalid");
  }

  return {
    id: row.id,
    leaseToken: row.lease_token,
    analyticsId: row.analytics_id,
  };
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return jsonResponse(405, { error: "method_not_allowed" });
  }

  const workerSecret = optionalEnvironment("ACCOUNT_DELETION_WORKER_SECRET");
  const authorized = await secretsMatch(
    request.headers.get("x-snowmate-worker-secret"),
    workerSecret,
  );
  if (!authorized) {
    return jsonResponse(401, { error: "unauthorized" });
  }

  try {
    const supabaseUrl = requiredEnvironment("SUPABASE_URL");
    const admin = createClient(supabaseUrl, secretSupabaseKey(), {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { fetch: fetchWithTimeout },
    });
    const avatarBucket = optionalEnvironment("AVATAR_BUCKET") ?? "avatars";
    const brevoApiKey = optionalEnvironment("BREVO_API_KEY");
    const posthogApiKey = optionalEnvironment("POSTHOG_PERSONAL_API_KEY");
    const posthogProjectId = optionalEnvironment("POSTHOG_PROJECT_ID");
    const deletePosthogPerson = async (analyticsId: string) => {
      if (!posthogApiKey || !posthogProjectId) {
        throw new DeletionProviderError("posthog_not_configured");
      }
      await queuePosthogErasure(
        {
          apiKey: posthogApiKey,
          baseUrl: optionalEnvironment("POSTHOG_API_HOST") ??
            "https://eu.posthog.com",
          projectId: posthogProjectId,
        },
        analyticsId,
      );
    };

    const { data, error } = await admin.rpc("claim_account_deletion_jobs", {
      p_limit: 1,
    });
    if (error) {
      throw new DeletionProviderError("deletion_claim_failed");
    }

    const claimedRows: unknown[] = Array.isArray(data) ? data : [];
    let completed = 0;
    let failed = 0;

    for (const claimedRow of claimedRows) {
      const job = parseClaimedJob(claimedRow);
      const result = await processAccountDeletionJob(job, {
        deleteAvatar: async (path) => {
          const { error: storageError } = await admin.storage
            .from(avatarBucket)
            .remove([path]);
          if (storageError) {
            throw new DeletionProviderError("storage_delete_failed");
          }
        },
        deleteAuthUser: async (userId) => {
          const { error: authError } = await admin.auth.admin.deleteUser(
            userId,
            false,
          );
          if (
            authError &&
            authError.status !== 404 &&
            authError.code !== "user_not_found"
          ) {
            throw new DeletionProviderError("auth_delete_failed");
          }
        },
        deleteBrevoContact: async (email) => {
          if (!brevoApiKey) {
            throw new DeletionProviderError("brevo_not_configured");
          }
          await deleteBrevoContact(
            { apiKey: brevoApiKey, baseUrl: "https://api.brevo.com" },
            email,
          );
        },
        deletePosthogPerson,
      });

      const { error: completionError } = await admin.rpc(
        "complete_account_deletion_job",
        {
          p_job_id: result.jobId,
          p_lease_token: job.leaseToken,
          p_storage_status: result.storageStatus,
          p_database_status: result.databaseStatus,
          p_brevo_status: result.brevoStatus,
          p_posthog_status: result.posthogStatus,
          p_error_code: result.errorCode,
        },
      );
      if (completionError) {
        throw new DeletionProviderError("deletion_completion_failed");
      }

      if (result.errorCode === null) {
        completed += 1;
      } else {
        failed += 1;
      }
    }

    const { data: analyticsData, error: analyticsClaimError } = await admin.rpc(
      "claim_analytics_erasure_jobs",
      { p_limit: 1 },
    );
    if (analyticsClaimError) {
      throw new DeletionProviderError("analytics_erasure_claim_failed");
    }

    const analyticsRows: unknown[] = Array.isArray(analyticsData)
      ? analyticsData
      : [];
    for (const analyticsRow of analyticsRows) {
      const analyticsJob = parseClaimedAnalyticsJob(analyticsRow);
      const result = await processAnalyticsErasureJob(
        analyticsJob,
        deletePosthogPerson,
      );
      const { error: completionError } = await admin.rpc(
        "complete_analytics_erasure_job",
        {
          p_job_id: result.jobId,
          p_lease_token: analyticsJob.leaseToken,
          p_status: result.status,
          p_error_code: result.errorCode,
        },
      );
      if (completionError) {
        throw new DeletionProviderError("analytics_erasure_completion_failed");
      }

      if (result.errorCode === null) {
        completed += 1;
      } else {
        failed += 1;
      }
    }

    const claimed = claimedRows.length + analyticsRows.length;

    return jsonResponse(
      200,
      {
        claimed,
        completed,
        failed,
      },
      {
        "x-snowmate-claimed-jobs": String(claimed),
        "x-snowmate-completed-jobs": String(completed),
        "x-snowmate-failed-jobs": String(failed),
      },
    );
  } catch {
    return jsonResponse(500, { error: "worker_failed" });
  }
});
