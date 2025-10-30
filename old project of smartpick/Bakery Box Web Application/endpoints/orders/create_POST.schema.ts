import { z } from "zod";
import superjson from "superjson";
import { type Selectable } from "kysely";
import type { Orders } from "../../helpers/schema";

export const schema = z.object({
  productId: z.number(),
  quantity: z.number().int().min(1, "Quantity must be at least 1."),
  customerEmail: z.string().email("Please enter a valid email address."),
  customerName: z.string().min(2, "Name must be at least 2 characters long."),
});

export type InputType = z.infer<typeof schema>;

export type OutputType =
  | {
      success: true;
      order: Selectable<Orders>;
    }
  | {
      success?: false;
      error: string;
      details?: any;
    };

export const postCreateOrder = async (
  body: z.infer<typeof schema>,
  init?: RequestInit
): Promise<OutputType> => {
  const validatedInput = schema.parse(body);
  const result = await fetch(`/_api/orders/create`, {
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
      "error" in responseJson ? responseJson.error : "Failed to create order"
    );
  }
  return responseJson;
};