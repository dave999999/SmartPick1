import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from "@tanstack/react-query";
import {
  getUnreadNotifications,
  OutputType as UnreadCountOutput,
} from "../endpoints/notifications/unread_GET.schema";
import {
  getListNotifications,
  InputType as ListInput,
  OutputType as ListOutput,
} from "../endpoints/notifications/list_GET.schema";
import {
  postMarkRead,
  InputType as MarkReadInput,
} from "../endpoints/notifications/mark_read_POST.schema";
import {
  getNotificationSettings,
  OutputType as SettingsOutput,
} from "../endpoints/notifications/settings_GET.schema";
import {
  postNotificationSettings,
  InputType as UpdateSettingsInput,
} from "../endpoints/notifications/settings_POST.schema";
import { AUTH_QUERY_KEY } from "./useAuth";

export const NOTIFICATIONS_QUERY_KEYS = {
  all: ["notifications"] as const,
  unreadCount: () => [...NOTIFICATIONS_QUERY_KEYS.all, "unread-count"] as const,
  lists: () => [...NOTIFICATIONS_QUERY_KEYS.all, "list"] as const,
  list: (filters: ListInput) =>
    [...NOTIFICATIONS_QUERY_KEYS.lists(), filters] as const,
  settings: () => [...NOTIFICATIONS_QUERY_KEYS.all, "settings"] as const,
};

/**
 * Fetches the count of unread notifications.
 * Polls every 60 seconds.
 */
export const useUnreadCount = () => {
  return useQuery<UnreadCountOutput, Error>({
    queryKey: NOTIFICATIONS_QUERY_KEYS.unreadCount(),
    queryFn: () => getUnreadNotifications(),
    refetchInterval: 60 * 1000, // 60 seconds
    // Only fetch if the user is authenticated
    enabled: !!useQueryClient().getQueryData(AUTH_QUERY_KEY),
  });
};

/**
 * Fetches a paginated list of notifications.
 * Uses useInfiniteQuery for easy "load more" functionality.
 */
export const useNotifications = (limit: number = 20) => {
  return useInfiniteQuery<ListOutput, Error>({
    queryKey: NOTIFICATIONS_QUERY_KEYS.list({ limit, offset: 0 }),
    queryFn: ({ pageParam = 0 }) =>
      getListNotifications({ limit, offset: pageParam as number }),
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < limit) {
        return undefined; // No more pages
      }
      return allPages.length * limit;
    },
    initialPageParam: 0,
  });
};

/**
 * Mutation to mark notifications as read.
 * Invalidates unread count and list queries on success.
 */
export const useMarkAsRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: MarkReadInput) => postMarkRead(variables),
    onSuccess: () => {
      // Invalidate queries to refetch data
      queryClient.invalidateQueries({
        queryKey: NOTIFICATIONS_QUERY_KEYS.unreadCount(),
      });
      queryClient.invalidateQueries({
        queryKey: NOTIFICATIONS_QUERY_KEYS.lists(),
      });
    },
  });
};

/**
 * Fetches the user's notification settings.
 */
export const useNotificationSettings = () => {
  return useQuery<SettingsOutput, Error>({
    queryKey: NOTIFICATIONS_QUERY_KEYS.settings(),
    queryFn: getNotificationSettings,
    // Only fetch if the user is authenticated
    enabled: !!useQueryClient().getQueryData(AUTH_QUERY_KEY),
  });
};

/**
 * Mutation to update the user's notification settings.
 * Updates the settings query cache optimistically on success.
 */
export const useUpdateNotificationSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: UpdateSettingsInput) =>
      postNotificationSettings(variables),
    onSuccess: (updatedSettings) => {
      // Update the cache with the new settings
      queryClient.setQueryData(
        NOTIFICATIONS_QUERY_KEYS.settings(),
        updatedSettings
      );
    },
  });
};