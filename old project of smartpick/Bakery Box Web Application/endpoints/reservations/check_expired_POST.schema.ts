import { z } from "zod";
import superjson from "superjson";

// This endpoint does not require any input parameters.
export const schema = z.object({});

export type InputType = z.infer<typeof schema>;

export type OutputType =
  | {
      success: true;
      processedCount: number;
    }
  | {
      success: false;
      error: string;
      details?: any;
    };

export const postCheckExpiredReservations = async (
  body: z.infer<typeof schema> = {},
  init?: RequestInit
): Promise<OutputType> => {
  const result = await fetch(`/_api/reservations/check_expired`, {
    method: "POST",
    body: superjson.stringify(body),
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
        : "Failed to check expired reservations"
    );
  }

  return responseJson;
};