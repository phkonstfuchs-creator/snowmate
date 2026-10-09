import { describe, expect, it, vi } from "vitest";

import {
  type ClaimedAccountDeletionJob,
  type ClaimedAnalyticsErasureJob,
  deleteBrevoContact,
  DeletionProviderError,
  type DeletionProviders,
  processAccountDeletionJob,
  processAnalyticsErasureJob,
  queuePosthogErasure,
  secretsMatch,
} from "./account-deletion-worker";

const baseJob: ClaimedAccountDeletionJob = {
  id: "10000000-0000-4000-8000-000000000001",
  leaseToken: "10000000-0000-4000-8000-000000000002",
  userId: "20000000-0000-4000-8000-000000000001",
  email: "rider@example.com",
  avatarPath: "20000000-0000-4000-8000-000000000001/avatar.webp",
  analyticsId: "30000000-0000-4000-8000-000000000001",
  hardDeadlineAt: "2099-01-01T00:00:00.000Z",
  storageStatus: "pending",
  databaseStatus: "pending",
  brevoStatus: "pending",
  posthogStatus: "pending",
};

function providers(): DeletionProviders {
  return {
    deleteAvatar: vi.fn().mockResolvedValue(undefined),
    deleteAuthUser: vi.fn().mockResolvedValue(undefined),
    deleteBrevoContact: vi.fn().mockResolvedValue(undefined),
    deletePosthogPerson: vi.fn().mockResolvedValue(undefined),
  };
}

describe("processAccountDeletionJob", () => {
  it("completes every pending provider step", async () => {
    const deletionProviders = providers();

    await expect(
      processAccountDeletionJob(baseJob, deletionProviders),
    ).resolves.toEqual({
      jobId: baseJob.id,
      storageStatus: "completed",
      databaseStatus: "completed",
      brevoStatus: "completed",
      posthogStatus: "completed",
      errorCode: null,
    });

    expect(deletionProviders.deleteAvatar).toHaveBeenCalledWith(
      baseJob.avatarPath,
    );
    expect(deletionProviders.deleteAuthUser).toHaveBeenCalledWith(
      baseJob.userId,
    );
  });

  it("preserves terminal steps and skips providers without identifiers", async () => {
    const deletionProviders = providers();
    const job: ClaimedAccountDeletionJob = {
      ...baseJob,
      userId: null,
      email: null,
      avatarPath: null,
      analyticsId: null,
      storageStatus: "skipped",
      brevoStatus: "skipped",
      posthogStatus: "skipped",
    };

    await expect(
      processAccountDeletionJob(job, deletionProviders),
    ).resolves.toEqual({
      jobId: job.id,
      storageStatus: "skipped",
      databaseStatus: "completed",
      brevoStatus: "skipped",
      posthogStatus: "skipped",
      errorCode: null,
    });

    expect(deletionProviders.deleteAvatar).not.toHaveBeenCalled();
    expect(deletionProviders.deleteAuthUser).not.toHaveBeenCalled();
    expect(deletionProviders.deleteBrevoContact).not.toHaveBeenCalled();
    expect(deletionProviders.deletePosthogPerson).not.toHaveBeenCalled();
  });

  it("does not delete Auth before a failed Storage step", async () => {
    const deletionProviders = providers();
    vi.mocked(deletionProviders.deleteAvatar).mockRejectedValue(
      new DeletionProviderError("storage_delete_failed"),
    );

    await expect(
      processAccountDeletionJob(baseJob, deletionProviders),
    ).resolves.toEqual({
      jobId: baseJob.id,
      storageStatus: "failed",
      databaseStatus: "pending",
      brevoStatus: "completed",
      posthogStatus: "completed",
      errorCode: "storage_delete_failed",
    });

    expect(deletionProviders.deleteAuthUser).not.toHaveBeenCalled();
    expect(deletionProviders.deleteBrevoContact).toHaveBeenCalledOnce();
    expect(deletionProviders.deletePosthogPerson).toHaveBeenCalledOnce();
  });

  it("hard-deletes Auth after the seven-day deadline while Storage keeps retrying", async () => {
    const deletionProviders = providers();
    vi.mocked(deletionProviders.deleteAvatar).mockRejectedValue(
      new DeletionProviderError("storage_delete_failed"),
    );
    const overdueJob: ClaimedAccountDeletionJob = {
      ...baseJob,
      hardDeadlineAt: "2026-08-01T00:00:00.000Z",
    };

    const result = await processAccountDeletionJob(
      overdueJob,
      deletionProviders,
      {
        now: () => new Date("2026-08-08T00:00:00.000Z"),
      },
    );

    expect(result.storageStatus).toBe("failed");
    expect(result.databaseStatus).toBe("completed");
    expect(result.errorCode).toBe("storage_delete_failed");
    expect(deletionProviders.deleteAuthUser).toHaveBeenCalledWith(
      overdueJob.userId,
    );
  });

  it("retries failed steps while leaving completed steps untouched", async () => {
    const deletionProviders = providers();
    const job: ClaimedAccountDeletionJob = {
      ...baseJob,
      storageStatus: "completed",
      brevoStatus: "failed",
      posthogStatus: "completed",
    };

    const result = await processAccountDeletionJob(job, deletionProviders);

    expect(result.errorCode).toBeNull();
    expect(deletionProviders.deleteAvatar).not.toHaveBeenCalled();
    expect(deletionProviders.deleteBrevoContact).toHaveBeenCalledOnce();
    expect(deletionProviders.deletePosthogPerson).not.toHaveBeenCalled();
    expect(deletionProviders.deleteAuthUser).toHaveBeenCalledOnce();
  });

  it("maps unknown provider failures to a fixed non-sensitive code", async () => {
    const deletionProviders = providers();
    vi.mocked(deletionProviders.deleteBrevoContact).mockRejectedValue(
      new Error("response contained rider@example.com"),
    );

    const result = await processAccountDeletionJob(baseJob, deletionProviders);

    expect(result.brevoStatus).toBe("failed");
    expect(result.errorCode).toBe("brevo_delete_failed");
    expect(JSON.stringify(result)).not.toContain("rider@example.com");
  });

  it("starts independent provider erasures before waiting for Storage", async () => {
    const deletionProviders = providers();
    let releaseStorage: (() => void) | undefined;
    vi.mocked(deletionProviders.deleteAvatar).mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          releaseStorage = resolve;
        }),
    );

    const processing = processAccountDeletionJob(baseJob, deletionProviders);
    await Promise.resolve();

    const brevoStartedBeforeStorageFinished = vi.mocked(
      deletionProviders.deleteBrevoContact,
    ).mock.calls.length === 1;
    const posthogStartedBeforeStorageFinished = vi.mocked(
      deletionProviders.deletePosthogPerson,
    ).mock.calls.length === 1;
    const authStartedBeforeStorageFinished = vi.mocked(
      deletionProviders.deleteAuthUser,
    ).mock.calls.length > 0;

    releaseStorage?.();
    await processing;

    expect(brevoStartedBeforeStorageFinished).toBe(true);
    expect(posthogStartedBeforeStorageFinished).toBe(true);
    expect(authStartedBeforeStorageFinished).toBe(false);
  });
});

