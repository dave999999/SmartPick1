import { z } from "zod";
import superjson from "superjson";

export const schema = z.object({
  productId: z.number().int().positive(),
});

export type InputType = z.infer<typeof schema>;

export type OutputType =
  | {
      success: true;
      message: string;
    }
  | {
      success?: false;
      error: string;
      details?: any;
    };

export const postPauseProduct = async (
  body: z.infer<typeof schema>,
  init?: RequestInit
): Promise<OutputType> => {
  const validatedInput = schema.parse(body);
  const result = await fetch(`/_api/products/pause`, {
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
      "error" in responseJson ? responseJson.error : "Failed to pause product"
    );
  }
  return responseJson;
};