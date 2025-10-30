import { z } from "zod";
import superjson from "superjson";

// No input schema needed for a simple GET request
export const schema = z.object({});

export type InputType = z.infer<typeof schema>;

export type PartnerReservation = {
  reservationId: number;
  expiresAt: Date;
  verificationCode: string;
  quantity: number;
  productId: number;
  productTitle: string;
  pickupTimeStart: string;
  pickupTimeEnd: string;
  availableDate: Date;
  imageUrl: string | null;
  originalPrice: string;
  discountedPrice: string;
  businessId: number;
  businessName: string;
  userId: number;
  userDisplayName: string;
  userEmail: string;
};

export type OutputType = PartnerReservation[];

export const getPartnerReservations = async (
  init?: RequestInit
): Promise<OutputType> => {
  const result = await fetch(`/_api/reservations/partner`, {
    method: "GET",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const responseText = await result.text();
  const responseJson = superjson.parse<OutputType | { error: string }>(
    responseText
  );

  if (!result.ok) {
    const errorMessage =
      typeof responseJson === "object" &&
      responseJson &&
      "error" in responseJson
        ? responseJson.error
        : "Failed to fetch partner reservations";
    throw new Error(errorMessage as string);
  }
  return responseJson as OutputType;
};