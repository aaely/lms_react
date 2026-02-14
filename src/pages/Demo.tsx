import useEndpoint from "../utils/useTest";

export default function Demo() {
  // Example 1: Google Sheets API (public read-only with API key)
  // Make sure the sheet is publicly readable and the key is referrer-restricted.
  const SPREADSHEET_ID =
    "13d8sRwZ5qRlbi_OPFGdj4tN_RjOpvRMYmxzqZUz_IiY"; // demo id
  const RANGE = "Sheet1!A1:B2";
  const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY ?? "AIzaSyB6ybfd-UNQCFd3T2mpCk6setgZhLtKxto";

  const endpoint = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(
    RANGE
  )}?majorDimension=ROWS&key=${API_KEY}`;

  // Example 2: CSV via gviz (no key required for public)
  // const endpoint = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&gid=0`;

  const { data, error, loading } = useEndpoint(endpoint);

  if (loading) return <p>Loading…</p>;
  if (error) return <pre style={{ color: "crimson" }}>{error}</pre>;

  // data may be JSON (ValueRange) or text (CSV) depending on the endpoint
  if (typeof data === "string") {
    // CSV string — show a preview
    return (
      <pre style={{ whiteSpace: "pre-wrap" }}>
        {data.split("\n").slice(0, 10).join("\n")}
      </pre>
    );
  }

  // JSON (Google Sheets ValueRange) — render as a table if `values` exists
  const valueRange = data as { values?: string[][] };
  const rows = valueRange.values ?? [];

  return (
    <table>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            {r.map((c, j) => (
              <td key={j}>{c}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}