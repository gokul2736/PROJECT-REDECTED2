"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

interface TeamResult {
  rank: number;
  name: string;
  code: string;
  members: string[];
  r1Score: number;
  r2Score: number;
  total: number;
  distinction: string;
}

const OFFICIAL_RESULTS: TeamResult[] = [
  {
    rank: 1,
    name: "DualSpark",
    code: "3BAD80",
    members: ["P Keerthana", "Yenuganti Prathyusha"],
    r1Score: 44.0,
    r2Score: 45.5,
    total: 89.5,
    distinction: "Grand Champion · Highest Total & R2 Trail Score",
  },
  {
    rank: 2,
    name: "NOYYAL TITANS",
    code: "4FB494",
    members: [
      "Jai Akash R",
      "Yuvan Karthikeyan S",
      "Aabidh Mohamed P",
      "Murugesan P",
    ],
    r1Score: 38.0,
    r2Score: 47.0,
    total: 85.0,
    distinction: "Runner-Up · Best Forensic Trail Synthesis",
  },
  {
    rank: 3,
    name: "TEAM SWAG",
    code: "394F00",
    members: ["Sameena J", "Logesh G", "Sowmiya G"],
    r1Score: 45.0,
    r2Score: 34.0,
    total: 79.0,
    distinction: "2nd Runner-Up · Highest Crime Scene Efficiency",
  },
  {
    rank: 4,
    name: "TEAM NOVA",
    code: "106D4E",
    members: [
      "Gowtham R",
      "Ashwanth P",
      "Neela Kandan V",
      "Ashwin S",
    ],
    r1Score: 45.0,
    r2Score: 33.5,
    total: 78.5,
    distinction: "Top 5 Finalist · Precision Digital Analysis",
  },
  {
    rank: 5,
    name: "PNDP",
    code: "A9F225",
    members: [
      "Pavithra S",
      "Nandhana Marien F",
      "Prathiksha B",
      "Dhiyaashni D.K",
    ],
    r1Score: 43.0,
    r2Score: 35.0,
    total: 78.0,
    distinction: "Top 5 Finalist · Balanced Investigative Flow",
  },
  {
    rank: 6,
    name: "Sherlock Holmes",
    code: "D3223F",
    members: ["Sriram A", "Mohamed Afzal N", "Krithik Kiran S"],
    r1Score: 43.0,
    r2Score: 33.0,
    total: 76.0,
    distinction: "Honor Mention · Rapid Artifact Acquisition",
  },
  {
    rank: 7,
    name: "Apex",
    code: "2FE641",
    members: ["Alvina Sha", "Kamalika S", "Abhirami P", "Ragavi R"],
    r1Score: 41.5,
    r2Score: 33.0,
    total: 74.5,
    distinction: "Honor Mention · Strong Cross-Reference Logic",
  },
  {
    rank: 8,
    name: "Mystical",
    code: "48A936",
    members: ["Khenza B", "Leina Varsha B", "Avanthika S"],
    r1Score: 40.5,
    r2Score: 33.0,
    total: 73.5,
    distinction: "Honor Mention · Consistent Deduction",
  },
  {
    rank: 9,
    name: "hostel gang",
    code: "AAFDC2",
    members: [
      "Lavanya S",
      "Bavana A",
      "Dharshini R",
      "Pooja S",
      "Uma Bharathi P",
    ],
    r1Score: 39.0,
    r2Score: 32.0,
    total: 71.0,
    distinction: "Valiant Detective Squad · Team Collaboration",
  },
  {
    rank: 10,
    name: "AURA",
    code: "960D24",
    members: ["Marino Sarisha T", "Kamali R"],
    r1Score: 37.5,
    r2Score: 31.0,
    total: 68.5,
    distinction: "Commended Unit · Persistence & Focus",
  },
  {
    rank: 11,
    name: "SPLK",
    code: "39600C",
    members: ["Shivani N", "Pooja B", "Kaviya", "Lohetha S"],
    r1Score: 35.5,
    r2Score: 30.0,
    total: 65.5,
    distinction: "Commended Unit · Forensic Rigor",
  },
  {
    rank: 12,
    name: "TDML26",
    code: "9B2EA9",
    members: ["Thanishka S", "Dharshini", "Lakshitha M", "Megavarshini"],
    r1Score: 35.0,
    r2Score: 29.0,
    total: 64.0,
    distinction: "Commended Unit · Investigative Tenacity",
  },
];

