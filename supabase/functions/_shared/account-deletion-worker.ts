export type DeletionStepStatus =
  | "pending"
  | "skipped"
  | "completed"
  | "failed";

export type DatabaseDeletionStatus = "pending" | "completed" | "failed";

export interface ClaimedAccountDeletionJob {
  id: string;
  leaseToken: string;
  userId: string | null;
  email: string | null;
  avatarPath: string | null;
  analyticsId: string | null;
  hardDeadlineAt: string;
  storageStatus: DeletionStepStatus;
  databaseStatus: DatabaseDeletionStatus;
  brevoStatus: DeletionStepStatus;
  posthogStatus: DeletionStepStatus;
}

export interface AccountDeletionCompletion {
  jobId: string;
  storageStatus: DeletionStepStatus;
  databaseStatus: DatabaseDeletionStatus;
  brevoStatus: DeletionStepStatus;
  posthogStatus: DeletionStepStatus;
  errorCode: string | null;
}

export interface ClaimedAnalyticsErasureJob {
  id: string;
  leaseToken: string;
  analyticsId: string;
}

export interface AnalyticsErasureCompletion {
  jobId: string;
  status: "completed" | "failed";
  errorCode: string | null;
}

export interface DeletionProviders {
  deleteAvatar(path: string): Promise<void>;
  deleteAuthUser(userId: string): Promise<void>;
  deleteBrevoContact(email: string): Promise<void>;
  deletePosthogPerson(analyticsId: string): Promise<void>;
}

interface BrevoDeletionConfig {
  apiKey: string;
  baseUrl: string;
  timeoutMs?: number;
}

interface PosthogDeletionConfig {
  apiKey: string;
  baseUrl: string;
  projectId: string;
  timeoutMs?: number;
}

type ProcessAccountDeletionOptions = Readonly<{
  now?: () => Date;
}>;

type Fetcher = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

const terminalStatuses = new Set<DeletionStepStatus>([
  "completed",
  "skipped",
]);

const safeCodePattern = /^[a-z0-9_:-]{1,100}$/;

export class DeletionProviderError extends Error {
  readonly code: string;

  constructor(code: string) {
    super("account deletion provider failed");
    this.name = "DeletionProviderError";
    this.code = safeCodePattern.test(code) ? code : "provider_delete_failed";
  }
}

function providerErrorCode(error: unknown, fallback: string): string {
  if (error instanceof DeletionProviderError) {
    return error.code;
  }

  return fallback;
}

async function runOptionalStep(
  currentStatus: DeletionStepStatus,
  identifier: string | null,
  action: (identifier: string) => Promise<void>,
  fallbackCode: string,
): Promise<{ status: DeletionStepStatus; errorCode: string | null }> {
  if (terminalStatuses.has(currentStatus)) {
    return { status: currentStatus, errorCode: null };
  }
  if (identifier === null) {
    return { status: "skipped", errorCode: null };
  }

  try {
    await action(identifier);
    return { status: "completed", errorCode: null };
  } catch (error) {
    return {
      status: "failed",
      errorCode: providerErrorCode(error, fallbackCode),
    };
  }
}

export async function processAccountDeletionJob(
  job: ClaimedAccountDeletionJob,
  providers: DeletionProviders,
  options: ProcessAccountDeletionOptions = {},
): Promise<AccountDeletionCompletion> {
  const [storage, brevo, posthog] = await Promise.all([
    runOptionalStep(
      job.storageStatus,
      job.avatarPath,
      providers.deleteAvatar,
      "storage_delete_failed",
    ),
    runOptionalStep(
      job.brevoStatus,
      job.email,
      providers.deleteBrevoContact,
      "brevo_delete_failed",
    ),
    runOptionalStep(
      job.posthogStatus,
      job.analyticsId,
      providers.deletePosthogPerson,
      "posthog_delete_failed",
    ),
  ]);

  let databaseStatus = job.databaseStatus;
  let databaseErrorCode: string | null = null;
  const hardDeadline = Date.parse(job.hardDeadlineAt);
  const deadlineReached = Number.isFinite(hardDeadline) &&
    (options.now ?? (() => new Date()))().getTime() >= hardDeadline;

  if (databaseStatus !== "completed" && job.userId === null) {
    databaseStatus = "completed";
  } else if (
    databaseStatus !== "completed" &&
    (terminalStatuses.has(storage.status) || deadlineReached) &&
    job.userId !== null
  ) {
    try {
      await providers.deleteAuthUser(job.userId);
      databaseStatus = "completed";
    } catch (error) {
      databaseStatus = "failed";
      databaseErrorCode = providerErrorCode(error, "auth_delete_failed");
    }
  }

  return {
    jobId: job.id,
    storageStatus: storage.status,
    databaseStatus,
    brevoStatus: brevo.status,
    posthogStatus: posthog.status,
    errorCode: storage.errorCode ??
      brevo.errorCode ??
      posthog.errorCode ??
      databaseErrorCode,
  };
}

export async function processAnalyticsErasureJob(
  job: ClaimedAnalyticsErasureJob,
  deletePosthogPerson: (analyticsId: string) => Promise<void>,
): Promise<AnalyticsErasureCompletion> {
  try {
    await deletePosthogPerson(job.analyticsId);
    return { jobId: job.id, status: "completed", errorCode: null };
  } catch (error) {
    return {
      jobId: job.id,
      status: "failed",
      errorCode: providerErrorCode(error, "posthog_delete_failed"),
    };
  }
}

function withoutTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function networkTimeoutSignal(timeoutMs = 10_000): AbortSignal {
  const boundedTimeout = Math.min(60_000, Math.max(1_000, timeoutMs));
  return AbortSignal.timeout(boundedTimeout);
}

export async function deleteBrevoContact(
  config: BrevoDeletionConfig,
  email: string,
  fetcher: Fetcher = fetch,
): Promise<void> {
  const url = new URL(
    `${withoutTrailingSlash(config.baseUrl)}/v3/contacts/${
      encodeURIComponent(email)
    }`,
  );
  url.searchParams.set("identifierType", "email_id");

  const response = await fetcher(url.toString(), {
    method: "DELETE",
    headers: {
      accept: "application/json",
      "api-key": config.apiKey,
    },
    signal: networkTimeoutSignal(config.timeoutMs),
  });

  if (response.status !== 204 && response.status !== 404) {
    throw new DeletionProviderError(`brevo_http_${response.status}`);
  }
}

interface PosthogBulkDeletionResponse {
  persons_found?: unknown;
  persons_deleted?: unknown;
  events_queued_for_deletion?: unknown;
  recordings_queued_for_deletion?: unknown;
  deletion_errors?: unknown;
}

interface PosthogEventsResponse {
  results?: unknown;
}

function confirmsPosthogDeletionQueue(
  value: PosthogBulkDeletionResponse,
): boolean {
  const deletionErrors = value.deletion_errors;
  if (!Array.isArray(deletionErrors) || deletionErrors.length > 0) {
    return false;
  }

  if (
    typeof value.persons_found !== "number" ||
    typeof value.persons_deleted !== "number"
  ) {
    return false;
  }

  return (
    value.persons_found > 0 &&
    value.persons_deleted === value.persons_found &&
    value.events_queued_for_deletion === true &&
    value.recordings_queued_for_deletion === true
  );
}

function confirmsNoPosthogPerson(value: PosthogBulkDeletionResponse): boolean {
  return (
    Array.isArray(value.deletion_errors) &&
    value.deletion_errors.length === 0 &&
    value.persons_found === 0 &&
    value.persons_deleted === 0
  );
}

async function verifyNoPosthogEvents(
  config: PosthogDeletionConfig,
  analyticsId: string,
  fetcher: Fetcher,
): Promise<void> {
  const url = new URL(
    `${withoutTrailingSlash(config.baseUrl)}/api/projects/${
      encodeURIComponent(
        config.projectId,
      )
    }/events/`,
  );
  url.searchParams.set("distinct_id", analyticsId);
  url.searchParams.set("after", "1970-01-01T00:00:00.000Z");
  url.searchParams.set("limit", "1");

  const response = await fetcher(url.toString(), {
    method: "GET",
    headers: {
      accept: "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    signal: networkTimeoutSignal(config.timeoutMs),
  });

  if (response.status !== 200) {
    throw new DeletionProviderError(
      `posthog_event_verification_http_${response.status}`,
    );
  }

  let payload: PosthogEventsResponse;
  try {
    payload = (await response.json()) as PosthogEventsResponse;
  } catch {
    throw new DeletionProviderError("posthog_event_verification_invalid");
  }

  if (!Array.isArray(payload.results)) {
    throw new DeletionProviderError("posthog_event_verification_invalid");
  }
  if (payload.results.length > 0) {
    throw new DeletionProviderError("posthog_personless_events_remain");
  }
}

export async function queuePosthogErasure(
  config: PosthogDeletionConfig,
  analyticsId: string,
  fetcher: Fetcher = fetch,
): Promise<void> {
  const url = `${withoutTrailingSlash(config.baseUrl)}/api/projects/${
    encodeURIComponent(
      config.projectId,
    )
  }/persons/bulk_delete/`;
  const response = await fetcher(url, {
    method: "POST",
    headers: {
      accept: "application/json",
      Authorization: `Bearer ${config.apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      distinct_ids: [analyticsId],
      delete_events: true,
      delete_recordings: true,
      keep_person: false,
    }),
    signal: networkTimeoutSignal(config.timeoutMs),
  });

  if (response.status !== 202) {
    throw new DeletionProviderError(`posthog_http_${response.status}`);
  }

  let payload: PosthogBulkDeletionResponse;
  try {
    payload = (await response.json()) as PosthogBulkDeletionResponse;
  } catch {
    throw new DeletionProviderError("posthog_invalid_response");
  }

  if (confirmsPosthogDeletionQueue(payload)) {
    throw new DeletionProviderError("posthog_delete_pending");
  }
  if (confirmsNoPosthogPerson(payload)) {
    await verifyNoPosthogEvents(config, analyticsId, fetcher);
    return;
  }

  throw new DeletionProviderError("posthog_delete_unconfirmed");
}

async function secretDigest(value: string): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return new Uint8Array(digest);
}

export async function secretsMatch(
  provided: string | null,
  expected: string | undefined,
): Promise<boolean> {
  if (!provided || !expected) {
    return false;
  }

  const [providedDigest, expectedDigest] = await Promise.all([
    secretDigest(provided),
    secretDigest(expected),
  ]);
  let difference = 0;

  for (let index = 0; index < expectedDigest.length; index += 1) {
    difference |= providedDigest[index]! ^ expectedDigest[index]!;
  }

  return difference === 0;
}
