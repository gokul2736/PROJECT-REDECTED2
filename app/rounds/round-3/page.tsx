"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const ROUND = 3;
const MAX_QUESTIONS = 6;
const POLL_MS = 4000;
const SAVE_MS = 900;
const RELEVANT_EVIDENCE_IDS = new Set(["E-02", "E-04", "E-05", "E-06", "E-08", "E-10", "E-14"]);

type Evidence = { id: string; title: string; content: string; source: string };
type Asked = { question: string; response: string; category: string; id: string };
type Echo = { id: string; keywords: string[]; category: string; response: string; evidence: Evidence };

type VerdictState = {
  responsible_entity: string;
  selected_contradictions: string[];
  motive: string;
  reconstruction: string;
  strongest_proof: string;
};

type TeamState = {
  history: Asked[];
  evidence: Evidence[];
  questionsRemaining: number;
  categories: string[];
  verdict: VerdictState;
};

type Bundle = {
  team_id: string;
  duration_seconds: number;
  round_status: string;
  started_at: string | null;
  completed_at: string | null;
  metadata: Record<string, any>;
  score: number;
  max_score: number;
  score_breakdown: Record<string, any>;
  score_final: boolean;
};

const OFFICIAL_PERSONNEL = [
  "Dr. Adrian Vale",
  "Mira Sen",
  "Ethan Cole",
  "Leah Morgan",
  "Daniel Cross",
  "Unknown Contact"
];

const CONTRADICTIONS_LIST = [
  "E-01 terminal remained active during security interruption",
  "E-03 restricted badge record does not prove physical user",
  "E-05 restricted access event at 22:11; credential does not prove physical user",
  "E-07 no direct proof of removal through main entrance",
  "E-09 wall clock shows 22:16 but is not synchronized",
  "E-11 corridor camera affected during interruption",
  "E-12 locker key does not establish movement route",
  "E-13 discard bin does not establish responsibility",
  "E-15 chain of custody only",
  "E-16 emergency network procedure; does not establish user"
];

