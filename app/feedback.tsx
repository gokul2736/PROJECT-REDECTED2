"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Send, ShieldCheck, Star } from "lucide-react";
import { motion } from "framer-motion";

const GOLD = "#d6b35a";

export default function FeedbackPage() {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <main className="min-h-screen bg-[#070708] text-white selection:bg-[#d6b35a] selection:text-black">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <motion.div
          animate={{ opacity: [0.14, 0.22, 0.14], scale: [1, 1.03, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute left-1/2 top-[-220px] h-[460px] w-[760px] -translate-x-1/2 rounded-full bg-[#d6b35a]/[0.025] blur-[120px]"
        />
      </div>

      <header className="relative z-10 border-b border-white/[0.06] bg-[#070708]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/" className="leading-none">
            <div className="text-[8px] font-semibold uppercase tracking-[0.45em] text-[#d6b35a]/65">
              Project
            </div>
            <div className="mt-1 text-[21px] font-black tracking-[0.04em] text-white sm:text-[24px]">
              REDACTED
              <span className="align-top text-[9px] text-[#d6b35a]">²</span>
            </div>
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.018] px-3.5 py-2.5 text-[8px] font-semibold uppercase tracking-[0.18em] text-white/40 transition hover:border-[#d6b35a]/25 hover:text-[#d6b35a]"
          >
            <ArrowLeft size={13} />
            Results
          </Link>
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-3xl px-5 py-16 sm:px-8 sm:py-24">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="text-center"
        >
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-[#d6b35a]/24 bg-[#d6b35a]/[0.035] px-4 py-2">
            <ShieldCheck size={12} className="text-[#d6b35a]/80" />
            <span className="text-[8px] font-semibold uppercase tracking-[0.27em] text-[#d6b35a]/80">
              Post-event feedback
            </span>
          </div>

          <h1 className="mt-7 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-6xl">
            Tell us how the{" "}
            <span className="bg-gradient-to-r from-[#e5cd89] via-[#f4e2a9] to-[#c69a43] bg-clip-text text-transparent">
              investigation
            </span>{" "}
            felt.
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-white/35 sm:text-base">
            Your feedback helps us improve future investigations, challenges,
            judging flow, and the overall experience.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08 }}
          className="mt-10 rounded-3xl border border-white/[0.07] bg-[#0b0b0d] p-6 shadow-[0_28px_90px_rgba(0,0,0,0.28)] sm:p-8"
        >
          {submitted ? (
            <div className="py-14 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[#d6b35a]/25 bg-[#d6b35a]/[0.06] text-[#d6b35a]">
                <CheckCircle2 size={24} />
              </div>

              <h2 className="mt-6 text-2xl font-semibold text-white">
                Thank you for your feedback.
              </h2>

              <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-white/30">
                Your response has been received. We appreciate you taking the
                time to help us improve.
              </p>

              <Link
                href="/"
                className="mt-7 inline-flex items-center gap-2 rounded-xl border border-[#d6b35a]/24 bg-[#d6b35a]/[0.04] px-4 py-2.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-[#d6b35a]/75 transition hover:border-[#d6b35a]/40 hover:bg-[#d6b35a]/[0.07]"
              >
                Back to results
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-7">
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block">
                  <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/30">
                    Name
                  </span>
                  <input
                    name="name"
                    required
                    className="mt-2 w-full rounded-xl border border-white/[0.07] bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/18 focus:border-[#d6b35a]/35"
                    placeholder="Your name"
                  />
                </label>

                <label className="block">
                  <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/30">
                    Email
                  </span>
                  <input
                    name="email"
                    type="email"
                    required
                    className="mt-2 w-full rounded-xl border border-white/[0.07] bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/18 focus:border-[#d6b35a]/35"
                    placeholder="you@example.com"
                  />
                </label>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block">
                  <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/30">
                    Team code
                  </span>
                  <input
                    name="teamCode"
                    className="mt-2 w-full rounded-xl border border-white/[0.07] bg-black/20 px-4 py-3 font-mono text-sm uppercase tracking-[0.15em] text-white outline-none placeholder:text-white/18 focus:border-[#d6b35a]/35"
                    placeholder="Optional"
                  />
                </label>

                <div>
                  <div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/30">
                    Overall rating
                  </div>
                  <div className="mt-2 flex h-[46px] items-center gap-2 rounded-xl border border-white/[0.07] bg-black/20 px-4">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        type="button"
                        key={value}
                        onMouseEnter={() => setHoverRating(value)}
                        onMouseLeave={() => setHoverRating(0)}
                        onClick={() => setRating(value)}
                        className="transition hover:scale-110"
                        aria-label={`Rate ${value} out of 5`}
                      >
                        <Star
                          size={17}
                          fill={(hoverRating || rating) >= value ? GOLD : "transparent"}
                          className={
                            (hoverRating || rating) >= value
                              ? "text-[#d6b35a]"
                              : "text-white/20"
                          }
                        />
                      </button>
                    ))}
                    <span className="ml-2 font-mono text-[9px] text-white/22">
                      {rating ? `${rating}/5` : "Select"}
                    </span>
                  </div>
                </div>
              </div>

              <label className="block">
                <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/30">
                  Your feedback
                </span>
                <textarea
                  name="feedback"
                  required
                  rows={7}
                  className="mt-2 w-full resize-none rounded-2xl border border-white/[0.07] bg-black/20 px-4 py-4 text-sm leading-7 text-white outline-none placeholder:text-white/18 focus:border-[#d6b35a]/35"
                  placeholder="What worked well? What should we improve for the next investigation?"
                />
              </label>

              <div className="flex flex-col gap-4 border-t border-white/[0.06] pt-6 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[9px] leading-5 text-white/20">
                  Thank you for helping us make future events sharper and smoother.
                </p>

                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#d6b35a]/35 bg-[#d6b35a] px-5 py-3 text-[9px] font-bold uppercase tracking-[0.18em] text-[#0a0906] transition hover:bg-[#ecd994] active:scale-[0.99]"
                >
                  <Send size={13} />
                  Submit feedback
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </section>
    </main>
  );
}
