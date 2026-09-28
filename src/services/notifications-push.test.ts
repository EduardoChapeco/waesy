import { describe, it, expect } from "vitest";
import { SavePushSubscriptionSchema, ListCompanyNotificationsSchema, MarkNotificationAsReadSchema } from "./notifications-push.functions";

describe("Notifications & Web Push Contracts", () => {
  it("validates SavePushSubscriptionSchema with valid keys and endpoint", () => {
    const valid = SavePushSubscriptionSchema.safeParse({
      endpoint: "https://fcm.googleapis.com/fcm/send/abcdef123456",
      p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QT9Q0A477GAUtnsUQ5KnP8uvK5e0WPN5P3i4ndBDqAkKgphs",
      auth: "tBHItJI5svbpez7KI4CCXg",
      deviceLabel: "iPhone 15 Pro",
    });
    expect(valid.success).toBe(true);

    const invalidEndpoint = SavePushSubscriptionSchema.safeParse({
      endpoint: "not-a-url",
      p256dh: "short",
      auth: "a",
    });
    expect(invalidEndpoint.success).toBe(false);
  });

  it("validates ListCompanyNotificationsSchema limits", () => {
    const valid = ListCompanyNotificationsSchema.safeParse({ limit: 15 });
    expect(valid.success).toBe(true);

    const defaultLimit = ListCompanyNotificationsSchema.parse({});
    expect(defaultLimit.limit).toBe(20);
  });

  it("validates MarkNotificationAsReadSchema with uuid", () => {
    const valid = MarkNotificationAsReadSchema.safeParse({
      notificationId: "77777777-7777-7777-7777-777777777777",
    });
    expect(valid.success).toBe(true);

    const invalid = MarkNotificationAsReadSchema.safeParse({
      notificationId: "invalid",
    });
    expect(invalid.success).toBe(false);
  });
});
