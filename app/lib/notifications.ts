import clientPromise from "@/app/lib/mongodb";

interface RelicI18n {
    [locale: string]:
        | {
              displayName?: string;
          }
        | undefined;
}

export type BodyValue =
    | string
    | number
    | RelicI18n
    | boolean
    | null
    | undefined;

interface NotificationData {
    type: string;
    titleKey?: string;
    bodyKey?: string;
    bodyValues?: Record<string, BodyValue>;
    title?: string;
    body?: string;
    link?: string;
}

export async function createNotification(
    data: { userId: string } & NotificationData,
) {
    const client = await clientPromise;
    const db = client.db();

    const result = await db.collection("notifications").insertOne({
        ...data,
        read: false,
        createdAt: new Date(),
    });

    return result;
}

export async function createBulkNotifications(
    userIds: string[],
    data: NotificationData,
) {
    if (!userIds || userIds.length === 0) return null;

    const client = await clientPromise;
    const db = client.db();

    const notifications = userIds.map((id) => ({
        userId: id,
        ...data,
        read: false,
        createdAt: new Date(),
    }));

    const result = await db
        .collection("notifications")
        .insertMany(notifications);

    return result;
}
