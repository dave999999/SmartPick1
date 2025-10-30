import { db } from "../../../helpers/db";
import { getServerUserSession } from "../../../helpers/getServerUserSession";
import { schema, OutputType } from "./reject_POST.schema";
import superjson from "superjson";

export async function handle(request: Request) {
  try {
    const { user } = await getServerUserSession(request);

    if (user.role !== "admin") {
      return new Response(
        superjson.stringify({ error: "Forbidden: Admin access required." }),
        { status: 403 }
      );
    }

    const json = superjson.parse(await request.text());
    const { businessId } = schema.parse(json);

    const business = await db
      .selectFrom("businesses")
      .select("status")
      .where("id", "=", businessId)
      .executeTakeFirst();

    if (!business) {
      return new Response(
        superjson.stringify({ error: "Business not found." }),
        { status: 404 }
      );
    }

    if (business.status !== "pending") {
      return new Response(
        superjson.stringify({
          error: `Business is already ${business.status}.`,
        }),
        { status: 400 }
      );
    }

    await db
      .updateTable("businesses")
      .set({ status: "rejected" })
      .where("id", "=", businessId)
      .execute();

    return new Response(
      superjson.stringify({
        success: true,
        message: "Business rejected successfully.",
      } satisfies OutputType),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error rejecting business:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(
      superjson.stringify({
        error: "Failed to reject business.",
        details: errorMessage,
      }),
      { status: 500 }
    );
  }
}