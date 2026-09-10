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
DROP FUNCTION IF EXISTS get_my_team();
CREATE OR REPLACE FUNCTION get_my_team()
RETURNS TABLE (
  team_id UUID,
  team_name TEXT,
  team_code TEXT,
  members JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id AS team_id,
    t.name AS team_name,
    t.team_code,
    (
      SELECT jsonb_agg(jsonb_build_object('id', tm.user_id, 'role', tm.role, 'email', au.email))
      FROM team_members tm
      JOIN auth.users au ON au.id = tm.user_id
      WHERE tm.team_id = t.id
    ) AS members
  FROM teams t
  JOIN team_members tm ON tm.team_id = t.id
  WHERE tm.user_id = auth.uid();
END;
$$;

-- 4. Admin RPC to change a round's status
DROP FUNCTION IF EXISTS admin_set_round_status(INT, TEXT, INT);
CREATE OR REPLACE FUNCTION admin_set_round_status(
  p_round_number INT,
  p_status TEXT,
  p_duration_seconds INT DEFAULT 1800
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE round_states 
    SET status = p_status, 
        duration_seconds = p_duration_seconds,
        started_at = CASE WHEN p_status = 'LIVE' AND started_at IS NULL THEN now() ELSE started_at END,
        ended_at = CASE WHEN p_status = 'COMPLETED' THEN now() ELSE ended_at END
    WHERE round_number = p_round_number;
END;
$$;

-- 5. Student RPC to get their team's current round state
DROP FUNCTION IF EXISTS student_get_round_state(INT);
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

-- 6. Student RPC to continuously save progress (auto-save)
DROP FUNCTION IF EXISTS student_save_round_state(INT, JSONB, INT);
CREATE OR REPLACE FUNCTION student_save_round_state(
  p_round_number INT,
  p_metadata JSONB,
  p_current_step INT DEFAULT 0
)
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

-- 7. Student RPC to submit final answer
DROP FUNCTION IF EXISTS student_submit_round(INT, JSONB);
CREATE OR REPLACE FUNCTION student_submit_round(
  p_round_number INT,
  p_metadata JSONB
)
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
