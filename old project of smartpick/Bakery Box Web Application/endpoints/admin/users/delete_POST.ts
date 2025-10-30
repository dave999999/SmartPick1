import { db } from "../../../helpers/db";
import { getServerUserSession } from "../../../helpers/getServerUserSession";
import { schema, OutputType } from "./delete_POST.schema";
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
    const { userId } = schema.parse(json);

    if (userId === adminUser.id) {
      return new Response(
        superjson.stringify({ error: "Admins cannot delete their own account." }),
        { status: 403 }
      );
    }

    const result = await db.transaction().execute(async (trx) => {
      // Delete all related data first
      await trx.deleteFrom("sessions").where("userId", "=", userId).execute();
      await trx.deleteFrom("userPasswords").where("userId", "=", userId).execute();
      await trx.deleteFrom("oauthAccounts").where("userId", "=", userId).execute();
      await trx.deleteFrom("orders").where("userId", "=", userId).execute();

      // Handle businesses owned by the user
      const businesses = await trx
        .selectFrom("businesses")
        .select("id")
        .where("ownerId", "=", userId)
        .execute();

      if (businesses.length > 0) {
        for (const business of businesses) {
          const products = await trx
            .selectFrom("products")
            .select("id")
            .where("businessId", "=", business.id)
            .execute();

          if (products.length > 0) {
            const productIds = products.map((p) => p.id);
            await trx
              .deleteFrom("orders")
              .where("productId", "in", productIds)
              .execute();
            await trx
              .deleteFrom("products")
              .where("id", "in", productIds)
              .execute();
          }
          await trx
            .deleteFrom("businesses")
            .where("id", "=", business.id)
            .execute();
        }
      }

      // Finally, delete the user
      const deleteResult = await trx
        .deleteFrom("users")
        .where("id", "=", userId)
        .executeTakeFirst();

      return deleteResult;
    });

    if (result.numDeletedRows === 0n) {
      return new Response(
        superjson.stringify({
          error: `User with ID ${userId} not found.`,
        }),
        { status: 404 }
      );
    }

    return new Response(
      superjson.stringify({
        success: true,
        message: "User and all associated data deleted successfully.",
      } satisfies OutputType),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error deleting user:", error);
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
        error: "Failed to delete user.",
        details: errorMessage,
      }),
      { status: 500 }
    );
  }
}