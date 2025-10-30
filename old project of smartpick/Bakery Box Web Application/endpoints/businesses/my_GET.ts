import { db } from "../../helpers/db";
import { getServerUserSession } from "../../helpers/getServerUserSession";
import { OutputType } from "./my_GET.schema";
import superjson from "superjson";

export async function handle(request: Request) {
  try {
    const { user } = await getServerUserSession(request);

    if (user.role !== "partner" && user.role !== "admin") {
      return new Response(
        superjson.stringify({ error: "Forbidden: Insufficient permissions." }),
        { status: 403 }
      );
    }

    const query = db.selectFrom("businesses").selectAll();

    // Admins can see all businesses, partners only see their own
    const businesses =
      user.role === "admin"
        ? await query.execute()
        : await query.where("ownerId", "=", user.id).execute();

    return new Response(superjson.stringify(businesses satisfies OutputType), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching user's businesses:", error);
    // NotAuthenticatedError from getServerUserSession is caught here
    if (error instanceof Error && error.message.includes("Not authenticated")) {
       return new Response(
        superjson.stringify({ error: "Authentication required." }),
        { status: 401 }
      );
    }
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(
      superjson.stringify({ error: "Failed to fetch businesses.", details: errorMessage }),
      { status: 500 }
    );
  }
}