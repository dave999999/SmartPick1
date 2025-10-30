import { z } from "zod";
import superjson from "superjson";
import { BusinessStatusArrayValues } from '../../../helpers/schema';

export const schema = z.
object({
  name: z.string().min(1),
  description: z.string().min(1),
  businessType: z.string().min(1),
  address: z.string().min(1),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  phone: z.string().nullable(),
  logoUrl: z.string().url().nullable(),
  status: z.enum(BusinessStatusArrayValues)
}).
partial().
extend({
  businessId: z.number()
});

export type InputType = z.infer<typeof schema>;

export type OutputType = {
  success: boolean;
  message: string;
};

export const postAdminBusinessesUpdate = async (
body: z.infer<typeof schema>,
init?: RequestInit)
: Promise<OutputType> => {
  const validatedInput = schema.parse(body);
  const result = await fetch(`/_api/admin/businesses/update`, {
    method: "POST",
    body: superjson.stringify(validatedInput),
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    }
  });
  if (!result.ok) {
    const errorObject = superjson.parse<{error: string;details?: any;}>(
      await result.text()
    );
    throw new Error(errorObject.error);
  }
  return superjson.parse<OutputType>(await result.text());
};