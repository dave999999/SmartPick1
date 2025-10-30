import { z } from "zod";
import superjson from "superjson";
import { type Selectable } from "kysely";
import type { Reservations } from "../../helpers/schema";

export const schema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().min(1).default(1),
});

export type InputType = z.infer<typeof schema>;

export type OutputType =
  | {
      success: true;
      reservation: Pick<
        Selectable<Reservations>,
        "id" | "verificationCode" | "expiresAt"
      >;
    }
  | {
      success?: false;
      error: string;
      details?: any;
      penaltyUntil?: Date;
    };

export const postCreateReservation = async (
  body: z.infer<typeof schema>,
  init?: RequestInit
): Promise<OutputType> => {
  const validatedInput = schema.parse(body);
  const result = await fetch(`/_api/reservations/create`, {
    method: "POST",
    body: superjson.stringify(validatedInput),
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const responseJson = superjson.parse<OutputType>(await result.text());
  if (!result.ok || ("error" in responseJson && responseJson.error)) {
    throw new Error(
      "error" in responseJson
        ? responseJson.error
        : "Failed to create reservation"
    );
  }
  return responseJson;
};