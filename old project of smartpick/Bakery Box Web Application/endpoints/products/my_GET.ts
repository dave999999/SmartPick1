import { db } from "../../helpers/db";
import { getServerUserSession } from "../../helpers/getServerUserSession";
import superjson from "superjson";
import { OutputType } from "./my_GET.schema";
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

    let query = db
      .selectFrom("products")
      .innerJoin("businesses", "products.businessId", "businesses.id")
      .selectAll("products")
      .select("businesses.name as businessName");

    if (user.role === "partner") {
      query = query.where("businesses.ownerId", "=", user.id);
    }

    const products = await query.orderBy("products.createdAt", "desc").execute();

    return new Response(superjson.stringify(products satisfies OutputType), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching my products:", error);
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
        error: "Failed to fetch products.",
        details: errorMessage,
      }),
      { status: 500 }
    );
  }
}