const echo: Echo[] = [
  { id: "E01", keywords: ["terminal", "active", "security interruption", "system continued"], category: "SYSTEMS", response: "The laboratory terminal remained active during the security interruption. The interruption does not establish that the laboratory system stopped recording.", evidence: { id: "E-01", title: "ACTIVE LABORATORY TERMINAL", content: "The laboratory terminal remained active during the security interruption.", source: "R1 STUDY REPORT" } },
  { id: "E02", keywords: ["22:17", "time", "disappearance", "missing", "when", "timeline"], category: "TIMELINE", response: "The BLACKBOX was recorded as missing at exactly 22:17. That establishes the reported disappearance time, not necessarily the exact physical moment it was removed.", evidence: { id: "E-02", title: "22:17 DISAPPEARANCE", content: "BLACKBOX was recorded as missing exactly at 22:17.", source: "R1 STUDY REPORT" } },
  { id: "E03", keywords: ["badge", "credential", "physical user", "identity", "who used", "access identity"], category: "ACCESS", response: "A credential was linked to restricted laboratory access. The credential record does not prove who physically used or possessed it.", evidence: { id: "E-03", title: "CREDENTIAL LIMITATION", content: "The credential is linked to restricted access, but the record does not prove the physical user.", source: "R1 STUDY REPORT" } },
  { id: "E04", keywords: ["22:08", "encrypted", "communication", "message", "deleted"], category: "COMMUNICATION", response: "A communication associated with the incident was recorded at 22:08. The timing is relevant to the sequence surrounding the later access and disappearance events.", evidence: { id: "E-04", title: "22:08 COMMUNICATION", content: "A deleted communication was recorded at 22:08.", source: "R1 STUDY REPORT" } },
  { id: "E05", keywords: ["22:11", "restricted access", "access event", "credential event"], category: "ACCESS", response: "A restricted-access event occurred at 22:11. The event establishes that the credential was used or recorded, but does not establish the physical identity of the person using it.", evidence: { id: "E-05", title: "22:11 RESTRICTED ACCESS", content: "A restricted-access event was recorded at 22:11; the credential does not establish the physical user.", source: "R1 STUDY REPORT" } },
  { id: "E06", keywords: ["cctv", "camera", "22:16:53", "last frame", "visual", "surveillance"], category: "CCTV", response: "The last recovered CCTV frame before the reported 22:17 disappearance is timestamped 22:16:53. It is the last recovered visual point immediately before the BLACKBOX was reported missing.", evidence: { id: "E-06", title: "22:16:53 LAST CCTV FRAME", content: "CCTV recovered a frame at 22:16:53 immediately before the 22:17 disappearance.", source: "R1 STUDY REPORT" } },
  { id: "E07", keywords: ["main entrance", "main door", "route", "removed", "exit", "entrance"], category: "LOCATION", response: "There is no direct record proving that the BLACKBOX was removed through the main laboratory entrance. The evidence does not establish that route.", evidence: { id: "E-07", title: "NO MAIN-ENTRANCE PROOF", content: "There is no direct record proving BLACKBOX removal through the main entrance.", source: "R1 STUDY REPORT" } },
  { id: "E08", keywords: ["transfer note", "handwritten", "22:11", "note"], category: "TRANSFER", response: "The handwritten transfer note contains the time 22:11. Its significance becomes stronger when compared with the transfer preparation evidence and restricted transfer infrastructure.", evidence: { id: "E-08", title: "22:11 TRANSFER NOTE", content: "The handwritten transfer note contains 22:11.", source: "R1 STUDY REPORT" } },
  { id: "E09", keywords: ["wall clock", "22:16", "clock", "unsynchronized"], category: "RELIABILITY", response: "The wall clock displays 22:16, but it is an environmental observation and is not independently synchronized. It should not override verified system timestamps.", evidence: { id: "E-09", title: "UNSYNCED WALL CLOCK", content: "The wall clock displays 22:16 but is not independently synchronized.", source: "R1 STUDY REPORT" } },
  { id: "E10", keywords: ["transfer fragments", "preparation", "prep", "22:08", "storage drive", "transfer"], category: "DIGITAL", response: "Transfer fragments show preparation activity at 22:08. This becomes significant when compared with the restricted transfer network connection.", evidence: { id: "E-10", title: "22:08 TRANSFER PREPARATION", content: "Storage-drive transfer fragments show preparation activity at 22:08.", source: "R1 STUDY REPORT" } },
  { id: "E11", keywords: ["corridor camera", "camera affected", "interruption", "corridor"], category: "CCTV", response: "The corridor camera was affected during the security interruption. This limits the visual record but does not by itself identify who caused the interruption.", evidence: { id: "E-11", title: "CORRIDOR CAMERA GAP", content: "The corridor camera was affected during the interruption.", source: "R1 STUDY REPORT" } },
  { id: "E12", keywords: ["locker key", "locker", "movement route", "key"], category: "LOCATION", response: "The locker key does not establish a movement route for the BLACKBOX. It should not be treated as proof of where the object travelled.", evidence: { id: "E-12", title: "LOCKER KEY LIMITATION", content: "The locker key does not establish the BLACKBOX movement route.", source: "R1 STUDY REPORT" } },
  { id: "E14", keywords: ["maintenance panel", "transfer network", "restricted network", "network"], category: "SYSTEMS", response: "The maintenance panel is connected to the restricted transfer network. This establishes relevant infrastructure, but infrastructure access alone does not prove who used it.", evidence: { id: "E-14", title: "RESTRICTED TRANSFER NETWORK", content: "The maintenance panel is connected to the restricted transfer network.", source: "R1 STUDY REPORT" } },
  { id: "E15", keywords: ["chain of custody", "custody", "envelope"], category: "RELIABILITY", response: "The chain-of-custody record documents handling of evidence. It does not independently establish responsibility for the BLACKBOX disappearance.", evidence: { id: "E-15", title: "CHAIN OF CUSTODY", content: "Chain of custody documents evidence handling but does not identify responsibility.", source: "R1 STUDY REPORT" } },
  { id: "E16", keywords: ["emergency network", "procedure", "procedure tag", "emergency"], category: "SYSTEMS", response: "The emergency network procedure explains an available technical procedure. It does not establish who used the procedure or who was responsible.", evidence: { id: "E-16", title: "EMERGENCY NETWORK PROCEDURE", content: "The procedure tag does not establish responsibility.", source: "R1 STUDY REPORT" } },
];

