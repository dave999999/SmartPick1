import { z } from "zod";
import superjson from "superjson";

export const schema = z.object({
  name: z.string().min(2, "Business name is required"),
  description: z.string().min(10, "Description is required"),
  businessType: z.string().min(2, "Business type is required"),
  address: z.string().min(5, "Address is required"),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  phone: z.string().optional().nullable(),
  logoUrl: z.string().url("Must be a valid URL").optional().nullable(),
  ownerEmail: z.string().email("Invalid email address"),
  ownerDisplayName: z.string().min(2, "Your name is required"),
  ownerPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export type InputType = z.infer<typeof schema>;

export type OutputType = {
  success: boolean;
  message: string;
  businessId: number;
};

export const postBusinessesRegister = async (
  body: z.infer<typeof schema>,
  init?: RequestInit
): Promise<OutputType> => {
  const validatedInput = schema.parse(body);
  const result = await fetch(`/_api/businesses/register`, {
    method: "POST",
    body: superjson.stringify(validatedInput),
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