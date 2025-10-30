import { schema, OutputType } from "./partner_GET.schema";
import { db } from "../../helpers/db";
import { getServerUserSession } from "../../helpers/getServerUserSession";
import superjson from "superjson";
import { sql } from "kysely";

async function expireReservationsForBusinesses(businessIds: number[]) {
  if (businessIds.length === 0) return;

  await db.transaction().execute(async (trx) => {
    const expiredReservations = await trx
      .selectFrom("reservations")
      .innerJoin("products", "reservations.productId", "products.id")
      .select(["reservations.id", "reservations.productId", "reservations.quantity"])
      .where("products.businessId", "in", businessIds)
      .where("reservations.status", "=", "reserved")
      .where("reservations.expiresAt", "<", new Date())
      .execute();

    if (expiredReservations.length === 0) {
      return;
    }

    const reservationIds = expiredReservations.map((r) => r.id);

    await trx
      .updateTable("reservations")
      .set({ status: "expired" })
      .where("id", "in", reservationIds)
      .execute();

    for (const reservation of expiredReservations) {
      await trx
        .updateTable("products")
        .set({
          quantity: sql`quantity + ${reservation.quantity}`,
          status: sql`CASE WHEN status = 'sold_out' THEN 'available' ELSE status END`,
        })
        .where("id", "=", reservation.productId)
        .execute();
    }
  });
}

export async function handle(request: Request) {
  try {
    const { user } = await getServerUserSession(request);

    if (user.role !== "partner" && user.role !== "admin") {
      return new Response(
        superjson.stringify({ error: "Forbidden: Insufficient permissions." }),
        { status: 403 }
      );
    }

    const businesses = await db
      .selectFrom("businesses")
      .select("id")
      .where("ownerId", "=", user.id)
      .execute();

    const businessIds = businesses.map((b) => b.id);

    if (businessIds.length === 0 && user.role === "partner") {
      return new Response(superjson.stringify([] satisfies OutputType), {
        headers: { "Content-Type": "application/json" },
      });
    }

    await expireReservationsForBusinesses(businessIds);

    let query = db
      .selectFrom("reservations")
      .innerJoin("products", "reservations.productId", "products.id")
      .innerJoin("businesses", "products.businessId", "businesses.id")
      .innerJoin("users", "reservations.userId", "users.id")
      .where("reservations.status", "=", "reserved");

    if (user.role === "partner") {
      query = query.where("businesses.id", "in", businessIds);
    }
    // Admins can see all reservations

    const reservations = await query
      .select([
        "reservations.id as reservationId",
        "reservations.expiresAt",
        "reservations.verificationCode",
        "reservations.quantity",
        "products.id as productId",
        "products.title as productTitle",
        "products.pickupTimeStart",
        "products.pickupTimeEnd",
        "products.availableDate",
        "products.imageUrl",
        "products.originalPrice",
        "products.discountedPrice",
        "businesses.id as businessId",
        "businesses.name as businessName",
        "users.id as userId",
        "users.displayName as userDisplayName",
        "users.email as userEmail",
      ])
      .orderBy("reservations.expiresAt", "asc")
      .execute();

    return new Response(superjson.stringify(reservations satisfies OutputType), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching partner reservations:", error);
    if (error instanceof Error && error.message.includes("Not authenticated")) {
      return new Response(
        superjson.stringify({ error: "Authentication required." }),
        { status: 401 }
      );
    }
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(
      superjson.stringify({
        error: "Failed to fetch reservations.",
        details: errorMessage,
      }),
      { status: 500 }
    );
  }
}