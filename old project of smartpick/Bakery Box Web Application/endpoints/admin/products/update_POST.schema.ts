import { z } from "zod";
import superjson from "superjson";
import { ProductStatusArrayValues } from "../../../helpers/schema";

export const schema = z
  .object({
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
    imageUrl: z.string().url("Please enter a valid image URL.").nullable(),
    pickupTimeStart: z
      .string()
      .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format (HH:MM)"),
    pickupTimeEnd: z
      .string()
      .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format (HH:MM)"),
    availableDate: z.date(),
    status: z.enum(ProductStatusArrayValues).nullable(),
    expiresAt: z.date().nullable(),
  })
  .partial()
  .extend({
    productId: z.number(),
  })
  .refine(
    (data) => {
      if (
        data.discountedPrice !== undefined &&
        data.originalPrice !== undefined
      ) {
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

export type OutputType = {
  success: boolean;
  message: string;
};

export const postAdminProductsUpdate = async (
  body: z.infer<typeof schema>,
  init?: RequestInit
): Promise<OutputType> => {
  const validatedInput = schema.parse(body);
  const result = await fetch(`/_api/admin/products/update`, {
    method: "POST",
    body: superjson.stringify(validatedInput),
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!result.ok) {
    const errorObject = superjson.parse<{ error: string; details?: any }>(
      await result.text()
    );
    throw new Error(errorObject.error);
  }
  return superjson.parse<OutputType>(await result.text());
};