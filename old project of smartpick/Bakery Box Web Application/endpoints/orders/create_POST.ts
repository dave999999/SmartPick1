import { schema, OutputType } from "./create_POST.schema";
import { db } from "../../helpers/db";
import { getServerSessionOrThrow } from "../../helpers/getSetServerSession";
import superjson from "superjson";
import { ZodError } from "zod";
import { type Transaction } from "kysely";
import { type DB } from "../../helpers/schema";

async function getOptionalUserId(request: Request): Promise<number | null> {
  try {
        const session = await getServerSessionOrThrow(request);
    if (session) {
      const sessionData = await db
        .selectFrom("sessions")
        .select("userId")
        .where("id", "=", session.id)
        .executeTakeFirst();
      return sessionData?.userId ?? null;
    }
  } catch (e) {
    // Ignore NotAuthenticatedError, return null for unauthenticated users
  }
  return null;
}

export async function handle(request: Request) {
  console.log("Deprecated endpoint accessed: orders/create_POST");
  
  return new Response(
    superjson.stringify({ 
      error: "Direct orders are no longer supported. Please use the reservation system instead.",
      details: "This endpoint has been deprecated. Migrate to the reservation system for order processing."
    }),
    { 
      status: 410,
      headers: { "Content-Type": "application/json" }
    }
  );
}