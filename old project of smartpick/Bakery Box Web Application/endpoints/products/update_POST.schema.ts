import { z } from "zod";
import superjson from "superjson";
import { type Selectable } from "kysely";
import type { Products } from "../../helpers/schema";

export const schema = z
  .object({
    productId: z.number(),
    title: z.string().min(3, "Title must be at least 3 characters long."),
    description: z
      .string()
      .min(10, "Description must be at least 10 characters long."),
    originalPrice: z
      .number()
      .positive("Original price must be greater than 0."),
    discountedPrice: z
      .number()
      .positive("Discounted price must be greater than 0."),
    quantity: z.number().int().min(0, "Quantity must be 0 or more."),
    imageUrl: z.string().url("Please enter a valid image URL.").optional(),
    expirationHours: z
      .number()
      .int()
      .min(1, "Expiration hours must be at least 1.")
      .max(24, "Expiration hours must be at most 24.")
      .optional(),
  })
  .refine((data) => data.discountedPrice < data.originalPrice, {
    message: "Discounted price must be less than the original price.",
    path: ["discountedPrice"],
  });

export type InputType = z.infer<typeof schema>;

export type OutputType =
  | {
      success: true;
      product: Selectable<Products>;
    }
  | {
      success?: false;
      error: string;
      details?: any;
    };

export const postUpdateProduct = async (
  body: z.infer<typeof schema>,
  init?: RequestInit
): Promise<OutputType> => {
  const validatedInput = schema.parse(body);
  const result = await fetch(`/_api/products/update`, {
    method: "POST",
    body: superjson.stringify(validatedInput),
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const responseJson = superjson.parse<OutputType>(await result.text());
  if (!result.ok || ("error" in responseJson && responseJson.error)) {
    throw new Error(
      "error" in responseJson ? responseJson.error : "Failed to update product"
    );
  }
  return responseJson;
};