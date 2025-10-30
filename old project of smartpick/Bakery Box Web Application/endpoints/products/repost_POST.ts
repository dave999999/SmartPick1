import { schema, OutputType } from "./repost_POST.schema";
import { db } from "../../helpers/db";
import { getServerUserSession } from "../../helpers/getServerUserSession";
import superjson from "superjson";
import { ZodError } from "zod";
import { NotAuthenticatedError } from "../../helpers/getSetServerSession";
import { Selectable } from "kysely";
import { Products } from "../../helpers/schema";

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

    // Fetch the original product
    const originalProduct = await db
      .selectFrom("products")
      .innerJoin("businesses", "products.businessId", "businesses.id")
      .selectAll("products")
      .select("businesses.ownerId")
      .where("products.id", "=", input.productId)
      .executeTakeFirst();

    if (!originalProduct) {
      return new Response(
        superjson.stringify({ error: "Original product not found." }),
        { status: 404 }
      );
    }

    // Verify ownership if the user is a partner
    if (user.role === "partner" && originalProduct.ownerId !== user.id) {
      return new Response(
        superjson.stringify({
          error: "Forbidden: You do not own this product.",
        }),
        { status: 403 }
      );
    }

    // Prepare new product data
    const now = new Date();
    const expirationHours = input.expirationHours ?? 9;
    const expiresAt = new Date(now.getTime() + expirationHours * 60 * 60 * 1000);

    const newProductData = {
      businessId: originalProduct.businessId,
      title: input.title ?? originalProduct.title,
      description: input.description ?? originalProduct.description,
      originalPrice: String(input.originalPrice ?? originalProduct.originalPrice),
      discountedPrice: String(input.discountedPrice ?? originalProduct.discountedPrice),
      quantity: input.quantity ?? originalProduct.quantity,
      imageUrl: originalProduct.imageUrl,
      pickupTimeStart: originalProduct.pickupTimeStart,
      pickupTimeEnd: originalProduct.pickupTimeEnd,
      availableDate: input.availableDate ? new Date(input.availableDate) : now,
      status: "available" as const,
      expiresAt: expiresAt,
    };

    // Insert the new product
    const [newProduct] = await db
      .insertInto("products")
      .values(newProductData)
      .returningAll()
      .execute();

    return new Response(
      superjson.stringify({ success: true, product: newProduct } satisfies OutputType),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error reposting product:", error);
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
        error: "Failed to repost product.",
        details: errorMessage,
      }),
      { status: 500 }
    );
  }
}