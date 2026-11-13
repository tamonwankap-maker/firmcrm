import "server-only";
import path from "node:path";
import { Document, Font, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { formatCell, isNumeric } from "../format";
import type { ReportResult } from "../types";

let fontsRegistered = false;

/**
 * Sarabun (SIL OFL) ships as separate Latin and Thai subsets; react-pdf falls back across the
 * family list per glyph, so we register both and use ["SarabunLatin", "SarabunThai"].
 * Thai has no spaces between words, so line breaks are found with Intl.Segmenter.
 */
function registerFonts() {
  if (fontsRegistered) return;
  const dir = path.join(process.cwd(), "public", "fonts");
  for (const [family, subset] of [
    ["SarabunLatin", "latin"],
    ["SarabunThai", "thai"],
  ] as const) {
    Font.register({
      family,
      fonts: [
        { src: path.join(dir, `sarabun-${subset}-400-normal.woff`), fontWeight: 400 },
        { src: path.join(dir, `sarabun-${subset}-700-normal.woff`), fontWeight: 700 },
      ],
    });
  }
  const segmenter = new Intl.Segmenter("th", { granularity: "word" });
  Font.registerHyphenationCallback((word) =>
    /[฀-๿]/.test(word) ? Array.from(segmenter.segment(word), (s) => s.segment) : [word],
  );
  fontsRegistered = true;
}

const FONT = ["SarabunLatin", "SarabunThai"];
const THAI = /[\u0E00-\u0E7F]/;
/**
 * Per-glyph font fallback is ~4× slower to lay out, so cells without Thai use the Latin face only;
 * cells with Thai list the Thai face first (Latin glyphs then fall back to SarabunLatin).
 */
const fontFor = (text: string) => (THAI.test(text) ? ["SarabunThai", "SarabunLatin"] : ["SarabunLatin"]);

const styles = StyleSheet.create({
  page: { padding: 28, paddingBottom: 40, fontFamily: FONT, fontSize: 8, color: "#1a1a1a" },
  title: { fontSize: 15, fontWeight: 700, color: "#1F3A5F" },
  subtitle: { fontSize: 9, color: "#555", marginTop: 2 },
  meta: { fontSize: 7, color: "#777", marginTop: 2, marginBottom: 8 },
  highlights: { flexDirection: "row", gap: 8, marginBottom: 8 },
  hl: { borderWidth: 0.5, borderColor: "#ccc", borderRadius: 3, paddingVertical: 4, paddingHorizontal: 6 },
  hlLabel: { fontSize: 6.5, color: "#666", textTransform: "uppercase" },
  hlValue: { fontSize: 11, fontWeight: 700 },
  headRow: { flexDirection: "row", backgroundColor: "#1F3A5F", color: "#fff", fontWeight: 700 },
  row: { flexDirection: "row", borderBottomWidth: 0.4, borderBottomColor: "#ddd" },
  zebra: { backgroundColor: "#f6f7f9" },
  totalRow: { flexDirection: "row", borderTopWidth: 0.8, borderTopColor: "#333", fontWeight: 700 },
  cell: { paddingVertical: 3, paddingHorizontal: 3 },
  notes: { marginTop: 10, fontSize: 7, color: "#555" },
  footer: {
    position: "absolute",
    bottom: 16,
    left: 28,
    right: 28,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: "#888",
  },
});

function ReportPdf({
  title,
  subtitle,
  meta,
  result,
}: {
  title: string;
  subtitle: string;
  meta: string;
  result: ReportResult;
}) {
  // Text columns get more room than numbers.
  const weights = result.columns.map((c) => (c.type === "text" ? 2.2 : c.type === "date" ? 1.3 : 1));
  const total = weights.reduce((a, b) => a + b, 0);
  const width = (i: number) => `${((weights[i] / total) * 100).toFixed(2)}%`;
  const cellStyle = (i: number) => [
    styles.cell,
    { width: width(i), textAlign: isNumeric(result.columns[i].type) ? ("right" as const) : ("left" as const) },
  ];

  return (
    <Document title={title} author="BD CRM">
      <Page size="A4" orientation="landscape" style={styles.page}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        <Text style={styles.meta}>{meta}</Text>
        {result.highlights && (
          <View style={styles.highlights}>
            {result.highlights.map((h) => (
              <View key={h.label} style={styles.hl}>
                <Text style={styles.hlLabel}>{h.label}</Text>
                <Text style={styles.hlValue}>{h.value}</Text>
              </View>
            ))}
          </View>
        )}
        <View style={styles.headRow} fixed>
          {result.columns.map((c, i) => (
            <Text key={c.key} style={cellStyle(i)}>
              {c.label}
            </Text>
          ))}
        </View>
        {result.rows.map((r, ri) => (
          <View key={ri} style={ri % 2 ? [styles.row, styles.zebra] : styles.row} wrap={false}>
            {result.columns.map((c, i) => {
              const text = formatCell(r[c.key], c.type);
              return (
                <Text key={c.key} style={[...cellStyle(i), { fontFamily: fontFor(text) }]}>
                  {text}
                </Text>
              );
            })}
          </View>
        ))}
        {result.rows.length === 0 && <Text style={{ marginTop: 8, color: "#777" }}>No records for these filters.</Text>}
        {result.totals && (
          <View style={styles.totalRow} wrap={false}>
            {result.columns.map((c, i) => (
              <Text key={c.key} style={cellStyle(i)}>
                {formatCell(result.totals?.[c.key] ?? null, c.type)}
              </Text>
            ))}
          </View>
        )}
        {result.notes?.map((n) => (
          <Text key={n} style={styles.notes}>
            {n}
          </Text>
        ))}
        <View style={styles.footer} fixed>
          <Text>Confidential — internal use only</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

/** PDFs are for reading and printing; very long lists belong in Excel. */
export const PDF_MAX_ROWS = 1000;

export async function buildPdf(opts: {
  title: string;
  subtitle: string;
  generatedBy: string;
  generatedAt: string;
  result: ReportResult;
}) {
  registerFonts();
  const total = opts.result.rows.length;
  const result: ReportResult =
    total > PDF_MAX_ROWS
      ? {
          ...opts.result,
          rows: opts.result.rows.slice(0, PDF_MAX_ROWS),
          totals: undefined,
          notes: [
            `This PDF shows the first ${PDF_MAX_ROWS.toLocaleString("en-GB")} of ${total.toLocaleString("en-GB")} rows. Export to Excel for the full list.`,
            ...(opts.result.notes ?? []),
          ],
        }
      : opts.result;
  return renderToBuffer(
    <ReportPdf
      title={opts.title}
      subtitle={opts.subtitle}
      meta={`Generated ${opts.generatedAt} (Bangkok) by ${opts.generatedBy}`}
      result={result}
    />,
  );
}
