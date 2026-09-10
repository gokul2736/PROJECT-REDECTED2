CREATE TABLE IF NOT EXISTS public.team_secrets (
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    round_number INTEGER NOT NULL,
    speed_bonus_enabled BOOLEAN DEFAULT false,
    no_hint_bonus_enabled BOOLEAN DEFAULT false,
    secret_bonus_enabled BOOLEAN DEFAULT false,
    secret_penalty_enabled BOOLEAN DEFAULT false,
    updated_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (team_id, round_number)
);

-- RPC for admin to get secrets for a specific team and round
CREATE OR REPLACE FUNCTION admin_get_team_secrets(p_team_id UUID, p_round_number INT)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_secrets JSON;
BEGIN
    SELECT row_to_json(ts) INTO v_secrets
    FROM team_secrets ts
    WHERE ts.team_id = p_team_id AND ts.round_number = p_round_number;
    
    IF v_secrets IS NULL THEN
        RETURN json_build_object(
            'team_id', p_team_id,
            'round_number', p_round_number,
            'speed_bonus_enabled', false,
            'no_hint_bonus_enabled', false,
            'secret_bonus_enabled', false,
            'secret_penalty_enabled', false
        );
    END IF;
    
    RETURN v_secrets;
END;
$$;

-- RPC for admin to save secrets for a specific team and round
CREATE OR REPLACE FUNCTION admin_set_team_secrets(
    p_team_id UUID, 
    p_round_number INT,
    p_speed_bonus BOOLEAN,
    p_no_hint_bonus BOOLEAN,
    p_secret_bonus BOOLEAN,
    p_secret_penalty BOOLEAN
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO team_secrets (
        team_id, 
        round_number, 
        speed_bonus_enabled, 
        no_hint_bonus_enabled, 
        secret_bonus_enabled, 
        secret_penalty_enabled,
        updated_at
    )
    VALUES (
        p_team_id, 
        p_round_number, 
        p_speed_bonus, 
        p_no_hint_bonus, 
        p_secret_bonus, 
        p_secret_penalty,
        now()
    )
    ON CONFLICT (team_id, round_number) 
    DO UPDATE SET 
        speed_bonus_enabled = EXCLUDED.speed_bonus_enabled,
        no_hint_bonus_enabled = EXCLUDED.no_hint_bonus_enabled,
        secret_bonus_enabled = EXCLUDED.secret_bonus_enabled,
        secret_penalty_enabled = EXCLUDED.secret_penalty_enabled,
        updated_at = now();
END;
$$;

-- RPC for admin to force recalculate the official score based on secrets
CREATE OR REPLACE FUNCTION admin_recalculate_r1_score(p_team_id UUID)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_raw_score NUMERIC;
    v_official_score NUMERIC;
    v_secrets RECORD;
BEGIN
    -- Get raw score from round 1 metadata
    SELECT (metadata->>'rawScore')::NUMERIC INTO v_raw_score
    FROM team_round_submissions
    WHERE team_id = p_team_id AND round_number = 1;
    
    IF v_raw_score IS NULL THEN
        RETURN 0;
    END IF;
    
    -- Base official is raw / 2
    v_official_score := v_raw_score / 2.0;
    
    -- Get secrets
    SELECT * INTO v_secrets FROM team_secrets WHERE team_id = p_team_id AND round_number = 1;
    
    IF FOUND THEN
        IF v_secrets.speed_bonus_enabled THEN
            v_official_score := v_official_score + 5;
        END IF;
        IF v_secrets.no_hint_bonus_enabled THEN
            v_official_score := v_official_score + 2.5;
        END IF;
        IF v_secrets.secret_bonus_enabled THEN
            v_official_score := v_official_score + 5;
        END IF;
        IF v_secrets.secret_penalty_enabled THEN
            v_official_score := v_official_score - 5;
        END IF;
    END IF;
    
    -- Clamp between 0 and 50
    IF v_official_score > 50 THEN
        v_official_score := 50;
    ELSIF v_official_score < 0 THEN
        v_official_score := 0;
    END IF;
    
    -- Update the score in the submissions table
    UPDATE team_round_submissions
    SET score = v_official_score, updated_at = now()
    WHERE team_id = p_team_id AND round_number = 1;
    
    RETURN v_official_score;
END;
$$;
