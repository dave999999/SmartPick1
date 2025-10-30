import { db } from "../../helpers/db";
import { OutputType, schema } from "./list_GET.schema";
import superjson from "superjson";
import { sql } from "kysely";

export async function handle(request: Request) {
  try {
    // Parse query parameters
    const url = new URL(request.url);
    const searchParams = Object.fromEntries(url.searchParams);
    
    // Validate query parameters
    const validationResult = schema.safeParse(searchParams);
    if (!validationResult.success) {
      return new Response(
        superjson.stringify({ 
          error: "Invalid query parameters", 
          details: validationResult.error.errors 
        }),
        { status: 400 }
      );
    }
    
    const params = validationResult.data;
    
    // Check if distance sorting or filtering requires location
    if ((params.sortBy === "distance" || params.distance) && (!params.userLat || !params.userLng)) {
      return new Response(
        superjson.stringify({ 
          error: "userLat and userLng are required for distance-based filtering or sorting" 
        }),
        { status: 400 }
      );
    }

    // Get today's date at midnight in the correct timezone (or UTC)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get current server time for expiration checks
    const now = new Date();

    // Build the base query
    let query = db
      .selectFrom("products")
      .innerJoin("businesses", "products.businessId", "businesses.id")
      .selectAll("products")
      .select([
        "businesses.id as businessId",
        "businesses.name as businessName",
        "businesses.description as businessDescription",
        "businesses.businessType as businessType",
        "businesses.address as businessAddress",
        "businesses.latitude as businessLatitude",
        "businesses.longitude as businessLongitude",
        "businesses.phone as businessPhone",
        "businesses.logoUrl as businessLogoUrl",
        "businesses.status as businessStatus",
      ])
      .where("products.status", "=", "available")
      .where("products.availableDate", ">=", today)
      .where("products.quantity", ">", 0)
      .where((eb) =>
        eb.and([
          eb("products.expiresAt", "is not", null),
          eb("products.expiresAt", ">", now),
        ])
      );

    // Hoist the Haversine formula for distance calculation when user location is provided
    const distanceExpr = (params.userLat !== undefined && params.userLng !== undefined)
      ? sql<number>`(
          6371 * acos(
            cos(radians(${params.userLat})) * 
            cos(radians(businesses.latitude)) * 
            cos(radians(businesses.longitude) - radians(${params.userLng})) + 
            sin(radians(${params.userLat})) * 
            sin(radians(businesses.latitude))
          )
        )`
      : null;

    // Add distance calculation if user location is provided
    if (distanceExpr) {
      query = query.select(distanceExpr.as("distance"));
    }

    // Apply search filter
    if (params.search) {
      const searchTerm = `%${params.search}%`;
      query = query.where((eb) =>
        eb.or([
          eb("products.title", "ilike", searchTerm),
          eb("products.description", "ilike", searchTerm),
        ])
      );
    }

    // Apply price filters
    if (params.minPrice !== undefined) {
      query = query.where("products.discountedPrice", ">=", params.minPrice.toString());
    }
    if (params.maxPrice !== undefined) {
      query = query.where("products.discountedPrice", "<=", params.maxPrice.toString());
    }

    // Apply business type filter (case-insensitive exact match)
    if (params.businessType) {
      query = query.where(
        sql`LOWER(businesses.business_type)`,
        "=",
        params.businessType.toLowerCase()
      );
    }

    // Apply distance filter using the hoisted expression
    if (params.distance !== undefined && distanceExpr) {
      query = query.where(sql<boolean>`${distanceExpr} <= ${params.distance}`);
    }

    // Apply sorting
    if (params.sortBy === "price_asc") {
      query = query.orderBy("products.discountedPrice", "asc");
    } else if (params.sortBy === "price_desc") {
      query = query.orderBy("products.discountedPrice", "desc");
    } else if (params.sortBy === "distance" && distanceExpr) {
      query = query.orderBy(distanceExpr, "asc");
    } else {
      // Default sorting by creation date
      query = query.orderBy("products.createdAt", "desc");
    }

    const productsWithBusiness = await query.execute();

    const responseData: OutputType = productsWithBusiness.map((p) => {
      const item: OutputType[number] = {
        product: {
          id: p.id,
          title: p.title,
          description: p.description,
          originalPrice: p.originalPrice,
          discountedPrice: p.discountedPrice,
          quantity: p.quantity,
          imageUrl: p.imageUrl,
          pickupTimeStart: p.pickupTimeStart,
          pickupTimeEnd: p.pickupTimeEnd,
          availableDate: p.availableDate,
          status: p.status,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
          businessId: p.businessId,
          expiresAt: p.expiresAt,
        },
        business: {
          id: p.businessId,
          name: p.businessName,
          description: p.businessDescription,
          businessType: p.businessType,
          address: p.businessAddress,
          latitude: p.businessLatitude,
          longitude: p.businessLongitude,
          phone: p.businessPhone,
          logoUrl: p.businessLogoUrl,
          status: p.businessStatus,
        },
      };
      
      // Add distance if it was calculated
      if ('distance' in p && p.distance !== undefined) {
        item.distance = p.distance as number;
      }
      
      return item;
    });

    return new Response(superjson.stringify(responseData), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching available products:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(
      superjson.stringify({ error: "Failed to fetch products.", details: errorMessage }),
      { status: 500 }
    );
  }
}