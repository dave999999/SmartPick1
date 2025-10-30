import { db } from "../../helpers/db";
import { getServerUserSession } from "../../helpers/getServerUserSession";
import { OutputType } from "./businesses_GET.schema";
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

    const businesses = await db
      .selectFrom("businesses")
      .innerJoin("users", "businesses.ownerId", "users.id")
      .select([
        "businesses.id",
        "businesses.name",
        "businesses.description",
        "businesses.businessType",
        "businesses.address",
        "businesses.latitude",
        "businesses.longitude",
        "businesses.phone",
        "businesses.logoUrl",
        "businesses.status",
        "businesses.createdAt",
        "users.email as ownerEmail",
        "users.displayName as ownerDisplayName",
      ])
      .orderBy("businesses.createdAt", "desc")
      .execute();

    return new Response(superjson.stringify(businesses satisfies OutputType), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching all businesses:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(
      superjson.stringify({
        error: "Failed to fetch businesses.",
        details: errorMessage,
      }),
      { status: 500 }
    );
  }
}