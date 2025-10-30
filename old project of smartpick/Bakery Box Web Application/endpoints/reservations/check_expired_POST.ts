import { db } from "../../helpers/db";
import superjson from "superjson";
import { OutputType } from "./check_expired_POST.schema";
import { sql, Transaction } from "kysely";
import { DB, ProductStatus } from "../../helpers/schema";

// Helper function to calculate penalty duration
const getPenaltyDurationMinutes = (penaltyCount: number): number => {
  // 10 minutes for the first offense (penaltyCount is 0 before incrementing)
  // 30 minutes for subsequent offenses
  return penaltyCount === 0 ? 10 : 30;
};

// Helper function to apply penalty to a user within a transaction
const applyPenalty = async (
  trx: Transaction<DB>,
  userId: number,
  penaltyCount: number
) => {
  const penaltyMinutes = getPenaltyDurationMinutes(penaltyCount);
  const penaltyUntil = new Date(Date.now() + penaltyMinutes * 60 * 1000);

  await trx
    .updateTable("users")
    .set({
      penaltyCount: sql`penalty_count + 1`,
      penaltyUntil: penaltyUntil,
    })
    .where("id", "=", userId)
    .execute();
};

export async function handle(request: Request) {
  try {
    const processedCount = await db.transaction().execute(async (trx) => {
      const now = new Date();

      // 1. Find all reservations that are 'reserved' and have expired.
      // We join with users to get their current penalty_count.
      // We lock the selected reservation rows to prevent race conditions.
      const expiredReservations = await trx
        .selectFrom("reservations")
        .innerJoin("users", "users.id", "reservations.userId")
        .select([
          "reservations.id as reservationId",
          "reservations.productId",
          "reservations.quantity",
          "reservations.userId",
          "users.penaltyCount",
        ])
        .where("reservations.status", "=", "reserved")
        .where("reservations.expiresAt", "<", now)
        .forUpdate() // Lock the reservation rows for processing
        .execute();

      if (expiredReservations.length === 0) {
        return 0; // No expired reservations to process
      }

      const reservationIds = expiredReservations.map((r) => r.reservationId);

      // 2. Update all expired reservations' status to 'expired' in one query.
      await trx
        .updateTable("reservations")
        .set({ status: "expired" })
        .where("id", "in", reservationIds)
        .execute();

      // 3. Process product stock updates and user penalties.
      // We group penalties by user to apply them only once per user, even if they have multiple expired reservations in this batch.
      const userPenalties = new Map<number, { penaltyCount: number }>();
      for (const res of expiredReservations) {
        if (!userPenalties.has(res.userId)) {
          userPenalties.set(res.userId, { penaltyCount: res.penaltyCount });
        }
      }

      // Apply penalties for each unique user.
      for (const [userId, { penaltyCount }] of userPenalties.entries()) {
        await applyPenalty(trx, userId, penaltyCount);
      }

      // Restore product quantities.
      for (const res of expiredReservations) {
        await trx
          .updateTable("products")
          .set({
            quantity: sql`quantity + ${res.quantity}`,
            status: sql`CASE WHEN status = 'sold_out' THEN 'available'::product_status ELSE status END`
          })
          .where("id", "=", res.productId)
          .execute();
      }

      return expiredReservations.length;
    });

    console.log(`Processed ${processedCount} expired reservations.`);

    return new Response(
      superjson.stringify({
        success: true,
        processedCount,
      } satisfies OutputType),
      {
        headers: { "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error processing expired reservations:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(
      superjson.stringify({
        success: false,
        error: "Failed to process expired reservations.",
        details: errorMessage,
      }),
      {
        headers: { "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
}