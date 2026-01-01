import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { connectTelegramAccount, disconnectTelegramAccount } from '@/lib/telegram'
import { logger } from '@/lib/logger'

export function useTelegramStatus(userId?: string) {
  const [loading, setLoading] = useState(true)
  const [connected, setConnected] = useState(false)
  const [username, setUsername] = useState<string | null>(null)

  async function fetchTelegramStatus() {
    if (!userId) return
    setLoading(true)
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('enable_telegram, telegram_username, telegram_chat_id')
      .eq('user_id', userId)
      .maybeSingle()
    
    logger.debug('[useTelegramStatus] Telegram status debug:', {
      data,
      error,
      enable_telegram: data?.enable_telegram,
      telegram_chat_id: (data as any)?.telegram_chat_id,
      telegram_username: (data as any)?.telegram_username,
      isConnected: !!data?.enable_telegram && !!(data as any)?.telegram_chat_id
    });
    
    if (!error && data) {
      // User is connected only if enable_telegram is true AND telegram_chat_id exists
      const isConnected = !!data.enable_telegram && !!(data as any).telegram_chat_id
      logger.debug('[useTelegramStatus] Setting connected status:', isConnected);
      setConnected(isConnected)
      setUsername((data as any).telegram_username || null)
    } else if (!data) {
      logger.debug('[useTelegramStatus] No data found, creating initial row...');
      // Create initial row with defaults
      const { error: insertError } = await supabase
        .from('notification_preferences')
        .insert({
          user_id: userId,
          enable_telegram: false,
          telegram_chat_id: null,
          telegram_username: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      
      if (insertError) {
        logger.error('[useTelegramStatus] Error creating initial row:', insertError);
      } else {
        logger.debug('[useTelegramStatus] Initial row created successfully');
      }
      
      setConnected(false)
      setUsername(null)
    } else if (error) {
      logger.error('[useTelegramStatus] Error fetching telegram status:', error);
      setConnected(false)
      setUsername(null)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchTelegramStatus()
    if (!userId) return
    const channel = supabase
      .channel('telegram_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notification_preferences',
          filter: `user_id=eq.${userId}`
        },
        () => fetchTelegramStatus()
      )
      .subscribe()
    return () => {
      try {
        supabase.removeChannel(channel)
      } catch (e) {
        // Channel already removed or doesn't exist
      }
    }
  }, [userId])

  async function connect(chatId: string, username?: string) {
    if (!userId) return
    await connectTelegramAccount(userId, chatId, username)
    await fetchTelegramStatus()
  }

  async function disconnect() {
    if (!userId) return
    await disconnectTelegramAccount(userId)
    await fetchTelegramStatus()
  }

  async function refresh() {
    await fetchTelegramStatus()
  }

  return { connected, username, loading, connect, disconnect, refresh }
}

