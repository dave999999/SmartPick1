import { schema, OutputType } from "./my_GET.schema";
import { db } from "../../helpers/db";
import { getServerUserSession } from "../../helpers/getServerUserSession";
import superjson from "superjson";
import { sql } from "kysely";

async function expireReservationsForUser(userId: number) {
  await db.transaction().execute(async (trx) => {
    // Find expired reservations for the user
    const expiredReservations = await trx
      .selectFrom("reservations")
      .select(["id", "productId", "quantity"])
      .where("userId", "=", userId)
      .where("status", "=", "reserved")
      .where("expiresAt", "<", new Date())
      .execute();

    if (expiredReservations.length === 0) {
      return;
    }

    const reservationIds = expiredReservations.map((r) => r.id);

    // Update status to 'expired'
    await trx
      .updateTable("reservations")
      .set({ status: "expired" })
      .where("id", "in", reservationIds)
      .execute();

    // Restore product quantity from reservation
    for (const reservation of expiredReservations) {
      await trx
        .updateTable("products")
        .set({
          quantity: sql`quantity + ${reservation.quantity}`,
          // If it was sold_out, it's now available
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

    // Expire any outdated reservations before fetching
    await expireReservationsForUser(user.id);

    const reservations = await db
      .selectFrom("reservations")
      .innerJoin("products", "reservations.productId", "products.id")
      .innerJoin("businesses", "products.businessId", "businesses.id")
      .where("reservations.userId", "=", user.id)
      .select([
        "reservations.id as reservationId",
        "reservations.status as reservationStatus",
        "reservations.expiresAt",
        "reservations.redeemedAt",
        "reservations.reservedAt",
        "reservations.createdAt",
        "reservations.verificationCode",
        "reservations.quantity",
        "products.id as productId",
        "products.title as productTitle",
        "products.imageUrl as productImageUrl",
        "products.discountedPrice",
        "products.originalPrice",
        "products.pickupTimeStart",
        "products.pickupTimeEnd",
        "products.availableDate",
        "businesses.id as businessId",
        "businesses.name as businessName",
        "businesses.address as businessAddress",
      ])
      .orderBy("reservations.createdAt", "desc")
      .execute();

    return new Response(superjson.stringify(reservations satisfies OutputType), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching user reservations:", error);
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