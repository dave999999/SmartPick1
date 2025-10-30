import { z } from "zod";
import superjson from "superjson";

export const schema = z.object({});

export type InputType = z.infer<typeof schema>;

export type OutputType = {
  totalUsers: number;
  totalPartners: number;
  totalOrders: number;
  totalProducts: number;
  pendingRegistrations: number;
};

export const getAdminStats = async (
  body?: z.infer<typeof schema>,
  init?: RequestInit
): Promise<OutputType> => {
  const result = await fetch(`/_api/admin/stats`, {
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