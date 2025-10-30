import { db } from "../../helpers/db";
import { getServerUserSession } from "../../helpers/getServerUserSession";
import superjson from "superjson";
import { OutputType } from "./unread_GET.schema";

export async function handle(request: Request) {
  try {
    const { user } = await getServerUserSession(request);

    const result = await db
      .selectFrom("notifications")
      .select((eb) => [eb.fn.count<string>("id").as("count")])
      .where("userId", "=", user.id)
      .where("isRead", "=", false)
      .executeTakeFirstOrThrow();

    const count = parseInt(result.count, 10);

    return new Response(
      superjson.stringify({ count } satisfies OutputType)
    );
  } catch (error) {
    console.error("Failed to get unread notification count:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(superjson.stringify({ error: errorMessage }), {
      status: 500,
    });
  }
}