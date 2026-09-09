/* app/admin/page.tsx */
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Member = {
  id: string;
  name: string;
  email: string;
  register_number: string | null;
  college_name: string | null;
  year_of_study: string | null;
  department: string | null;
  is_saveetha_student: boolean | null;
  whatsapp_number: string | null;
};

type Team = {
  id: string;
  team_code: string;
  team_name: string;
  case_code: string | null;
  current_round: number;
  status: string;
  created_at: string;
  updated_at: string;
  members: Member[];
};

type RoundSummary = {
  round_number: number;
  round_name: string;
  status: string;
  max_score: number;
  duration_seconds: number;
  started_at: string | null;
  ended_at: string | null;
  teams_started: number;
  teams_completed: number;
  average_score: number | null;
  highest_score: number | null;
};

type LiveResult = {
  team_id: string;
  team_name: string;
  team_code: string;
  current_round: number;
  team_status: string;
  round1_score: number;
  round2_score: number;
  round3_score: number;
  round4_score: number;
  total_score: number;
};

const ROUND_META: Record<number, { label: string; subtitle: string; color: string; available: boolean }> = {
  1: {
    label: "THE CRIME SCENE",
    subtitle: "Evidence investigation",
    color: "yellow",
    available: true,
  },
  2: {
    label: "FOLLOW THE TRAIL",
    subtitle: "Lead selection & reasoning",
    color: "cyan",
    available: true,
  },
  3: {
    label: "THE INTERROGATION",
    subtitle: "Classification pending",
    color: "purple",
    available: false,
  },
  4: {
    label: "THE FINAL VERDICT",
    subtitle: "Classification pending",
    color: "red",
    available: false,
  },
};

function formatScore(value: number | null | undefined) {
  return value == null ? "—" : Number(value).toFixed(1).replace(".0", "");
}

