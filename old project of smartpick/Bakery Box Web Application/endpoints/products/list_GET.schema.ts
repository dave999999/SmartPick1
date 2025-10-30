import { z } from "zod";
import superjson from "superjson";
import { type Selectable } from "kysely";
import type { Products, Businesses } from "../../helpers/schema";

export const schema = z.object({
  search: z.string().optional(),
  minPrice: z.coerce.number().positive().optional(),
  maxPrice: z.coerce.number().positive().optional(),
  businessType: z.string().optional(),
  userLat: z.coerce.number().min(-90).max(90).optional(),
  userLng: z.coerce.number().min(-180).max(180).optional(),
  distance: z.coerce.number().positive().optional(),
  sortBy: z.enum(["price_asc", "price_desc", "distance"]).optional(),
});

export type InputType = z.infer<typeof schema>;

// A simplified business type for the response
type BusinessInfo = Pick<
  Selectable<Businesses>,
  | "id"
  | "name"
  | "description"
  | "businessType"
  | "address"
  | "latitude"
  | "longitude"
  | "phone"
  | "logoUrl"
  | "status"
>;

export type OutputType = Array<{
  product: Selectable<Products>;
  business: BusinessInfo;
  distance?: number; // Distance in kilometers (only present when userLat/userLng provided)
}>;

export const getProductsList = async (
  params?: z.infer<typeof schema>,
  init?: RequestInit
): Promise<OutputType> => {
  const queryParams = new URLSearchParams();
  if (params?.search) queryParams.append("search", params.search);
  if (params?.minPrice) queryParams.append("minPrice", params.minPrice.toString());
  if (params?.maxPrice) queryParams.append("maxPrice", params.maxPrice.toString());
  if (params?.businessType) queryParams.append("businessType", params.businessType);
  if (params?.userLat) queryParams.append("userLat", params.userLat.toString());
  if (params?.userLng) queryParams.append("userLng", params.userLng.toString());
  if (params?.distance) queryParams.append("distance", params.distance.toString());
  if (params?.sortBy) queryParams.append("sortBy", params.sortBy);
  
  const queryString = queryParams.toString();
  const url = `/_api/products/list${queryString ? `?${queryString}` : ''}`;
  
  const result = await fetch(url, {
    method: "GET",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!result.ok) {
    const errorObject = superjson.parse<{ error: string }>(
      await result.text()
    );
    throw new Error(errorObject.error);
  }
  return superjson.parse<OutputType>(await result.text());
};