const EVALUATION_RULES = [
  {
    phase: "PHASE 01",
    title: "Crime Scene Forensics & Evidence Extraction",
    weight: "50% Weightage (Max 50 Pts)",
    color: "#f2c300",
    criteria: [
      {
        heading: "Primary Artifact Discovery",
        desc: "Rapid identification of core Lab 3 digital & physical evidence items, phone logs, and restricted network terminal recordings.",
      },
      {
        heading: "Timestamp & Integrity Verification",
        desc: "Accurately pinning down critical timeline events: 22:08 deleted communication, 22:16:53 CCTV frame, and 22:17 initial disappearance alert.",
      },
      {
        heading: "Operational Discipline",
        desc: "Efficiency and economy in forensic lab requests, minimizing procedural overhead while retaining high precision.",
      },
    ],
  },
  {
    phase: "PHASE 02",
    title: "Lead Filtering & Investigative Trail Synthesis",
    weight: "50% Weightage (Max 50 Pts)",
    color: "#00e5ff",
    criteria: [
      {
        heading: "Lead Discrimination (Signal vs. Noise)",
        desc: "Correctly classifying leads into IMPORTANT vs. IGNORE, avoiding decoy cafeteria receipts and uncorroborated rumors while prioritizing network transfer notes.",
      },
      {
        heading: "Cryptographic & Code Resolution",
        desc: "Accurate decryption of whiteboard fragments, network hex traces, and server routing tables to isolate the exfiltration route.",
      },
      {
        heading: "Sequential Deduction & Final Trail",
        desc: "Connecting authenticated evidence chains (Timeline → Network → Ciphers → Restricted Transfer Paths) to establish indisputable responsibility.",
      },
    ],
  },
];