describe("processAnalyticsErasureJob", () => {
  const job: ClaimedAnalyticsErasureJob = {
    id: "31000000-0000-4000-8000-000000000001",
    leaseToken: "31000000-0000-4000-8000-000000000002",
    analyticsId: baseJob.analyticsId!,
  };

  it("completes a consent-withdrawal erasure", async () => {
    const deletePosthogPerson = vi.fn().mockResolvedValue(undefined);

    await expect(
      processAnalyticsErasureJob(job, deletePosthogPerson),
    ).resolves.toEqual({
      jobId: job.id,
      status: "completed",
      errorCode: null,
    });
    expect(deletePosthogPerson).toHaveBeenCalledWith(job.analyticsId);
  });

  it("maps analytics provider details to a fixed retry code", async () => {
    const deletePosthogPerson = vi
      .fn()
      .mockRejectedValue(new Error("event for rider@example.com remains"));

    const result = await processAnalyticsErasureJob(job, deletePosthogPerson);

    expect(result).toEqual({
      jobId: job.id,
      status: "failed",
      errorCode: "posthog_delete_failed",
    });
    expect(JSON.stringify(result)).not.toContain("rider@example.com");
  });
});

describe("provider HTTP adapters", () => {
  it("treats Brevo deletion and an already absent contact as complete", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(null, { status: 404 }));
    const config = {
      apiKey: "brevo-secret",
      baseUrl: "https://api.brevo.com",
    };

    await deleteBrevoContact(config, "rider+snow@example.com", fetcher);
    await deleteBrevoContact(config, "missing@example.com", fetcher);

    expect(fetcher).toHaveBeenNthCalledWith(
      1,
      "https://api.brevo.com/v3/contacts/rider%2Bsnow%40example.com?identifierType=email_id",
      expect.objectContaining({
        method: "DELETE",
        headers: expect.objectContaining({ "api-key": "brevo-secret" }),
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it("rejects Brevo responses with a fixed status code only", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response('{"message":"rider@example.com"}', { status: 429 }),
      );

    await expect(
      deleteBrevoContact(
        { apiKey: "brevo-secret", baseUrl: "https://api.brevo.com" },
        "rider@example.com",
        fetcher,
      ),
    ).rejects.toMatchObject({ code: "brevo_http_429" });
  });

  it("keeps a PostHog erasure pending after the provider only queues it", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json(
        {
          persons_found: 1,
          persons_deleted: 1,
          events_queued_for_deletion: true,
          recordings_queued_for_deletion: true,
          deletion_errors: [],
        },
        { status: 202 },
      ),
    );

    await expect(
      queuePosthogErasure(
        {
          apiKey: "phx-secret",
          baseUrl: "https://eu.posthog.com",
          projectId: "12345",
        },
        baseJob.analyticsId!,
        fetcher,
      ),
    ).rejects.toMatchObject({ code: "posthog_delete_pending" });

    expect(fetcher).toHaveBeenCalledWith(
      "https://eu.posthog.com/api/projects/12345/persons/bulk_delete/",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer phx-secret",
        }),
        body: JSON.stringify({
          distinct_ids: [baseJob.analyticsId],
          delete_events: true,
          delete_recordings: true,
          keep_person: false,
        }),
      }),
    );
  });

  it("fails closed when PostHog does not confirm the complete erasure request", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json(
        {
          persons_found: 1,
          persons_deleted: 1,
          events_queued_for_deletion: false,
          recordings_queued_for_deletion: true,
          deletion_errors: [],
        },
        { status: 202 },
      ),
    );

    await expect(
      queuePosthogErasure(
        {
          apiKey: "phx-secret",
          baseUrl: "https://eu.posthog.com",
          projectId: "12345",
        },
        baseJob.analyticsId!,
        fetcher,
      ),
    ).rejects.toMatchObject({ code: "posthog_delete_unconfirmed" });
  });

  it("treats an already-erased PostHog identity as an idempotent success", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json(
        {
          persons_found: 0,
          persons_deleted: 0,
          events_queued_for_deletion: false,
          recordings_queued_for_deletion: false,
          deletion_errors: [],
        },
        { status: 202 },
      ))
      .mockResolvedValueOnce(Response.json({ results: [] }, { status: 200 }));

    await expect(
      queuePosthogErasure(
        {
          apiKey: "phx-secret",
          baseUrl: "https://eu.posthog.com",
          projectId: "12345",
        },
        baseJob.analyticsId!,
        fetcher,
      ),
    ).resolves.toBeUndefined();

    expect(fetcher).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(fetcher).toHaveBeenLastCalledWith(
      expect.stringContaining("/events/?"),
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer phx-secret",
        }),
      }),
    );
  });

  it("does not hide personless PostHog events behind a zero-person retry", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json(
          {
            persons_found: 0,
            persons_deleted: 0,
            events_queued_for_deletion: false,
            recordings_queued_for_deletion: false,
            deletion_errors: [],
          },
          { status: 202 },
        ),
      )
      .mockResolvedValueOnce(
        Response.json({ results: [{ id: "remaining-event" }] }, {
          status: 200,
        }),
      );

    await expect(
      queuePosthogErasure(
        {
          apiKey: "phx-secret",
          baseUrl: "https://eu.posthog.com",
          projectId: "12345",
        },
        baseJob.analyticsId!,
        fetcher,
      ),
    ).rejects.toMatchObject({ code: "posthog_personless_events_remain" });
  });
});

describe("secretsMatch", () => {
  it("accepts only the exact configured worker secret", async () => {
    await expect(secretsMatch("same-secret", "same-secret")).resolves.toBe(
      true,
    );
    await expect(secretsMatch("same-secret", "other-secret")).resolves.toBe(
      false,
    );
    await expect(secretsMatch(null, "same-secret")).resolves.toBe(false);
  });
});
