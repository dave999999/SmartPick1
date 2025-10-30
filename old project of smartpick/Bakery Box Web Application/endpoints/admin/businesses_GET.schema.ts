import { z } from "zod";
import superjson from "superjson";
import { type Selectable } from "kysely";
import type { Businesses } from "../../helpers/schema";

export const schema = z.object({});

export type InputType = z.infer<typeof schema>;

export type OutputType = Array<
  Pick<
    Selectable<Businesses>,
    | "id"
    | "name"
    | "description"
    | "businessType"
    | "address"
    | "latitude"
    | "longitude"
    | "phone"
    | "logoUrl"
    | "status"
    | "createdAt"
  > & {
    ownerEmail: string;
    ownerDisplayName: string;
  }
>;

export const getAdminBusinesses = async (
  body?: z.infer<typeof schema>,
  init?: RequestInit
): Promise<OutputType> => {
  const result = await fetch(`/_api/admin/businesses`, {
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