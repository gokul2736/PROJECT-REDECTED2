{"use client";

import { useState } from "react";

type Team = {
  rank: number;
  name: string;
  members: string[];
  r2Score: number;
  r3Score: number;
  total: number;
};

const TEAMS: Team[] = [
  { rank: 1, name: "Team Swag", members: ["Sameena J", "Logesh G", "Sowmiya G"], r2Score: 44, r3Score: 42, total: 86 },
  { rank: 2, name: "NOMA", members: ["Gowtham R", "Ashoanth P", "Neela Kandan V", "S Ashwin"], r2Score: 40, r3Score: 39, total: 79 },
  { rank: 3, name: "Noyal Titans", members: ["Jai Aakash R", "Yuvan Karthikeyan S", "Aabidh Mohamed P", "Murugesan P"], r2Score: 38, r3Score: 37, total: 75 },
  { rank: 4, name: "APEX", members: ["Alvina Shae", "Kamali R. S", "Aishwimi P", "Ragavi R"], r2Score: 36, r3Score: 35, total: 71 },
  { rank: 5, name: "Sherlock", members: ["Sriram A", "Mohamed Afzal N", "Karthik Kiran S"], r2Score: 35, r3Score: 33, total: 68 },
  { rank: 6, name: "SPLK", members: ["Shilvane N", "Pooja B", "Kaviya", "Lohitha S"], r2Score: 33, r3Score: 32, total: 65 },
  { rank: 7, name: "DML26", members: ["Thanishka S", "Dharshini", "Lakshitha M", "Megavarshini"], r2Score: 31, r3Score: 30, total: 61 },
  { rank: 8, name: "PNDP", members: ["Pavithra S", "Nandhana Marien F", "Prathiksha B", "Dhivyaashni D.K"], r2Score: 29, r3Score: 28, total: 57 },
  { rank: 9, name: "DualSpark", members: ["P. Keerthana", "Yenuganthi Prathyusha"], r2Score: 27, r3Score: 26, total: 53 },
  { rank: 10, name: "Aura", members: ["Marino Sarishat", "Kamali R"], r2Score: 25, r3Score: 24, total: 49 },
  { rank: 11, name: "HOSTEL GANG", members: ["Lavanya S", "Bavanna A", "Dharshini R", "Pooja S", "Uma Bharathi P"], r2Score: 23, r3Score: 22, total: 45 },
  { rank: 12, name: "Mystical", members: ["Khenza B", "Keina Varsha B", "Havanthika S"], r2Score: 21, r3Score: 20, total: 41 },
];

function Medal({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-2xl">&#x1F947;</span>;
  if (rank === 2) return <span className="text-2xl">&#x1F948;</span>;
  if (rank === 3) return <span className="text-2xl">&#x1F949;</span>;
  return <span className="text-lg text-white/30 font-bold">{rank}</span>;
}

export default function AnalyzePage() {
  const [hoveredTeam, setHoveredTeam] = useState<string | null>(null);

  return (
    <main className="min-h-screen bg-[#070709] text-white font-sans">
      <header className="border-b border-white/10 px-6 py-5">
        <p className="text-[10px] tracking-[0.4em] text-white/35">
          ADMIN // RESULTS
        </p>
        <h1 className="mt-1 text-2xl font-black tracking-wide">
          PROJECT: REDACTED
          <sup className="ml-0.5 text-[#f2c300] text-[9px]">2</sup>
          <span className="text-white/30 text-base font-normal ml-3">
            Final Analysis
          </span>
        </h1>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-[10px] tracking-[0.35em] text-[#f2c300]">
              LEADERBOARD
            </p>
            <h2 className="mt-2 text-3xl font-black">
              Team Rankings
            </h2>
            <p className="mt-1 text-sm text-white/35">
              Hover on the final score to see round breakdown
            </p>
          </div>
          <div className="text-right text-[10px] text-white/25 tracking-widest">
            12 TEAMS // R2 + R3 // MAX 100
          </div>
        </div>

        <div className="border border-white/10 rounded-xl overflow-hidden">
          <div className="grid grid-cols-[60px_1fr_1fr_120px] gap-0 px-5 py-3 bg-white/[0.03] border-b border-white/10 text-[9px] uppercase tracking-[0.2em] text-white/30">
            <span>#</span>
            <span>Team</span>
            <span>Members</span>
            <span className="text-right">Score</span>
          </div>

          {TEAMS.map((team) => (
            <div
              key={team.name}
              className={`grid grid-cols-[60px_1fr_1fr_120px] gap-0 px-5 py-4 border-b border-white/[0.06] transition-colors ${
                team.rank <= 3
                  ? "bg-[#f2c300]/[0.02]"
                  : "hover:bg-white/[0.02]"
              }`}
            >
              <div className="flex items-center">
                <Medal rank={team.rank} />
              </div>

              <div className="flex items-center">
                <div>
                  <p
                    className={`font-bold ${
                      team.rank === 1
                        ? "text-[#f2c300]"
                        : team.rank <= 3
                          ? "text-white"
                          : "text-white/70"
                    }`}
                  >
                    {team.name}
                  </p>
                </div>
              </div>

              <div className="flex items-center">
                <p className="text-xs text-white/40 leading-5">
                  {team.members.join(", ")}
                </p>
              </div>

              <div
                className="flex items-center justify-end relative"
                onMouseEnter={() =>
                  setHoveredTeam(team.name)
                }
                onMouseLeave={() =>
                  setHoveredTeam(null)
                }
              >
                <p
                  className={`text-xl font-black tabular-nums cursor-default ${
                    team.rank === 1
                      ? "text-[#f2c300]"
                      : team.rank <= 3
                        ? "text-white"
                        : "text-white/60"
                  }`}
                >
                  {team.total}
                  <span className="text-xs text-white/20 font-normal">
                    /100
                  </span>
                </p>

                {hoveredTeam === team.name && (
                  <div className="absolute right-0 top-full mt-2 z-50 border border-white/15 bg-[#111] rounded-lg p-4 min-w-[200px] shadow-2xl">
                    <p className="text-[9px] tracking-[0.2em] text-white/30 mb-3">
                      SCORE BREAKDOWN
                    </p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-white/50">
                          Round 2
                        </span>
                        <span className="font-bold text-amber-400">
                          {team.r2Score}
                          <span className="text-white/20 font-normal text-xs">
                            /50
                          </span>
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-white/50">
                          Round 3
                        </span>
                        <span className="font-bold text-purple-400">
                          {team.r3Score}
                          <span className="text-white/20 font-normal text-xs">
                            /50
                          </span>
                        </span>
                      </div>
                      <div className="border-t border-white/10 pt-2 flex justify-between text-sm">
                        <span className="text-white/50">
                          Total
                        </span>
                        <span className="font-black text-white">
                          {team.total}
                          <span className="text-white/20 font-normal text-xs">
                            /100
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-between text-[10px] text-white/20">
          <span>PROJECT: REDACTED² // FINAL RESULTS</span>
          <span>SCORES ARE PROVISIONAL UNTIL VERIFIED BY COORDINATORS</span>
        </div>
      </div>
    </main>
  );
}
}