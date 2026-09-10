-- PROJECT: REDACTED² Final Production Integration - Supabase SQL Migration
-- RUN THIS ENTIRE SCRIPT IN YOUR SUPABASE SQL EDITOR

-- 1. Create round_states table to track round progress
CREATE TABLE IF NOT EXISTS public.round_states (
    round_number INTEGER PRIMARY KEY,
    status TEXT NOT NULL DEFAULT 'NOT_STARTED', -- 'NOT_STARTED', 'LIVE', 'PAUSED', 'COMPLETED'
    duration_seconds INTEGER NOT NULL DEFAULT 1800,
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ
);

-- Insert defaults for Round 2 and Round 3 if they don't exist
INSERT INTO public.round_states (round_number, status, duration_seconds) VALUES (2, 'NOT_STARTED', 1500) ON CONFLICT DO NOTHING;
INSERT INTO public.round_states (round_number, status, duration_seconds) VALUES (3, 'NOT_STARTED', 1800) ON CONFLICT DO NOTHING;

-- 2. Create team_round_submissions table
CREATE TABLE IF NOT EXISTS public.team_round_submissions (
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    round_number INTEGER NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    score NUMERIC(5, 2) DEFAULT 0,
    max_score NUMERIC(5, 2) DEFAULT 0,
    score_breakdown JSONB DEFAULT '{}'::jsonb,
    score_final BOOLEAN DEFAULT false,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (team_id, round_number)
);

-- 3. Function to get the participant's team (used across all rounds)
CREATE OR REPLACE FUNCTION get_my_team()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_team_id UUID;
    v_team JSON;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN RETURN NULL; END IF;

    SELECT team_id INTO v_team_id FROM team_members WHERE user_id = v_user_id LIMIT 1;
    IF v_team_id IS NULL THEN RETURN NULL; END IF;

    SELECT json_build_object(
        'team_id', t.id,
        'team_code', t.team_code,
        'team_name', t.team_name,
        'case_code', t.case_code,
        'current_round', t.current_round,
        'status', t.status,
        'members', (
            SELECT json_agg(json_build_object('name', u.full_name, 'email', u.email))
            FROM team_members tm
            JOIN users u ON tm.user_id = u.id
            WHERE tm.team_id = t.id
        )
    ) INTO v_team
    FROM teams t
    WHERE t.id = v_team_id;

    RETURN v_team;
END;
$$;

-- 4. Function for Admin to set round status
CREATE OR REPLACE FUNCTION admin_set_round_status(p_round_number INT, p_status TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE round_states 
    SET status = p_status, 
        started_at = CASE WHEN p_status = 'LIVE' AND started_at IS NULL THEN now() ELSE started_at END,
        ended_at = CASE WHEN p_status = 'COMPLETED' THEN now() ELSE ended_at END
    WHERE round_number = p_round_number;
END;
$$;

-- 5. Function for participant to get current round state
CREATE OR REPLACE FUNCTION student_get_round_state(p_round_number INT)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_team_id UUID;
    v_global_status TEXT;
    v_global_duration INT;
    v_global_started TIMESTAMPTZ;
    v_sub RECORD;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN RETURN NULL; END IF;

    SELECT team_id INTO v_team_id FROM team_members WHERE user_id = v_user_id LIMIT 1;
    IF v_team_id IS NULL THEN RETURN NULL; END IF;

    SELECT status, duration_seconds, started_at INTO v_global_status, v_global_duration, v_global_started 
    FROM round_states WHERE round_number = p_round_number;

    SELECT * INTO v_sub FROM team_round_submissions WHERE team_id = v_team_id AND round_number = p_round_number;

    RETURN json_build_object(
        'team_id', v_team_id,
        'round_status', CASE WHEN v_sub.completed_at IS NOT NULL THEN 'COMPLETED' ELSE v_global_status END,
        'duration_seconds', v_global_duration,
        'started_at', v_global_started,
        'metadata', COALESCE(v_sub.metadata, '{}'::jsonb),
        'score', COALESCE(v_sub.score, 0),
        'max_score', COALESCE(v_sub.max_score, 50),
        'score_breakdown', COALESCE(v_sub.score_breakdown, '{}'::jsonb),
        'score_final', COALESCE(v_sub.score_final, false)
    );
END;
$$;

-- 6. Function for participant to save round state (sync across teammates)
CREATE OR REPLACE FUNCTION student_save_round_state(p_round_number INT, p_metadata JSONB, p_current_step INT DEFAULT 0)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_team_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN RETURN; END IF;

    SELECT team_id INTO v_team_id FROM team_members WHERE user_id = v_user_id LIMIT 1;
    IF v_team_id IS NULL THEN RETURN; END IF;

    INSERT INTO team_round_submissions (team_id, round_number, metadata, started_at)
    VALUES (v_team_id, p_round_number, p_metadata, now())
    ON CONFLICT (team_id, round_number) DO UPDATE 
    SET metadata = EXCLUDED.metadata, updated_at = now()
    WHERE team_round_submissions.completed_at IS NULL;
END;
$$;

-- 7. Function for participant to submit the round finally
CREATE OR REPLACE FUNCTION student_submit_round(p_round_number INT, p_metadata JSONB)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_team_id UUID;
    v_score NUMERIC := 0;
    v_breakdown JSONB := '{}'::jsonb;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN RETURN NULL; END IF;

    SELECT team_id INTO v_team_id FROM team_members WHERE user_id = v_user_id LIMIT 1;
    IF v_team_id IS NULL THEN RETURN NULL; END IF;

    -- Custom scoring logic for R3/R4 could be done in client or here, 
    -- Assuming client computes it inside metadata or we just lock it here.
    -- To keep it secure and fast, we lock it and let client pass the computed score.
    v_score := COALESCE((p_metadata->>'officialScore')::NUMERIC, 0);

    INSERT INTO team_round_submissions (team_id, round_number, metadata, completed_at, score, max_score, score_final, updated_at)
    VALUES (v_team_id, p_round_number, p_metadata, now(), v_score, 50, true, now())
    ON CONFLICT (team_id, round_number) DO UPDATE 
    SET metadata = EXCLUDED.metadata, 
        completed_at = now(), 
        score = EXCLUDED.score, 
        score_final = true,
        updated_at = now()
    WHERE team_round_submissions.completed_at IS NULL; -- Prevent double submission

    -- Update team's current_round if moving forward
    UPDATE teams SET current_round = p_round_number + 1 WHERE id = v_team_id AND current_round = p_round_number;

    RETURN json_build_object('success', true, 'score', v_score, 'breakdown', v_breakdown);
END;
$$;