function formatDuration(seconds: number) {
  if (!seconds) return "—";
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}m ${String(remaining).padStart(2, "0")}s`;
}

function statusClass(status: string) {
  const value = status.toUpperCase();

  if (value === "LIVE" || value === "ACTIVE") {
    return "text-green-400 border-green-500/20 bg-green-500/[0.05]";
  }

  if (value === "COMPLETED" || value === "FINALIZED") {
    return "text-blue-300 border-blue-500/20 bg-blue-500/[0.05]";
  }

  if (value === "LOCKED") {
    return "text-white/50 border-white/10 bg-white/[0.03]";
  }

  return "text-yellow-400 border-yellow-500/20 bg-yellow-500/[0.04]";
}

export default function AdminDashboard() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [teams, setTeams] = useState<Team[]>([]);
  const [rounds, setRounds] = useState<RoundSummary[]>([]);
  const [liveResults, setLiveResults] = useState<LiveResult[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

  const [loading, setLoading] = useState(true);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");

  const [moveMemberId, setMoveMemberId] = useState("");
  const [targetTeamId, setTargetTeamId] = useState("");

  useEffect(() => {
    checkAdmin();
  }, []);

  useEffect(() => {
    if (!loading) {
      const refresh = window.setInterval(() => {
        loadDashboardData();
        loadTeams();
      }, 10000);

      return () => window.clearInterval(refresh);
    }
  }, [loading]);

  const checkAdmin = async () => {
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        setErrorMessage(sessionError.message);
        setLoading(false);
        return;
      }

      if (!session) {
        router.replace("/admin/login");
        return;
      }

      const { data: admin, error: adminError } = await supabase
        .from("admins")
        .select("id, email, role")
        .eq("id", session.user.id)
        .maybeSingle();

      if (adminError) {
        setErrorMessage("Admin verification failed: " + adminError.message);
        setLoading(false);
        return;
      }

      if (!admin) {
        await supabase.auth.signOut();
        router.replace("/admin/login");
        return;
      }

      setEmail(session.user.email || admin.email || "");

      await Promise.all([loadTeams(), loadDashboardData()]);
      setLoading(false);
    } catch (error) {
      console.error(error);
      setErrorMessage("An unexpected error occurred while loading the dashboard.");
      setLoading(false);
    }
  };

  const loadTeams = async () => {
    setTeamsLoading(true);

    const { data, error } = await supabase.rpc("admin_get_teams");

    if (error) {
      console.error("Team load error:", error);
      setErrorMessage("Unable to load teams: " + error.message);
      setTeamsLoading(false);
      return;
    }

    setTeams((data || []) as Team[]);
    setTeamsLoading(false);
  };

  const loadDashboardData = async () => {
    setDashboardLoading(true);

    const [roundResponse, resultResponse] = await Promise.all([
      supabase.rpc("admin_get_round_dashboard"),
      supabase.rpc("admin_get_live_results"),
    ]);

    if (roundResponse.error) {
      console.error("Round dashboard error:", roundResponse.error);
    }

    if (resultResponse.error) {
      console.error("Live results error:", resultResponse.error);
    }

    setRounds((roundResponse.data || []) as RoundSummary[]);
    setLiveResults((resultResponse.data || []) as LiveResult[]);
    setDashboardLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/admin/login");
  };

  const handleLockTeam = async () => {
    if (!selectedTeam) return;

    if (selectedTeam.members.length < 2) {
      setNotice("A team needs at least 2 members before it can be locked.");
      return;
    }

    const confirmed = window.confirm(
      `Lock ${selectedTeam.team_name}? Once locked, its members cannot be changed.`
    );

    if (!confirmed) return;

    setActionLoading(true);
    setNotice("");

    const { error } = await supabase.rpc("admin_lock_team", {
      p_team_id: selectedTeam.id,
    });

    if (error) {
      setNotice(error.message);
      setActionLoading(false);
      return;
    }

    setNotice("Team locked successfully.");
    await loadTeams();

    setSelectedTeam((current) =>
      current ? { ...current, status: "LOCKED" } : null
    );

    setActionLoading(false);
  };

  const handleRemoveMember = async (member: Member) => {
    if (!selectedTeam) return;

    const confirmed = window.confirm(
      `Remove ${member.name} from ${selectedTeam.team_name}?`
    );

    if (!confirmed) return;

    setActionLoading(true);
    setNotice("");

    const { error } = await supabase.rpc("admin_remove_member", {
      p_member_id: member.id,
    });

    if (error) {
      setNotice(error.message);
      setActionLoading(false);
      return;
    }

    setNotice(`${member.name} removed.`);
    await loadTeams();
    setSelectedTeam(null);
    setActionLoading(false);
  };

  const handleMoveMember = async () => {
    if (!moveMemberId || !targetTeamId) {
      setNotice("Select a member and target team.");
      return;
    }

    setActionLoading(true);
    setNotice("");

    const { error } = await supabase.rpc("admin_move_member", {
      p_member_id: moveMemberId,
      p_target_team_id: targetTeamId,
    });

    if (error) {
      setNotice(error.message);
      setActionLoading(false);
      return;
    }

    setNotice("Member moved successfully.");
    await loadTeams();

    setMoveMemberId("");
    setTargetTeamId("");
    setSelectedTeam(null);
    setActionLoading(false);
  };

  const filteredTeams = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return teams;

    return teams.filter((team) => {
      return (
        team.team_name.toLowerCase().includes(query) ||
        team.team_code.toLowerCase().includes(query) ||
        team.members.some(
          (member) =>
            member.name.toLowerCase().includes(query) ||
            member.email.toLowerCase().includes(query)
        )
      );
    });
  }, [teams, search]);

  const totalMembers = teams.reduce(
    (sum, team) => sum + team.members.length,
    0
  );

  const formingTeams = teams.filter((team) => team.status === "FORMING").length;
  const lockedTeams = teams.filter((team) => team.status === "LOCKED").length;

  const availableMoveTargets = teams.filter(
    (team) =>
      team.status === "FORMING" &&
      team.id !== selectedTeam?.id &&
      team.members.length < 4
  );

  const roundByNumber = new Map(rounds.map((round) => [round.round_number, round]));

  const highestLiveScore =
    liveResults.length > 0
      ? Math.max(...liveResults.map((team) => Number(team.total_score || 0)))
      : 0;

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-yellow-400 text-xs uppercase tracking-[0.3em]">
            PROJECT: REDACTED²
          </p>
          <h1 className="mt-3 text-2xl font-semibold">
            Verifying Admin Clearance
          </h1>
          <p className="mt-2 text-sm text-white/40">Please wait...</p>
        </div>
      </main>
    );
  }

  if (errorMessage) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="w-full max-w-lg border border-white/10 rounded-2xl p-8 bg-[#0b0b0b]">
          <p className="text-yellow-400 text-xs uppercase tracking-[0.25em]">
            Access Error
          </p>
          <h1 className="text-2xl font-semibold mt-3">
            Admin Dashboard Error
          </h1>
          <p className="mt-4 text-red-400 text-sm">{errorMessage}</p>
          <button
            onClick={() => router.replace("/admin/login")}
            className="mt-6 w-full rounded-xl bg-white text-black py-3 font-semibold hover:bg-yellow-300 transition"
          >
            Return to Login
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <header className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between gap-5">
          <div>
            <p className="text-yellow-400 text-xs uppercase tracking-[0.3em]">
              PROJECT: REDACTED²
            </p>
            <h1 className="text-2xl font-semibold mt-1">
              Admin Control Center
            </h1>
            <p className="text-sm text-white/40 mt-1">{email}</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                loadDashboardData();
                loadTeams();
              }}
              className="border border-white/15 rounded-lg px-4 py-2 text-sm hover:bg-white hover:text-black transition"
            >
              Refresh
            </button>

            <button
              onClick={handleLogout}
              className="border border-white/15 rounded-lg px-4 py-2 text-sm hover:bg-white hover:text-black transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* TOP STATS */}
        <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="border border-white/10 bg-[#0b0b0b] rounded-2xl p-5">
            <p className="text-xs uppercase tracking-widest text-white/40">
              Teams
            </p>
            <p className="text-3xl font-semibold mt-2">{teams.length}</p>
          </div>

          <div className="border border-white/10 bg-[#0b0b0b] rounded-2xl p-5">
            <p className="text-xs uppercase tracking-widest text-white/40">
              Participants
            </p>
            <p className="text-3xl font-semibold mt-2">{totalMembers}</p>
          </div>

          <div className="border border-white/10 bg-[#0b0b0b] rounded-2xl p-5">
            <p className="text-xs uppercase tracking-widest text-white/40">
              Live Teams
            </p>
            <p className="text-3xl font-semibold mt-2 text-green-400">
              {liveResults.filter((team) => team.current_round > 0).length}
            </p>
          </div>

          <div className="border border-white/10 bg-[#0b0b0b] rounded-2xl p-5">
            <p className="text-xs uppercase tracking-widest text-white/40">
              Top Live Score
            </p>
            <p className="text-3xl font-semibold mt-2 text-yellow-400">
              {formatScore(highestLiveScore)}
            </p>
          </div>
        </section>

        {/* ROUND CARDS */}
        <section>
          <div className="mb-5">
            <p className="text-xs uppercase tracking-[0.25em] text-white/40">
              Event Control
            </p>
            <h2 className="text-2xl font-semibold mt-1">Rounds</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((roundNumber) => {
              const meta = ROUND_META[roundNumber];
              const round = roundByNumber.get(roundNumber);
              const available = meta.available;

              return (
                <div
                  key={roundNumber}
                  className={`rounded-2xl border p-6 ${
                    available
                      ? "border-white/10 bg-[#0b0b0b]"
                      : "border-white/5 bg-[#080808] opacity-75"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.25em] text-white/35">
                        Round {roundNumber}
                      </p>
                      <h3 className="text-xl font-semibold mt-2">
                        {meta.label}
                      </h3>
                      <p className="text-sm text-white/40 mt-1">
                        {meta.subtitle}
                      </p>
                    </div>

                    <span
                      className={`text-[10px] font-semibold uppercase tracking-widest px-3 py-1.5 rounded-full border ${
                        !available
                          ? "text-white/40 border-white/10 bg-white/[0.03]"
                          : statusClass(round?.status || "NOT STARTED")
                      }`}
                    >
                      {!available ? "CLASSIFY LATER" : round?.status || "NOT STARTED"}
                    </span>
                  </div>

                  {available ? (
                    <>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
                        <div className="border border-white/8 rounded-xl p-3">
                          <p className="text-[10px] uppercase tracking-widest text-white/30">
                            Max
                          </p>
                          <p className="mt-1 font-semibold">
                            {round?.max_score ?? (roundNumber === 1 ? 100 : 50)}
                          </p>
                        </div>

                        <div className="border border-white/8 rounded-xl p-3">
                          <p className="text-[10px] uppercase tracking-widest text-white/30">
                            Duration
                          </p>
                          <p className="mt-1 font-semibold">
                            {formatDuration(round?.duration_seconds || 0)}
                          </p>
                        </div>

                        <div className="border border-white/8 rounded-xl p-3">
                          <p className="text-[10px] uppercase tracking-widest text-white/30">
                            Started
                          </p>
                          <p className="mt-1 font-semibold">
                            {round?.teams_started ?? 0}
                          </p>
                        </div>

                        <div className="border border-white/8 rounded-xl p-3">
                          <p className="text-[10px] uppercase tracking-widest text-white/30">
                            Completed
                          </p>
                          <p className="mt-1 font-semibold">
                            {round?.teams_completed ?? 0}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 flex items-center justify-between text-sm">
                        <span className="text-white/40">
                          Average score
                        </span>
                        <span className="font-semibold">
                          {formatScore(round?.average_score)}
                        </span>
                      </div>

                      <div className="mt-2 flex items-center justify-between text-sm">
                        <span className="text-white/40">
                          Highest score
                        </span>
                        <span className="font-semibold text-yellow-400">
                          {formatScore(round?.highest_score)}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="mt-6 border border-dashed border-white/10 rounded-xl p-5">
                      <p className="text-sm text-white/45">
                        Round structure is not classified yet.
                      </p>
                      <p className="text-xs text-white/25 mt-2">
                        This card is intentionally reserved so the dashboard
                        does not need to be rebuilt later.
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* TEAMS CARD */}
        <section className="border border-white/10 bg-[#080808] rounded-2xl overflow-hidden">
          <div className="px-6 py-5 border-b border-white/10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-white/40">
                Operations
              </p>
              <h2 className="text-2xl font-semibold mt-1">Teams</h2>
              <p className="text-sm text-white/35 mt-1">
                Team membership, locking and movement controls.
              </p>
            </div>

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search team, code or participant..."
              className="w-full sm:w-80 bg-[#0b0b0b] border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-yellow-400/60"
            />
          </div>

          <div className="grid sm:grid-cols-3 border-b border-white/10">
            <div className="p-5 border-b sm:border-b-0 sm:border-r border-white/10">
              <p className="text-xs uppercase tracking-widest text-white/35">
                Total
              </p>
              <p className="text-2xl font-semibold mt-2">{teams.length}</p>
            </div>

            <div className="p-5 border-b sm:border-b-0 sm:border-r border-white/10">
              <p className="text-xs uppercase tracking-widest text-white/35">
                Forming
              </p>
              <p className="text-2xl font-semibold mt-2 text-yellow-400">
                {formingTeams}
              </p>
            </div>

            <div className="p-5">
              <p className="text-xs uppercase tracking-widest text-white/35">
                Locked
              </p>
              <p className="text-2xl font-semibold mt-2 text-green-400">
                {lockedTeams}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[760px]">
              <div className="grid grid-cols-[1fr_100px_110px_110px_40px] gap-4 px-6 py-3 border-b border-white/10 text-[11px] uppercase tracking-widest text-white/35">
                <span>Team</span>
                <span>Members</span>
                <span>Status</span>
                <span>Round</span>
                <span />
              </div>

              {teamsLoading ? (
                <div className="px-6 py-12 text-center text-white/40">
                  Loading teams...
                </div>
              ) : filteredTeams.length === 0 ? (
                <div className="px-6 py-12 text-center text-white/40">
                  No teams found.
                </div>
              ) : (
                filteredTeams.map((team) => (
                  <button
                    key={team.id}
                    onClick={() => {
                      setSelectedTeam(team);
                      setNotice("");
                      setMoveMemberId("");
                      setTargetTeamId("");
                    }}
                    className="w-full grid grid-cols-[1fr_100px_110px_110px_40px] gap-4 px-6 py-5 text-left border-b border-white/5 last:border-b-0 hover:bg-white/[0.03] transition items-center"
                  >
                    <div>
                      <p className="font-semibold">{team.team_name}</p>
                      <p className="text-xs text-yellow-400 mt-1 tracking-widest">
                        {team.team_code}
                      </p>
                    </div>

                    <p className="text-sm text-white/70">
                      {team.members.length}/4
                    </p>

                    <span
                      className={`text-xs font-semibold uppercase tracking-wider ${
                        team.status === "LOCKED"
                          ? "text-green-400"
                          : "text-yellow-400"
                      }`}
                    >
                      {team.status}
                    </span>

                    <p className="text-xs text-white/50">
                      R{team.current_round || 0}
                    </p>

                    <span className="text-white/30 text-lg">→</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </section>

        {/* LIVE RESULTS */}
        <section className="border border-white/10 bg-[#080808] rounded-2xl overflow-hidden">
          <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-green-400">
                Live
              </p>
              <h2 className="text-2xl font-semibold mt-1">Live Results</h2>
              <p className="text-sm text-white/35 mt-1">
                Current leaderboard based on saved round scores.
              </p>
            </div>

            {dashboardLoading && (
              <span className="text-xs text-white/30">Refreshing…</span>
            )}
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[850px]">
              <div className="grid grid-cols-[60px_1fr_90px_90px_90px_90px_110px] gap-4 px-6 py-3 border-b border-white/10 text-[11px] uppercase tracking-widest text-white/35">
                <span>#</span>
                <span>Team</span>
                <span>R1</span>
                <span>R2</span>
                <span>R3</span>
                <span>R4</span>
                <span>Total</span>
              </div>

              {liveResults.length === 0 ? (
                <div className="px-6 py-12 text-center text-white/40">
                  No live scores yet.
                </div>
              ) : (
                liveResults.map((team, index) => (
                  <div
                    key={team.team_id}
                    className="grid grid-cols-[60px_1fr_90px_90px_90px_90px_110px] gap-4 px-6 py-4 border-b border-white/5 last:border-b-0 items-center"
                  >
                    <span
                      className={`font-semibold ${
                        index === 0
                          ? "text-yellow-400"
                          : index === 1
                          ? "text-white/70"
                          : index === 2
                          ? "text-orange-300"
                          : "text-white/40"
                      }`}
                    >
                      {index + 1}
                    </span>

                    <div>
                      <p className="font-semibold">{team.team_name}</p>
                      <p className="text-xs text-yellow-400/80 tracking-widest mt-1">
                        {team.team_code}
                      </p>
                    </div>

                    <span className="text-white/70">
                      {formatScore(team.round1_score)}
                    </span>

                    <span className="text-white/70">
                      {formatScore(team.round2_score)}
                    </span>

                    <span className="text-white/30">
                      {team.round3_score > 0 ? formatScore(team.round3_score) : "—"}
                    </span>

                    <span className="text-white/30">
                      {team.round4_score > 0 ? formatScore(team.round4_score) : "—"}
                    </span>

                    <span className="font-semibold text-yellow-400">
                      {formatScore(team.total_score)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* RESULTS */}
        <section className="border border-white/10 bg-[#080808] rounded-2xl p-6">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-blue-300">
              Scoring
            </p>
            <h2 className="text-2xl font-semibold mt-1">Results</h2>
            <p className="text-sm text-white/35 mt-1">
              Round-wise scores now, final winner calculation later.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mt-6">
            {[1, 2, 3, 4].map((roundNumber) => {
              const round = roundByNumber.get(roundNumber);
              const available = ROUND_META[roundNumber].available;

              return (
                <div
                  key={roundNumber}
                  className="border border-white/10 rounded-xl p-5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-widest text-white/30">
                        Round {roundNumber}
                      </p>
                      <h3 className="font-semibold mt-1">
                        {ROUND_META[roundNumber].label}
                      </h3>
                    </div>

                    <span
                      className={`text-[10px] uppercase tracking-widest border rounded-full px-3 py-1.5 ${
                        available
                          ? statusClass(round?.status || "NOT STARTED")
                          : "text-white/35 border-white/10"
                      }`}
                    >
                      {available
                        ? round?.status || "NOT STARTED"
                        : "CLASSIFY LATER"}
                    </span>
                  </div>

                  {available ? (
                    <div className="grid grid-cols-2 gap-3 mt-5">
                      <div>
                        <p className="text-xs text-white/30">
                          Average
                        </p>
                        <p className="mt-1 font-semibold">
                          {formatScore(round?.average_score)}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-white/30">
                          Highest
                        </p>
                        <p className="mt-1 font-semibold text-yellow-400">
                          {formatScore(round?.highest_score)}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-5 text-sm text-white/35">
                      Scoring schema will be added once this round is classified.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* FINAL WINNER PLACEHOLDER */}
        <section className="border border-yellow-500/20 bg-yellow-500/[0.03] rounded-2xl p-6">
          <p className="text-xs uppercase tracking-[0.25em] text-yellow-400">
            Final Results
          </p>
          <h2 className="text-xl font-semibold mt-2">
            Winner calculation is reserved
          </h2>
          <p className="text-sm text-white/40 mt-2 max-w-2xl">
            Once Rounds 3 and 4 are classified, the final results card can
            calculate the official winner from all four finalized round scores
            without changing this dashboard structure.
          </p>
        </section>
      </div>

      {/* TEAM SIDE PANEL */}
      {selectedTeam && (
        <div className="fixed inset-0 z-50">
          <button
            className="absolute inset-0 bg-black/70"
            onClick={() => setSelectedTeam(null)}
            aria-label="Close panel"
          />

          <aside className="absolute top-0 right-0 h-full w-full max-w-xl bg-[#0a0a0a] border-l border-white/10 overflow-y-auto">
            <div className="sticky top-0 z-10 bg-[#0a0a0a]/95 backdrop-blur border-b border-white/10 px-6 py-5 flex justify-between items-start">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-yellow-400">
                  Team Details
                </p>
                <h2 className="text-2xl font-semibold mt-2">
                  {selectedTeam.team_name}
                </h2>
                <p className="text-sm text-white/40 mt-1">
                  {selectedTeam.team_code}
                </p>
              </div>

              <button
                onClick={() => setSelectedTeam(null)}
                className="text-white/40 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-3">
                <div className="border border-white/10 rounded-xl p-4">
                  <p className="text-xs text-white/35 uppercase tracking-widest">
                    Status
                  </p>
                  <p
                    className={`mt-2 font-semibold ${
                      selectedTeam.status === "LOCKED"
                        ? "text-green-400"
                        : "text-yellow-400"
                    }`}
                  >
                    {selectedTeam.status}
                  </p>
                </div>

                <div className="border border-white/10 rounded-xl p-4">
                  <p className="text-xs text-white/35 uppercase tracking-widest">
                    Members
                  </p>
                  <p className="mt-2 font-semibold">
                    {selectedTeam.members.length} / 4
                  </p>
                </div>

                <div className="border border-white/10 rounded-xl p-4">
                  <p className="text-xs text-white/35 uppercase tracking-widest">
                    Team Code
                  </p>
                  <p className="mt-2 font-semibold text-yellow-400">
                    {selectedTeam.team_code}
                  </p>
                </div>

                <div className="border border-white/10 rounded-xl p-4">
                  <p className="text-xs text-white/35 uppercase tracking-widest">
                    Current Round
                  </p>
                  <p className="mt-2 font-semibold">
                    {selectedTeam.current_round
                      ? `Round ${selectedTeam.current_round}`
                      : "Not started"}
                  </p>
                </div>
              </div>

              <section>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">Members</h3>
                  <span className="text-xs text-white/35">
                    {selectedTeam.members.length} participant
                    {selectedTeam.members.length === 1 ? "" : "s"}
                  </span>
                </div>

                <div className="space-y-3">
                  {selectedTeam.members.map((member) => (
                    <div
                      key={member.id}
                      className="border border-white/10 rounded-xl p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold">{member.name}</p>
                          <p className="text-sm text-white/45 mt-1">
                            {member.email}
                          </p>
                        </div>

                        {selectedTeam.status === "FORMING" && (
                          <button
                            disabled={actionLoading}
                            onClick={() => handleRemoveMember(member)}
                            className="text-xs text-red-400 hover:text-red-300 disabled:opacity-40"
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
                        <div>
                          <p className="text-white/30">College</p>
                          <p className="mt-1 text-white/70">
                            {member.college_name || "—"}
                          </p>
                        </div>

                        <div>
                          <p className="text-white/30">Department</p>
                          <p className="mt-1 text-white/70">
                            {member.department || "—"}
                          </p>
                        </div>

                        <div>
                          <p className="text-white/30">Year</p>
                          <p className="mt-1 text-white/70">
                            {member.year_of_study || "—"}
                          </p>
                        </div>

                        <div>
                          <p className="text-white/30">Contact</p>
                          <p className="mt-1 text-white/70">
                            {member.whatsapp_number || "—"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {selectedTeam.status === "FORMING" &&
                availableMoveTargets.length > 0 && (
                  <section className="border border-white/10 rounded-xl p-5">
                    <p className="text-xs uppercase tracking-widest text-white/35">
                      Team Management
                    </p>

                    <h3 className="font-semibold mt-2">Move Member</h3>

                    <div className="mt-4 space-y-3">
                      <select
                        value={moveMemberId}
                        onChange={(event) =>
                          setMoveMemberId(event.target.value)
                        }
                        className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm outline-none"
                      >
                        <option value="">Select member</option>
                        {selectedTeam.members.map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.name}
                          </option>
                        ))}
                      </select>

                      <select
                        value={targetTeamId}
                        onChange={(event) =>
                          setTargetTeamId(event.target.value)
                        }
                        className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm outline-none"
                      >
                        <option value="">Select target team</option>
                        {availableMoveTargets.map((team) => (
                          <option key={team.id} value={team.id}>
                            {team.team_name} — {team.members.length}/4
                          </option>
                        ))}
                      </select>

                      <button
                        disabled={
                          actionLoading || !moveMemberId || !targetTeamId
                        }
                        onClick={handleMoveMember}
                        className="w-full rounded-xl bg-white text-black py-3 font-semibold disabled:opacity-40 hover:bg-yellow-300 transition"
                      >
                        {actionLoading ? "Processing..." : "Move Member"}
                      </button>
                    </div>
                  </section>
                )}

              {selectedTeam.status === "FORMING" && (
                <section className="border border-yellow-500/20 bg-yellow-500/[0.04] rounded-xl p-5">
                  <p className="text-xs uppercase tracking-widest text-yellow-400">
                    Finalize Team
                  </p>

                  <h3 className="font-semibold mt-2">Lock this team</h3>

                  <p className="text-sm text-white/40 mt-2">
                    Once locked, members cannot leave, move or be removed.
                  </p>

                  <button
                    disabled={
                      actionLoading || selectedTeam.members.length < 2
                    }
                    onClick={handleLockTeam}
                    className="w-full mt-4 rounded-xl bg-yellow-400 text-black py-3 font-bold disabled:opacity-40 hover:bg-yellow-300 transition"
                  >
                    {selectedTeam.members.length < 2
                      ? "Need at Least 2 Members"
                      : actionLoading
                      ? "Processing..."
                      : "Lock Team"}
                  </button>
                </section>
              )}

              {selectedTeam.status === "LOCKED" && (
                <section className="border border-green-500/20 bg-green-500/[0.04] rounded-xl p-5">
                  <p className="text-xs uppercase tracking-widest text-green-400">
                    Team Secured
                  </p>

                  <h3 className="font-semibold mt-2">Team is locked</h3>

                  <p className="text-sm text-white/40 mt-2">
                    Team composition is now frozen.
                  </p>
                </section>
              )}

              {notice && (
                <div className="border border-white/10 rounded-xl p-4 text-sm text-white/70">
                  {notice}
                </div>
              )}
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}
