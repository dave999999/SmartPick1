import { schema, OutputType } from "./create_POST.schema";
import { db } from "../../helpers/db";
import { getServerUserSession } from "../../helpers/getServerUserSession";
import superjson from "superjson";
import { ZodError } from "zod";

export async function handle(request: Request): Promise<Response> {
  try {
    const { user } = await getServerUserSession(request);

    if (user.role !== "partner" && user.role !== "admin") {
      return new Response(
        superjson.stringify({
          error: "Unauthorized. Only partners can create businesses.",
        }),
        { status: 403 }
      );
    }

    const json = superjson.parse(await request.text());
    const validatedInput = schema.parse(json);

    const [newBusiness] = await db
      .insertInto("businesses")
      .values({
        ownerId: user.id,
        name: validatedInput.name,
        description: validatedInput.description,
        address: validatedInput.address,
        latitude: validatedInput.latitude.toString(),
        longitude: validatedInput.longitude.toString(),
        phone: validatedInput.contactPhone,
        businessType: validatedInput.businessType,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returningAll()
      .execute();

    if (!newBusiness) {
      throw new Error("Failed to create business in the database.");
    }

    return new Response(
      superjson.stringify({ success: true, business: newBusiness } satisfies OutputType),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error creating business:", error);
    if (error instanceof ZodError) {
      return new Response(
        superjson.stringify({ error: "Invalid input", details: error.errors }),
        { status: 400 }
      );
    }
    if (error instanceof Error) {
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