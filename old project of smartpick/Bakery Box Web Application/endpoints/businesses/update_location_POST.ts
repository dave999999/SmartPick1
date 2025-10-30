import { schema, OutputType } from "./update_location_POST.schema";
import { db } from "../../helpers/db";
import { getServerUserSession } from "../../helpers/getServerUserSession";
import superjson from "superjson";
import { ZodError } from "zod";
import { type Transaction } from "kysely";
import { type DB } from "../../helpers/schema";

async function updateBusinessLocation(
  input: {
    businessId: number;
    latitude: number;
    longitude: number;
    address?: string;
  },
  userId: number,
  userRole: "admin" | "partner" | "user",
  trx: Transaction<DB>
) {
  const business = await trx
    .selectFrom("businesses")
    .select(["id", "ownerId"])
    .where("id", "=", input.businessId)
    .executeTakeFirst();

  if (!business) {
    throw new Error("Business not found.");
  }

  if (userRole !== "admin" && business.ownerId !== userId) {
    throw new Error("You are not authorized to update this business.");
  }

  const updateData: {
    latitude: string;
    longitude: string;
    address?: string;
    updatedAt: Date;
  } = {
    latitude: input.latitude.toString(),
    longitude: input.longitude.toString(),
    updatedAt: new Date(),
  };

  if (input.address) {
    updateData.address = input.address;
  }

  const [updatedBusiness] = await trx
    .updateTable("businesses")
    .set(updateData)
    .where("id", "=", input.businessId)
    .returningAll()
    .execute();

  if (!updatedBusiness) {
    throw new Error("Failed to update business location in the database.");
  }

  return updatedBusiness;
}

export async function handle(request: Request): Promise<Response> {
  try {
    const { user } = await getServerUserSession(request);

    if (user.role !== "partner" && user.role !== "admin") {
      return new Response(
        superjson.stringify({
          error: "Unauthorized. Only partners or admins can update locations.",
        }),
        { status: 403 }
      );
    }

    const json = superjson.parse(await request.text());
    const validatedInput = schema.parse(json);

    const updatedBusiness = await db.transaction().execute(async (trx) => {
      return await updateBusinessLocation(
        validatedInput,
        user.id,
        user.role,
        trx
      );
    });

    return new Response(
      superjson.stringify({
        success: true,
        business: updatedBusiness,
      } satisfies OutputType),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error updating business location:", error);
    if (error instanceof ZodError) {
      return new Response(
        superjson.stringify({ error: "Invalid input", details: error.errors }),
        { status: 400 }
      );
    }
    if (error instanceof Error) {
      // Check for specific error messages to return appropriate status codes
      if (error.message === "Business not found.") {
        return new Response(superjson.stringify({ error: error.message }), {
          status: 404,
        });
      }
      if (
        error.message === "You are not authorized to update this business."
      ) {
        return new Response(superjson.stringify({ error: error.message }), {
          status: 403,
        });
      }
      return new Response(superjson.stringify({ error: error.message }), {
        status: 400,
      });
    }
    return new Response(
      superjson.stringify({ error: "An unexpected error occurred." }),
      { status: 500 }
    );
  }
}