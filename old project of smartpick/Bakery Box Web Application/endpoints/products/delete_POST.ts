import { schema, OutputType } from "./delete_POST.schema";
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
      .select(["businesses.ownerId"])
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
          error: "Forbidden: You do not have permission to delete this product.",
        }),
        { status: 403 }
      );
    }

    const { numDeletedRows } = await db
      .deleteFrom("products")
      .where("id", "=", input.productId)
      .executeTakeFirst();

    if (Number(numDeletedRows) === 0) {
      return new Response(
        superjson.stringify({ error: "Product not found or already deleted." }),
        { status: 404 }
      );
    }

    return new Response(
      superjson.stringify({
        success: true,
        message: "Product deleted successfully.",
      } satisfies OutputType),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error deleting product:", error);
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
        error: "Failed to delete product.",
        details: errorMessage,
      }),
      { status: 500 }
    );
  }
}