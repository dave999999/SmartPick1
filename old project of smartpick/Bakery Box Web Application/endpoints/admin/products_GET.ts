import { db } from "../../helpers/db";
import { getServerUserSession } from "../../helpers/getServerUserSession";
import { OutputType } from "./products_GET.schema";
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

    const products = await db
      .selectFrom("products")
      .innerJoin("businesses", "products.businessId", "businesses.id")
      .innerJoin("users", "businesses.ownerId", "users.id")
      .selectAll("products")
      .select([
        "businesses.name as businessName",
        "users.email as ownerEmail",
        "users.displayName as ownerDisplayName",
      ])
      .orderBy("products.createdAt", "desc")
      .execute();

    return new Response(superjson.stringify(products satisfies OutputType), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching all products for admin:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(
      superjson.stringify({
        error: "Failed to fetch products.",
        details: errorMessage,
      }),
      { status: 500 }
    );
  }
}