import { schema, OutputType } from "./pause_POST.schema";
import { db } from "../../helpers/db";
import { getServerUserSession } from "../../helpers/getServerUserSession";
import superjson from "superjson";
import { ZodError } from "zod";
import { NotAuthenticatedError } from "../../helpers/getSetServerSession";

export async function handle(request: Request) {
  try {
    const { user } = await getServerUserSession(request);

    if (user.role !== "partner" && user.role !== "admin") {
      return new Response(
        superjson.stringify({ error: "Forbidden: Insufficient permissions." }),
        { status: 403 }
      );
    }

    const json = superjson.parse(await request.text());
    const input = schema.parse(json);

    // Verify ownership
    const product = await db
      .selectFrom("products")
      .innerJoin("businesses", "products.businessId", "businesses.id")
      .select(["businesses.ownerId", "products.status"])
      .where("products.id", "=", input.productId)
      .executeTakeFirst();

    if (!product) {
      return new Response(
        superjson.stringify({ error: "Product not found." }),
        { status: 404 }
      );
    }

    if (user.role === "partner" && product.ownerId !== user.id) {
      return new Response(
        superjson.stringify({
          error: "Forbidden: You do not have permission to pause this product.",
        }),
        { status: 403 }
      );
    }

    if (product.status === "paused") {
        return new Response(
            superjson.stringify({
            success: true,
            message: "Product is already paused.",
            } satisfies OutputType),
            {
            headers: { "Content-Type": "application/json" },
            }
        );
    }

    const { numUpdatedRows } = await db
      .updateTable("products")
      .set({ status: "paused", updatedAt: new Date() })
      .where("id", "=", input.productId)
      .executeTakeFirst();

    if (Number(numUpdatedRows) === 0) {
        return new Response(
            superjson.stringify({ error: "Failed to update product status." }),
            { status: 500 }
        );
    }

    return new Response(
      superjson.stringify({
        success: true,
        message: "Product paused successfully.",
      } satisfies OutputType),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error pausing product:", error);
    if (error instanceof ZodError) {
      return new Response(
        superjson.stringify({ error: "Invalid input.", details: error.errors }),
        { status: 400 }
      );
    }
    if (error instanceof NotAuthenticatedError) {
      return new Response(
        superjson.stringify({ error: "Authentication required." }),
        { status: 401 }
      );
    }
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(
      superjson.stringify({
        error: "Failed to pause product.",
        details: errorMessage,
      }),
      { status: 500 }
    );
  }
}