const guides = [
  ["timeline", "RECONSTRUCT THE TIMELINE", "What can ECHO confirm about the critical sequence from 22:08 to 22:17?", "TIMELINE"],
  ["access", "CHECK ACCESS IDENTITY", "What can the 22:11 restricted-access record actually prove about the person who used the credential?", "ACCESS"],
  ["cctv", "INVESTIGATE THE CCTV GAP", "What is the last reliable visual point before BLACKBOX was reported missing?", "CCTV"],
  ["digital", "FOLLOW THE DIGITAL TRAIL", "What digital activity occurred around 22:08 and how does it connect to the restricted transfer network?", "DIGITAL"],
  ["location", "TEST THE REMOVAL ROUTE", "What does the evidence establish about how or where BLACKBOX could have left the laboratory?", "LOCATION"],
  ["communication", "TRACE COMMUNICATION", "What is known about the communication recorded at 22:08?", "COMMUNICATION"],
  ["reliability", "CHALLENGE THE EVIDENCE", "Which evidence should be treated cautiously because its timing or meaning is limited?", "RELIABILITY"],
] as const;

function matchQuestion(q: string) {
  const n = q.toLowerCase();
  let best: Echo | null = null;
  let score = 0;
  for (const e of echo) {
    const s = e.keywords.reduce((a, k) => a + (n.includes(k.toLowerCase()) ? 1 : 0), 0);
    if (s > score) { score = s; best = e; }
  }
  return best;
}

function calc(s: TeamState) {
  const rel = s.evidence.filter((e) => RELEVANT_EVIDENCE_IDS.has(e.id)).length;
  const irr = s.evidence.length - rel;
  const cats = new Set(s.history.map((h) => h.category)).size;
  const raw = s.questionsRemaining * 10 + rel * 15 - irr * 5 + Math.min(cats, 7) * 5;
  return { raw, official: Math.max(0, Math.min(50, raw / 4)), rel, irr, cats };
}

