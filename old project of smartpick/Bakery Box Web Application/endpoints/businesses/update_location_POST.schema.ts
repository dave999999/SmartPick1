import { z } from "zod";
import superjson from "superjson";
import { type Selectable } from "kysely";
import type { Businesses } from "../../helpers/schema";

export const schema = z.object({
  businessId: z.number().int().positive(),
  latitude: z.number().min(-90).max(90, "Invalid latitude."),
  longitude: z.number().min(-180).max(180, "Invalid longitude."),
  address: z.string().min(5, "Please enter a valid address.").optional(),
});

export type InputType = z.infer<typeof schema>;

export type OutputType =
  | {
      success: true;
      business: Selectable<Businesses>;
    }
  | {
      success?: false;
      error: string;
      details?: any;
    };

export const postUpdateBusinessLocation = async (
  body: z.infer<typeof schema>,
  init?: RequestInit
): Promise<OutputType> => {
  const validatedInput = schema.parse(body);
  const result = await fetch(`/_api/businesses/update_location`, {
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
      "error" in responseJson
        ? responseJson.error
        : "Failed to update business location"
    );
  }
  return responseJson;
};