import { schema, OutputType } from "./update_POST.schema";
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

    const { productId, expirationHours, ...updateData } = input;

    // Verify ownership
    const product = await db
      .selectFrom("products")
      .innerJoin("businesses", "products.businessId", "businesses.id")
      .select(["businesses.ownerId"])
      .where("products.id", "=", productId)
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
          error: "Forbidden: You do not have permission to update this product.",
        }),
        { status: 403 }
      );
    }

    // Calculate new expiresAt if expirationHours is provided
    const updatePayload: Record<string, any> = {
      ...updateData,
      originalPrice: String(updateData.originalPrice),
      discountedPrice: String(updateData.discountedPrice),
      updatedAt: new Date(),
    };

    if (expirationHours !== undefined) {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + expirationHours);
      updatePayload.expiresAt = expiresAt;
    }

    const [updatedProduct] = await db
      .updateTable("products")
      .set(updatePayload)
      .where("id", "=", productId)
      .returningAll()
      .execute();

    return new Response(
      superjson.stringify({
        success: true,
        product: updatedProduct,
      } satisfies OutputType),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error updating product:", error);
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
        error: "Failed to update product.",
        details: errorMessage,
      }),
      { status: 500 }
    );
  }
}