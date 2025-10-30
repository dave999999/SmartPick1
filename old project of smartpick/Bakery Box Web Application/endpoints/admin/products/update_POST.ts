import { db } from "../../../helpers/db";
import { getServerUserSession } from "../../../helpers/getServerUserSession";
import { schema, OutputType } from "./update_POST.schema";
import superjson from "superjson";
import { ZodError } from "zod";
import { NotAuthenticatedError } from "../../../helpers/getSetServerSession";

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
    const { productId, ...updateData } = schema.parse(json);

    if (Object.keys(updateData).length === 0) {
      return new Response(
        superjson.stringify({
          error: "No update data provided.",
        }),
        { status: 400 }
      );
    }

    const updatePayload: any = { ...updateData };
    if (updateData.originalPrice !== undefined) {
      updatePayload.originalPrice = String(updateData.originalPrice);
    }
    if (updateData.discountedPrice !== undefined) {
      updatePayload.discountedPrice = String(updateData.discountedPrice);
    }
    if (updateData.expiresAt !== undefined) {
      updatePayload.expiresAt = updateData.expiresAt;
    }

    const result = await db
      .updateTable("products")
      .set({ ...updatePayload, updatedAt: new Date() })
      .where("id", "=", productId)
      .executeTakeFirst();

    if (result.numUpdatedRows === 0n) {
      return new Response(
        superjson.stringify({
          error: `Product with ID ${productId} not found or no changes made.`,
        }),
        { status: 404 }
      );
    }

    return new Response(
      superjson.stringify({
        success: true,
        message: "Product updated successfully.",
      } satisfies OutputType),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error updating product:", error);
    if (error instanceof ZodError) {
      return new Response(
        superjson.stringify({
          error: "Invalid input.",
          details: error.flatten(),
        }),
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