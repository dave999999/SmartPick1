import { z } from "zod";
import superjson from "superjson";
import { Selectable } from "kysely";
import { Notifications } from "../../helpers/schema";

export const schema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export type InputType = z.infer<typeof schema>;

export type OutputType = Selectable<Notifications>[];

export const getListNotifications = async (
  params: InputType,
  init?: RequestInit
): Promise<OutputType> => {
  const validatedParams = schema.parse(params);
  const searchParams = new URLSearchParams({
    limit: validatedParams.limit.toString(),
    offset: validatedParams.offset.toString(),
  });

  const result = await fetch(`/_api/notifications/list?${searchParams}`, {
    method: "GET",
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