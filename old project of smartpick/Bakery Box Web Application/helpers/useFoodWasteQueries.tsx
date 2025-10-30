import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { 
  getProductsList,
  type InputType as ProductsFilterParams 
} from "../endpoints/products/list_GET.schema";
import {
  postCreateProduct,
  type InputType as CreateProductInput,
} from "../endpoints/products/create_POST.schema";
import {
  postUpdateProduct,
  type InputType as UpdateProductInput,
} from "../endpoints/products/update_POST.schema";
import {
  postDeleteProduct,
  type InputType as DeleteProductInput,
} from "../endpoints/products/delete_POST.schema";
import {
  postCreateOrder,
  type InputType as CreateOrderInput,
} from "../endpoints/orders/create_POST.schema";
import { getMyBusinesses } from "../endpoints/businesses/my_GET.schema";
import { getMyOrders } from "../endpoints/orders/my_GET.schema";
import { getMyProducts } from "../endpoints/products/my_GET.schema";
import { getMyReservations } from "../endpoints/reservations/my_GET.schema";
import { getPartnerReservations } from "../endpoints/reservations/partner_GET.schema";
import {
  getPartnerStats,
  type OutputType as PartnerStatsOutput,
} from "../endpoints/partner/stats_GET.schema";
import {
  postRepostProduct,
  type InputType as RepostProductInput,
} from "../endpoints/products/repost_POST.schema";
import {
  postPauseProduct,
  type InputType as PauseProductInput,
} from "../endpoints/products/pause_POST.schema";
import {
  postCreateReservation,
  type InputType as CreateReservationInput,
} from "../endpoints/reservations/create_POST.schema";
import {
  postRedeemReservation,
  type InputType as RedeemReservationInput,
} from "../endpoints/reservations/redeem_POST.schema";
import {
  postCancelReservation,
  type InputType as CancelReservationInput,
} from "../endpoints/reservations/cancel_POST.schema";
import {
  postCreateBusiness,
  type InputType as CreateBusinessInput,
} from "../endpoints/businesses/create_POST.schema";
import {
  postUpdateBusinessLocation,
  type InputType as UpdateBusinessLocationInput,
} from "../endpoints/businesses/update_location_POST.schema";
import { CheckCircle2, AlertCircle } from "lucide-react";

export const getProductsQueryKey = (filters?: ProductsFilterParams) => 
  ["products", "list", filters] as const;

export const MY_PRODUCTS_QUERY_KEY = ["products", "my"] as const;
export const MY_BUSINESSES_QUERY_KEY = ["businesses", "my"] as const;
export const MY_ORDERS_QUERY_KEY = ["orders", "my"] as const;
export const MY_RESERVATIONS_QUERY_KEY = ["reservations", "my"] as const;
export const PARTNER_RESERVATIONS_QUERY_KEY = ["reservations", "partner"] as const;
export const PARTNER_STATS_QUERY_KEY = ["partner", "stats"] as const;

/**
 * Fetches all available products with optional filtering and sorting.
 * Publicly accessible.
 * 
 * @param filters - Optional filter parameters:
 *   - search: Text search for product title and description
 *   - minPrice: Minimum discounted price filter
 *   - maxPrice: Maximum discounted price filter
 *   - businessType: Filter by business type
 *   - userLat: User's latitude for distance calculations
 *   - userLng: User's longitude for distance calculations
 *   - distance: Maximum distance in kilometers (requires userLat/userLng)
 *   - sortBy: Sorting option ("price_asc", "price_desc", "distance")
 */
export const useGetProductsQuery = (filters?: ProductsFilterParams) => {
  return useQuery({
    queryKey: getProductsQueryKey(filters),
    queryFn: () => getProductsList(filters),
    refetchInterval: 30000, // Automatically refetch every 30 seconds to update sold out and expired products
  });
};

/**
 * Fetches the businesses owned by the current authenticated user.
 * Requires partner or admin authentication.
 */
export const useGetMyBusinessesQuery = () => {
  return useQuery({
    queryKey: MY_BUSINESSES_QUERY_KEY,
    queryFn: () => getMyBusinesses(),
    // This query depends on user authentication, so it might fail.
    // The component using this hook should handle the error state.
    retry: 1,
  });
};

/**
 * Fetches the products for the current authenticated partner/admin.
 * Requires partner or admin authentication.
 */
