-- Enable Supabase Realtime for user_points table
-- This allows real-time subscriptions to point balance changes

-- Enable realtime replication for user_points
ALTER PUBLICATION supabase_realtime ADD TABLE user_points;

-- Ensure the table has proper replica identity for realtime updates
ALTER TABLE user_points REPLICA IDENTITY FULL;

-- Add comment for documentation
COMMENT ON TABLE user_points IS 'User SmartPoints balance - realtime enabled for instant UI sync';
