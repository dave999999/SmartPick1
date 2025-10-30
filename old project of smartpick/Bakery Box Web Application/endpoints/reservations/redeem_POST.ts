import { schema, OutputType } from "./redeem_POST.schema";
import { db } from "../../helpers/db";
import { getServerUserSession } from "../../helpers/getServerUserSession";
import superjson from "superjson";
import { ZodError } from "zod";

export async function handle(request: Request) {
  try {
    const { user } = await getServerUserSession(request);

    if (user.role !== "partner" && user.role !== "admin") {
      return new Response(
        superjson.stringify({ error: "Forbidden: Insufficient permissions." }),
        { status: 403 }
      );
    }

    const json = superjson.parse(await request.text());
    const input = schema.parse(json);

    const updatedReservation = await db.transaction().execute(async (trx) => {
      const reservation = await trx
        .selectFrom("reservations")
        .innerJoin("products", "reservations.productId", "products.id")
        .innerJoin("businesses", "products.businessId", "businesses.id")
        .where("reservations.id", "=", input.reservationId)
        .select([
          "reservations.id",
          "reservations.status",
          "reservations.expiresAt",
          "reservations.verificationCode",
          "businesses.ownerId",
        ])
        .executeTakeFirst();

      if (!reservation) {
        throw new Error("Reservation not found.");
      }
      if (user.role === "partner" && reservation.ownerId !== user.id) {
        throw new Error("You do not have permission to redeem this reservation.");
      }
      if (reservation.status !== "reserved") {
        throw new Error(`Cannot redeem reservation with status: ${reservation.status}.`);
      }
      if (new Date(reservation.expiresAt) < new Date()) {
        throw new Error("This reservation has expired.");
      }
      if (reservation.verificationCode !== input.verificationCode) {
        throw new Error("Invalid verification code.");
      }

      const [result] = await trx
        .updateTable("reservations")
        .set({
          status: "redeemed",
          redeemedAt: new Date(),
        })
        .where("id", "=", input.reservationId)
        .returningAll()
        .execute();
      
      return result;
    });

    return new Response(
      superjson.stringify({
        success: true,
        message: "Reservation redeemed successfully.",
        reservation: updatedReservation,
      } satisfies OutputType),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error redeeming reservation:", error);
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
        error: "Failed to redeem reservation.",
        details: errorMessage,
      }),
      { status: 500 }
    );
  }
}