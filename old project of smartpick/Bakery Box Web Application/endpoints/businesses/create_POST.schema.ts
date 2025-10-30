import { z } from "zod";
import superjson from "superjson";
import { type Selectable } from "kysely";
import type { Businesses } from "../../helpers/schema";

// A simple regex for phone numbers. Can be improved for international numbers.
const phoneRegex = /^\+?[1-9]\d{1,14}$/;

export const schema = z.object({
  name: z.string().min(3, "Business name must be at least 3 characters long."),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters long."),
  address: z.string().min(5, "Please enter a valid address."),
  latitude: z.number().min(-90).max(90, "Invalid latitude."),
  longitude: z.number().min(-180).max(180, "Invalid longitude."),
  contactPhone: z
    .string()
    .regex(phoneRegex, "Please enter a valid phone number."),
  businessType: z.string().min(3, "Business type is required."),
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

export const postCreateBusiness = async (
  body: z.infer<typeof schema>,
  init?: RequestInit
): Promise<OutputType> => {
  const validatedInput = schema.parse(body);
  const result = await fetch(`/_api/businesses/create`, {
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
        : "Failed to create business"
    );
  }
  return responseJson;
};