-- SQL to create a fake test team in Supabase
-- Option A: If you want to attach the fake team to your CURRENT logged-in user:
DO $$
DECLARE
    v_user_id UUID;
    v_team_id UUID := gen_random_uuid();
    v_team_code TEXT := 'TEST-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4));
BEGIN
    -- Grab the first user in auth.users (or replace with your specific user_id)
    SELECT id INTO v_user_id FROM auth.users ORDER BY created_at DESC LIMIT 1;

    IF v_user_id IS NOT NULL THEN
        -- Insert into teams
        INSERT INTO public.teams (id, name, team_code, status, current_round)
        VALUES (v_team_id, 'APEX DETECTIVES (TEST)', v_team_code, 'LOCKED', 1)
        ON CONFLICT DO NOTHING;

        -- Link the user to team_members
        INSERT INTO public.team_members (team_id, user_id, role)
        VALUES (v_team_id, v_user_id, 'LEADER')
        ON CONFLICT DO NOTHING;

        RAISE NOTICE 'Created fake team % (Code: %) linked to user %', v_team_id, v_team_code, v_user_id;
    ELSE
        RAISE NOTICE 'No user found in auth.users. Please register/sign up a user first.';
    END IF;
END $$;
