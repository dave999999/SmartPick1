import { db } from "../../helpers/db";
import { schema, OutputType } from "./register_POST.schema";
import superjson from "superjson";
import bcrypt from "bcryptjs";

export async function handle(request: Request) {
  try {
    const json = superjson.parse(await request.text());
    const input = schema.parse(json);

    const {
      name,
      description,
      businessType,
      address,
      latitude,
      longitude,
      phone,
      logoUrl,
      ownerEmail,
      ownerDisplayName,
      ownerPassword,
    } = input;

    const existingUser = await db
      .selectFrom("users")
      .select("id")
      .where("email", "=", ownerEmail)
      .executeTakeFirst();

    if (existingUser) {
      return new Response(
        superjson.stringify({
          error: "An account with this email already exists.",
        }),
        { status: 409 }
      );
    }

    const businessId = await db.transaction().execute(async (trx) => {
      const passwordHash = await bcrypt.hash(ownerPassword, 10);

      const newUser = await trx
        .insertInto("users")
        .values({
          email: ownerEmail,
          displayName: ownerDisplayName,
          role: "user", // Role is 'user' until approved
        })
        .returning("id")
        .executeTakeFirstOrThrow();

      await trx.insertInto("userPasswords").values({
        userId: newUser.id,
        passwordHash: passwordHash,
      }).execute();

      const newBusiness = await trx
        .insertInto("businesses")
        .values({
          name,
          description,
          businessType,
          address,
          latitude: latitude?.toString(),
          longitude: longitude?.toString(),
          phone,
          logoUrl,
          ownerId: newUser.id,
          status: "pending",
        })
        .returning("id")
        .executeTakeFirstOrThrow();

      return newBusiness.id;
    });

    return new Response(
      superjson.stringify({
        success: true,
        message: "Registration submitted for approval.",
        businessId,
      } satisfies OutputType),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error registering business:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(
      superjson.stringify({
        error: "Failed to register business.",
        details: errorMessage,
      }),
      { status: 500 }
    );
  }
}