export default function EventConcludedPage() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"results" | "rules">("results");
  const [expandedTeamCode, setExpandedTeamCode] = useState<string | null>(null);

  const top3 = useMemo(() => OFFICIAL_RESULTS.slice(0, 3), []);

  const filteredTeams = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return OFFICIAL_RESULTS;

    return OFFICIAL_RESULTS.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.code.toLowerCase().includes(q) ||
        t.members.some((m) => m.toLowerCase().includes(q))
    );
  }, [search]);

  return (
    <main className="min-h-screen w-full overflow-x-hidden bg-[#070709] text-white flex flex-col font-sans selection:bg-[#f2c300] selection:text-black relative">
      <style jsx global>{`
        html,
        body {
          overflow-x: hidden;
          scrollbar-width: none;
          -ms-overflow-style: none;
          scroll-behavior: smooth;
        }

        html::-webkit-scrollbar,
        body::-webkit-scrollbar {
          width: 0;
          height: 0;
          display: none;
        }

        * {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        *::-webkit-scrollbar {
          width: 0;
          height: 0;
          display: none;
        }
      `}</style>

      {/* Subtle Background Grid */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none opacity-50" />

      {/* Navigation Header */}
      <header className="border-b border-white/10 relative z-30 backdrop-blur-xl bg-black/70 sticky top-0">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div>
              <p className="text-[10px] tracking-[0.35em] text-[#f2c300] uppercase font-mono font-bold">
                OFFICIAL CASE ARCHIVE
              </p>

              <h1 className="mt-0.5 text-lg sm:text-xl font-black tracking-wider">
                PROJECT: REDACTED
                <sup className="ml-1 text-[#f2c300] text-xs">2</sup>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-yellow-500/30 bg-yellow-500/10 text-yellow-400 text-[10px] font-mono tracking-widest uppercase font-bold">
              INVESTIGATION CONCLUDED
            </span>

            <Link
              href="/admin/login"
              className="text-[11px] font-mono tracking-wider text-white/60 hover:text-black hover:bg-[#f2c300] transition-all border border-[#f2c300]/40 px-4 py-2 rounded-xl bg-white/[0.03] font-bold"
            >
              ADMIN ACCESS →
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-20 px-6 pt-16 pb-12 text-center max-w-4xl mx-auto">
        {/* Clean Case Closed Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center px-5 py-2 rounded-full border border-[#f2c300]/50 bg-[#f2c300]/10 text-[#f2c300] text-xs font-mono tracking-[0.3em] uppercase mb-6 font-bold"
        >
          MISSION COMPLETE // CASE CLOSED
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.08]"
        >
          THANK YOU TO ALL{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#f2c300] via-[#ffe57f] to-[#f2c300]">
            DETECTIVES
          </span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-6 text-sm sm:text-base text-white/65 leading-relaxed max-w-2xl mx-auto"
        >
          The incident records for{" "}
          <strong className="text-white">PROJECT: REDACTED²</strong> have been
          formally authenticated and sealed. A massive congratulations to all{" "}
          <strong className="text-[#f2c300]">12 investigative units</strong>{" "}
          for demonstrating peerless technical acumen, cipher decryption, and
          analytical rigor throughout the event.
        </motion.p>

        {/* Navigation Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-10 inline-flex p-1.5 rounded-2xl bg-black/70 border border-white/12 backdrop-blur-lg"
        >
          <button
            onClick={() => setActiveTab("results")}
            className={`px-6 py-2.5 rounded-xl font-mono text-xs font-bold tracking-wider transition-all ${
              activeTab === "results"
                ? "bg-[#f2c300] text-black shadow-lg shadow-[#f2c300]/20"
                : "text-white/60 hover:text-white"
            }`}
          >
            🏆 OFFICIAL LEADERBOARD
          </button>

          <button
            onClick={() => setActiveTab("rules")}
            className={`px-6 py-2.5 rounded-xl font-mono text-xs font-bold tracking-wider transition-all ${
              activeTab === "rules"
                ? "bg-[#f2c300] text-black shadow-lg shadow-[#f2c300]/20"
                : "text-white/60 hover:text-white"
            }`}
          >
            ⚖️ EVALUATION PROTOCOL
          </button>
        </motion.div>
      </section>

      {/* TAB 1: RESULTS VIEW */}
      <AnimatePresence mode="wait" initial={false}>
        {activeTab === "results" && (
          <motion.div
            key="results"
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 16 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-20 mx-auto w-full min-w-0 max-w-6xl space-y-16 px-6 pb-20"
          >
          {/* Champions Podium */}
          <section>
            <div className="text-center mb-8">
              <p className="text-[10px] font-mono tracking-[0.4em] text-[#f2c300] uppercase font-bold">
                TOP HONORS
              </p>

              <h3 className="mt-1.5 text-2xl sm:text-3xl font-black tracking-tight">
                PODIUM OF EXCELLENCE
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end pt-4">
              {/* 2nd Place */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="border border-slate-400/30 bg-gradient-to-b from-slate-400/10 via-black/80 to-black rounded-3xl p-7 relative order-2 md:order-1 backdrop-blur-md shadow-[0_0_30px_rgba(203,213,225,0.08)] hover:border-slate-400/50 transition"
              >
                <div className="flex justify-between items-start">
                  <span className="text-4xl">🥈</span>

                  <span className="text-[11px] font-mono px-3 py-1 rounded-full border border-slate-400/30 text-slate-200 bg-slate-400/10 font-bold">
                    RANK #2
                  </span>
                </div>

                <h4 className="mt-5 text-2xl font-black text-white">
                  {top3[1].name}
                </h4>

                <p className="text-xs font-mono text-[#f2c300] tracking-widest mt-1">
                  UNIT CODE: {top3[1].code}
                </p>

                <p className="mt-3 text-xs text-white/50 leading-relaxed min-h-[38px]">
                  {top3[1].members.join(" · ")}
                </p>

                <div className="mt-6 pt-5 border-t border-white/10 flex items-end justify-between">
                  <div>
                    <span className="block text-[10px] text-white/40 uppercase font-mono">
                      SCORES
                    </span>

                    <span className="text-xs text-white/80 font-mono">
                      R1:{" "}
                      <strong className="text-white">
                        {top3[1].r1Score}
                      </strong>{" "}
                      · R2:{" "}
                      <strong className="text-white">
                        {top3[1].r2Score}
                      </strong>
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-3xl font-black text-slate-100 font-mono">
                      {top3[1].total.toFixed(1)}
                    </span>

                    <span className="text-xs text-white/30 ml-1">/100</span>
                  </div>
                </div>
              </motion.div>

              {/* 1st Place */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="border-2 border-[#f2c300] bg-gradient-to-b from-[#f2c300]/20 via-[#0d0d10] to-black rounded-3xl p-8 relative order-1 md:order-2 shadow-[0_0_50px_rgba(242,195,0,0.25)] md:-translate-y-4 backdrop-blur-md"
              >
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-[#f2c300] text-black font-black text-[11px] tracking-widest font-mono uppercase shadow-xl">
                  GRAND CHAMPION
                </div>

                <div className="flex justify-between items-start mt-2">
                  <span className="text-5xl">🥇</span>

                  <span className="text-[11px] font-mono px-3 py-1 rounded-full border border-[#f2c300]/60 text-[#f2c300] bg-[#f2c300]/15 font-black">
                    RANK #1
                  </span>
                </div>

                <h4 className="mt-5 text-3xl font-black text-[#f2c300]">
                  {top3[0].name}
                </h4>

                <p className="text-xs font-mono text-white/70 tracking-widest mt-1 font-bold">
                  UNIT CODE: {top3[0].code}
                </p>

                <p className="mt-3 text-xs text-white/70 leading-relaxed font-medium min-h-[38px]">
                  {top3[0].members.join(" · ")}
                </p>

                <div className="mt-6 pt-5 border-t border-[#f2c300]/30 flex items-end justify-between">
                  <div>
                    <span className="block text-[10px] text-white/50 uppercase font-mono">
                      SCORES
                    </span>

                    <span className="text-xs text-white/90 font-mono">
                      R1:{" "}
                      <strong className="text-white">
                        {top3[0].r1Score}
                      </strong>{" "}
                      · R2:{" "}
                      <strong className="text-white">
                        {top3[0].r2Score}
                      </strong>
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-4xl font-black text-[#f2c300] font-mono">
                      {top3[0].total.toFixed(1)}
                    </span>

                    <span className="text-xs text-white/40 ml-1">/100</span>
                  </div>
                </div>
              </motion.div>

              {/* 3rd Place */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="border border-amber-600/30 bg-gradient-to-b from-amber-600/10 via-black/80 to-black rounded-3xl p-7 relative order-3 backdrop-blur-md shadow-[0_0_30px_rgba(217,119,6,0.08)] hover:border-amber-600/50 transition"
              >
                <div className="flex justify-between items-start">
                  <span className="text-4xl">🥉</span>

                  <span className="text-[11px] font-mono px-3 py-1 rounded-full border border-amber-600/30 text-amber-300 bg-amber-600/10 font-bold">
                    RANK #3
                  </span>
                </div>

                <h4 className="mt-5 text-2xl font-black text-white">
                  {top3[2].name}
                </h4>

                <p className="text-xs font-mono text-[#f2c300] tracking-widest mt-1">
                  UNIT CODE: {top3[2].code}
                </p>

                <p className="mt-3 text-xs text-white/50 leading-relaxed min-h-[38px]">
                  {top3[2].members.join(" · ")}
                </p>

                <div className="mt-6 pt-5 border-t border-white/10 flex items-end justify-between">
                  <div>
                    <span className="block text-[10px] text-white/40 uppercase font-mono">
                      SCORES
                    </span>

                    <span className="text-xs text-white/80 font-mono">
                      R1:{" "}
                      <strong className="text-white">
                        {top3[2].r1Score}
                      </strong>{" "}
                      · R2:{" "}
                      <strong className="text-white">
                        {top3[2].r2Score}
                      </strong>
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-3xl font-black text-amber-300 font-mono">
                      {top3[2].total.toFixed(1)}
                    </span>

                    <span className="text-xs text-white/30 ml-1">/100</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </section>

          {/* Full Leaderboard */}
          <section className="border border-white/12 bg-black/60 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
              <div>
                <p className="text-[10px] font-mono tracking-[0.3em] text-[#f2c300] uppercase font-bold">
                  COMPLETE STANDINGS
                </p>

                <h3 className="mt-1 text-2xl font-black">
                  All 12 Detective Units
                </h3>

                <p className="text-xs text-white/40 mt-1">
                  Quantitative verification based on Crime Scene Forensics
                  (/50) + Trail Synthesis (/50)
                </p>
              </div>

              <div className="w-full sm:w-80">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter by team, code or investigator..."
                  className="w-full bg-[#111115] border border-white/15 rounded-xl px-4 py-3 text-xs text-white placeholder:text-white/30 outline-none focus:border-[#f2c300] transition"
                />
              </div>
            </div>

            <div className="w-full min-w-0 overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full min-w-[760px] text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-white/[0.04] border-b border-white/10 text-white/40 font-mono uppercase text-[10px] tracking-wider">
                    <th className="py-4 px-4">#</th>
                    <th className="py-4 px-4">Detective Unit</th>
                    <th className="py-4 px-4">Code</th>
                    <th className="py-4 px-4 hidden md:table-cell">
                      Operatives
                    </th>
                    <th className="py-4 px-4 text-right">R1 /50</th>
                    <th className="py-4 px-4 text-right">R2 /50</th>
                    <th className="py-4 px-4 text-right font-black text-white/80">
                      Total /100
                    </th>
                    <th className="py-4 px-2 text-center" aria-label="Expand" />
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/[0.06]">
                  {filteredTeams.map((team) => {
                    const expanded = expandedTeamCode === team.code;

                    return (
                    <React.Fragment key={team.code}>
                      <tr
                      onClick={() =>
                        setExpandedTeamCode((current) =>
                          current === team.code ? null : team.code
                        )
                      }
                      className={`hover:bg-white/[0.03] transition-colors cursor-pointer ${
                        team.rank === 1
                          ? "bg-[#f2c300]/[0.06]"
                          : team.rank <= 3
                          ? "bg-white/[0.015]"
                          : ""
                      }`}
                    >
                      <td className="py-4 px-4 font-bold text-sm">
                        {team.rank === 1 ? (
                          <span className="text-xl">🥇</span>
                        ) : team.rank === 2 ? (
                          <span className="text-xl">🥈</span>
                        ) : team.rank === 3 ? (
                          <span className="text-xl">🥉</span>
                        ) : (
                          <span className="text-white/40 font-mono">
                            #{team.rank}
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-4">
                        <p
                          className={`font-black tracking-wide text-sm ${
                            team.rank === 1
                              ? "text-[#f2c300]"
                              : team.rank <= 3
                              ? "text-white"
                              : "text-white/90"
                          }`}
                        >
                          {team.name}
                        </p>

                        <p className="text-[10px] text-white/35 mt-0.5 hidden sm:block">
                          {team.distinction}
                        </p>
                      </td>

                      <td className="py-4 px-4 font-mono text-[#f2c300]/80 text-[11px] font-bold">
                        {team.code}
                      </td>

                      <td className="py-4 px-4 hidden md:table-cell text-white/50 text-[11px] max-w-[220px] truncate">
                        {team.members.join(", ")}
                      </td>

                      <td className="py-4 px-4 text-right font-mono text-white/70">
                        {team.r1Score.toFixed(1)}
                      </td>

                      <td className="py-4 px-4 text-right font-mono text-white/70">
                        {team.r2Score.toFixed(1)}
                      </td>

                      <td className="py-4 px-4 text-right font-mono font-black text-sm">
                        <span
                          className={`${
                            team.rank === 1
                              ? "text-[#f2c300] text-base"
                              : team.rank <= 3
                              ? "text-white text-base"
                              : "text-white/80"
                          }`}
                        >
                          {team.total.toFixed(1)}
                        </span>
                      </td>

                      <td className="py-4 px-2 text-center">
                        <ChevronDown
                          size={15}
                          className={`mx-auto text-white/25 transition-transform duration-[520ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
                            expanded ? "rotate-180 text-[#f2c300]" : ""
                          }`}
                        />
                      </td>
                    </tr>

                    <tr className="border-t border-white/[0.04] bg-white/[0.012]">
                      <td colSpan={8} className="px-5 py-0 align-top">
                        <div
                          className={[
                            "overflow-hidden transition-[max-height,opacity] duration-[520ms]",
                            "ease-[cubic-bezier(0.22,1,0.36,1)]",
                            expanded
                              ? "max-h-[280px] opacity-100"
                              : "max-h-0 opacity-0",
                          ].join(" ")}
                        >
                          <div
                            className={[
                              "grid grid-cols-1 gap-5 py-4 md:grid-cols-2",
                              "transform transition-transform duration-[520ms]",
                              "ease-[cubic-bezier(0.22,1,0.36,1)]",
                              expanded
                                ? "translate-y-0"
                                : "-translate-y-2",
                            ].join(" ")}
                          >
                            <div>
                              <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-[#f2c300]/70">
                                Investigators
                              </p>
                              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
                                {team.members.map((member) => (
                                  <span
                                    key={member}
                                    className="text-xs text-white/55"
                                  >
                                    {member}
                                  </span>
                                ))}
                              </div>
                            </div>

                            <div>
                              <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-[#f2c300]/70">
                                Final Distinction
                              </p>
                              <p className="mt-3 text-xs text-white/45">
                                {team.distinction}
                              </p>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                    </React.Fragment>
                    );
                  })}

                  {filteredTeams.length === 0 && (
                    <tr>
                      <td
                        colSpan={8}
                        className="py-12 text-center text-white/30 font-mono text-xs"
                      >
                        No team or member found matching "{search}"
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-5 flex flex-col sm:flex-row items-center justify-between text-[11px] font-mono text-white/35 gap-2">
              <span>PROJECT: REDACTED² · OFFICIAL ADJUDICATION ARCHIVE</span>
              <span>ALL 12 UNITS VERIFIED & CERTIFIED</span>
            </div>
          </section>
          </motion.div>
        )}

      {/* TAB 2: EVALUATION PROTOCOL */}
          {activeTab === "rules" && (
          <motion.div
            key="rules"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-20 mx-auto w-full min-w-0 max-w-5xl space-y-10 px-6 pb-20"
          >
          <div className="text-center mb-8">
            <p className="text-[10px] font-mono tracking-[0.4em] text-[#f2c300] uppercase font-bold">
              SCORING METHODOLOGY
            </p>

            <h3 className="mt-1.5 text-3xl font-black tracking-tight">
              Evaluation & Adjudication Protocol
            </h3>

            <p className="text-sm text-white/50 mt-2 max-w-xl mx-auto">
              How investigative performance was quantitatively assessed across
              digital forensics, cipher cracking, and lead cross-examination.
            </p>
          </div>

          <div className="space-y-8">
            {EVALUATION_RULES.map((rule, idx) => (
              <motion.section
                key={rule.phase}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: idx * 0.15 }}
                className="border border-white/12 bg-black/60 rounded-3xl p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-5 mb-6">
                  <div>
                    <span className="text-[11px] font-mono uppercase tracking-widest text-[#f2c300] font-bold">
                      {rule.phase}
                    </span>

                    <h4 className="text-2xl font-black text-white mt-1">
                      {rule.title}
                    </h4>
                  </div>

                  <span className="px-3.5 py-1.5 rounded-full border border-white/15 bg-white/[0.04] text-xs font-mono text-white/80 self-start sm:self-auto font-bold">
                    {rule.weight}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {rule.criteria.map((item, cIdx) => (
                    <div
                      key={cIdx}
                      className="border border-white/8 bg-white/[0.02] rounded-2xl p-5 hover:border-[#f2c300]/30 transition"
                    >
                      <div className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-2">
                        CRITERION 0{cIdx + 1}
                      </div>

                      <h5 className="font-black text-sm text-white mb-2">
                        {item.heading}
                      </h5>

                      <p className="text-xs text-white/55 leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </motion.section>
            ))}
          </div>

          {/* Adjudication Verification */}
          <div className="border border-[#f2c300]/25 bg-[#f2c300]/[0.03] rounded-3xl p-8 text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-[#f2c300]/20 text-[#f2c300] flex items-center justify-center mx-auto text-lg font-black">
              ✓
            </div>

            <h4 className="text-lg font-black text-white">
              Transparent Evaluation & Verification
            </h4>

            <p className="text-xs text-white/50 max-w-2xl mx-auto leading-relaxed">
              All results were first evaluated through an AI-assisted scoring
              and verification pass, then manually reviewed and re-verified by
              the event coordinators and judge. The final standings were checked
              for accuracy, consistency, and fairness before final approval.
            </p>
          </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="border-t border-white/10 py-10 px-6 relative z-20 bg-black/80 mt-auto">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-5">
            <p className="font-mono text-[11px] text-white/30">
              PROJECT: REDACTED² · Final Investigation Archive
            </p>

            <p className="text-[11px] text-white/40 text-center">
              Thank you to all Investigators
            </p>
          </div>
          

          <div className="mt-5 text-center">
            <span className="text-[9px] font-mono tracking-[0.25em] uppercase text-white/15">
              Official Event Archive . PROJECT: REDACTED²
            </span>
          </div>
        </div>
      </footer>
    </main>
  );
}