import { z } from "zod";
import superjson from "superjson";
import { Selectable } from "kysely";
import { UserSettings } from "../../helpers/schema";

export const schema = z.object({
  emailNotificationsEnabled: z.boolean(),
});

export type InputType = z.infer<typeof schema>;

export type OutputType = Selectable<UserSettings>;

export const postNotificationSettings = async (
  body: InputType,
  init?: RequestInit
): Promise<OutputType> => {
  const validatedInput = schema.parse(body);
  const result = await fetch(`/_api/notifications/settings`, {
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