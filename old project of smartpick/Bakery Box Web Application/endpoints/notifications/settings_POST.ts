import { db } from "../../helpers/db";
import { getServerUserSession } from "../../helpers/getServerUserSession";
import superjson from "superjson";
import { schema, OutputType } from "./settings_POST.schema";

export async function handle(request: Request) {
  try {
    const { user } = await getServerUserSession(request);
    const json = superjson.parse(await request.text());
    const input = schema.parse(json);

    const updatedSettings = await db
      .insertInto("userSettings")
      .values({
        userId: user.id,
        emailNotificationsEnabled: input.emailNotificationsEnabled,
      })
      .onConflict((oc) =>
        oc.column("userId").doUpdateSet({
          emailNotificationsEnabled: input.emailNotificationsEnabled,
          updatedAt: new Date(),
        })
      )
      .returningAll()
      .executeTakeFirstOrThrow();

    return new Response(
      superjson.stringify(updatedSettings satisfies OutputType)
    );
  } catch (error) {
    console.error("Failed to update notification settings:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(superjson.stringify({ error: errorMessage }), {
      status: 500,
    });
  }
}