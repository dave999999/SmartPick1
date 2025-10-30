import { schema, OutputType } from "./create_POST.schema";
import { db } from "../../helpers/db";
import { getServerUserSession } from "../../helpers/getServerUserSession";
import superjson from "superjson";
import { ZodError } from "zod";
import { sql } from "kysely";

function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function handle(request: Request) {
  try {
    const { user } = await getServerUserSession(request);
    const json = superjson.parse(await request.text());
    const input = schema.parse(json);

    const reservation = await db.transaction().execute(async (trx) => {
      // 1. Check if user is under penalty
      const userRecord = await trx
        .selectFrom("users")
        .select(["penaltyUntil"])
        .where("id", "=", user.id)
        .executeTakeFirstOrThrow();

      if (userRecord.penaltyUntil) {
        const now = new Date();
        if (userRecord.penaltyUntil > now) {
          const error = new Error("You are currently under penalty and cannot create reservations.");
          (error as any).penaltyUntil = userRecord.penaltyUntil;
          throw error;
        }
      }

      // 2. Check for user's active reservations count
      const { count: activeReservationsCount } = await trx
        .selectFrom("reservations")
        .select(db.fn.count("id").as("count"))
        .where("userId", "=", user.id)
        .where("status", "=", "reserved")
        .executeTakeFirstOrThrow();

      if (Number(activeReservationsCount) >= 3) {
        throw new Error("You cannot have more than 3 active reservations.");
      }

      // 3. Check if user already has an active reservation for this product
      const existingReservation = await trx
        .selectFrom("reservations")
        .select("id")
        .where("userId", "=", user.id)
        .where("productId", "=", input.productId)
        .where("status", "=", "reserved")
        .executeTakeFirst();

      if (existingReservation) {
        throw new Error(
          "You already have an active reservation for this product."
        );
      }

      // 4. Lock product row and check availability
      const product = await trx
        .selectFrom("products")
        .selectAll()
        .where("id", "=", input.productId)
        .forUpdate()
        .executeTakeFirst();

      if (!product) {
        throw new Error("Product not found.");
      }
      if (product.status !== "available") {
        throw new Error("This product is no longer available.");
      }

      // 5. Check if quantity is sufficient
      if (product.quantity < input.quantity) {
        throw new Error("Not enough stock available for the requested quantity.");
      }

      // 6. Decrement product quantity
      const newQuantity = product.quantity - input.quantity;
      const newStatus = newQuantity === 0 ? "sold_out" : "available";

      await trx
        .updateTable("products")
        .set({
          quantity: newQuantity,
          status: newStatus,
        })
        .where("id", "=", product.id)
        .execute();

      // 7. Create the reservation
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes from now
      const verificationCode = generateVerificationCode();

      const [newReservation] = await trx
        .insertInto("reservations")
        .values({
          productId: input.productId,
          userId: user.id,
          status: "reserved",
          reservedAt: now,
          expiresAt: expiresAt,
          verificationCode: verificationCode,
          quantity: input.quantity,
        })
        .returning(["id", "verificationCode", "expiresAt"])
        .execute();

      return newReservation;
    });

    return new Response(
      superjson.stringify({ success: true, reservation } satisfies OutputType),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error creating reservation:", error);
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
    const responseBody: any = {
      error: "Failed to create reservation.",
      details: errorMessage,
    };
    
    // Include penaltyUntil if it's a penalty error
    if (error instanceof Error && (error as any).penaltyUntil) {
      responseBody.penaltyUntil = (error as any).penaltyUntil;
    }
    
    return new Response(
      superjson.stringify(responseBody),
      { status: 500 }
    );
  }
}