"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "@/lib/supabase";

type TeamMember = {
  name: string;
  email: string | null;
};

type Team = {
  has_team: boolean;
  team_id?: string;
  team_code?: string;
  team_name?: string;
  case_code?: string | null;
  current_round?: number | null;
  status?: string | null;
  members?: TeamMember[];
};

type Profile = {
  full_name: string;
  email: string;
  is_saveetha_student: boolean | null;
  college_name: string | null;
  year_of_study: string | null;
  department: string | null;
  whatsapp_number: string | null;
};

type Mode = "create" | "join";

const slideEase = [0.72, 0, 0.28, 1] as const;

export default function LobbyPage() {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [team, setTeam] = useState<Team | null>(null);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [mode, setMode] = useState<Mode>("create");

  const [profileOpen, setProfileOpen] = useState(false);

  const [teamName, setTeamName] = useState("");
  const [teamCode, setTeamCode] = useState("");

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const clearMessages = () => {
    setMessage("");
    setErrorMessage("");
  };

  const loadLobby = async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      /*
       * PROFILE
       *
       * public.users is the primary source.
       * Auth metadata is used as a fallback so the lobby
       * does not break if the profile row cannot be read.
       */

      const { data: profileData, error: profileError } =
        await supabase
          .from("users")
          .select(
            `
              full_name,
              email,
              is_saveetha_student,
              college_name,
              year_of_study,
              department,
              whatsapp_number
            `
          )
          .eq("id", user.id)
          .maybeSingle();

      if (profileError) {
        console.warn(
          "Profile lookup failed. Using auth metadata.",
          profileError
        );
      }

      const fallbackProfile: Profile = {
        full_name:
          user.user_metadata?.full_name ||
          "INVESTIGATOR",
        email: user.email || "",
        is_saveetha_student:
          typeof user.user_metadata
            ?.is_saveetha_student === "boolean"
            ? user.user_metadata.is_saveetha_student
            : null,
        college_name:
          user.user_metadata?.college_name || null,
        year_of_study:
          user.user_metadata?.year_of_study || null,
        department:
          user.user_metadata?.department || null,
        whatsapp_number:
          user.user_metadata?.whatsapp_number || null,
      };

      setProfile(
        profileData
          ? (profileData as Profile)
          : fallbackProfile
      );

      /*
       * TEAM
       */

      const { data: teamData, error: teamError } =
        await supabase.rpc("get_my_team");

      if (teamError) {
        console.warn(
          "Team lookup failed:",
          teamError
        );

        setTeam({
          has_team: false,
        });
      } else {
        setTeam(
          teamData
            ? (teamData as Team)
            : { has_team: false }
        );
      }
    } catch (error) {
      console.error(
        "Lobby loading error:",
        error
      );

      setErrorMessage(
        "Unable to open the lobby. Please refresh."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLobby();
  }, []);

  const createTeam = async () => {
    clearMessages();

    if (!teamName.trim()) {
      setErrorMessage(
        "Enter a team name first."
      );
      return;
    }

    setActionLoading(true);

    try {
      const { data, error } =
        await supabase.rpc("create_team", {
          p_team_name: teamName.trim(),
        });

      if (error) {
        console.error(
          "Create team error:",
          error
        );

        setErrorMessage(
          error.message
            .replace("Database error: ", "")
            .replace("create_team: ", "")
        );

        return;
      }

      setTeam({
        has_team: true,
        team_id: data.team_id,
        team_code: data.team_code,
        team_name: data.team_name,
        status: data.status,
        members: [
          {
            name:
              profile?.full_name ||
              "INVESTIGATOR",
            email: profile?.email || null,
          },
        ],
      });

      setTeamName("");

      setMessage(
        `Team created. Share ${data.team_code} with your teammates.`
      );
    } catch (error) {
      console.error(
        "Unexpected create team error:",
        error
      );

      setErrorMessage(
        "Unable to create the team."
      );
    } finally {
      setActionLoading(false);
    }
  };

  const joinTeam = async () => {
    clearMessages();

    const code = teamCode
      .trim()
      .toUpperCase();

    if (!code) {
      setErrorMessage(
        "Enter a team code first."
      );
      return;
    }

    setActionLoading(true);

    try {
      const { data, error } =
        await supabase.rpc("join_team", {
          p_team_code: code,
        });

      if (error) {
        console.error(
          "Join team error:",
          error
        );

        setErrorMessage(
          error.message
            .replace("Database error: ", "")
            .replace("join_team: ", "")
        );

        return;
      }

      setTeamCode("");

      setMessage(
        `You joined ${data.team_name}.`
      );

      await loadLobby();
    } catch (error) {
      console.error(
        "Unexpected join team error:",
        error
      );

      setErrorMessage(
        "Unable to join the team."
      );
    } finally {
      setActionLoading(false);
    }
  };

  const leaveTeam = async () => {
    clearMessages();
    setActionLoading(true);

    try {
      const { data, error } =
        await supabase.rpc("leave_team");

      if (error) {
        console.error(
          "Leave team error:",
          error
        );

        setErrorMessage(
          error.message
            .replace("Database error: ", "")
            .replace("leave_team: ", "")
        );

        return;
      }

      setTeam({
        has_team: false,
      });

      setMode("join");

      setMessage(
        data?.team_deleted
          ? "Team closed. You can now join another team."
          : "You left the team. You can now create or join another team."
      );
    } catch (error) {
      console.error(
        "Unexpected leave team error:",
        error
      );

      setErrorMessage(
        "Unable to leave the team."
      );
    } finally {
      setActionLoading(false);
    }
  };

  const copyTeamCode = async () => {
    if (!team?.team_code) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        team.team_code
      );

      setMessage(
        "Team code copied."
      );
    } catch {
      setMessage(
        `Team code: ${team.team_code}`
      );
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="mx-auto w-8 h-8 border border-white/20 border-t-[#f2c300] rounded-full animate-spin" />

          <p className="mt-5 text-[10px] tracking-[0.35em] text-white/40">
            LOADING LOBBY
          </p>
        </motion.div>
      </main>
    );
  }

  const displayName =
    profile?.full_name ||
    "INVESTIGATOR";

  const hasTeam =
    team?.has_team === true;

  const members =
    team?.members || [];

  const memberCount =
    members.length;

  const teamReady =
    memberCount >= 2 &&
    memberCount <= 4;

  return (
    <main className="min-h-screen bg-black text-[#f4f1e8] overflow-x-hidden">

      {/* =====================================================
          HEADER
      ====================================================== */}

      <header className="border-b border-[#f2c300]/20 bg-black">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">

          <div>
            <p className="text-[10px] tracking-[0.4em] text-white/35">
              INVESTIGATION NETWORK
            </p>

            <h1 className="mt-1 text-lg sm:text-xl font-bold tracking-wide">
              PROJECT: REDACTED
              <sup className="ml-0.5 text-[#f2c300] text-[9px]">
                2
              </sup>
            </h1>
          </div>

          <div className="flex items-center gap-4 sm:gap-6">

            <button
              type="button"
              onClick={() =>
                setProfileOpen(
                  (current) => !current
                )
              }
              className="text-right"
            >
              <p className="text-sm font-semibold">
                {displayName}
              </p>

              <p className="mt-0.5 text-[9px] tracking-[0.2em] text-[#f2c300]">
                PROFILE
              </p>
            </button>

            <div className="w-px h-7 bg-white/10" />

            <button
              type="button"
              onClick={signOut}
              className="text-xs text-white/45 hover:text-white transition"
            >
              SIGN OUT
            </button>

          </div>
        </div>
      </header>

      {/* =====================================================
          PROFILE
      ====================================================== */}

      {profileOpen && (
        <motion.div
          initial={{
            opacity: 0,
            height: 0,
          }}
          animate={{
            opacity: 1,
            height: "auto",
          }}
          className="overflow-hidden border-b border-white/10 bg-[#090909]"
        >
          <div className="max-w-7xl mx-auto px-6 py-7">

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-white/10 border border-white/10">

              {[
                ["NAME", displayName],
                ["EMAIL", profile?.email || "—"],
                [
                  "INSTITUTION",
                  profile?.college_name || "—",
                ],
                [
                  "DEPARTMENT",
                  profile?.department || "—",
                ],
                [
                  "YEAR",
                  profile?.year_of_study || "—",
                ],
                [
                  "CONTACT",
                  profile?.whatsapp_number || "—",
                ],
                [
                  "CLEARANCE",
                  profile?.is_saveetha_student
                    ? "INTERNAL"
                    : "EXTERNAL",
                ],
              ].map(
                ([label, value]) => (
                  <div
                    key={label}
                    className="bg-[#0b0b0b] p-5"
                  >
                    <p className="text-[9px] tracking-[0.25em] text-white/30">
                      {label}
                    </p>

                    <p className="mt-2 text-sm text-white/80 break-words">
                      {value}
                    </p>
                  </div>
                )
              )}

            </div>
          </div>
        </motion.div>
      )}

      {/* =====================================================
          LOBBY INTRO
      ====================================================== */}

      <section className="max-w-7xl mx-auto px-6 pt-12">

        <motion.div
          initial={{
            opacity: 0,
            y: 10,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 0.5,
          }}
        >

          <p className="text-[10px] tracking-[0.4em] text-[#f2c300]">
            PARTICIPANT LOBBY
          </p>

          <h2 className="mt-4 text-4xl sm:text-5xl lg:text-6xl font-black tracking-[-0.04em]">
            READY TO BUILD
            <br />
            YOUR TEAM?
          </h2>

          <p className="mt-5 max-w-xl text-sm sm:text-base text-white/45 leading-7">
            Create an investigation group or enter an
            existing team using its access code.
          </p>

        </motion.div>

        {/* =====================================================
            MESSAGES
        ====================================================== */}

        <AnimatePresence>
          {(message || errorMessage) && (
            <motion.div
              initial={{
                opacity: 0,
                y: -6,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              exit={{
                opacity: 0,
                y: -6,
              }}
              className={`mt-7 border px-4 py-3 text-sm ${
                errorMessage
                  ? "border-red-500/30 text-red-300 bg-red-500/[0.04]"
                  : "border-[#f2c300]/20 text-[#f2c300] bg-[#f2c300]/[0.03]"
              }`}
            >
              {errorMessage ||
                message}
            </motion.div>
          )}
        </AnimatePresence>

        {/* =====================================================
            EXISTING TEAM
        ====================================================== */}

        {hasTeam ? (

          <motion.div
            initial={{
              opacity: 0,
              y: 15,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            className="mt-10 mb-16"
          >

            <div className="border border-white/12 bg-[#090909]">

              <div className="grid lg:grid-cols-[1.45fr_0.55fr]">

                {/* TEAM */}

                <div className="p-7 sm:p-10">

                  <div className="flex items-start justify-between gap-6">
                    <div>

                      <p className="text-[9px] tracking-[0.35em] text-white/30">
                        ACTIVE TEAM
                      </p>

                      <h3 className="mt-3 text-3xl sm:text-4xl font-black uppercase">
                        {team?.team_name}
                      </h3>

                    </div>

                    <div className="text-right">
                      <p className="text-[9px] tracking-[0.25em] text-white/30">
                        MEMBERS
                      </p>

                      <p className="mt-2 text-xl font-bold text-[#f2c300]">
                        {memberCount}/4
                      </p>
                    </div>
                  </div>

                  <p className="mt-4 text-sm text-white/45 max-w-2xl leading-6">
                    {teamReady
                      ? "Your team has enough members for administrative review."
                      : "Your team is still forming. Share the code with another investigator."}
                  </p>

                  {/* MEMBERS */}

                  <div className="mt-8 space-y-2">

                    {members.map(
                      (
                        member,
                        index
                      ) => (
                        <div
                          key={`${member.email}-${index}`}
                          className="flex items-center justify-between border border-white/8 bg-[#0d0d0d] px-4 py-4"
                        >

                          <div>
                            <p className="text-sm font-semibold">
                              {member.name}
                            </p>

                            <p className="mt-1 text-xs text-white/30 break-all">
                              {member.email}
                            </p>
                          </div>

                          <span className="text-[9px] tracking-[0.18em] text-white/25">
                            MEMBER{" "}
                            {index + 1}
                          </span>

                        </div>
                      )
                    )}

                  </div>

                  {/* ACTIONS */}

                  <div className="flex flex-col sm:flex-row gap-3 mt-7">

                    <button
                      type="button"
                      onClick={copyTeamCode}
                      className="flex-1 border border-[#f2c300]/30 text-[#f2c300] py-3.5 text-xs font-bold tracking-[0.15em] hover:bg-[#f2c300] hover:text-black transition"
                    >
                      COPY TEAM CODE
                    </button>

                    <button
                      type="button"
                      onClick={leaveTeam}
                      disabled={actionLoading}
                      className="flex-1 border border-white/10 text-white/45 py-3.5 text-xs font-bold tracking-[0.15em] hover:border-red-400/30 hover:text-red-300 disabled:opacity-50 transition"
                    >
                      {actionLoading
                        ? "PROCESSING..."
                        : "LEAVE TEAM"}
                    </button>

                  </div>

                </div>

                {/* INTEL */}

                <div className="border-t lg:border-t-0 lg:border-l border-white/10 bg-[#0d0d0d] p-7 sm:p-10">

                  <p className="text-[9px] tracking-[0.35em] text-white/30">
                    TEAM INTEL
                  </p>

                  <div className="mt-8">

                    <p className="text-[9px] tracking-[0.25em] text-white/30">
                      ACCESS CODE
                    </p>

                    <button
                      type="button"
                      onClick={copyTeamCode}
                      className="mt-3 text-left"
                    >
                      <p className="text-4xl font-black tracking-[0.22em] text-[#f2c300]">
                        {team?.team_code}
                      </p>
                    </button>

                  </div>

                  <div className="mt-10 pt-7 border-t border-white/10">

                    <p className="text-[9px] tracking-[0.25em] text-white/30">
                      TEAM STATUS
                    </p>

                    <p className="mt-3 text-lg font-bold">
                      {team?.status ||
                        "FORMING"}
                    </p>

                  </div>

                  <div className="mt-8">

                    <p className="text-[9px] tracking-[0.25em] text-white/30">
                      CLEARANCE
                    </p>

                    <p className="mt-3 text-sm text-white/55">
                      Waiting for administrative
                      lock.
                    </p>

                  </div>

                </div>

              </div>

            </div>

          </motion.div>

        ) : (

          /* ===================================================
             SLOT-SNIPER SLIDER
          ==================================================== */

          <motion.div
            initial={{
              opacity: 0,
              y: 15,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.55,
              delay: 0.1,
            }}
            className="mt-10 mb-16"
          >

            <div className="relative w-full max-w-[1120px] mx-auto h-[570px] sm:h-[610px] overflow-hidden border border-white/15 bg-[#080808]">

              {/* =================================================
                  LEFT FORM
              ================================================== */}

              <div className="absolute inset-y-0 left-0 w-1/2 hidden md:flex items-center justify-center px-8 lg:px-14">

                <motion.div
                  animate={{
                    x:
                      mode === "create"
                        ? 0
                        : -18,
                    opacity:
                      mode === "create"
                        ? 1
                        : 0.35,
                  }}
                  transition={{
                    duration: 0.95,
                    ease: slideEase,
                  }}
                  className="w-full max-w-sm"
                >

                  <p className="text-[9px] tracking-[0.35em] text-white/30">
                    TEAM PROTOCOL 01
                  </p>

                  <h3 className="mt-5 text-4xl lg:text-5xl font-black tracking-[-0.04em]">
                    CREATE
                    <br />
                    TEAM
                  </h3>

                  <p className="mt-5 text-sm text-white/45 leading-7">
                    Establish a new investigation group
                    and receive a unique access code for
                    your teammates.
                  </p>

                  <div className="mt-9">

                    <label className="text-[10px] tracking-[0.2em] text-white/55">
                      TEAM NAME
                    </label>

                    <input
                      type="text"
                      value={teamName}
                      onChange={(e) =>
                        setTeamName(
                          e.target.value
                        )
                      }
                      onKeyDown={(e) => {
                        if (
                          e.key === "Enter"
                        ) {
                          createTeam();
                        }
                      }}
                      disabled={
                        mode !== "create"
                      }
                      placeholder="Enter team name"
                      className="mt-3 w-full h-14 border border-white/12 bg-[#050505] px-5 text-white placeholder:text-white/20 outline-none focus:border-[#f2c300]/50 transition"
                    />

                  </div>

                  <button
                    type="button"
                    onClick={createTeam}
                    disabled={
                      actionLoading ||
                      mode !== "create"
                    }
                    className="mt-5 w-full h-14 bg-[#f2c300] text-black font-black text-xs tracking-[0.15em] hover:bg-[#ffd83b] disabled:opacity-40 transition"
                  >
                    {actionLoading
                      ? "CREATING..."
                      : "CREATE TEAM"}
                  </button>

                </motion.div>

              </div>

              {/* =================================================
                  RIGHT FORM
              ================================================== */}

              <div className="absolute inset-y-0 right-0 w-1/2 hidden md:flex items-center justify-center px-8 lg:px-14">

                <motion.div
                  animate={{
                    x:
                      mode === "join"
                        ? 0
                        : 18,
                    opacity:
                      mode === "join"
                        ? 1
                        : 0.35,
                  }}
                  transition={{
                    duration: 0.95,
                    ease: slideEase,
                  }}
                  className="w-full max-w-sm"
                >

                  <p className="text-[9px] tracking-[0.35em] text-white/30">
                    TEAM PROTOCOL 02
                  </p>

                  <h3 className="mt-5 text-4xl lg:text-5xl font-black tracking-[-0.04em]">
                    JOIN
                    <br />
                    TEAM
                  </h3>

                  <p className="mt-5 text-sm text-white/45 leading-7">
                    Already part of an investigation
                    group? Enter its access code.
                  </p>

                  <div className="mt-9">

                    <label className="text-[10px] tracking-[0.2em] text-white/55">
                      TEAM CODE
                    </label>

                    <input
                      type="text"
                      value={teamCode}
                      onChange={(e) =>
                        setTeamCode(
                          e.target.value
                            .toUpperCase()
                            .replace(
                              /[^A-Z0-9]/g,
                              ""
                            )
                            .slice(
                              0,
                              6
                            )
                        )
                      }
                      onKeyDown={(e) => {
                        if (
                          e.key === "Enter"
                        ) {
                          joinTeam();
                        }
                      }}
                      maxLength={6}
                      disabled={
                        mode !== "join"
                      }
                      placeholder="ENTER CODE"
                      className="mt-3 w-full h-14 border border-white/12 bg-[#050505] px-5 text-white placeholder:text-white/20 uppercase tracking-[0.3em] outline-none focus:border-[#f2c300]/50 transition"
                    />

                  </div>

                  <button
                    type="button"
                    onClick={joinTeam}
                    disabled={
                      actionLoading ||
                      mode !== "join"
                    }
                    className="mt-5 w-full h-14 bg-[#f2c300] text-black font-black text-xs tracking-[0.15em] hover:bg-[#ffd83b] disabled:opacity-40 transition"
                  >
                    {actionLoading
                      ? "JOINING..."
                      : "JOIN TEAM"}
                  </button>

                </motion.div>

              </div>

              {/* =================================================
                  MOVING GOLD PANEL
              ================================================== */}

              <motion.div
                animate={{
                  left:
                    mode === "create"
                      ? "50%"
                      : "0%",
                }}
                transition={{
                  duration: 1.05,
                  ease: slideEase,
                }}
                className="absolute top-0 bottom-0 left-0 z-20 hidden md:block w-1/2"
              >

                <div className="relative h-full overflow-hidden bg-[#f2c300] text-black">

                  {/* subtle pattern */}

                  <div className="absolute inset-0 opacity-[0.06] bg-[repeating-linear-gradient(135deg,#000_0,#000_1px,transparent_1px,transparent_12px)]" />

                  {/* moving edge */}

                  <motion.div
                    animate={{
                      x:
                        mode === "create"
                          ? ["-50%", "150%"]
                          : ["150%", "-50%"],
                    }}
                    transition={{
                      duration: 1.25,
                      ease: slideEase,
                    }}
                    className="absolute top-0 bottom-0 w-16 bg-white/20 blur-sm"
                  />

                  <div className="relative z-10 h-full p-8 lg:p-11 flex flex-col justify-between">

                    {/* BRAND */}

                    <div>

                      <p className="text-[10px] tracking-[0.35em] font-bold">
                        PROJECT: REDACTED
                        <sup className="text-[7px] ml-0.5">
                          2
                        </sup>
                      </p>

                      <div className="mt-7 h-px bg-black/15" />

                    </div>

                    {/* INTEL */}

                    <motion.div
                      key={mode}
                      initial={{
                        opacity: 0,
                        y: 10,
                      }}
                      animate={{
                        opacity: 1,
                        y: 0,
                      }}
                      transition={{
                        duration: 0.6,
                        ease: slideEase,
                      }}
                      className="flex-1 flex flex-col justify-center"
                    >

                      <p className="text-[9px] tracking-[0.32em] font-bold opacity-55">
                        TEAM INTEL
                      </p>

                      <h3 className="mt-5 text-4xl lg:text-5xl font-black tracking-[-0.04em] uppercase leading-[0.95]">
                        {mode === "create"
                          ? "BUILD YOUR TEAM."
                          : "HAVE A CODE?"}
                      </h3>

                      <p className="mt-6 max-w-sm text-sm leading-6 text-black/65">
                        {mode === "create"
                          ? "Create the team first. Your teammates can join using the access code generated for you."
                          : "Enter an existing team's access code and join the investigation."}
                      </p>

                    </motion.div>

                    {/* SWITCH */}

                    <div>

                      <p className="mb-3 text-[10px] font-bold tracking-[0.08em] opacity-55">
                        {mode === "create"
                          ? "ALREADY HAVE A TEAM?"
                          : "STARTING A NEW TEAM?"}
                      </p>

                      <button
                        type="button"
                        onClick={() => {
                          clearMessages();

                          setMode(
                            mode ===
                              "create"
                              ? "join"
                              : "create"
                          );
                        }}
                        className="w-full border border-black/30 py-4 text-xs font-black tracking-[0.13em] hover:bg-black hover:text-[#f2c300] transition-colors duration-300"
                      >
                        {mode === "create"
                          ? "JOIN A TEAM"
                          : "CREATE A TEAM"}
                      </button>

                    </div>

                  </div>

                  {/* hard edge */}

                  <div className="absolute inset-y-0 right-0 w-px bg-black/20" />

                </div>

              </motion.div>

              {/* =================================================
                  MOBILE
              ================================================== */}

              <div className="md:hidden absolute inset-0 p-7 flex items-center">

                <motion.div
                  key={mode}
                  initial={{
                    opacity: 0,
                    x:
                      mode === "create"
                        ? -25
                        : 25,
                  }}
                  animate={{
                    opacity: 1,
                    x: 0,
                  }}
                  transition={{
                    duration: 0.7,
                    ease: slideEase,
                  }}
                  className="w-full"
                >

                  <p className="text-[9px] tracking-[0.35em] text-white/30">
                    TEAM PROTOCOL{" "}
                    {mode === "create"
                      ? "01"
                      : "02"}
                  </p>

                  <h3 className="mt-5 text-4xl font-black">
                    {mode === "create"
                      ? "CREATE TEAM"
                      : "JOIN TEAM"}
                  </h3>

                  <p className="mt-4 text-sm text-white/45 leading-6">
                    {mode === "create"
                      ? "Create your investigation group."
                      : "Enter your team's access code."}
                  </p>

                  {mode === "create" ? (
                    <>
                      <input
                        type="text"
                        value={teamName}
                        onChange={(e) =>
                          setTeamName(
                            e.target.value
                          )
                        }
                        placeholder="Enter team name"
                        className="mt-8 w-full h-14 border border-white/12 bg-[#050505] px-5 outline-none"
                      />

                      <button
                        type="button"
                        onClick={createTeam}
                        disabled={
                          actionLoading
                        }
                        className="mt-4 w-full h-14 bg-[#f2c300] text-black font-black"
                      >
                        {actionLoading
                          ? "CREATING..."
                          : "CREATE TEAM"}
                      </button>
                    </>
                  ) : (
                    <>
                      <input
                        type="text"
                        value={teamCode}
                        onChange={(e) =>
                          setTeamCode(
                            e.target.value
                              .toUpperCase()
                              .replace(
                                /[^A-Z0-9]/g,
                                ""
                              )
                              .slice(
                                0,
                                6
                              )
                          )
                        }
                        maxLength={6}
                        placeholder="ENTER CODE"
                        className="mt-8 w-full h-14 border border-white/12 bg-[#050505] px-5 uppercase tracking-[0.3em] outline-none"
                      />

                      <button
                        type="button"
                        onClick={joinTeam}
                        disabled={
                          actionLoading
                        }
                        className="mt-4 w-full h-14 bg-[#f2c300] text-black font-black"
                      >
                        {actionLoading
                          ? "JOINING..."
                          : "JOIN TEAM"}
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      clearMessages();

                      setMode(
                        mode ===
                          "create"
                          ? "join"
                          : "create"
                      );
                    }}
                    className="mt-6 w-full border border-white/15 py-3.5 text-xs font-bold text-white/55"
                  >
                    {mode === "create"
                      ? "I HAVE A TEAM CODE"
                      : "I WANT TO CREATE A TEAM"}
                  </button>

                </motion.div>

              </div>

            </div>

          </motion.div>
        )}

      </section>
    </main>
  );
}