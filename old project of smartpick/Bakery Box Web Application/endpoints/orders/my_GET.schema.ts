import { z } from "zod";
import superjson from "superjson";
import { type Selectable } from "kysely";
import type { Orders } from "../../helpers/schema";

export const schema = z.object({});

export type InputType = z.infer<typeof schema>;

export type OrderDetails = Selectable<Orders> & {
  product: {
    title: string;
    imageUrl: string | null;
  };
  business: {
    name: string;
    address: string;
  };
};

export type OutputType = OrderDetails[];

export const getMyOrders = async (
  body?: z.infer<typeof schema>,
  init?: RequestInit
): Promise<OutputType> => {
  const result = await fetch(`/_api/orders/my`, {
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