import { z } from "zod";
import superjson from "superjson";
import { UserRoleArrayValues } from '../../../helpers/schema';

export const schema = z.
object({
  email: z.string().email(),
  displayName: z.string().min(1),
  role: z.enum(UserRoleArrayValues)
}).
partial().
extend({
  userId: z.number()
});

export type InputType = z.infer<typeof schema>;

export type OutputType = {
  success: boolean;
  message: string;
};

export const postAdminUsersUpdate = async (
body: z.infer<typeof schema>,
init?: RequestInit)
: Promise<OutputType> => {
  const validatedInput = schema.parse(body);
  const result = await fetch(`/_api/admin/users/update`, {
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