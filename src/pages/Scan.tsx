import { useState, useEffect, useCallback } from "react";
import '../App.css'

// ── Types ────────────────────────────────────────────────────────────────────

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

const API = "http://localhost:8000";

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
  const edaDate = new Date(year, month - 1, day); // local time, no UTC offset
  return edaDate.getTime() <= day1.getTime();
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

function isBelowBank(part: PartASL, asns: PartASN[]): boolean {
  return projectedBalance(part, asns) < part.bank;
}

function isOut(part: PartASL, asns: PartASN[]): boolean {
  return projectedBalance(part, asns) < 0;
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
}: {
  part:    PartASL;
  asns:    PartASN[];
  loading: boolean;
}) {
  const c        = dohColor(part.doh);
  const proj     = projectedBalance(part, asns);
  const atRisk   = proj < part.bank;

  return (
    <tr>
      <td
        colSpan={13}
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

          {/* ASN section label */}
          <div style={{
            fontSize:      11,
            fontWeight:    700,
            letterSpacing: "0.09em",
            textTransform: "uppercase",
            color:         "#9ca3af",
            marginBottom:  10,
          }}>
            Inbound ASNs
          </div>

          {loading && (
            <div style={{ color: "#9ca3af", fontSize: 13 }}>Loading shipments…</div>
          )}

          {!loading && asns.length === 0 && (
            <div style={{ color: "#9ca3af", fontSize: 13 }}>No open ASNs for this part.</div>
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
}: {
  parts:        PartASL[];
  expandedPart: string | null;
  asnMap:       Record<string, PartASN[]>;
  onRowClick:   (p: PartASL) => void;
}) {
  const headers = ["", "Part", "Description", "Supplier", "DOH", "C-Bal", "D1", "D2", "D3", "D4", "D5", "D6", ""];

  return (
    <div style={{
      borderRadius: 8,
      border:       "1px solid #e5e7eb",
      overflow:     "hidden",
      boxShadow:    "0 1px 4px rgba(0,0,0,0.06)",
    }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ background: "#f9fafb" }}>
            {headers.map((h, i) => (
              <th key={i} style={{
                padding:       "9px 14px",
                textAlign:     "left",
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
            const out     = isOut(p, partAsns);
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
                    {partAsns.length}
                  </td>
                  <td style={{ padding: "10px 14px", fontFamily: "monospace", fontWeight: 700, color: "#111827", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>
                    {p.part}
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
  const [decks,        setDecks]        = useState<string[]>([]);
  const [selectedDeck, setSelectedDeck] = useState<string | null>(null);
  const [parts,        setParts]        = useState<PartASL[]>([]);
  const [expandedPart, setExpandedPart] = useState<string | null>(null);
  const [asnMap,       setAsnMap]       = useState<Record<string, PartASN[]>>({});
  const [loadingDecks, setLoadingDecks] = useState(true);
  const [loadingParts, setLoadingParts] = useState(false);
  const [loadingAsns,  setLoadingAsns]  = useState(false);

  // Decks on mount
  useEffect(() => {
    fetch(`${API}/scan/decks`)
      .then((r) => r.json())
      .then((d: string[]) => setDecks(d))
      .finally(() => setLoadingDecks(false));
  }, []);

  // Parts + all ASNs for deck when deck changes
  useEffect(() => {
    if (!selectedDeck) return;
    setLoadingParts(true);
    setLoadingAsns(true);
    setParts([]);
    setExpandedPart(null);
    setAsnMap({});

    const partsReq = fetch(`${API}/scan/parts?deck=${encodeURIComponent(selectedDeck)}`).then((r) => r.json());
    const asnsReq  = fetch(`${API}/scan/asn/deck?deck=${encodeURIComponent(selectedDeck)}`).then((r) => r.json());

    Promise.all([partsReq, asnsReq])
      .then(([partsData, asnsData]: [PartASL[], PartASN[]]) => {
        setParts(partsData);

        // Group ASNs by part
        const grouped = asnsData.reduce<Record<string, PartASN[]>>((acc, a) => {
          if (!acc[a.part]) acc[a.part] = [];
          acc[a.part].push(a);
          return acc;
        }, {});
        setAsnMap(grouped);
      })
      .finally(() => {
        setLoadingParts(false);
        setLoadingAsns(false);
      });
  }, [selectedDeck]);

  const handleRowClick = useCallback((p: PartASL) => {
    setExpandedPart((prev) => prev === p.part ? null : p.part);
  }, []);

  const atRiskCount = parts.filter((p) => isBelowBank(p, asnMap[p.part] ?? [])).length;

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
              ? `${parts.length} parts · Deck ${selectedDeck} · sorted by DOH`
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

      {/* Parts table */}
      {selectedDeck && (
        loadingParts || loadingAsns ? (
          <div style={{ color: "#9ca3af", fontSize: 13, paddingTop: 12 }}>Loading parts…</div>
        ) : parts.length === 0 ? (
          <div style={{ color: "#9ca3af", fontSize: 13, paddingTop: 12 }}>No parts found for deck {selectedDeck}.</div>
        ) : (
          <PartsTable
            parts={parts}
            expandedPart={expandedPart}
            asnMap={asnMap}
            onRowClick={handleRowClick}
          />
        )
      )}
    </div>
  );
}