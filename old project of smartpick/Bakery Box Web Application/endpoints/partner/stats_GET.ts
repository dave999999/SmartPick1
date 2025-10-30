import { db } from "../../helpers/db";
import { getServerUserSession } from "../../helpers/getServerUserSession";
import { OutputType } from "./stats_GET.schema";
import superjson from "superjson";
import { sql } from "kysely";
import { NotAuthenticatedError } from "../../helpers/getSetServerSession";

export async function handle(request: Request) {
  try {
    const { user } = await getServerUserSession(request);

    if (user.role !== "partner") {
      return new Response(
        superjson.stringify({ error: "Forbidden: Partner access required." }),
        { status: 403 }
      );
    }

    const partnerBusinessesQuery = db
      .selectFrom("businesses")
      .select("id")
      .where("ownerId", "=", user.id)
      .where("status", "=", "approved");

    // 1. Active Deals
    const activeDealsPromise = db
      .selectFrom("products")
      .select(db.fn.count("id").as("count"))
      .where("businessId", "in", partnerBusinessesQuery)
      .where("status", "=", "available")
      .where("quantity", ">", 0)
      .executeTakeFirstOrThrow();

    // 2. Reservations Today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const reservationsTodayPromise = db
      .selectFrom("reservations")
      .innerJoin("products", "reservations.productId", "products.id")
      .select(db.fn.count("reservations.id").as("count"))
      .where("products.businessId", "in", partnerBusinessesQuery)
      .where("reservations.createdAt", ">=", today)
      .executeTakeFirstOrThrow();

    // 3. Redeemed This Week
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const redeemedThisWeekPromise = db
      .selectFrom("reservations")
      .innerJoin("products", "reservations.productId", "products.id")
      .select(db.fn.count("reservations.id").as("count"))
      .where("products.businessId", "in", partnerBusinessesQuery)
      .where("reservations.status", "=", "redeemed")
      .where("reservations.redeemedAt", ">=", sevenDaysAgo)
      .executeTakeFirstOrThrow();

    const [
      activeDealsResult,
      reservationsTodayResult,
      redeemedThisWeekResult,
    ] = await Promise.all([
      activeDealsPromise,
      reservationsTodayPromise,
      redeemedThisWeekPromise,
    ]);

    const stats: OutputType = {
      activeDeals: Number(activeDealsResult.count),
      reservationsToday: Number(reservationsTodayResult.count),
      redeemedThisWeek: Number(redeemedThisWeekResult.count),
    };

    return new Response(superjson.stringify(stats), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching partner stats:", error);
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
        error: "Failed to fetch statistics.",
        details: errorMessage,
      }),
      { status: 500 }
    );
  }
}