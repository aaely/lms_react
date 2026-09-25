import {
    Document,
    Packer,
    Paragraph,
    TextRun,
    Table,
    TableRow,
    TableCell,
    WidthType,
    TableLayoutType,
    PageOrientation,
    VerticalAlign,
    BorderStyle,
} from 'docx'

// Landscape Letter is 15840 twips wide (11in x 1440); the 720-twip (0.5in) side
// margins below leave exactly 10in of content. Callers' column widths must sum to
// this, because a FIXED-layout table is not renegotiated by Word — a short sum
// leaves dead space on the right, a long one pushes columns off the page.
export const LANDSCAPE_CONTENT_WIDTH = 14400

const PAGE_MARGIN = 720

// Portrait Letter; docx swaps these when the orientation is landscape. Set
// explicitly because docx defaults to A4, which would widen the page to 16838
// twips and strand an inch to the right of the table.
const PAGE_WIDTH = 12240
const PAGE_HEIGHT = 15840

// Hex without a leading '#', as OOXML expects it.
export interface WordTextRun {
    text:   string
    color?: string
    bold?:  boolean
}

// A cell is plain text, a number, or a run list when parts of it need their own color.
export type WordTableCell = string | number | WordTextRun[]

export interface LandscapeTableOptions {
    title:        string
    headers:      string[]
    columnWidths: number[]
    rows:         WordTableCell[][]
    fileName:     string
}

const BORDER = { style: BorderStyle.SINGLE, size: 4, color: '333333' }

const tableBorders = {
    top: BORDER,
    bottom: BORDER,
    left: BORDER,
    right: BORDER,
    insideHorizontal: BORDER,
    insideVertical: BORDER,
}

const CELL_MARGINS = { top: 40, bottom: 40, left: 80, right: 80 }

const cellParagraph = (value: WordTableCell): Paragraph =>
    new Paragraph({
        children: Array.isArray(value)
            ? value.map(run => new TextRun({ text: run.text, color: run.color, bold: run.bold }))
            : [new TextRun({ text: String(value) })],
    })

export async function downloadLandscapeTable({
    title,
    headers,
    columnWidths,
    rows,
    fileName,
}: LandscapeTableOptions): Promise<void> {
    const total = columnWidths.reduce((sum, w) => sum + w, 0)
    if (total !== LANDSCAPE_CONTENT_WIDTH) {
        console.warn(
            `wordTable: columnWidths total ${total} twips, expected ${LANDSCAPE_CONTENT_WIDTH}; ` +
            'the fixed-layout table will not fill the page correctly.'
        )
    }

    // Header styling mirrors the on-screen table: dark fill, white bold text.
    const headerRow = new TableRow({
        tableHeader: true,
        children: headers.map((heading, i) => new TableCell({
            width: { size: columnWidths[i], type: WidthType.DXA },
            shading: { fill: '111111' },
            margins: CELL_MARGINS,
            verticalAlign: VerticalAlign.CENTER,
            children: [new Paragraph({
                children: [new TextRun({ text: heading, bold: true, color: 'FFFFFF' })],
            })],
        })),
    })

    const bodyRows = rows.map(row => new TableRow({
        children: row.map((value, i) => new TableCell({
            width: { size: columnWidths[i], type: WidthType.DXA },
            margins: CELL_MARGINS,
            verticalAlign: VerticalAlign.TOP,
            children: [cellParagraph(value)],
        })),
    }))

    const doc = new Document({
        styles: {
            default: {
                document: { run: { font: 'Calibri', size: 16 } },
            },
        },
        sections: [{
            properties: {
                page: {
                    size: {
                        orientation: PageOrientation.LANDSCAPE,
                        width: PAGE_WIDTH,
                        height: PAGE_HEIGHT,
                    },
                    margin: {
                        top: PAGE_MARGIN,
                        right: PAGE_MARGIN,
                        bottom: PAGE_MARGIN,
                        left: PAGE_MARGIN,
                    },
                },
            },
            children: [
                new Paragraph({
                    spacing: { after: 120 },
                    children: [new TextRun({ text: title, bold: true, size: 24 })],
                }),
                new Table({
                    layout: TableLayoutType.FIXED,
                    width: { size: LANDSCAPE_CONTENT_WIDTH, type: WidthType.DXA },
                    columnWidths,
                    borders: tableBorders,
                    rows: [headerRow, ...bodyRows],
                }),
            ],
        }],
    })

    const blob = await Packer.toBlob(doc)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    link.click()
    URL.revokeObjectURL(url)
}
