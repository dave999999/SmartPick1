import { z } from "zod";
import superjson from "superjson";
import { type ReservationStatus } from "../../helpers/schema";

// No input schema needed for a simple GET request
export const schema = z.object({});

export type InputType = z.infer<typeof schema>;

export type MyReservation = {
  reservationId: number;
  reservationStatus: ReservationStatus;
  expiresAt: Date;
  redeemedAt: Date | null;
  reservedAt: Date;
  createdAt: Date | null;
  verificationCode: string;
  quantity: number;
  productId: number;
  productTitle: string;
  productImageUrl: string | null;
  discountedPrice: string;
  originalPrice: string;
  pickupTimeStart: string;
  pickupTimeEnd: string;
  availableDate: Date;
  businessId: number;
  businessName: string;
  businessAddress: string;
};

export type OutputType = MyReservation[];

export const getMyReservations = async (
  init?: RequestInit
): Promise<OutputType> => {
  const result = await fetch(`/_api/reservations/my`, {
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
        : "Failed to fetch reservations";
    throw new Error(errorMessage as string);
  }
  return responseJson as OutputType;
};