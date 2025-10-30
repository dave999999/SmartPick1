import { db } from "../../../helpers/db";
import { getServerUserSession } from "../../../helpers/getServerUserSession";
import { schema, OutputType } from "./update_POST.schema";
import superjson from "superjson";
import { ZodError } from "zod";

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
    const { businessId, ...updateData } = schema.parse(json);

    if (Object.keys(updateData).length === 0) {
      return new Response(
        superjson.stringify({
          error: "No update data provided.",
        }),
        { status: 400 }
      );
    }

    const result = await db
      .updateTable("businesses")
      .set(updateData)
      .where("id", "=", businessId)
      .executeTakeFirst();

    if (result.numUpdatedRows === 0n) {
      return new Response(
        superjson.stringify({
          error: `Business with ID ${businessId} not found or no changes made.`,
        }),
        { status: 404 }
      );
    }

    return new Response(
      superjson.stringify({
        success: true,
        message: "Business updated successfully.",
      } satisfies OutputType),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error updating business:", error);
    if (error instanceof ZodError) {
      return new Response(
        superjson.stringify({
          error: "Invalid input.",
          details: error.flatten(),
        }),
        { status: 400 }
      );
    }
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(
      superjson.stringify({
        error: "Failed to update business.",
        details: errorMessage,
      }),
      { status: 500 }
    );
  }
}