export const useGetMyProductsQuery = () => {
  return useQuery({
    queryKey: MY_PRODUCTS_QUERY_KEY,
    queryFn: () => getMyProducts(),
    retry: 1,
  });
};

/**
 * Fetches the orders for the current authenticated user.
 * Requires authentication.
 */
export const useGetMyOrdersQuery = () => {
  return useQuery({
    queryKey: MY_ORDERS_QUERY_KEY,
    queryFn: () => getMyOrders(),
    retry: 1,
  });
};

/**
 * Fetches the reservations for the current authenticated user.
 * Requires authentication.
 * Refetches every 15 seconds to update timers.
 */
export const useGetMyReservationsQuery = () => {
  return useQuery({
    queryKey: MY_RESERVATIONS_QUERY_KEY,
    queryFn: () => getMyReservations(),
    retry: 1,
    refetchInterval: 15000, // Refetch every 15 seconds to update timers
  });
};

/**
 * Fetches pending reservations for the partner's businesses.
 * Requires partner or admin authentication.
 * Refetches every 10 seconds to keep the list up to date.
 */
export const useGetPartnerReservationsQuery = () => {
  return useQuery({
    queryKey: PARTNER_RESERVATIONS_QUERY_KEY,
    queryFn: () => getPartnerReservations(),
    retry: 1,
    refetchInterval: 10000, // Refetch every 10 seconds
  });
};

/**
 * Fetches statistics for the partner's dashboard.
 * Requires partner or admin authentication.
 * Returns active deals, reservations today, and redeemed this week counts.
 */
export const useGetPartnerStatsQuery = () => {
  return useQuery({
    queryKey: PARTNER_STATS_QUERY_KEY,
    queryFn: () => getPartnerStats(),
    retry: 1,
  });
};

/**
 * Mutation to create a new business.
 * Invalidates the user's businesses list on success.
 */
export const useCreateBusinessMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (newBusiness: CreateBusinessInput) =>
      postCreateBusiness(newBusiness),
    onSuccess: () => {
      toast.success("Business registered successfully!", {
        description: "You can now add products for this business.",
        icon: <CheckCircle2 size={20} />,
      });
      queryClient.invalidateQueries({ queryKey: MY_BUSINESSES_QUERY_KEY });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to register business."
      );
    },
  });
};

/**
 * Mutation to update a business's location.
 * Invalidates the user's businesses list on success.
 */
export const useUpdateBusinessLocationMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (locationData: UpdateBusinessLocationInput) =>
      postUpdateBusinessLocation(locationData),
    onSuccess: () => {
      toast.success("Business location updated successfully!", {
        icon: <CheckCircle2 size={20} />,
      });
      queryClient.invalidateQueries({ queryKey: MY_BUSINESSES_QUERY_KEY });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update location."
      );
    },
  });
};

/**
 * Mutation to create a new product.
 * Invalidates the main products list on success.
 */
export const useCreateProductMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (newProduct: CreateProductInput) =>
      postCreateProduct(newProduct),
    onSuccess: () => {
      toast.success("Product created successfully!", {
        icon: <CheckCircle2 size={20} />,
      });
      // Invalidate all product list queries regardless of filters
      queryClient.invalidateQueries({ queryKey: ["products", "list"] });
      queryClient.invalidateQueries({ queryKey: MY_PRODUCTS_QUERY_KEY });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to create product."
      );
    },
  });
};

/**
 * Mutation to update an existing product.
 * Invalidates product lists on success.
 */
export const useUpdateProductMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (productData: UpdateProductInput) =>
      postUpdateProduct(productData),
    onSuccess: () => {
      toast.success("Product updated successfully!", {
        icon: <CheckCircle2 size={20} />,
      });
      // Invalidate all product list queries regardless of filters
      queryClient.invalidateQueries({ queryKey: ["products", "list"] });
      queryClient.invalidateQueries({ queryKey: MY_PRODUCTS_QUERY_KEY });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to update product."
      );
    },
  });
};

/**
 * Mutation to delete a product.
 * Invalidates product lists on success.
 */
export const useDeleteProductMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (productData: DeleteProductInput) =>
      postDeleteProduct(productData),
    onSuccess: () => {
      toast.success("Product deleted successfully.", {
        icon: <CheckCircle2 size={20} />,
      });
      // Invalidate all product list queries regardless of filters
      queryClient.invalidateQueries({ queryKey: ["products", "list"] });
      queryClient.invalidateQueries({ queryKey: MY_PRODUCTS_QUERY_KEY });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete product."
      );
    },
  });
};

