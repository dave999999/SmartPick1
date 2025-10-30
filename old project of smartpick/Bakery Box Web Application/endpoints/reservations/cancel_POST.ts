import { schema, OutputType } from "./cancel_POST.schema";
import { db } from "../../helpers/db";
import { getServerUserSession } from "../../helpers/getServerUserSession";
import superjson from "superjson";
import { ZodError } from "zod";
import { sql } from "kysely";

export async function handle(request: Request) {
  try {
    const { user } = await getServerUserSession(request);
    const json = superjson.parse(await request.text());
    const input = schema.parse(json);

    await db.transaction().execute(async (trx) => {
      const reservation = await trx
        .selectFrom("reservations")
        .selectAll()
        .where("id", "=", input.reservationId)
        .forUpdate()
        .executeTakeFirst();

      if (!reservation) {
        throw new Error("Reservation not found.");
      }
      if (reservation.userId !== user.id) {
        throw new Error("You do not have permission to cancel this reservation.");
      }
      if (reservation.status !== "reserved") {
        throw new Error(`Cannot cancel reservation with status: ${reservation.status}.`);
      }
      if (new Date(reservation.expiresAt) < new Date()) {
        throw new Error("This reservation has already expired.");
      }

      // Update reservation status
      await trx
        .updateTable("reservations")
        .set({ status: "cancelled" })
        .where("id", "=", input.reservationId)
        .execute();

      // Restore product quantity from reservation
      await trx
        .updateTable("products")
        .set({
          quantity: sql`quantity + ${reservation.quantity}`,
          status: sql`CASE WHEN status = 'sold_out' THEN 'available' ELSE status END`,
        })
        .where("id", "=", reservation.productId)
        .execute();
    });

    return new Response(
      superjson.stringify({
        success: true,
        message: "Reservation cancelled successfully.",
      } satisfies OutputType),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error cancelling reservation:", error);
    if (error instanceof ZodError) {
      return new Response(
        superjson.stringify({ error: "Invalid input.", details: error.errors }),
        { status: 400 }
      );
    }
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
        error: "Failed to cancel reservation.",
        details: errorMessage,
      }),
      { status: 500 }
    );
  }
}