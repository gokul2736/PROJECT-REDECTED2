"use client";

import { Trophy, Crown, Target, Shield, Medal } from "lucide-react";

const teams = [
  { rank: 1, name: "DualSpark", code: "3BAD80", r1: 44.0, r2: 45.5, total: 89.5 },
  { rank: 2, name: "NOYYAL TITANS", code: "4FB494", r1: 38.0, r2: 47.0, total: 85.0 },
  { rank: 3, name: "TEAM SWAG", code: "394F00", r1: 45.0, r2: 34.0, total: 79.0 },
  { rank: 4, name: "TEAM NOVA", code: "106D4E", r1: 45.0, r2: 33.5, total: 78.5 },
  { rank: 5, name: "PNDP", code: "A9F225", r1: 43.0, r2: 35.0, total: 78.0 },
  { rank: 6, name: "Sherlock Holmes", code: "D3223F", r1: 43.0, r2: 33.0, total: 76.0 },
  { rank: 7, name: "Apex", code: "2FE641", r1: 41.5, r2: 33.0, total: 74.5 },
  { rank: 8, name: "Mystical", code: "48A936", r1: 40.5, r2: 33.0, total: 73.5 },
  { rank: 9, name: "hostel gang", code: "AAFDC2", r1: 39.0, r2: 32.0, total: 71.0 },
  { rank: 10, name: "AURA", code: "960D24", r1: 37.5, r2: 31.0, total: 68.5 },
  { rank: 11, name: "SPLK", code: "39600C", r1: 35.5, r2: 30.0, total: 65.5 },
  { rank: 12, name: "TDML26", code: "9B2EA9", r1: 35.0, r2: 29.0, total: 64.0 },
];

export default function ResultsPage() {
  return (
    <main className="results-page">

      {/* Background Effects */}
      <div className="grid-overlay" />
      <div className="glow glow-one" />
      <div className="glow glow-two" />

      {/* Header */}
      <header className="header">
        <div className="brand">
          <span>PROJECT</span>
          <h1>
            REDACTED<span>²</span>
          </h1>
        </div>

        <div className="classified">
          <span className="line" />
          <p>CLASSIFIED RESULTS</p>
          <span className="line" />
        </div>

        <div className="status">
          <div className="status-dot" />
          FINAL STATUS
        </div>
      </header>

      {/* Hero */}
      <section className="hero">

        <div className="hero-icon">
          <Trophy size={42} strokeWidth={1.5} />
        </div>

        <p className="eyebrow">
          THE BLACKBOX INCIDENT
        </p>

        <h2>
          FINAL <span>RESULTS</span>
        </h2>

        <p className="subtitle">
          ONE INCIDENT. MULTIPLE CONTRADICTIONS. ONE HIDDEN TRUTH.
        </p>

        <div className="hero-divider">
          <span />
          <Shield size={17} />
          <span />
        </div>

      </section>

      {/* Podium */}
      <section className="podium">

        {/* Second */}
        <div className="podium-card second">
          <div className="medal">
            <Medal size={27} />
          </div>

          <span className="place">02</span>

          <h3>NOYYAL TITANS</h3>
          <p className="team-code">4FB494</p>

          <strong>85.0</strong>
          <small>/ 100</small>
        </div>

        {/* First */}
        <div className="podium-card first">
          <div className="crown">
            <Crown size={30} />
          </div>

          <div className="medal">
            <Trophy size={32} />
          </div>

          <span className="place">01</span>

          <h3>DualSpark</h3>
          <p className="team-code">3BAD80</p>

          <strong>89.5</strong>
          <small>/ 100</small>
        </div>

        {/* Third */}
        <div className="podium-card third">
          <div className="medal">
            <Medal size={27} />
          </div>

          <span className="place">03</span>

          <h3>TEAM SWAG</h3>
          <p className="team-code">394F00</p>

          <strong>79.0</strong>
          <small>/ 100</small>
        </div>

      </section>

      {/* Results Table */}
      <section className="results-container">

        <div className="table-header">
          <div>#</div>
          <div>TEAM</div>
          <div>TEAM CODE</div>
          <div>ROUND 1</div>
          <div>ROUND 2</div>
          <div>TOTAL</div>
        </div>

        {teams.map((team) => (
          <div
            className={`result-row ${
              team.rank <= 3 ? `top-${team.rank}` : ""
            }`}
            key={team.code}
          >

            {/* Rank */}
            <div className="rank">
              {team.rank <= 3 ? (
                <span className="rank-medal">
                  {team.rank === 1 ? "♛" : team.rank === 2 ? "Ⅱ" : "Ⅲ"}
                </span>
              ) : (
                String(team.rank).padStart(2, "0")
              )}
            </div>

            {/* Team */}
            <div className="team-name">
              <span
                className="team-dot"
                style={{ backgroundColor: `#${team.code}` }}
              />

              <strong>{team.name}</strong>
            </div>

            {/* Code */}
            <div>
              <span className="code-badge">
                {team.code}
              </span>
            </div>

            {/* Round 1 */}
            <div className="score">
              {team.r1.toFixed(1)}
            </div>

            {/* Round 2 */}
            <div className="score">
              {team.r2.toFixed(1)}
            </div>

            {/* Total */}
            <div className="total">
              {team.total.toFixed(1)}
            </div>

          </div>
        ))}

      </section>

      {/* Footer */}
      <footer>

        <div className="footer-line" />

        <div className="footer-content">

          <div>
            <span>PROJECT</span>
            <strong>REDACTED²</strong>
          </div>

          <div className="footer-center">
            <Target size={18} />
            <span>CASE CLOSED</span>
          </div>

          <div className="footer-right">
            <span>MORE THAN A GAME</span>
            <strong>IT'S A MISSION</strong>
          </div>

        </div>

      </footer>

    </main>
  );
}