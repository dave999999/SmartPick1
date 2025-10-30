import { db } from "../../../helpers/db";
import { getServerUserSession } from "../../../helpers/getServerUserSession";
import { schema, OutputType } from "./delete_POST.schema";
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
    const { businessId } = schema.parse(json);

    const result = await db.transaction().execute(async (trx) => {
      // Find all products associated with the business
      const products = await trx
        .selectFrom("products")
        .select("id")
        .where("businessId", "=", businessId)
        .execute();

      if (products.length > 0) {
        const productIds = products.map((p) => p.id);

        // Delete orders associated with those products
        await trx
          .deleteFrom("orders")
          .where("productId", "in", productIds)
          .execute();

        // Delete the products
        await trx
          .deleteFrom("products")
          .where("id", "in", productIds)
          .execute();
      }

      // Finally, delete the business
      const deleteResult = await trx
        .deleteFrom("businesses")
        .where("id", "=", businessId)
        .executeTakeFirst();

      return deleteResult;
    });

    if (result.numDeletedRows === 0n) {
      return new Response(
        superjson.stringify({
          error: `Business with ID ${businessId} not found.`,
        }),
        { status: 404 }
      );
    }

    return new Response(
      superjson.stringify({
        success: true,
        message: "Business and all associated data deleted successfully.",
      } satisfies OutputType),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error deleting business:", error);
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
        error: "Failed to delete business.",
        details: errorMessage,
      }),
      { status: 500 }
    );
  }
}