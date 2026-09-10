"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";

export default function EntryPage() {
  const router = useRouter();

  const [teamName, setTeamName] = useState("");
  const [captainName, setCaptainName] = useState("");
  const [member2, setMember2] = useState("");
  const [member3, setMember3] = useState("");
  const [member4, setMember4] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleStart = async () => {
    setError("");

    const name = teamName.trim();
    const captain = captainName.trim();

    if (!name) {
      setError("Enter a team name.");
      return;
    }

    if (!captain) {
      setError("Enter the captain's name.");
      return;
    }

    setLoading(true);

    try {
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .slice(0, 20);

      const uid = Math.random().toString(36).slice(2, 8);
      const email = `${slug}_${uid}@event.redacted`;
      const password = `Event_${uid}_${Date.now()}`;

      const { error: signUpError } =
        await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: captain,
              is_saveetha_student: true,
              college_name: "Event Participant",
              year_of_study: "-",
              department: "-",
              whatsapp_number: "-",
            },
          },
        });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      await new Promise((r) => setTimeout(r, 500));

      const { error: loginError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (loginError) {
        setError(
          "Account created but login failed. Ask coordinator for help."
        );
        setLoading(false);
        return;
      }

      const { data: teamData, error: teamError } =
        await supabase.rpc("create_team", {
          p_team_name: name,
        });

      if (teamError) {
        setError(
          teamError.message
            .replace("Database error: ", "")
            .replace("create_team: ", "")
        );
        setLoading(false);
        return;
      }

      const members = [member2, member3, member4]
        .map((m) => m.trim())
        .filter(Boolean);

      const allMembers = [captain, ...members];
      await supabase.rpc("student_save_round_state", {
        p_round_number: 2,
        p_metadata: {
          team_member_names: allMembers,
          team_display_name: name,
        },
      });

      if (typeof window !== "undefined") {
        localStorage.setItem(
          "pr2_team",
          JSON.stringify({
            name,
            members: allMembers,
            code: teamData?.team_code || slug,
          })
        );
      }

      router.push("/rounds/round-2");
    } catch (err) {
      console.error("Entry error:", err);
      setError("Something went wrong. Try again.");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white flex flex-col">
      <header className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <p className="text-[10px] tracking-[0.4em] text-white/35">
            INVESTIGATION NETWORK
          </p>
          <h1 className="mt-1 text-xl font-bold tracking-wide">
            PROJECT: REDACTED
            <sup className="ml-0.5 text-[#f2c300] text-[9px]">2</sup>
          </h1>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-lg"
        >
          <p className="text-[10px] tracking-[0.35em] text-[#f2c300]">
            TEAM REGISTRATION
          </p>

          <h2 className="mt-3 text-4xl font-black">
            ENTER YOUR TEAM
          </h2>

          <p className="mt-3 text-sm text-white/40">
            One entry per team. Captain registers for the group.
          </p>

          <div className="mt-8 border border-white/10 bg-[#090909] p-7 space-y-5">
            <div>
              <label className="text-[10px] tracking-[0.2em] text-white/50">
                TEAM NAME *
              </label>
              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="e.g. APEX DETECTIVES"
                className="mt-2 w-full h-13 border border-white/12 bg-black px-4 py-3 text-white placeholder:text-white/20 outline-none focus:border-[#f2c300]/50"
              />
            </div>

            <div>
              <label className="text-[10px] tracking-[0.2em] text-white/50">
                CAPTAIN NAME *
              </label>
              <input
                type="text"
                value={captainName}
                onChange={(e) => setCaptainName(e.target.value)}
                placeholder="Full name"
                className="mt-2 w-full h-13 border border-white/12 bg-black px-4 py-3 text-white placeholder:text-white/20 outline-none focus:border-[#f2c300]/50"
              />
            </div>

            <div className="border-t border-white/8 pt-5">
              <label className="text-[10px] tracking-[0.2em] text-white/50">
                TEAM MEMBERS
              </label>
              <p className="mt-1 text-[10px] text-white/25">
                Enter your teammates' names (1-3 additional)
              </p>

              <input
                type="text"
                value={member2}
                onChange={(e) => setMember2(e.target.value)}
                placeholder="Member 2"
                className="mt-3 w-full border border-white/12 bg-black px-4 py-3 text-white placeholder:text-white/20 outline-none focus:border-[#f2c300]/50"
              />
              <input
                type="text"
                value={member3}
                onChange={(e) => setMember3(e.target.value)}
                placeholder="Member 3"
                className="mt-2 w-full border border-white/12 bg-black px-4 py-3 text-white placeholder:text-white/20 outline-none focus:border-[#f2c300]/50"
              />
              <input
                type="text"
                value={member4}
                onChange={(e) => setMember4(e.target.value)}
                placeholder="Member 4"
                className="mt-2 w-full border border-white/12 bg-black px-4 py-3 text-white placeholder:text-white/20 outline-none focus:border-[#f2c300]/50"
              />
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="border border-red-500/30 bg-red-500/[0.04] px-4 py-3 text-sm text-red-300"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <button
              onClick={handleStart}
              disabled={loading}
              className="w-full bg-[#f2c300] text-black py-4 font-black text-xs tracking-[0.15em] hover:bg-[#ffd83b] disabled:opacity-40 transition"
            >
              {loading ? "SETTING UP..." : "START INVESTIGATION →"}
            </button>
          </div>

          <p className="mt-4 text-center text-[10px] text-white/20">
            One registration per team. Your team will be assigned automatically.
          </p>
        </motion.div>
      </div>
    </main>
  );
}
