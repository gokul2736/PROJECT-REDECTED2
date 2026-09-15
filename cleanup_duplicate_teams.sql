-- =================================================================
-- PROJECT: REDACTED² - FINAL DATABASE SANITIZATION
-- Keeps only the 12 official finalist teams from scores.md
-- Run this in your Supabase Dashboard -> SQL Editor
-- =================================================================

-- 1. Drop any legacy internal score tables and functions
DROP TABLE IF EXISTS public.team_secrets CASCADE;
DROP FUNCTION IF EXISTS admin_get_team_secrets CASCADE;
DROP FUNCTION IF EXISTS admin_set_team_secrets CASCADE;

-- 2. Clean up test and duplicate team registrations
DO $$
DECLARE
    v_official_codes TEXT[] := ARRAY[
        '3BAD80', -- 1. DualSpark
        '4FB494', -- 2. NOYYAL TITANS
        '394F00', -- 3. TEAM SWAG
        '106D4E', -- 4. TEAM NOVA
        'A9F225', -- 5. PNDP
        'D3223F', -- 6. Sherlock Holmes
        '2FE641', -- 7. Apex
        '48A936', -- 8. Mystical
        'AAFDC2', -- 9. hostel gang
        '960D24', -- 10. AURA
        '39600C', -- 11. SPLK
        '9B2EA9'  -- 12. TDML26
    ];
    v_deleted_teams_count INT;
BEGIN
    -- Delete submissions for non-official teams
    DELETE FROM public.team_round_submissions
    WHERE team_id IN (
        SELECT id FROM public.teams WHERE team_code IS NULL OR NOT (team_code = ANY(v_official_codes))
    );

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'team_round_scores') THEN
        DELETE FROM public.team_round_scores
        WHERE team_id IN (
            SELECT id FROM public.teams WHERE team_code IS NULL OR NOT (team_code = ANY(v_official_codes))
        );
    END IF;

    -- Delete team members for non-official teams
    DELETE FROM public.team_members
    WHERE team_id IN (
        SELECT id FROM public.teams WHERE team_code IS NULL OR NOT (team_code = ANY(v_official_codes))
    );

    -- Delete the non-official / duplicate teams
    WITH deleted AS (
        DELETE FROM public.teams
        WHERE team_code IS NULL OR NOT (team_code = ANY(v_official_codes))
        RETURNING id
    )
    SELECT count(*) INTO v_deleted_teams_count FROM deleted;

    RAISE NOTICE 'Sanitization complete: Purged % duplicate/test teams. The 12 official teams are preserved.', v_deleted_teams_count;
END $$;
