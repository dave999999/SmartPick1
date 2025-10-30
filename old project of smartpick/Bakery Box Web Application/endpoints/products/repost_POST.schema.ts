import { z } from "zod";
import superjson from "superjson";
import { type Selectable } from "kysely";
import type { Products } from "../../helpers/schema";

export const schema = z
  .object({
    productId: z.number().int().positive(),
    title: z.string().min(3, "Title must be at least 3 characters long.").optional(),
    description: z
      .string()
      .min(10, "Description must be at least 10 characters long.")
      .optional(),
    originalPrice: z.number().positive("Original price must be greater than 0.").optional(),
    discountedPrice: z
      .number()
      .positive("Discounted price must be greater than 0.")
      .optional(),
    quantity: z.number().int().min(1, "Quantity must be at least 1.").optional(),
    availableDate: z.string().refine((date) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const available = new Date(date);
        return available >= today;
    }, "Available date cannot be in the past.").optional(),
    expirationHours: z
      .number()
      .int()
      .min(1, "Expiration hours must be at least 1.")
      .max(24, "Expiration hours cannot exceed 24.")
      .optional()
      .default(9),
  })
  .refine(
    (data) => {
      if (data.discountedPrice !== undefined && data.originalPrice !== undefined) {
        return data.discountedPrice < data.originalPrice;
      }
      return true;
    },
    {
      message: "Discounted price must be less than the original price.",
      path: ["discountedPrice"],
    }
  );

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

export const postRepostProduct = async (
  body: z.infer<typeof schema>,
  init?: RequestInit
): Promise<OutputType> => {
  const validatedInput = schema.parse(body);
  const result = await fetch(`/_api/products/repost`, {
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
      "error" in responseJson ? responseJson.error : "Failed to repost product"
    );
  }
  return responseJson;
};