/**
 * @deprecated Direct orders are no longer supported. Use useCreateReservationMutation instead.
 * This hook now throws an error immediately to prevent usage.
 */
export const useCreateOrderMutation = () => {
  throw new Error(
    "Direct orders are no longer supported. Please use useCreateReservationMutation to create a reservation instead."
  );
};

/**
 * Mutation to create a new reservation.
 * Invalidates the products list and my reservations on success.
 */
export const useCreateReservationMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (newReservation: CreateReservationInput) =>
      postCreateReservation(newReservation),
    onSuccess: () => {
      toast.success("Reservation created successfully!", {
        description: "You have 30 minutes to pick up your item.",
        icon: <CheckCircle2 size={20} />,
      });
      // Invalidate all product list queries regardless of filters
      queryClient.invalidateQueries({ queryKey: ["products", "list"] });
      queryClient.invalidateQueries({ queryKey: MY_RESERVATIONS_QUERY_KEY });
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : "Failed to create reservation.";
      
      // Check if this is a penalty error
      if (errorMessage.toLowerCase().includes("penalty")) {
        toast.error("Account Temporarily Restricted", {
          description: "You cannot make new reservations right now because you didn't pick up previous reservations on time. Please wait a while before trying again, or check your profile for more details.",
          icon: <AlertCircle size={20} />,
          duration: 6000, // Show for longer since it's important information
        });
      } else {
        toast.error(errorMessage, {
          icon: <AlertCircle size={20} />,
        });
      }
    },
  });
};

/**
 * Mutation to redeem a reservation.
 * Invalidates partner reservations on success.
 */
export const useRedeemReservationMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (redeemData: RedeemReservationInput) =>
      postRedeemReservation(redeemData),
    onSuccess: () => {
      toast.success("Reservation redeemed successfully!", {
        description: "The customer has collected their item.",
        icon: <CheckCircle2 size={20} />,
      });
      queryClient.invalidateQueries({ queryKey: PARTNER_RESERVATIONS_QUERY_KEY });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to redeem reservation.",
        {
          icon: <AlertCircle size={20} />,
        }
      );
    },
  });
};

/**
 * Mutation to cancel a reservation.
 * Invalidates my reservations and products list on success.
 */
export const useCancelReservationMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (cancelData: CancelReservationInput) =>
      postCancelReservation(cancelData),
    onSuccess: () => {
      toast.success("Reservation cancelled successfully.", {
        description: "The item is now available again.",
        icon: <CheckCircle2 size={20} />,
      });
      queryClient.invalidateQueries({ queryKey: MY_RESERVATIONS_QUERY_KEY });
      // Invalidate all product list queries regardless of filters
      queryClient.invalidateQueries({ queryKey: ["products", "list"] });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to cancel reservation.",
        {
          icon: <AlertCircle size={20} />,
        }
      );
    },
  });
};

/**
 * Mutation to repost a product.
 * Creates a new product based on an existing one with optional overrides.
 * Invalidates product lists and partner stats on success.
 */
export const useRepostProductMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (repostData: RepostProductInput) =>
      postRepostProduct(repostData),
    onSuccess: () => {
      toast.success("Product reposted successfully!", {
        description: "Your product is now available again.",
        icon: <CheckCircle2 size={20} />,
      });
      // Invalidate all product list queries regardless of filters
      queryClient.invalidateQueries({ queryKey: ["products", "list"] });
      queryClient.invalidateQueries({ queryKey: MY_PRODUCTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: PARTNER_STATS_QUERY_KEY });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to repost product.",
        {
          icon: <AlertCircle size={20} />,
        }
      );
    },
  });
};

/**
 * Mutation to pause a product.
 * Updates the product status to 'paused'.
 * Invalidates product lists and partner stats on success.
 */
export const usePauseProductMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (pauseData: PauseProductInput) =>
      postPauseProduct(pauseData),
    onSuccess: () => {
      toast.success("Product paused successfully.", {
        description: "The product is no longer visible to customers.",
        icon: <CheckCircle2 size={20} />,
      });
      // Invalidate all product list queries regardless of filters
      queryClient.invalidateQueries({ queryKey: ["products", "list"] });
      queryClient.invalidateQueries({ queryKey: MY_PRODUCTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: PARTNER_STATS_QUERY_KEY });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to pause product.",
        {
          icon: <AlertCircle size={20} />,
        }
      );
    },
  });
};