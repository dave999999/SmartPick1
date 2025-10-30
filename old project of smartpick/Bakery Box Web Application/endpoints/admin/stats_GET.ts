import { db } from "../../helpers/db";
import { getServerUserSession } from "../../helpers/getServerUserSession";
import { OutputType } from "./stats_GET.schema";
import superjson from "superjson";
import { sql } from "kysely";

export async function handle(request: Request) {
  try {
    const { user } = await getServerUserSession(request);

    if (user.role !== "admin") {
      return new Response(
        superjson.stringify({ error: "Forbidden: Admin access required." }),
        { status: 403 }
      );
    }

    const usersCountPromise = db
      .selectFrom("users")
      .select(db.fn.count("id").as("count"))
      .executeTakeFirstOrThrow();

    const partnersCountPromise = db
      .selectFrom("businesses")
      .select(db.fn.count("id").as("count"))
      .where("status", "=", "approved")
      .executeTakeFirstOrThrow();

    const ordersCountPromise = db
      .selectFrom("orders")
      .select(db.fn.count("id").as("count"))
      .executeTakeFirstOrThrow();

    const productsCountPromise = db
      .selectFrom("products")
      .select(db.fn.count("id").as("count"))
      .executeTakeFirstOrThrow();

    const pendingRegistrationsCountPromise = db
      .selectFrom("businesses")
      .select(db.fn.count("id").as("count"))
      .where("status", "=", "pending")
      .executeTakeFirstOrThrow();

    const [
      usersCountResult,
      partnersCountResult,
      ordersCountResult,
      productsCountResult,
      pendingRegistrationsCountResult,
    ] = await Promise.all([
      usersCountPromise,
      partnersCountPromise,
      ordersCountPromise,
      productsCountPromise,
      pendingRegistrationsCountPromise,
    ]);

    const stats: OutputType = {
      totalUsers: Number(usersCountResult.count),
      totalPartners: Number(partnersCountResult.count),
      totalOrders: Number(ordersCountResult.count),
      totalProducts: Number(productsCountResult.count),
      pendingRegistrations: Number(pendingRegistrationsCountResult.count),
    };

    return new Response(superjson.stringify(stats), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(
      superjson.stringify({
        error: "Failed to fetch statistics.",
        details: errorMessage,
      }),
      { status: 500 }
    );
  }
}