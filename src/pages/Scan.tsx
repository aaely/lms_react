import { useState, useEffect, useCallback, useMemo } from "react";
import '../App.css'
import { api, logout } from "../utils/api";

// ── Types ────────────────────────────────────────────────────────────────────

interface DeckRoute {
  route: string;
  parts: string[];
}

interface PartASL {
  deck:     string;
  part:     string;
  duns:     string;
  supplier: string;
  doh:      number;
  desc:     string;
  cbal:     number;
  bank:     number;
  day1:     number | null;
  day2:     number | null;
  day3:     number | null;
  day4:     number | null;
  day5:     number | null;
  day6:     number | null;
}

interface Contact {
  email: string;
  name:  string;
  phone: string;
  duns:  string;
}

interface DunsContacts {
  duns:     string;
  contacts: Contact[];
}

interface CarrierContacts {
  scac:     string;
  contacts: Contact[];
}

interface PartASN {
  scac:         string;
  trailer:      string;
  deck:         string;
  part:         string;
  duns:         string;
  quantity:     number;
  status:       number;
  sid:          string;
  countComment: string;
  shipComment:  string;
  shipDate:     string;
  dock:         string;
  eda:          string;
  eta:          string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────


const dohColor = (doh: number) => {
  if (doh <= 1) return { bg: "#fee2e2", text: "#b91c1c", border: "#fca5a5" };
  if (doh <= 3) return { bg: "#ffedd5", text: "#c2410c", border: "#fdba74" };
  if (doh <= 5) return { bg: "#fef9c3", text: "#a16207", border: "#fde047" };
  return       { bg: "#dcfce7", text: "#15803d", border: "#86efac" };
};

const statusLabel = (s: number) => {
  switch (s) {
    case 0:  return "In Transit";
    case 4:  return "@ DY";
    case 5:  return "Arrived";
    case 6:  return "Arrived";
    default: return `Status ${s}`;
  }
};

const statusStyle = (s: number): React.CSSProperties => {
  switch (s) {
    case 0:  return { background: "#f3f4f6", color: "#6b7280" };
    case 1:  return { background: "#dbeafe", color: "#1d4ed8" };
    case 2:  return { background: "#ede9fe", color: "#7c3aed" };
    case 3:  return { background: "#dcfce7", color: "#15803d" };
    default: return { background: "#f3f4f6", color: "#6b7280" };
  }
};

function fmt(v: number | null): string {
  if (v == null) return "—";
  return v.toLocaleString();
}

// ── Bank / Projected Balance Logic ───────────────────────────────────────────

function getDay1Date(): Date {
  const now  = new Date();
  const day1 = new Date(now);
  if (now.getHours() >= 22) {
    day1.setDate(day1.getDate() + 1);
  }
  day1.setHours(0, 0, 0, 0);
  return day1;
}

function isDay1Arrival(eda: string, day1: Date): boolean {
  if (!eda) return false;
  const [year, month, day] = eda.split("-").map(Number);
  const edaDate = new Date(year, month - 1, day);
  return edaDate.getTime() <= day1.getTime();
}

function isArrivalOnDay(eda: string, date: Date): boolean {
  if (!eda) return false;
  const [year, month, day] = eda.split("-").map(Number);
  const edaDate = new Date(year, month - 1, day);
  return edaDate.getTime() === date.getTime();
}

function isOAsn(eda: string, eta: string): boolean {
  if (!eda) return false;
  const date = new Date(Date.now());
  const asnArrival = new Date(`${eda}T${eta}`);
    return asnArrival.getTime() <= date.getTime();
}

function isAging(eda: string, eta: string): boolean {
  if (!eda) return false;
  const date = new Date(Date.now());
  const asnArrival = new Date(`${eda}T${eta}`);
    return date.getTime() - asnArrival.getTime() >= 4 * 60 * 60 * 1000;
}

function projectedBalance(part: PartASL, asns: PartASN[]): number {
  const day1    = getDay1Date();
  const inbound = asns
    .filter((a) => isDay1Arrival(a.eda, day1) && a.eta !== "11:11" && !a.shipComment.toLowerCase().includes("ntxd"))
    .reduce((sum, a) => sum + a.quantity, 0);
  return part.cbal + inbound - (part.day1 ?? 0);
}

function dayNBalance(part: PartASL, asns: PartASN[], n: number): number {
  const usages = [null, part.day1, part.day2, part.day3, part.day4, part.day5, part.day6];
  const day1   = getDay1Date();
  let balance  = part.cbal;

  for (let d = 1; d <= n; d++) {
    const date = new Date(day1);
    date.setDate(day1.getDate() + (d - 1));

    const arrives = d === 1
      ? (a: PartASN) => isDay1Arrival(a.eda, date)
      : (a: PartASN) => isArrivalOnDay(a.eda, date);

    const inbound = asns
      .filter((a) => arrives(a) && a.eta !== "11:11" && !a.shipComment.toLowerCase().includes("ntxd"))
      .reduce((sum, a) => sum + a.quantity, 0);

    balance = balance + inbound - (usages[d] ?? 0);
  }

  return balance;
}

function dayNInTransit(asns: PartASN[], n: number): number {
  const day1 = getDay1Date();
  const date  = new Date(day1);
  date.setDate(day1.getDate() + (n - 1));

  const arrives = n === 1
    ? (a: PartASN) => isDay1Arrival(a.eda, date)
    : (a: PartASN) => isArrivalOnDay(a.eda, date);

  return asns
    .filter((a) => arrives(a) && a.eta !== "11:11" && !a.shipComment.toLowerCase().includes("ntxd"))
    .reduce((sum, a) => sum + a.quantity, 0);
}

function isBelowBank(part: PartASL, asns: PartASN[]): boolean {
  return projectedBalance(part, asns) < part.bank;
}

function isOut(part: PartASL, asns: PartASN[]): boolean {
  return projectedBalance(part, asns) < 0;
}

function getPDT(part: PartASL, asns: PartASN[]): string | null {
  if (part.doh > 6) return null;
  const usages = [part.day1, part.day2, part.day3, part.day4, part.day5, part.day6];
  const day1 = getDay1Date();

  for (let n = 1; n <= 6; n++) {
    const endBalance = dayNBalance(part, asns, n);
    if (endBalance < 0) {
      const usage = usages[n - 1] ?? 0;
      if (usage <= 0) return null;
      const startBalance = endBalance + usage;
      const minutes = (startBalance / usage) * 1440;
      const pdt = new Date(day1);
      pdt.setDate(day1.getDate() + (n - 1));
      pdt.setMinutes(pdt.getMinutes() + Math.round(minutes) - 120);
      const y  = pdt.getFullYear();
      const mo = String(pdt.getMonth() + 1).padStart(2, '0');
      const d  = String(pdt.getDate()).padStart(2, '0');
      const h  = String(pdt.getHours()).padStart(2, '0');
      const mi = String(pdt.getMinutes()).padStart(2, '0');
      return `${y}-${mo}-${d} ${h}:${mi}`;
    }
  }
  return null;
}


// ── Deck Selector ────────────────────────────────────────────────────────────

function DeckSelector({
  decks,
  selected,
  onSelect,
}: {
  decks:    string[];
  selected: string | null;
  onSelect: (d: string) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
      {decks.map((d) => {
        const active = d === selected;
        return (
          <button
            key={d}
            onClick={() => onSelect(d)}
            style={{
              padding:       "7px 18px",
              borderRadius:  6,
              border:        active ? "1.5px solid #1d4ed8" : "1.5px solid #d1d5db",
              background:    active ? "#1d4ed8" : "#ffffff",
              color:         active ? "#ffffff" : "#374151",
              fontFamily:    "inherit",
              fontSize:      13,
              fontWeight:    600,
              letterSpacing: "0.05em",
              cursor:        "pointer",
              textTransform: "uppercase",
              transition:    "all 0.12s",
              boxShadow:     active ? "0 1px 4px rgba(29,78,216,0.18)" : "0 1px 2px rgba(0,0,0,0.06)",
            }}
          >
            {d}
          </button>
        );
      })}
    </div>
  );
}

// ── ASN Inline Panel ─────────────────────────────────────────────────────────

const isCrossed = (comment: string): boolean => {
    return /(?<!nt)xd/i.test(comment);
}

function ASNPanel({
  part,
  asns,
  loading,
  route,
}: {
  part:    PartASL;
  asns:    PartASN[];
  loading: boolean;
  route:   string | undefined;
}) {
  const c        = dohColor(part.doh);
  const proj     = projectedBalance(part, asns);
  const atRisk   = proj < part.bank;
  const pdt      = getPDT(part, asns);

  return (
    <tr>
      <td
        colSpan={14}
        style={{
          padding:      0,
          borderBottom: "2px solid #e5e7eb",
          background:   "#f8fafc",
        }}
      >
        <div style={{ padding: "16px 20px 20px" }}>

          {/* Part summary strip */}
          <div style={{
            display:       "flex",
            gap:           12,
            alignItems:    "center",
            marginBottom:  14,
            paddingBottom: 12,
            borderBottom:  "1px solid #e5e7eb",
          }}>
            <span style={{
              fontFamily:    "monospace",
              fontWeight:    700,
              fontSize:      15,
              color:         "#111827",
              letterSpacing: "0.06em",
            }}>
              {part.part}
            </span>
            {route && (
              <span style={{
                padding:       "2px 8px",
                borderRadius:  4,
                background:    "#eff6ff",
                border:        "1px solid #bfdbfe",
                color:         "#1d4ed8",
                fontSize:      11,
                fontWeight:    700,
                fontFamily:    "monospace",
                letterSpacing: "0.05em",
              }}>
                {route}
              </span>
            )}
            <span style={{ color: "#6b7280", fontSize: 13 }}>{part.desc}</span>
            <span style={{ color: "#9ca3af", fontSize: 12 }}>{part.supplier}</span>
            <div style={{ marginLeft: "auto", display: "flex", gap: 16, alignItems: "flex-end" }}>
              <Kpi label="DOH"      value={part.doh.toFixed(1)} color={c.text} />
              <Kpi label="C-Bal"    value={fmt(part.cbal)} />
              <Kpi label="Bank"     value={fmt(part.bank)} color="#6b7280" />
              <Kpi
                label="Projected D1"
                value={fmt(proj)}
                color={atRisk ? "#b91c1c" : "#15803d"}
              />
              <Kpi label="D1"       value={fmt(part.day1)} />
              <Kpi label="D2"       value={fmt(part.day2)} />
              <Kpi label="D3"       value={fmt(part.day3)} />
            </div>
          </div>

          {loading && (
            <div style={{ color: "#9ca3af", fontSize: 13 }}>Loading shipments…</div>
          )}

          {!loading && asns.length === 0 && (
            <div style={{ color: "#9ca3af", fontSize: 13 }}>No open ASNs for this part.</div>
          )}

          {!loading && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", color: "#9ca3af" }}>Count Line</span>
                  <span style={{
                    fontSize:      11,
                    fontWeight:    700,
                    letterSpacing: "0.09em",
                    textTransform: "uppercase",
                    color:         "#6c6d6e",
                  }}>
                    {asns[0]?.countComment}
                  </span>
                </div>
                {pdt && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", color: "#9ca3af" }}>PDT</span>
                    <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "monospace", color: "#b91c1c" }}>{pdt}</span>
                  </div>
                )}
              </div>
              <table style={{ borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr>
                    <th style={{ padding: "2px 12px", color: "#9ca3af", fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", textAlign: "right" }}></th>
                    {([1, 2, 3, 4, 5, 6] as const).map((n) => (
                      <th key={n} style={{ padding: "2px 12px", color: "#9ca3af", fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", textAlign: "right" }}>
                        D{n}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: "3px 12px", color: "#9ca3af", fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", whiteSpace: "nowrap" }}>Req</td>
                    {([1, 2, 3, 4, 5, 6] as const).map((n) => {
                      const req = [null, part.day1, part.day2, part.day3, part.day4, part.day5, part.day6][n];
                      return (
                        <td key={n} style={{ padding: "3px 12px", textAlign: "right", fontWeight: 700, color: "#6b7280" }}>
                          {fmt(req)}
                        </td>
                      );
                    })}
                  </tr>
                  <tr>
                    <td style={{ padding: "3px 12px", color: "#9ca3af", fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", whiteSpace: "nowrap" }}>In Transit</td>
                    {([1, 2, 3, 4, 5, 6] as const).map((n) => (
                      <td key={n} style={{ padding: "3px 12px", textAlign: "right", fontWeight: 700, color: "#374151" }}>
                        {fmt(dayNInTransit(asns, n))}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td style={{ padding: "3px 12px", color: "#9ca3af", fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", whiteSpace: "nowrap" }}>Proj Bal</td>
                    {([1, 2, 3, 4, 5, 6] as const).map((n) => {
                      const bal   = dayNBalance(part, asns, n);
                      const color = bal < 0 ? "#b91c1c" : bal < part.bank ? "#c2410c" : "#15803d";
                      return (
                        <td key={n} style={{ padding: "3px 12px", textAlign: "right", fontWeight: 700, color }}>
                          {fmt(bal)}
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {!loading && asns.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {asns.sort((a, b) => {
                const da = a.eda && a.eta ? new Date(`${a.eda}T${a.eta}`).getTime() : Infinity;
                const db = b.eda && b.eta ? new Date(`${b.eda}T${b.eta}`).getTime() : Infinity;
                return da - db;
              }).map((a, i) => {
                const day1Arrival = isDay1Arrival(a.eda, getDay1Date());
                console.log(getDay1Date());
                return (
                  <div
                    key={i}
                    style={{
                      background:   "#ffffff",
                      border:       day1Arrival ? "1px solid #93c5fd" : "1px solid #e5e7eb",
                      borderRadius: 8,
                      padding:      "12px 16px",
                      boxShadow:    "0 1px 3px rgba(0,0,0,0.05)",
                    }}
                  >
                    {/* Card header */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{
                          fontFamily:    "monospace",
                          fontWeight:    700,
                          fontSize:      14,
                          color:         "#111827",
                          letterSpacing: "0.05em",
                        }}>
                          {a.scac} · {a.trailer}
                        </span>
                        <span style={{
                          ...statusStyle(a.status),
                          fontSize:      10,
                          fontWeight:    700,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          borderRadius:  4,
                          padding:       "2px 8px",
                        }}>
                          {statusLabel(a.status)}
                        </span>
                        {day1Arrival && (
                          <span style={{
                            background:    "#dbeafe",
                            color:         "#1d4ed8",
                            fontSize:      10,
                            fontWeight:    700,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            borderRadius:  4,
                            padding:       "2px 8px",
                          }}>
                            Day 1
                          </span>
                        )}
                        {a.shipComment.toLowerCase().includes("ntxd") && (
                          <span style={{
                            background:    "#f09797",
                            color:         "#7f1d1d",
                            fontSize:      10,
                            fontWeight:    700,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            borderRadius:  4,
                            padding:       "2px 8px",
                          }}>
                            Not Crossed
                          </span>
                        )}
                        {isCrossed(a.shipComment.toLowerCase()) && (
                          <span style={{
                            background:    "#34f005",
                            color:         "#000000",
                            fontSize:      10,
                            fontWeight:    700,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            borderRadius:  4,
                            padding:       "2px 8px",
                          }}>
                            Crossed
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: 18, fontWeight: 700, color: "#111827" }}>
                        {a.quantity.toLocaleString()}{" "}
                        <span style={{ fontSize: 12, fontWeight: 400, color: "#9ca3af" }}>pcs</span>
                      </span>
                    </div>

                    {/* Field grid */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8 }}>
                      {[
                        { label: "SID",       value: a.sid },
                        { label: "Dock",      value: a.dock },
                        { label: "Ship Date", value: a.shipDate },
                        { label: "EDA",       value: a.eda },
                        { label: "ETA",       value: a.eta },
                        { label: "DUNS",      value: a.duns },
                      ].map(({ label, value }) => (
                        <div key={label} style={{ background: "#f8fafc", borderRadius: 4, padding: "6px 10px" }}>
                          <div style={{
                            fontSize:      10,
                            color:         "#9ca3af",
                            fontWeight:    600,
                            letterSpacing: "0.07em",
                            textTransform: "uppercase",
                            backgroundColor: isAging(a.eda, a.eta) ? "#fa0404" : isOAsn(a.eda, a.eta) ? "#b8fa04" : "transparent",
                            marginBottom:  2,
                          }}>
                            {label}
                          </div>
                          <div style={{ fontSize: 12, color: "#374151", fontFamily: "monospace" }}>
                            {value || "—"}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Comments */}
                    {(a.shipComment || a.countComment) && (
                      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                        {a.shipComment && (
                          <div style={{
                            flex:         1,
                            background:   a.shipComment.toLowerCase().includes("ntxd") ? "#f09797" : "#f8fafc",
                            border:       "1px solid #fde68a",
                            borderRadius: 4,
                            padding:      "6px 10px",
                            fontSize:     12,
                            color:        "#92400e",
                          }}>
                            <span style={{ fontWeight: 700, fontSize: 10, letterSpacing: "0.07em", textTransform: "uppercase" }}>
                              Ship note:{" "}
                            </span>
                            {a.shipComment}

                          </div>
                        )}
                        {!a.shipComment && (
                          <div style={{
                            flex:         1,
                            background:   a.shipComment.toLowerCase().includes("ntxd") ? "#f09797" : "#f8fafc",
                            border:       "1px solid #fde68a",
                            borderRadius: 4,
                            padding:      "6px 10px",
                            fontSize:     12,
                            color:        "#92400e",
                          }}>
                            <span style={{ fontWeight: 700, fontSize: 10, letterSpacing: "0.07em", textTransform: "uppercase" }}>
                              NO SHIPPING COMMENT CHECK WINDOW TIME
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

function Kpi({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ textAlign: "right" }}>
      <div style={{ fontSize: 10, color: "#9ca3af", fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase" }}>
        {label}
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: color ?? "#111827" }}>
        {value}
      </div>
    </div>
  );
}

// ── Parts Table ──────────────────────────────────────────────────────────────

function PartsTable({
  parts,
  expandedPart,
  asnMap,
  onRowClick,
  deckRoutes,
}: {
  parts:        PartASL[];
  expandedPart: string | null;
  asnMap:       Record<string, PartASN[]>;
  onRowClick:   (p: PartASL) => void;
  deckRoutes:   DeckRoute[];
}) {
  const headers = ["", "Part", "Duns", "Route", "Description", "Supplier", "DOH", "C-Bal", "D1", "D2", "D3", "D4", "D5", "D6", ""];

  return (
    <div style={{
      borderRadius: 8,
      border:       "1px solid #e5e7eb",
      overflow:     "hidden",
      boxShadow:    "0 1px 4px rgba(0,0,0,0.06)",
    }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ background: "#f9fafb", textAlign: 'center' }}>
            {headers.map((h, i) => (
              <th key={i} style={{
                padding:       "9px 14px",
                textAlign:     "center",
                fontSize:      11,
                fontWeight:    700,
                color:         "#9ca3af",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                borderBottom:  "1px solid #e5e7eb",
                whiteSpace:    "nowrap",
              }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {parts.map((p) => {
            const expanded  = expandedPart === p.part;
            const c         = dohColor(p.doh);
            const partAsns  = asnMap[p.part] ?? [];
            const atRisk    = isBelowBank(p, partAsns);
            const days      = [p.cbal, p.day1, p.day2, p.day3, p.day4, p.day5, p.day6];
            const oAsn      = partAsns.find(a => isOAsn(a.eda, a.eta)) !== undefined;
            const agingASN  = partAsns.find(a => isAging(a.eda, a.eta)) !== undefined;
            const route     = deckRoutes.find(r => r.parts.includes(p.part))?.route;
            const duns      = parts.find(r => r.part.includes(p.part))?.duns;
            const out       = isOut(p, partAsns);
            const pdt       = getPDT(p, partAsns);
            const threshold = new Date(getDay1Date());
            threshold.setDate(threshold.getDate() + ((p.day2 ?? 0) > 0 ? 2 : 3));
            const pdtCritical = pdt ? new Date(pdt.replace(' ', 'T')) < threshold : false;
            const bankDays  = (p.day2 ?? 0) === 0 ? 3 : 2;
            const nearBankViolation = !atRisk && Array.from({ length: bankDays }, (_, i) => i + 1)
              .some(n => dayNBalance(p, partAsns, n) < p.bank);
            return (
              <>
                <tr
                  key={p.part}
                  onClick={() => onRowClick(p)}
                  className={out ? 'detention-flash' : ''}
                  style={{
                    background:   expanded ? "#eff6ff" : atRisk ? "#fff1f2" : "#ffffff",
                    borderBottom: expanded ? "none" : "1px solid #f3f4f6",
                    cursor:       "pointer",
                    transition:   "background 0.1s",
                    borderLeft:   `3px solid ${atRisk ? "#f87171" : c.border}`,
                    textAlign:   "center",
                  }}
                >
                  {/* Risk indicator column */}
                  <td style={{ padding: "10px 10px 10px 14px", width: 20 }}>
                    {atRisk && (
                      <span title={`Projected D1 balance falls below bank (${fmt(p.bank)})`} style={{
                        display:        "inline-block",
                        width:          8,
                        height:         8,
                        borderRadius:   "50%",
                        background:     "#ef4444",
                        boxShadow:      "0 0 0 2px #fecaca",
                      }} />
                    )}
                    {oAsn && !agingASN && (
                      <span title={`O-ASN detected`} style={{
                        display:        "inline-block",
                        width:          8,
                        height:         8,
                        borderRadius:   "50%",
                        background:     "#88ff00",
                        boxShadow:      "0 0 0 2px #f1f505",
                      }} />
                    )}
                    {oAsn && agingASN && (
                      <span title={`Aging ASN detected`} style={{
                        display:        "inline-block",
                        width:          8,
                        height:         8,
                        borderRadius:   "50%",
                        background:     "#ffa600",
                        boxShadow:      "0 0 0 2px #f50505",
                      }} />
                    )}
                    {nearBankViolation && (
                      <span title={`Bank violation within Day ${bankDays}`} style={{
                        display:      "inline-block",
                        width:        8,
                        height:       8,
                        borderRadius: "50%",
                        background:   "#eab308",
                        boxShadow:    "0 0 0 2px #fef08a",
                      }} />
                    )}
                    {pdtCritical && (
                      <span title={`PDT before Day ${(p.day2 ?? 0) > 0 ? 2 : 3}: ${pdt}`} style={{
                        display:        "inline-block",
                        width:          8,
                        height:         8,
                        borderRadius:   "50%",
                        background:     "#7c3aed",
                        boxShadow:      "0 0 0 2px #ddd6fe",
                      }} />
                    )}
                    {partAsns.length}
                  </td>
                  <td style={{ padding: "10px 14px", fontFamily: "monospace", fontWeight: 700, color: "#111827", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>
                    {p.part}
                  </td>
                  <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
                    {route ? (
                      <span style={{
                        padding:       "2px 8px",
                        borderRadius:  4,
                        background:    "#eff6ff",
                        border:        "1px solid #bfdbfe",
                        color:         "#1d4ed8",
                        fontSize:      11,
                        fontWeight:    700,
                        fontFamily:    "monospace",
                        letterSpacing: "0.05em",
                      }}>
                        {duns}
                      </span>
                    ) : <span style={{ color: "#d1d5db" }}>—</span>}
                  </td>
                  <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
                    {route ? (
                      <span style={{
                        padding:       "2px 8px",
                        borderRadius:  4,
                        background:    "#eff6ff",
                        border:        "1px solid #bfdbfe",
                        color:         "#1d4ed8",
                        fontSize:      11,
                        fontWeight:    700,
                        fontFamily:    "monospace",
                        letterSpacing: "0.05em",
                      }}>
                        {route}
                      </span>
                    ) : <span style={{ color: "#d1d5db" }}>—</span>}
                  </td>
                  <td style={{ padding: "10px 14px", color: "#6b7280", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {p.desc}
                  </td>
                  <td style={{ padding: "10px 14px", color: "#6b7280", whiteSpace: "nowrap" }}>
                    {p.supplier}
                  </td>
                  <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
                    <span style={{
                      background:    c.bg,
                      color:         c.text,
                      border:        `1px solid ${c.border}`,
                      borderRadius:  4,
                      fontSize:      11,
                      fontWeight:    700,
                      padding:       "2px 8px",
                      letterSpacing: "0.06em",
                    }}>
                      {p.doh.toFixed(1)}
                    </span>
                  </td>
                  {days.map((v, i) => (
                    <td key={i} style={{
                      padding:    "10px 14px",
                      textAlign:  "right",
                      fontFamily: "monospace",
                      color:      v != null && v < 0 ? "#b91c1c" : "#374151",
                      whiteSpace: "nowrap",
                    }}>
                      {fmt(v)}
                    </td>
                  ))}
                  <td style={{ padding: "10px 14px", textAlign: "right", color: "#9ca3af", fontSize: 11 }}>
                    {expanded ? "▲" : "▼"}
                  </td>
                </tr>

                {expanded && (
                  <ASNPanel
                    part={p}
                    asns={partAsns}
                    loading={false}
                    route={route}
                  />
                )}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function Scan() {
  const [decks,              setDecks]              = useState<string[]>([]);
  const [selectedDeck,       setSelectedDeck]       = useState<string | null>(null);
  const [parts,              setParts]              = useState<PartASL[]>([]);
  const [expandedPart,       setExpandedPart]       = useState<string | null>(null);
  const [asnMap,             setAsnMap]             = useState<Record<string, PartASN[]>>({});
  const [deckRoutes,         setDeckRoutes]         = useState<DeckRoute[]>([]);
  const [selectedRoute,      setSelectedRoute]      = useState<string | null>(null);
  const [selectedDuns,       setSelectedDuns]       = useState<string | null>(null);
  const [filterMode,         setFilterMode]         = useState<'route' | 'duns'>('route');
  const [contacts,           setContacts]           = useState<Contact[]>([]);
  const [routeContacts,      setRouteContacts]      = useState<DunsContacts[]>([]);
  const [routeCarrierContacts, setRouteCarrierContacts] = useState<CarrierContacts[]>([]);
  const [routeDescMap,       setRouteDescMap]       = useState<Record<string, string>>({});
  const [loadingDecks,       setLoadingDecks]       = useState(true);
  const [loadingParts,       setLoadingParts]       = useState(false);
  const [loadingAsns,        setLoadingAsns]        = useState(false);
  const [uniqueTrailerCount, setUniqueTrailerCount] = useState(0);

  // Decks on mount
  useEffect(() => {
    (async () => {
      try {
        setLoadingDecks(true);
        const decks = await api.get<string[]>(`/scan/decks`);
        setDecks(decks.data);
        setLoadingDecks(false);
      } catch(error) {
        console.error("Error fetching decks:", error);
      }
    })()
  }, []);

  useEffect(() => {
          (async () => {
              try {
                  await api.post('/api/refresh')
              } catch {
                  await logout()
              }
          })()
      },[])

  // Route descriptions on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<{ route: string; desc: string }[]>('/api/get_part_routes');
        const map: Record<string, string> = {};
        res.data.forEach(r => {
          if (r.route && r.desc && !map[r.route]) map[r.route] = r.desc;
        });
        setRouteDescMap(map);
      } catch(error) {
        console.error("Error fetching route descriptions:", error);
      }
    })()
  }, []);

  // Parts + all ASNs for deck when deck changes
  useEffect(() => {
    if (!selectedDeck) return;
    setLoadingParts(true);
    setLoadingAsns(true);
    setParts([]);
    setExpandedPart(null);
    setAsnMap({});
    setUniqueTrailerCount(0);

    setDeckRoutes([]);
    setSelectedRoute(null);
    setSelectedDuns(null);

    const partsReq  = api.get<PartASL[]>(`/scan/parts?deck=${encodeURIComponent(selectedDeck)}`);
    const asnsReq   = api.get<PartASN[]>(`/scan/asn/deck?deck=${encodeURIComponent(selectedDeck)}`);
    const routesReq = api.get<DeckRoute[]>(`/scan/routes?deck=${encodeURIComponent(selectedDeck)}`);

    Promise.all([partsReq, asnsReq, routesReq])
      .then(([partsRes, asnsRes, routesRes]) => {
        setDeckRoutes(routesRes.data);
        const partsData = partsRes.data;
        const asnsData  = asnsRes.data;
        setParts(partsData);

        // Group ASNs by part
        const grouped = asnsData.reduce<Record<string, PartASN[]>>((acc, a) => {
          if (!acc[a.part]) acc[a.part] = [];
          acc[a.part].push(a);
          return acc;
        }, {});
        setAsnMap(grouped);
        setUniqueTrailerCount(new Set(asnsData.map(a => a.trailer)).size);
      })
      .finally(() => {
        setLoadingParts(false);
        setLoadingAsns(false);
      });
  }, [selectedDeck]);

  // Contacts when a DUNS is selected
  useEffect(() => {
    if (!selectedDuns) {
      setContacts([]);
      return;
    }
    (async () => {
      try {
        const res = await api.get<Contact[]>(`/api/get_contacts`);
        setContacts(res.data);
      } catch(error) {
        console.error("Error fetching contacts:", error);
      }
    })()
  }, [selectedDuns]);

  // Contacts when a route is selected
  useEffect(() => {
    if (!selectedRoute) {
      setRouteContacts([]);
      setRouteCarrierContacts([]);
      return;
    }
    (async () => {
      try {
        const [dunsRes, carrierRes] = await Promise.all([
          api.get<DunsContacts[]>(`/api/get_route_contacts?route=${encodeURIComponent(selectedRoute)}`),
          api.get<CarrierContacts[]>(`/api/get_route_carrier_contacts?route=${encodeURIComponent(selectedRoute)}`),
        ]);
        setRouteContacts(dunsRes.data);
        setRouteCarrierContacts(carrierRes.data);
      } catch(error) {
        console.error("Error fetching route contacts:", error);
      }
    })()
  }, [selectedRoute]);

  const handleRowClick = useCallback((p: PartASL) => {
    setExpandedPart((prev) => prev === p.part ? null : p.part);
  }, []);

  const atRiskCount = parts.filter((p) => isBelowBank(p, asnMap[p.part] ?? [])).length;

  // Route associated with the selected DUNS, taken from the first part (of that DUNS) that has an ASN
  const dunsRoute = useMemo(() => {
    if (!selectedDuns) return null;
    const dunsParts = parts.filter(p => p.duns === selectedDuns);
    const partWithAsn = dunsParts.find(p => (asnMap[p.part] ?? []).length > 0);
    if (!partWithAsn) return null;
    return deckRoutes.find(r => r.parts.includes(partWithAsn.part))?.route ?? null;
  }, [selectedDuns, parts, asnMap, deckRoutes]);

  const buildSubject = useCallback((dunsList: string[], route: string | null) => {
    const segments: string[] = [];
    if (dunsList.length > 0) segments.push(`DUNS: ${dunsList.join(', ')}`);
    if (route) segments.push(`Route: ${route}`);
    const desc = route ? routeDescMap[route] : undefined;
    if (desc) segments.push(desc);
    return segments.join('  |  ');
  }, [routeDescMap]);

  const mailtoHref = (emails: string[], subject: string) =>
    emails.length > 0 ? `mailto:${emails.join(',')}${subject ? `?subject=${encodeURIComponent(subject)}` : ''}` : undefined;

  return (
    <div style={{
      minHeight:  "100vh",
      background: "#f8fafc",
      color:      "#111827",
      fontFamily: "'IBM Plex Sans', 'Geist', system-ui, sans-serif",
      padding:    "28px 32px",
      boxSizing:  "border-box",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 22 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#111827", letterSpacing: "-0.01em" }}>
            Scan
          </h1>
          <p style={{ margin: "3px 0 0", fontSize: 13, color: "#9ca3af" }}>
            {selectedDeck
              ? `Deck ${selectedDeck} · ${parts.length} parts · ${uniqueTrailerCount} trailers · ${deckRoutes.length} routes · ${new Set(parts.map(p => p.duns)).size} suppliers`
              : "Select a deck to view parts"}
          </p>
        </div>

        {/* At-risk badge */}
        {selectedDeck && !loadingParts && atRiskCount > 0 && (
          <div style={{
            display:      "flex",
            alignItems:   "center",
            gap:          8,
            background:   "#fff1f2",
            border:       "1px solid #fecaca",
            borderRadius: 8,
            padding:      "8px 14px",
          }}>
            <span style={{
              display:      "inline-block",
              width:        8,
              height:       8,
              borderRadius: "50%",
              background:   "#ef4444",
              boxShadow:    "0 0 0 2px #fecaca",
            }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: "#b91c1c" }}>
              {atRiskCount} part{atRiskCount > 1 ? "s" : ""} below bank
            </span>
          </div>
        )}
      </div>

      {/* Deck selector */}
      {loadingDecks ? (
        <div style={{ color: "#9ca3af", fontSize: 13 }}>Loading decks…</div>
      ) : (
        <DeckSelector decks={decks} selected={selectedDeck} onSelect={setSelectedDeck} />
      )}

      {/* Filter banners */}
      {deckRoutes.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          {/* Mode headers */}
          <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
            {(['route', 'duns'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => {
                  setFilterMode(mode);
                  setSelectedRoute(null);
                  setSelectedDuns(null);
                }}
                style={{
                  padding:       "3px 12px",
                  borderRadius:  4,
                  border:        `1px solid ${filterMode === mode ? "#374151" : "#e5e7eb"}`,
                  background:    filterMode === mode ? "#111827" : "#f9fafb",
                  color:         filterMode === mode ? "#ffffff" : "#6b7280",
                  fontSize:      11,
                  fontWeight:    700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  cursor:        "pointer",
                }}
              >
                {mode === 'route' ? 'Routes' : 'DUNS'}
              </button>
            ))}

            {filterMode === 'duns' && selectedDuns && (() => {
              const emails = Array.from(new Set(
                contacts.filter(c => c.duns === selectedDuns && c.email).map(c => c.email)
              ));
              const subject = buildSubject([selectedDuns], dunsRoute);
              return (
                <a
                  href={mailtoHref(emails, subject)}
                  onClick={(e) => { if (emails.length === 0) e.preventDefault(); }}
                  style={{
                    marginLeft:   "auto",
                    padding:      "3px 12px",
                    borderRadius: 4,
                    border:       `1px solid ${emails.length > 0 ? "#7c3aed" : "#e5e7eb"}`,
                    background:   emails.length > 0 ? "#7c3aed" : "#f9fafb",
                    color:        emails.length > 0 ? "#ffffff" : "#9ca3af",
                    fontSize:     12,
                    fontWeight:   600,
                    textDecoration: "none",
                    cursor:       emails.length > 0 ? "pointer" : "not-allowed",
                  }}
                >
                  {emails.length > 0 ? `Email ${selectedDuns} (${emails.length})` : "No contacts on file"}
                </a>
              );
            })()}

            {filterMode === 'route' && selectedRoute && (() => {
              const supplierEmails = routeContacts.flatMap(g => g.contacts.map(c => c.email)).filter(Boolean);
              const carrierEmails  = routeCarrierContacts.flatMap(g => g.contacts.map(c => c.email)).filter(Boolean);
              const routeDunsList  = routeContacts.map(g => g.duns).filter(Boolean);
              const subject        = buildSubject(routeDunsList, selectedRoute);

              const mailButton = (label: string, emails: string[], color: string, first: boolean) => {
                const unique = Array.from(new Set(emails));
                return (
                  <a
                    key={label}
                    href={mailtoHref(unique, subject)}
                    onClick={(e) => { if (unique.length === 0) e.preventDefault(); }}
                    style={{
                      marginLeft:   first ? "auto" : 0,
                      padding:      "3px 12px",
                      borderRadius: 4,
                      border:       `1px solid ${unique.length > 0 ? color : "#e5e7eb"}`,
                      background:   unique.length > 0 ? color : "#f9fafb",
                      color:        unique.length > 0 ? "#ffffff" : "#9ca3af",
                      fontSize:     12,
                      fontWeight:   600,
                      textDecoration: "none",
                      cursor:       unique.length > 0 ? "pointer" : "not-allowed",
                    }}
                  >
                    {unique.length > 0 ? `${label} (${unique.length})` : `No ${label.toLowerCase()} on file`}
                  </a>
                );
              };

              return (
                <>
                  {mailButton("Suppliers", supplierEmails, "#1d4ed8", true)}
                  {mailButton("Carriers", carrierEmails, "#d97706", false)}
                  {mailButton("All", [...supplierEmails, ...carrierEmails], "#059669", false)}
                </>
              );
            })()}
          </div>

          {/* Route banners */}
          {filterMode === 'route' && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {deckRoutes.map(({ route, parts: routeParts }) => {
                const active = selectedRoute === route;
                return (
                  <span
                    key={route}
                    title={routeParts.join(", ")}
                    onClick={() => setSelectedRoute(active ? null : route)}
                    style={{
                      padding:       "3px 10px",
                      borderRadius:  4,
                      background:    active ? "#1d4ed8" : "#eff6ff",
                      border:        `1px solid ${active ? "#1d4ed8" : "#bfdbfe"}`,
                      color:         active ? "#ffffff" : "#1d4ed8",
                      fontSize:      12,
                      fontWeight:    600,
                      fontFamily:    "monospace",
                      letterSpacing: "0.05em",
                      cursor:        "pointer",
                      userSelect:    "none",
                    }}
                  >
                    {route}
                    <span style={{ color: active ? "#bfdbfe" : "#93c5fd", fontWeight: 400, marginLeft: 6 }}>{routeParts.length}p</span>
                  </span>
                );
              })}
            </div>
          )}

          {/* DUNS banners */}
          {filterMode === 'duns' && (() => {
            const dunsGroups = parts.reduce<Record<string, number>>((acc, p) => {
              if (p.duns) acc[p.duns] = (acc[p.duns] ?? 0) + 1;
              return acc;
            }, {});
            return (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {Object.entries(dunsGroups).sort(([a], [b]) => a.localeCompare(b)).map(([duns, count]) => {
                  const active = selectedDuns === duns;
                  return (
                    <span
                      key={duns}
                      onClick={() => setSelectedDuns(active ? null : duns)}
                      style={{
                        padding:       "3px 10px",
                        borderRadius:  4,
                        background:    active ? "#7c3aed" : "#f5f3ff",
                        border:        `1px solid ${active ? "#7c3aed" : "#ddd6fe"}`,
                        color:         active ? "#ffffff" : "#7c3aed",
                        fontSize:      12,
                        fontWeight:    600,
                        fontFamily:    "monospace",
                        letterSpacing: "0.05em",
                        cursor:        "pointer",
                        userSelect:    "none",
                      }}
                    >
                      {duns}
                      <span style={{ color: active ? "#ddd6fe" : "#a78bfa", fontWeight: 400, marginLeft: 6 }}>{count}p</span>
                    </span>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* Parts table */}
      {selectedDeck && (
        loadingParts || loadingAsns ? (
          <div style={{ color: "#9ca3af", fontSize: 13, paddingTop: 12 }}>Loading parts…</div>
        ) : parts.length === 0 ? (
          <div style={{ color: "#9ca3af", fontSize: 13, paddingTop: 12 }}>No parts found for deck {selectedDeck}.</div>
        ) : (
          <PartsTable
            parts={selectedRoute
              ? parts.filter(p => deckRoutes.find(r => r.route === selectedRoute)?.parts.includes(p.part))
              : selectedDuns
              ? parts.filter(p => p.duns === selectedDuns)
              : parts}
            expandedPart={expandedPart}
            asnMap={asnMap}
            onRowClick={handleRowClick}
            deckRoutes={deckRoutes}
          />
        )
      )}
    </div>
  );
}