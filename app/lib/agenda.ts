import { Agenda } from "agenda";
import { MongoBackend } from "@agendajs/mongo-backend";
import clientPromise from "./mongodb";
import { createNotification } from "./notifications";
import { SquadDocument } from "@/app/lib/actions/squads";

interface AggregatedSquad extends SquadDocument {
    relicDetails: {
        i18n: Record<string, { displayName?: string }>;
    };
}

let agendaInstance: Agenda | null = null;

export const initAgenda = async () => {
    if (agendaInstance) return agendaInstance;

    const client = await clientPromise;
    const db = client.db();

    const agenda = new Agenda({
        backend: new MongoBackend({
            mongo: db,
            collection: "agendaJobs",
        }),
        processEvery: "5 seconds",
    });

    const logAgenda = (message: string) => {
        if (process.env.HIDE_AGENDA_LOGS !== "true") {
            console.log(`[Agenda] ${message}`);
        }
    };

    agenda.define("cleanup-squads", async () => {
        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

        try {
            const query = {
                $or: [
                    {
                        executionDate: { $lt: now },
                        $expr: { $lte: [{ $size: "$members" }, 1] },
                    },
                    {
                        executionDate: { $lt: oneHourAgo },
                    },
                ],
            };

            const squadsToPrune = await db
                .collection("squads")
                .aggregate<AggregatedSquad>([
                    { $match: query },
                    {
                        $lookup: {
                            from: "relics",
                            localField: "targetRelic",
                            foreignField: "uniqueId",
                            as: "relicDetails",
                        },
                    },
                    { $unwind: "$relicDetails" },
                ])
                .toArray();

            if (squadsToPrune.length > 0) {
                for (const squad of squadsToPrune) {
                    await createNotification({
                        userId: squad.ownerId,
                        type: "squad_expired",
                        titleKey: "squad_expired_title",
                        bodyKey: "squad_expired_body",
                        bodyValues: {
                            relicI18n: squad.relicDetails.i18n,
                            era: squad.relicEra,
                        },
                    });
                }

                await db.collection("squads").deleteMany(query);
            }
        } catch (error) {
            console.error("[Agenda] Cleanup failed:", error);
        }
    });

    agenda.define("cleanup-notifications", async () => {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

        try {
            const result = await db.collection("notifications").deleteMany({
                read: true,
                $or: [
                    { readAt: { $lt: oneHourAgo } },
                    {
                        readAt: { $exists: false },
                        createdAt: { $lt: oneHourAgo },
                    },
                ],
            });

            if (result.deletedCount > 0) {
                logAgenda(
                    `Pruned ${result.deletedCount} old read notifications.`,
                );
            }
        } catch (error) {
            console.error("[Agenda] Notification cleanup failed:", error);
        }
    });

    await agenda.start();

    await agenda.every("1 minute", "cleanup-squads");
    await agenda.every("15 minutes", "cleanup-notifications");

    agendaInstance = agenda;
    return agendaInstance;
};
