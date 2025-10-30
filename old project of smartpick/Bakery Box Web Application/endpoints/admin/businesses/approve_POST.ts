import { db } from "../../../helpers/db";
import { getServerUserSession } from "../../../helpers/getServerUserSession";
import { schema, OutputType } from "./approve_POST.schema";
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

    await db.transaction().execute(async (trx) => {
      const business = await trx
        .selectFrom("businesses")
        .select(["ownerId", "status"])
        .where("id", "=", businessId)
        .executeTakeFirst();

      if (!business) {
        throw new Error("Business not found.");
      }

      if (business.status !== "pending") {
        throw new Error(`Business is already ${business.status}.`);
      }

      await trx
        .updateTable("businesses")
        .set({ status: "approved" })
        .where("id", "=", businessId)
        .execute();

      await trx
        .updateTable("users")
        .set({ role: "partner" })
        .where("id", "=", business.ownerId)
        .where("role", "=", "user")
        .execute();
    });

    return new Response(
      superjson.stringify({
        success: true,
        message: "Business approved successfully.",
      } satisfies OutputType),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error approving business:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(
      superjson.stringify({
        error: "Failed to approve business.",
        details: errorMessage,
      }),
      { status: 500 }
    );
  }
}