import { db } from "../../helpers/db";
import { getServerUserSession } from "../../helpers/getServerUserSession";
import superjson from "superjson";
import { schema, OutputType } from "./list_GET.schema";

export async function handle(request: Request) {
  try {
    const { user } = await getServerUserSession(request);

    const url = new URL(request.url);
    const queryParams = {
      limit: url.searchParams.get("limit"),
      offset: url.searchParams.get("offset"),
    };

    const { limit, offset } = schema.parse(queryParams);

    const notifications = await db
      .selectFrom("notifications")
      .selectAll()
      .where("userId", "=", user.id)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .offset(offset)
      .execute();

    return new Response(
      superjson.stringify(notifications satisfies OutputType)
    );
  } catch (error) {
    console.error("Failed to list notifications:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(superjson.stringify({ error: errorMessage }), {
      status: 500,
    });
  }
}