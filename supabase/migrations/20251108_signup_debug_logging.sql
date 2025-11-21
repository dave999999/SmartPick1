-- Signup Debug Logging Migration
-- Purpose: Introduce detailed logging for user signup flows to aid in diagnosing signup issues.
-- Includes: debug schema, signup_events table, helper function, triggers, indexes, grants.

-- 1. Create debug schema (idempotent)
CREATE SCHEMA IF NOT EXISTS debug;
COMMENT ON SCHEMA debug IS 'Schema for debugging and diagnostic logs';

-- 2. Logging table
CREATE TABLE IF NOT EXISTS debug.signup_events (
	id            BIGSERIAL PRIMARY KEY,
	occurred_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
	event_type    TEXT NOT NULL,                    -- e.g. identity.insert, user.insert, profile.init
	user_id       UUID NULL,                        -- auth.users.id
	email         TEXT NULL,                        -- captured from raw record or identity
	provider      TEXT NULL,                        -- identity provider (email, github, etc.)
	raw_new       JSONB NULL,                       -- NEW row snapshot
	raw_old       JSONB NULL,                       -- OLD row snapshot for updates (not used for inserts)
	notes         TEXT NULL                         -- optional diagnostic notes
);
COMMENT ON TABLE debug.signup_events IS 'Detailed event log for signup-related operations';
CREATE INDEX IF NOT EXISTS signup_events_occurred_at_idx ON debug.signup_events(occurred_at DESC);
CREATE INDEX IF NOT EXISTS signup_events_user_id_idx ON debug.signup_events(user_id);
CREATE INDEX IF NOT EXISTS signup_events_event_type_idx ON debug.signup_events(event_type);

-- 3. Helper function to insert log rows
CREATE OR REPLACE FUNCTION debug.log_signup_event(
	p_event_type TEXT,
	p_user_id UUID,
	p_email TEXT,
	p_provider TEXT,
	p_new JSONB,
	p_old JSONB DEFAULT NULL,
	p_notes TEXT DEFAULT NULL
) RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
	INSERT INTO debug.signup_events(event_type, user_id, email, provider, raw_new, raw_old, notes)
	VALUES (p_event_type, p_user_id, p_email, p_provider, p_new, p_old, p_notes);
END;
$$;
COMMENT ON FUNCTION debug.log_signup_event IS 'Generic logger for signup events';

-- 4. Trigger for auth.users INSERT
DROP TRIGGER IF EXISTS trg_log_auth_users_insert ON auth.users;
CREATE TRIGGER trg_log_auth_users_insert
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION debug.log_auth_users_insert();

CREATE OR REPLACE FUNCTION debug.log_auth_users_insert()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
	v_email TEXT;
BEGIN
	v_email := NEW.email;
	PERFORM debug.log_signup_event(
		'auth.users.insert', NEW.id, v_email, NEW.raw_user_meta_data->>'provider', to_jsonb(NEW), NULL, 'User row created'
	);
	RETURN NEW;
END;
$$;
COMMENT ON FUNCTION debug.log_auth_users_insert IS 'Logs creation of rows in auth.users';

-- 5. Trigger for auth.identities INSERT (captures provider info)
DROP TRIGGER IF EXISTS trg_log_auth_identities_insert ON auth.identities;
CREATE TRIGGER trg_log_auth_identities_insert
AFTER INSERT ON auth.identities
FOR EACH ROW
EXECUTE FUNCTION debug.log_auth_identities_insert();

CREATE OR REPLACE FUNCTION debug.log_auth_identities_insert()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
	v_provider TEXT;
	v_email TEXT;
BEGIN
	v_provider := NEW.provider;
	v_email := NEW.identity_data->>'email';
	PERFORM debug.log_signup_event(
		'auth.identities.insert', NEW.user_id, v_email, v_provider, to_jsonb(NEW), NULL, 'Identity row created'
	);
	RETURN NEW;
END;
$$;
COMMENT ON FUNCTION debug.log_auth_identities_insert IS 'Logs creation of identities during signup';

-- 6. (Optional) Log profile initialization if public.profiles exists
DO $$
BEGIN
	IF EXISTS (
		SELECT 1 FROM information_schema.tables
		WHERE table_schema = 'public' AND table_name = 'profiles'
	) THEN
		EXECUTE 'DROP TRIGGER IF EXISTS trg_log_profiles_insert ON public.profiles';
		EXECUTE 'CREATE TRIGGER trg_log_profiles_insert AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION debug.log_profiles_insert()';
	END IF;
END;$$;

CREATE OR REPLACE FUNCTION debug.log_profiles_insert()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
	PERFORM debug.log_signup_event(
		'public.profiles.insert', NEW.id, NEW.email, NULL, to_jsonb(NEW), NULL, 'Profile row initialized'
	);
	RETURN NEW;
END;
$$;
COMMENT ON FUNCTION debug.log_profiles_insert IS 'Logs initialization of public.profiles rows';

-- 7. Grants (allowing service role / authenticated reads if desired)
GRANT USAGE ON SCHEMA debug TO authenticated, service_role;
GRANT SELECT ON debug.signup_events TO authenticated, service_role;
GRANT INSERT ON debug.signup_events TO service_role; -- restrict inserts to backend logic

-- 8. Safety query to inspect triggers relevant to signup
SELECT event_object_schema, event_object_table, trigger_name, action_timing, action_orientation, action_statement
FROM information_schema.triggers
WHERE (event_object_table IN ('users','identities','profiles') AND event_object_schema IN ('public','auth'))
ORDER BY event_object_schema, trigger_name;

-- 9. Quick sample query template (commented)
-- SELECT * FROM debug.signup_events ORDER BY occurred_at DESC LIMIT 100;

-- 10. Rollback helpers (commented)
-- DROP SCHEMA debug CASCADE; -- removes all debug objects
