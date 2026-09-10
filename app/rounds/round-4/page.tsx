"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Round4Redirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/rounds/round-3");
  }, [router]);
  return (
    <div style={{ padding: 40, textAlign: "center", color: "#fff", background: "#000", height: "100vh" }}>
      <h1>Redirecting to Final Round (Round 3)...</h1>
    </div>
  );
}