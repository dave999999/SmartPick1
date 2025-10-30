import { z } from "zod";
import superjson from "superjson";

export const schema = z
  .object({
    notificationIds: z.array(z.number().int()).optional(),
    markAllAsRead: z.boolean().optional(),
  })
  .refine(
    (data) =>
      (data.notificationIds && data.notificationIds.length > 0) ||
      data.markAllAsRead === true,
    {
      message:
        "Either a non-empty array of notificationIds or markAllAsRead: true must be provided.",
    }
  );

export type InputType = z.infer<typeof schema>;

export type OutputType = {
  success: boolean;
};

export const postMarkRead = async (
  body: InputType,
  init?: RequestInit
): Promise<OutputType> => {
  const validatedInput = schema.parse(body);
  const result = await fetch(`/_api/notifications/mark_read`, {
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