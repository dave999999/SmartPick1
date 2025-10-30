import { z } from "zod";
import superjson from "superjson";
import { type Selectable } from "kysely";
import type { Reservations } from "../../helpers/schema";

export const schema = z.object({
  reservationId: z.number().int().positive(),
  verificationCode: z
    .string()
    .length(6, "Verification code must be 6 digits.")
    .regex(/^\d{6}$/, "Invalid verification code format."),
});

export type InputType = z.infer<typeof schema>;

export type OutputType =
  | {
      success: true;
      message: string;
      reservation: Selectable<Reservations>;
    }
  | {
      success?: false;
      error: string;
      details?: any;
    };

export const postRedeemReservation = async (
  body: z.infer<typeof schema>,
  init?: RequestInit
): Promise<OutputType> => {
  const validatedInput = schema.parse(body);
  const result = await fetch(`/_api/reservations/redeem`, {
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
        : "Failed to redeem reservation"
    );
  }
  return responseJson;
};