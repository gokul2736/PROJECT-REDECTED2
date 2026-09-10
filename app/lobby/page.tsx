"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";

export default function LobbyPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [teamName, setTeamName] = useState("");
  const [members, setMembers] = useState<string[]>([]);
  const [teamId, setTeamId] = useState("");
  const [status, setStatus] = useState("WAITING");

  useEffect(() => {
    let mounted = true;

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/");
        return;
      }

      const { data: r2 } = await supabase.rpc(
        "student_get_round_state",
        { p_round_number: 2 }
      );

      if (!mounted) return;

      if (r2?.team_id) {
        setTeamId(r2.team_id);
        const meta = r2.metadata || {};
        setTeamName(
          meta.team_display_name ||
            user.user_metadata?.full_name ||
            "YOUR TEAM"
        );
        setMembers(
          Array.isArray(meta.team_member_names)
            ? meta.team_member_names
            : [
                user.user_metadata?.full_name ||
                  "CAPTAIN",
              ]
        );
      } else {
        router.replace("/");
        return;
      }

      setLoading(false);
    }

    load();
    return () => {
      mounted = false;
    };
  }, [router]);

  useEffect(() => {
    if (!teamId) return;

    let active = true;

    const poll = async () => {
      try {
        const { data } = await supabase.rpc(
          "student_get_round_state",
          { p_round_number: 2 }
        );

        if (!active) return;

        if (data?.round_status === "LIVE") {
          router.replace("/rounds/round-2");
          return;
        }

        const { data: r3 } = await supabase.rpc(
          "student_get_round_state",
          { p_round_number: 3 }
        );

        if (!active) return;

        if (r3?.round_status === "LIVE") {
          router.replace("/rounds/round-3");
          return;
        }
      } catch {
        // ignore
      }
    };

    poll();
    const interval = setInterval(poll, 4000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [teamId, router]);

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto w-8 h-8 border border-white/20 border-t-[#f2c300] rounded-full animate-spin" />
          <p className="mt-5 text-[10px] tracking-[0.35em] text-white/40">
            LOADING LOBBY
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-[#f4f1e8]">
      <header className="border-b border-[#f2c300]/20 bg-black">
        <div className="max-w-7xl mx-auto px-6 py-5">
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
      </header>

      <section className="max-w-2xl mx-auto px-6 pt-16">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <p className="text-[10px] tracking-[0.4em] text-[#f2c300]">
            TEAM REGISTERED
          </p>

          <h2 className="mt-4 text-4xl sm:text-5xl font-black tracking-tight uppercase">
            {teamName}
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-10 border border-white/12 bg-[#090909]"
        >
          <div className="p-7">
            <p className="text-[9px] tracking-[0.35em] text-white/30">
              TEAM MEMBERS
            </p>

            <div className="mt-5 space-y-2">
              {members.map((name, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between border border-white/8 bg-[#0d0d0d] px-4 py-4"
                >
                  <p className="text-sm font-semibold">
                    {name}
                  </p>
                  <span className="text-[9px] tracking-[0.18em] text-white/25">
                    {index === 0
                      ? "CAPTAIN"
                      : `MEMBER ${index + 1}`}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-white/10 p-7 text-center">
            <div className="mx-auto w-6 h-6 border border-white/20 border-t-[#f2c300] rounded-full animate-spin" />

            <p className="mt-4 text-sm text-white/55">
              Waiting for the coordinator to start
              the round...
            </p>

            <p className="mt-2 text-[10px] text-white/25">
              You will be redirected automatically.
            </p>
          </div>
        </motion.div>
      </section>
    </main>
  );
}
