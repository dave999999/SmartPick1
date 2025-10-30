import { db } from "../../helpers/db";
import { getServerUserSession } from "../../helpers/getServerUserSession";
import superjson from "superjson";
import { schema, OutputType } from "./mark_read_POST.schema";

export async function handle(request: Request) {
  try {
    const { user } = await getServerUserSession(request);
    const json = superjson.parse(await request.text());
    const input = schema.parse(json);

    let query = db
      .updateTable("notifications")
      .set({ isRead: true })
      .where("userId", "=", user.id);

    if (input.markAllAsRead) {
      // Query is already scoped to the user, so no further `where` is needed.
    } else if (input.notificationIds && input.notificationIds.length > 0) {
      query = query.where("id", "in", input.notificationIds);
    } else {
      // This case should be prevented by the schema refinement, but as a safeguard:
      return new Response(
        superjson.stringify({
          error: "Either notificationIds or markAllAsRead must be provided.",
        }),
        { status: 400 }
      );
    }

        const result = await query.executeTakeFirst();

    const numUpdated = Number(result?.numUpdatedRows ?? 0);
    const success: boolean = numUpdated > 0 || (!!input.markAllAsRead && numUpdated === 0);

    return new Response(
      superjson.stringify({ success } satisfies OutputType)
    );
  } catch (error) {
    console.error("Failed to mark notifications as read:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(superjson.stringify({ error: errorMessage }), {
      status: 500,
    });
  }
}