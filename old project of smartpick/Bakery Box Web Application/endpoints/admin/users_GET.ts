import { db } from "../../helpers/db";
import { getServerUserSession } from "../../helpers/getServerUserSession";
import { OutputType } from "./users_GET.schema";
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

    const users = await db
      .selectFrom("users")
      .leftJoin("reservations", "reservations.userId", "users.id")
      .select([
        "users.id",
        "users.email",
        "users.displayName",
        "users.role",
        "users.createdAt",
        (eb) =>
          eb.fn.count<number>("reservations.id").as("totalReservations"),
        (eb) =>
          eb.fn
            .count<number>(
              eb.case()
                .when("reservations.status", "=", "expired")
                .then("reservations.id")
                .end()
            )
            .as("expiredReservations"),
        (eb) =>
          eb.fn
            .count<number>(
              eb.case()
                .when("reservations.status", "=", "cancelled")
                .then("reservations.id")
                .end()
            )
            .as("cancelledReservations"),
        (eb) =>
          eb.fn
            .count<number>(
              eb.case()
                .when("reservations.status", "=", "redeemed")
                .then("reservations.id")
                .end()
            )
            .as("redeemedReservations"),
        (eb) =>
          sql<number>`
            CASE 
              WHEN COUNT(${eb.ref("reservations.id")}) > 0 
              THEN (
                COUNT(CASE WHEN ${eb.ref("reservations.status")} = 'expired' THEN 1 END) + 
                COUNT(CASE WHEN ${eb.ref("reservations.status")} = 'cancelled' THEN 1 END)
              ) * 100.0 / COUNT(${eb.ref("reservations.id")})
              ELSE 0 
            END
          `.as("fraudScore"),
      ])
      .groupBy([
        "users.id",
        "users.email",
        "users.displayName",
        "users.role",
        "users.createdAt",
      ])
      .orderBy("users.createdAt", "desc")
      .execute();

    const formattedUsers = users.map((user) => ({
      ...user,
      totalReservations: Number(user.totalReservations),
      expiredReservations: Number(user.expiredReservations),
      cancelledReservations: Number(user.cancelledReservations),
      redeemedReservations: Number(user.redeemedReservations),
      fraudScore: Number(user.fraudScore),
    }));

    return new Response(
      superjson.stringify(formattedUsers satisfies OutputType),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error fetching all users:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(
      superjson.stringify({
        error: "Failed to fetch users.",
        details: errorMessage,
      }),
      { status: 500 }
    );
  }
}