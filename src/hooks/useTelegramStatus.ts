import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { connectTelegramAccount, disconnectTelegramAccount } from '@/lib/telegram'

export function useTelegramStatus(userId?: string) {
  const [loading, setLoading] = useState(true)
  const [connected, setConnected] = useState(false)
  const [username, setUsername] = useState<string | null>(null)

  async function fetchTelegramStatus() {
    if (!userId) return
    setLoading(true)
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('enable_telegram, telegram_username')
      .eq('user_id', userId)
      .maybeSingle()
    if (!error && data) {
      setConnected(!!data.enable_telegram)
      setUsername((data as any).telegram_username || null)
    } else if (!data) {
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

  return { connected, username, loading, connect, disconnect }
}

