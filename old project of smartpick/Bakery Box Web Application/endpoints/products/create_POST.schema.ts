import { z } from "zod";
import superjson from "superjson";
import { type Selectable } from "kysely";
import type { Products } from "../../helpers/schema";

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/; // HH:MM format

export const schema = z
  .object({
    businessType: z.string().min(1, "Business type is required"),
    title: z.string().min(3, "Title must be at least 3 characters long."),
    description: z
      .string()
      .min(10, "Description must be at least 10 characters long."),
    originalPrice: z.number().positive("Original price must be greater than 0."),
    discountedPrice: z
      .number()
      .positive("Discounted price must be greater than 0."),
    quantity: z.number().int().min(1, "Quantity must be at least 1."),
    imageUrl: z.string().url("Please enter a valid image URL.").optional(),
    pickupTimeStart: z
      .string()
      .regex(timeRegex, "Invalid start time format. Use HH:MM."),
    pickupTimeEnd: z
      .string()
      .regex(timeRegex, "Invalid end time format. Use HH:MM."),
    availableDate: z.string().refine((date) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const available = new Date(date);
        return available >= today;
    }, "Available date cannot be in the past."),
    expirationHours: z
      .number()
      .int()
      .min(1, "Expiration hours must be at least 1.")
      .max(24, "Expiration hours cannot exceed 24.")
      .optional()
      .default(9),
  })
  .refine((data) => data.discountedPrice < data.originalPrice, {
    message: "Discounted price must be less than the original price.",
    path: ["discountedPrice"], // Field to associate the error with
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

export const postCreateProduct = async (
  body: z.infer<typeof schema>,
  init?: RequestInit
): Promise<OutputType> => {
  const validatedInput = schema.parse(body);
  const result = await fetch(`/_api/products/create`, {
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
      "error" in responseJson ? responseJson.error : "Failed to create product"
    );
  }
  return responseJson;
};