import { db } from "../../../helpers/db";
import { getServerUserSession } from "../../../helpers/getServerUserSession";
import { schema, OutputType } from "./update_POST.schema";
import superjson from "superjson";
import { ZodError } from "zod";

export async function handle(request: Request) {
  try {
    const { user: adminUser } = await getServerUserSession(request);

    if (adminUser.role !== "admin") {
      return new Response(
        superjson.stringify({ error: "Forbidden: Admin access required." }),
        { status: 403 }
      );
    }

    const json = superjson.parse(await request.text());
    const { userId, ...updateData } = schema.parse(json);

    if (Object.keys(updateData).length === 0) {
      return new Response(
        superjson.stringify({
          error: "No update data provided.",
        }),
        { status: 400 }
      );
    }

    if (userId === adminUser.id && updateData.role && updateData.role !== 'admin') {
        return new Response(
            superjson.stringify({
              error: "Admins cannot demote their own role.",
            }),
            { status: 403 }
          );
    }

    const result = await db
      .updateTable("users")
      .set(updateData)
      .where("id", "=", userId)
      .executeTakeFirst();

    if (result.numUpdatedRows === 0n) {
      return new Response(
        superjson.stringify({
          error: `User with ID ${userId} not found or no changes made.`,
        }),
        { status: 404 }
      );
    }

    return new Response(
      superjson.stringify({
        success: true,
        message: "User updated successfully.",
      } satisfies OutputType),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error updating user:", error);
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
        error: "Failed to update user.",
        details: errorMessage,
      }),
      { status: 500 }
    );
  }
}