import { schema, OutputType } from "./create_POST.schema";
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

    // Calculate expiresAt timestamp
    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + input.expirationHours * 60 * 60 * 1000);

    // Get businessId based on user role
    let businessId: number;
    
    if (user.role === "partner") {
      // For partners, get their first business
      const business = await db
        .selectFrom("businesses")
        .select("id")
        .where("ownerId", "=", user.id)
        .where("status", "=", "approved")
        .executeTakeFirst();

      if (!business) {
        return new Response(
          superjson.stringify({
            error: "No approved business found. Please create and get your business approved first.",
          }),
          { status: 400 }
        );
      }
      
      businessId = business.id;
    } else {
      // For admins, find a business matching the businessType
      const business = await db
        .selectFrom("businesses")
        .select("id")
        .where("businessType", "=", input.businessType)
        .where("status", "=", "approved")
        .executeTakeFirst();

      if (!business) {
        return new Response(
          superjson.stringify({
            error: `No approved business found with type "${input.businessType}".`,
          }),
          { status: 400 }
        );
      }
      
      businessId = business.id;
    }

    const [newProduct] = await db
      .insertInto("products")
      .values({
        businessId: businessId,
        title: input.title,
        description: input.description,
        originalPrice: String(input.originalPrice),
        discountedPrice: String(input.discountedPrice),
        quantity: input.quantity,
        imageUrl: input.imageUrl,
        pickupTimeStart: input.pickupTimeStart,
        pickupTimeEnd: input.pickupTimeEnd,
        availableDate: new Date(input.availableDate),
        status: "available",
        expiresAt: expiresAt,
      })
      .returningAll()
      .execute();

    // Send notifications to users with notifications enabled
    try {
      // Get business details for the notification message
      const business = await db
        .selectFrom("businesses")
        .select(["name"])
        .where("id", "=", businessId)
        .executeTakeFirst();

      if (business) {
        // Get all users with email notifications enabled
        const usersWithNotifications = await db
          .selectFrom("userSettings")
          .innerJoin("users", "users.id", "userSettings.userId")
          .select(["userSettings.userId"])
          .where("userSettings.emailNotificationsEnabled", "=", true)
          .execute();

        // Create notifications for each user
        if (usersWithNotifications.length > 0) {
          const notificationRecords = usersWithNotifications.map((userSetting) => ({
            userId: userSetting.userId,
            type: "new_listing" as const,
            title: `New Product: ${newProduct.title}`,
            message: `${business.name} just listed "${newProduct.title}" at a discounted price. Check it out!`,
            link: "/",
            metadata: JSON.stringify({
              productId: newProduct.id,
              businessId: businessId,
            }),
            isRead: false,
          }));

          await db
            .insertInto("notifications")
            .values(notificationRecords)
            .execute();

          console.log(`Created ${notificationRecords.length} notifications for new product: ${newProduct.title}`);
        }
      }
    } catch (notificationError) {
      // Log but don't fail the request
      console.error("Failed to create notifications for new product:", notificationError);
    }

    return new Response(
      superjson.stringify({ success: true, product: newProduct } satisfies OutputType),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error creating product:", error);
    if (error instanceof ZodError) {
      return new Response(
        superjson.stringify({ error: "Invalid input.", details: error.errors }),
        { status: 400 }
      );
    }
    // NotAuthenticatedError from getServerUserSession is caught here
    if (error instanceof Error && error.message.includes("Not authenticated")) {
       return new Response(
        superjson.stringify({ error: "Authentication required." }),
        { status: 401 }
      );
    }
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(
      superjson.stringify({ error: "Failed to create product.", details: errorMessage }),
      { status: 500 }
    );
  }
}