export default function Page() {
  const router = useRouter();
  const [teamId, setTeamId] = useState("");
  const [teamName, setTeamName] = useState("");
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [started, setStarted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [remaining, setRemaining] = useState(1800);
  const [history, setHistory] = useState<Asked[]>([]);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState<Echo | null>(null);
  const [tab, setTab] = useState("guide");
  const [selectedGuide, setSelectedGuide] = useState("");

  const [verdict, setVerdict] = useState<VerdictState>({
    responsible_entity: "",
    selected_contradictions: [],
    motive: "",
    reconstruction: "",
    strongest_proof: ""
  });

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const state: TeamState = useMemo(() => ({
    history,
    evidence,
    questionsRemaining: Math.max(0, MAX_QUESTIONS - history.length),
    categories: [...new Set(history.map(h => h.category))],
    verdict
  }), [history, evidence, verdict]);

  const score = useMemo(() => calc(state), [state]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace("/login"); return; }
    
    const { data: teamRows, error: te } = await supabase.rpc("get_my_team");
    const team = Array.isArray(teamRows) ? teamRows[0] : teamRows;
    if (te || !team?.team_id) {
      setError("You are not assigned to a team. Return to the team lobby.");
      setLoading(false);
      return;
    }
    
    setTeamId(team.team_id);
    setTeamName(team.team_name || team.team_code || "YOUR TEAM");
    
    const { data: b, error: be } = await supabase.rpc("student_get_round_state", { p_round_number: ROUND });
    if (be) { setError(be.message); setLoading(false); return; }
    
    setBundle(b);
    setRemaining(b.started_at ? Math.max(0, Math.ceil((new Date(b.started_at).getTime() + b.duration_seconds * 1000 - Date.now()) / 1000)) : b.duration_seconds);
    
    const m = b.metadata || {};
    setHistory(Array.isArray(m.history) ? m.history : []);
    setEvidence(Array.isArray(m.evidence) ? m.evidence : []);
    if (m.verdict) setVerdict(m.verdict);
    
    setSubmitted(b.round_status === "COMPLETED" || b.score_final);
    if (b.round_status === "LIVE") setStarted(true);
    
    setLoading(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!teamId) return;
    const i = setInterval(async () => {
      const { data } = await supabase.rpc("student_get_round_state", { p_round_number: ROUND });
      if (data) {
        setBundle(data);
        if (data.round_status === "COMPLETED" || data.score_final) setSubmitted(true);
        if (data.round_status === "LIVE" && !started) setStarted(true);
        if (data.round_status !== "LIVE" && data.round_status !== "COMPLETED") setStarted(false);
      }
    }, POLL_MS);
    return () => clearInterval(i);
  }, [teamId, started]);

  useEffect(() => {
    if (!started || submitted || !bundle?.started_at) return;
    const i = setInterval(() => {
      const r = Math.max(0, Math.ceil((new Date(bundle.started_at!).getTime() + bundle.duration_seconds * 1000 - Date.now()) / 1000));
      setRemaining(r);
      if (r <= 0) {
        setStarted(false);
        setError("TIME EXPIRED. Submit your current investigation state.");
      }
    }, 1000);
    return () => clearInterval(i);
  }, [started, submitted, bundle]);

  const persist = useCallback((next: TeamState) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => supabase.rpc("student_save_round_state", { p_round_number: ROUND, p_metadata: next, p_current_step: next.history.length }), SAVE_MS);
  }, []);

  useEffect(() => {
    if (teamId && started && !submitted) persist(state);
  }, [state, teamId, started, submitted, persist]);

  const ask = (text?: string) => {
    const q = (text ?? question).trim();
    if (!q) { setError("Choose an investigation route or enter a question."); return; }
    if (state.questionsRemaining <= 0) { setError("NO INTERROGATION QUESTIONS REMAIN."); return; }
    const hit = matchQuestion(q);
    if (!hit) { setError("ECHO could not map that query. Try a more specific investigation angle."); return; }
    if (history.some((h) => h.id === hit.id)) { setError("That evidence channel has already been explored. Choose another route."); return; }
    setResponse(hit);
    setHistory((h) => [...h, { question: q, response: hit.response, category: hit.category, id: hit.id }]);
    setQuestion("");
    setSelectedGuide("");
    setError("");
  };

  const saveEvidence = () => {
    if (!response || evidence.some((e) => e.id === response.evidence.id)) return;
    setEvidence((e) => [...e, response.evidence]);
    setError("");
  };

  const submit = async () => {
    if (!started && !submitted) return;
    
    if (verdict.selected_contradictions.length < 2) {
      setError("FINAL VERDICT: You must select at least 2 contradictions.");
      setTab("verdict");
      return;
    }
    if (!verdict.responsible_entity) {
      setError("FINAL VERDICT: You must select a responsible entity.");
      setTab("verdict");
      return;
    }
    if (!verdict.motive || !verdict.reconstruction || !verdict.strongest_proof) {
      setError("FINAL VERDICT: All text fields must be completed.");
      setTab("verdict");
      return;
    }

    setError("");
    const finalState = { ...state, officialScore: score.official };
    const { data, error: e } = await supabase.rpc("student_submit_round", { p_round_number: ROUND, p_metadata: finalState });
    if (e) { setError(e.message); return; }
    setSubmitted(true);
    setStarted(false);
    setBundle((b) => (b ? { ...b, round_status: "COMPLETED", score: data.score, score_final: true, score_breakdown: data.breakdown } : b));
  };

  const handleContradictionToggle = (c: string) => {
    setVerdict(v => {
      if (v.selected_contradictions.includes(c)) return { ...v, selected_contradictions: v.selected_contradictions.filter(x => x !== c) };
      return { ...v, selected_contradictions: [...v.selected_contradictions, c] };
    });
  };

  if (loading) return <Screen><Card><Kicker>PROJECT: REDACTED²</Kicker><h1>LOADING INVESTIGATION TEAM</h1><p>Connecting to the classified team record...</p></Card></Screen>;
  if (error && !teamId) return <Screen><Card><Kicker>ACCESS ERROR</Kicker><h1>TEAM NOT FOUND</h1><p>{error}</p></Card></Screen>;
  if (submitted) return <Screen><Card><Kicker>FINAL ROUND // RECORDED</Kicker><h1>VERDICT SUBMITTED</h1><p>TEAM: <b>{teamName}</b></p><div className="score">{bundle?.score?.toFixed?.(2) ?? score.official.toFixed(2)} / 50</div><p>Your team's investigation and verdict have been locked and submitted to the Admin.</p></Card></Screen>;
  
  if (bundle?.round_status !== "LIVE") return <Screen><Card><Kicker>TEAM: {teamName}</Kicker><h1>ROUND 03 — FINAL ROUND</h1><p>This is the final phase of PROJECT: REDACTED².</p><div className="notice">Waiting for Admin to start the round...</div></Card></Screen>;

  return (
    <main>
      <header>
        <div>
          <Kicker>PROJECT: REDACTED²</Kicker>
          <h1>ROUND 03: FINAL VERDICT</h1>
          <p>INTERROGATION & SUBMISSION · TEAM {teamName}</p>
        </div>
        <div className="timer">
          {fmt(remaining)}
          <small>TIME LEFT</small>
        </div>
      </header>
      <section className="grid">
        <aside>
          <div className="panel">
            <b>QUESTIONS</b>
            <div className="big">
              {state.questionsRemaining}
              <small>/ {MAX_QUESTIONS} LEFT</small>
            </div>
          </div>
          <div className="panel">
            <b>TEAM EVIDENCE VAULT</b>
            {evidence.length ? evidence.map((e) => (
              <div className="item" key={e.id}>
                <strong>{e.id}</strong> {e.title}
              </div>
            )) : <p>None saved yet.</p>}
          </div>
          <div className="panel">
            <b>CATEGORIES</b>
            <p>{state.categories.join(" · ") || "NONE"}</p>
          </div>
        </aside>
        <section className="workspace">
          <nav>
            {["guide", "free", "log", "verdict"].map((t) => (
              <button key={t} className={tab === t ? "active" : "ghost"} onClick={() => setTab(t)}>
                {t.toUpperCase()}
              </button>
            ))}
          </nav>
          
          {tab === "guide" && (
            <div className="cards">
              {guides.map(([id, label, prompt, cat]) => (
                <button key={id} className="guide" disabled={history.some((h) => h.category === cat)} onClick={() => { setSelectedGuide(id); setQuestion(prompt); }}>
                  <b>{label}</b>
                  <span>{prompt}</span>
                  <small>{cat}</small>
                </button>
              ))}
            </div>
          )}

          {tab === "free" && (
            <div className="panel">
              <textarea value={question} maxLength={300} onChange={(e) => setQuestion(e.target.value)} placeholder="ASK ECHO A SPECIFIC QUESTION..." />
              <button onClick={() => ask()}>TRANSMIT QUERY</button>
            </div>
          )}

          {tab === "log" && (
            <div className="panel">
              {history.map((h, i) => (
                <div className="log" key={i}>
                  <b>Q{i + 1} · {h.category}</b>
                  <p>{h.question}</p>
                  <span>{h.response}</span>
                </div>
              ))}
            </div>
          )}

          {tab === "verdict" && (
            <div className="panel verdict-panel">
              <h2>THE FINAL VERDICT</h2>
              <p>Construct your final case. You must complete all sections before submitting.</p>
              
              <div className="form-group">
                <label>RESPONSIBLE ENTITY</label>
                <select value={verdict.responsible_entity} onChange={e => setVerdict({...verdict, responsible_entity: e.target.value})}>
                  <option value="">-- SELECT SUSPECT --</option>
                  {OFFICIAL_PERSONNEL.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label>IDENTIFY CONTRADICTIONS (Select at least 2)</label>
                <div className="checkboxes">
                  {CONTRADICTIONS_LIST.map(c => (
                    <label key={c} className="checkbox-label">
                      <input type="checkbox" checked={verdict.selected_contradictions.includes(c)} onChange={() => handleContradictionToggle(c)} />
                      <span>{c}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>ESTABLISHED MOTIVE</label>
                <textarea value={verdict.motive} onChange={e => setVerdict({...verdict, motive: e.target.value})} placeholder="Explain the motive behind the incident..." />
              </div>

              <div className="form-group">
                <label>INCIDENT RECONSTRUCTION</label>
                <textarea value={verdict.reconstruction} onChange={e => setVerdict({...verdict, reconstruction: e.target.value})} placeholder="Reconstruct the events chronologically..." />
              </div>

              <div className="form-group">
                <label>STRONGEST PROOF</label>
                <textarea value={verdict.strongest_proof} onChange={e => setVerdict({...verdict, strongest_proof: e.target.value})} placeholder="What is the single strongest piece of evidence?" />
              </div>
            </div>
          )}

          {selectedGuide && tab === "guide" && (
            <div className="panel">
              <p>{question}</p>
              <button onClick={() => ask(question)}>TRANSMIT SELECTED ROUTE</button>
            </div>
          )}

          {response && tab !== "verdict" && (
            <div className="response">
              <Kicker>ECHO RESPONSE · {response.category}</Kicker>
              <h2>{response.evidence.title}</h2>
              <p>{response.response}</p>
              <div className="notice">Evidence {response.evidence.id} can be saved to the team vault.</div>
              <button onClick={saveEvidence} disabled={evidence.some((e) => e.id === response.evidence.id)}>SAVE TO TEAM EVIDENCE</button>
            </div>
          )}

          {error && <div className="error">{error}</div>}

          <div className="submit">
            <div>
              <b>READY TO END?</b>
              <p>Submitting records the team's final verdict and locks the competition.</p>
            </div>
            <button onClick={submit}>SUBMIT FINAL VERDICT</button>
          </div>
        </section>
      </section>
      <style>{css}</style>
    </main>
  );
}

function Screen({ children }: { children: any }) {
  return (
    <div className="screen">
      <style>{css}</style>
      {children}
    </div>
  );
}
function Card({ children }: { children: any }) { return <div className="card">{children}</div>; }
function Kicker({ children }: { children: any }) { return <div className="kicker">{children}</div>; }
function fmt(s: number) {
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const x = (s % 60).toString().padStart(2, "0");
  return `${m}:${x}`;
}

const css = `
*{box-sizing:border-box}
body{margin:0;background:#030303;color:#eee;font-family:Inter,system-ui,sans-serif}
button,textarea,select,input{font:inherit}
button{border:1px solid #555;background:#ffcc00;color:#000;padding:13px 16px;font-weight:800;cursor:pointer}
button:disabled{opacity:.35;cursor:not-allowed}
.screen,main{min-height:100vh;background:radial-gradient(circle at 75% 10%,rgba(255,204,0,.08),transparent 30%),#030303}
.screen{display:grid;place-items:center;padding:30px}
.card{max-width:720px;width:100%;border:1px solid #333;background:#090909;padding:40px}
.kicker{color:#ffcc00;font-size:11px;font-weight:900;letter-spacing:4px}
.card h1,header h1{font-size:28px;margin:12px 0}
.card p{color:#aaa;line-height:1.6}
.notice{border:1px solid #333;padding:14px;color:#bbb;margin:18px 0;line-height:1.5}
.score{font-size:54px;font-weight:900;color:#ffcc00;margin:25px 0}
header{display:flex;justify-content:space-between;align-items:center;padding:24px 4vw;border-bottom:1px solid #222}
header p{color:#777}
.timer{font-size:34px;font-weight:900;text-align:right;color:#ffcc00}
.timer small{display:block;font-size:9px;letter-spacing:2px;color:#777}
.grid{display:grid;grid-template-columns:280px 1fr;gap:18px;max-width:1400px;margin:auto;padding:18px}
.panel,.response{border:1px solid #292929;background:#080808;padding:18px;margin-bottom:18px}
.big{font-size:42px;font-weight:900;margin-top:8px}
.big small{font-size:12px;color:#777}
.item{padding:9px 0;border-bottom:1px solid #222;font-size:12px}
.workspace nav{display:flex;gap:8px;margin-bottom:18px}
.workspace nav button{font-size:11px}
.ghost{background:#111;color:#aaa;border-color:#333}
.active{background:#ffcc00}
.cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.guide{text-align:left;background:#090909;color:#eee;border-color:#333;min-height:130px}
.guide b,.guide span,.guide small{display:block}
.guide b{color:#ffcc00;margin-bottom:12px}
.guide span{color:#aaa;line-height:1.5}
.guide small{margin-top:12px;color:#666;letter-spacing:2px}
textarea, select{width:100%;background:#030303;color:#fff;border:1px solid #444;padding:14px;margin-bottom:12px}
textarea{min-height:100px;resize:vertical}
select{padding:14px}
.response h2{margin:8px 0}
.response p{color:#bbb;line-height:1.6}
.log{border-bottom:1px solid #222;padding:14px 0}
.log p{color:#aaa}
.log span{color:#ddd;line-height:1.5}
.error{border:1px solid #733;color:#ff9999;background:#160707;padding:12px;margin-bottom:18px}
.submit{display:flex;justify-content:space-between;gap:15px;align-items:center;border:1px solid #444;padding:18px;background:#0a0a0a}
.submit p{color:#777;margin:5px 0}
.verdict-panel h2{color:#ffcc00;margin-top:0}
.form-group{margin-bottom:24px}
.form-group label{display:block;margin-bottom:8px;font-weight:bold;color:#ffcc00;font-size:12px;letter-spacing:1px}
.checkboxes{display:grid;gap:8px;border:1px solid #333;padding:12px;background:#050505}
.checkbox-label{display:flex;align-items:flex-start;gap:10px;cursor:pointer;font-size:13px;color:#bbb;line-height:1.4}
.checkbox-label input{margin-top:3px}
@media(max-width:800px){.grid{grid-template-columns:1fr}.cards{grid-template-columns:1fr}header{align-items:flex-start}.timer{font-size:25px}}
`;
