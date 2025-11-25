-- Update MapTiler API key in existing app_config table
UPDATE app_config 
SET config_value = 'lbc0oIt12XmRGOSqhQUx',
    updated_at = now()
WHERE config_key = 'maptiler_api_key';

-- If the row doesn't exist, insert it
INSERT INTO app_config (config_key, config_value, description)
VALUES (
  'maptiler_api_key',
  'lbc0oIt12XmRGOSqhQUx',
  'MapTiler API key for vector map rendering'
)
ON CONFLICT (config_key) DO UPDATE 
SET config_value = 'lbc0oIt12XmRGOSqhQUx',
    updated_at = now();
