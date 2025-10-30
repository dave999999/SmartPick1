import { db } from "../../helpers/db";
import { getServerUserSession } from "../../helpers/getServerUserSession";
import superjson from "superjson";
import { OutputType } from "./settings_GET.schema";
import { Selectable } from "kysely";
import { UserSettings } from "../../helpers/schema";

export async function handle(request: Request) {
  try {
    const { user } = await getServerUserSession(request);

    let settings = await db
      .selectFrom("userSettings")
      .selectAll()
      .where("userId", "=", user.id)
      .executeTakeFirst();

    if (!settings) {
      // Create default settings if they don't exist
      const defaultSettings: Omit<
        Selectable<UserSettings>,
        "createdAt" | "updatedAt"
      > = {
        userId: user.id,
        emailNotificationsEnabled: true,
      };

      settings = await db
        .insertInto("userSettings")
        .values(defaultSettings)
        .returningAll()
        .executeTakeFirstOrThrow();
    }

    return new Response(superjson.stringify(settings satisfies OutputType));
  } catch (error) {
    console.error("Failed to get notification settings:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(superjson.stringify({ error: errorMessage }), {
      status: 500,
    });
  }
}