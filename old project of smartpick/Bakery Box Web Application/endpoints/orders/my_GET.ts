import superjson from "superjson";
import { db } from "../../helpers/db";
import { getServerUserSession } from "../../helpers/getServerUserSession";
import { type OutputType } from "./my_GET.schema";

export async function handle(request: Request) {
  try {
    const { user } = await getServerUserSession(request);

    const orders = await db
      .selectFrom("orders")
      .innerJoin("products", "orders.productId", "products.id")
      .innerJoin("businesses", "products.businessId", "businesses.id")
      .select([
        "orders.id",
        "orders.userId",
        "orders.productId",
        "orders.quantity",
        "orders.totalPrice",
        "orders.status",
        "orders.customerEmail",
        "orders.customerName",
        "orders.createdAt",
        "orders.updatedAt",
        "products.title as productTitle",
        "products.imageUrl as productImageUrl",
        "businesses.name as businessName",
        "businesses.address as businessAddress",
      ])
      .where("orders.userId", "=", user.id)
      .orderBy("orders.createdAt", "desc")
      .execute();

    const formattedOrders: OutputType = orders.map((order) => ({
      id: order.id,
      userId: order.userId,
      productId: order.productId,
      quantity: order.quantity,
      totalPrice: order.totalPrice,
      status: order.status,
      customerEmail: order.customerEmail,
      customerName: order.customerName,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      product: {
        title: order.productTitle,
        imageUrl: order.productImageUrl,
      },
      business: {
        name: order.businessName,
        address: order.businessAddress,
      },
    }));

    return new Response(superjson.stringify(formattedOrders), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching user orders:", error);
    if (error instanceof Error && error.message.includes("Not authenticated")) {
      return new Response(
        superjson.stringify({ error: "Authentication required." }),
        { status: 401 }
      );
    }
    return new Response(
      superjson.stringify({ error: "Failed to fetch orders." }),
      { status: 500 }
    );
  }
}