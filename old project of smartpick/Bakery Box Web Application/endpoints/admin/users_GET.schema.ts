import { z } from "zod";
import superjson from "superjson";
import { type Selectable } from "kysely";
import type { Users } from "../../helpers/schema";

export const schema = z.object({});

export type InputType = z.infer<typeof schema>;

export type OutputType = Array<
  Pick<
    Selectable<Users>,
    "id" | "email" | "displayName" | "role" | "createdAt"
  > & {
    totalReservations: number;
    expiredReservations: number;
    cancelledReservations: number;
    redeemedReservations: number;
    fraudScore: number;
  }
>;

export const getAdminUsers = async (
  body?: z.infer<typeof schema>,
  init?: RequestInit
): Promise<OutputType> => {
  const result = await fetch(`/_api/admin/users`, {
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