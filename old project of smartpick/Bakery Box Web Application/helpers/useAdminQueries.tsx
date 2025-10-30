import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getAdminUsers } from "../endpoints/admin/users_GET.schema";
import { getAdminBusinesses } from "../endpoints/admin/businesses_GET.schema";
import { getAdminProducts } from "../endpoints/admin/products_GET.schema";
import { getAdminStats } from "../endpoints/admin/stats_GET.schema";
import {
  postAdminBusinessesApprove,
  type InputType as ApproveBusinessInput,
} from "../endpoints/admin/businesses/approve_POST.schema";
import {
  postAdminBusinessesReject,
  type InputType as RejectBusinessInput,
} from "../endpoints/admin/businesses/reject_POST.schema";
import {
  postAdminUsersUpdate,
  type InputType as UpdateUserInput,
} from "../endpoints/admin/users/update_POST.schema";
import {
  postAdminUsersDelete,
  type InputType as DeleteUserInput,
} from "../endpoints/admin/users/delete_POST.schema";
import {
  postAdminBusinessesUpdate,
  type InputType as UpdateBusinessInput,
} from "../endpoints/admin/businesses/update_POST.schema";
import {
  postAdminBusinessesDelete,
  type InputType as DeleteBusinessInput,
} from "../endpoints/admin/businesses/delete_POST.schema";
import {
  postAdminProductsUpdate,
  type InputType as UpdateProductInput,
} from "../endpoints/admin/products/update_POST.schema";
import {
  postAdminProductsDelete,
  type InputType as DeleteProductInput,
} from "../endpoints/admin/products/delete_POST.schema";
import { CheckCircle2 } from "lucide-react";

export const ADMIN_USERS_QUERY_KEY = ["admin", "users"] as const;
export const ADMIN_BUSINESSES_QUERY_KEY = ["admin", "businesses"] as const;
export const ADMIN_PRODUCTS_QUERY_KEY = ["admin", "products"] as const;
export const ADMIN_STATS_QUERY_KEY = ["admin", "stats"] as const;

export const useAdminUsers = () => {
  return useQuery({
    queryKey: ADMIN_USERS_QUERY_KEY,
    queryFn: getAdminUsers,
  });
};

export const useAdminBusinesses = () => {
  return useQuery({
    queryKey: ADMIN_BUSINESSES_QUERY_KEY,
    queryFn: getAdminBusinesses,
  });
};

export const useAdminProducts = () => {
  return useQuery({
    queryKey: ADMIN_PRODUCTS_QUERY_KEY,
    queryFn: getAdminProducts,
  });
};

export const useAdminStats = () => {
  return useQuery({
    queryKey: ADMIN_STATS_QUERY_KEY,
    queryFn: getAdminStats,
  });
};

export const useApproveBusiness = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ApproveBusinessInput) => postAdminBusinessesApprove(data),
    onSuccess: () => {
      toast.success("Business approved successfully.", {
        icon: <CheckCircle2 size={20} />,
      });
      queryClient.invalidateQueries({ queryKey: ADMIN_BUSINESSES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ADMIN_STATS_QUERY_KEY });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to approve business.");
    },
  });
};

export const useRejectBusiness = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: RejectBusinessInput) => postAdminBusinessesReject(data),
    onSuccess: () => {
      toast.success("Business rejected successfully.", {
        icon: <CheckCircle2 size={20} />,
      });
      queryClient.invalidateQueries({ queryKey: ADMIN_BUSINESSES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ADMIN_STATS_QUERY_KEY });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to reject business.");
    },
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateUserInput) => postAdminUsersUpdate(data),
    onSuccess: () => {
      toast.success("User updated successfully.", {
        icon: <CheckCircle2 size={20} />,
      });
      queryClient.invalidateQueries({ queryKey: ADMIN_USERS_QUERY_KEY });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update user.");
    },
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: DeleteUserInput) => postAdminUsersDelete(data),
    onSuccess: () => {
      toast.success("User deleted successfully.", {
        icon: <CheckCircle2 size={20} />,
      });
      queryClient.invalidateQueries({ queryKey: ADMIN_USERS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ADMIN_STATS_QUERY_KEY });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete user.");
    },
  });
};

export const useUpdateBusiness = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateBusinessInput) => postAdminBusinessesUpdate(data),
    onSuccess: () => {
      toast.success("Business updated successfully.", {
        icon: <CheckCircle2 size={20} />,
      });
      queryClient.invalidateQueries({ queryKey: ADMIN_BUSINESSES_QUERY_KEY });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update business.");
    },
  });
};

export const useDeleteBusiness = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: DeleteBusinessInput) => postAdminBusinessesDelete(data),
    onSuccess: () => {
      toast.success("Business deleted successfully.", {
        icon: <CheckCircle2 size={20} />,
      });
      queryClient.invalidateQueries({ queryKey: ADMIN_BUSINESSES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ADMIN_STATS_QUERY_KEY });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete business.");
    },
  });
};

export const useUpdateProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateProductInput) => postAdminProductsUpdate(data),
    onSuccess: () => {
      toast.success("Product updated successfully.", {
        icon: <CheckCircle2 size={20} />,
      });
      queryClient.invalidateQueries({ queryKey: ADMIN_PRODUCTS_QUERY_KEY });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update product.");
    },
  });
};

export const useDeleteProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: DeleteProductInput) => postAdminProductsDelete(data),
    onSuccess: () => {
      toast.success("Product deleted successfully.", {
        icon: <CheckCircle2 size={20} />,
      });
      queryClient.invalidateQueries({ queryKey: ADMIN_PRODUCTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ADMIN_STATS_QUERY_KEY });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete product.");
    },
  });
};