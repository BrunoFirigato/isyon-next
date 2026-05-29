import ExcelJS from 'exceljs'
import type { ColDef } from './columns'

const HEADER_BG    = 'FF2563EB'   // azul Isyon
const HEADER_FONT  = 'FFFFFFFF'   // branco
const EXAMPLE_BG   = 'FFF0F4FF'   // azul bem claro
const EXAMPLE_FONT = 'FF6B7280'   // cinza

/**
 * Gera um buffer .xlsx com dados.
 * @param cols    Definição de colunas
 * @param rows    Linhas de dados (objetos com as keys das colunas)
 * @param sheet   Nome da aba
 */
export async function generateExcel(
  cols: ColDef[],
  rows: Record<string, unknown>[],
  sheet = 'Dados',
): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook()
  wb.creator   = 'Isyon CRM'
  wb.lastModifiedBy = 'Isyon CRM'
  wb.created   = new Date()

  const ws = wb.addWorksheet(sheet, {
    views: [{ state: 'frozen', ySplit: 1 }],
  })

  // Definir colunas
  ws.columns = cols.map(c => ({ key: c.key, width: c.width }))

  // Linha de cabeçalho com estilo
  const headerRow = ws.addRow(cols.map(c => c.header))
  headerRow.eachCell(cell => {
    cell.font  = { bold: true, color: { argb: HEADER_FONT }, size: 11 }
    cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_BG } }
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
    cell.border = {
      bottom: { style: 'thin', color: { argb: 'FF1D4ED8' } },
    }
  })
  headerRow.height = 22

  // Linhas de dados
  rows.forEach(row => {
    const dataRow = ws.addRow(cols.map(c => row[c.key] ?? ''))
    dataRow.eachCell(cell => {
      cell.alignment = { vertical: 'middle' }
    })
  })

  // Auto-filtro no cabeçalho
  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to:   { row: 1, column: cols.length },
  }

  const buf = await wb.xlsx.writeBuffer()
  return buf as ArrayBuffer
}

/**
 * Gera um template .xlsx para importação.
 * Inclui linha de cabeçalho + linha de exemplo.
 */
export async function generateTemplate(
  cols: ColDef[],
  exemplo: Record<string, unknown>,
  sheet = 'Importação',
): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet(sheet, {
    views: [{ state: 'frozen', ySplit: 1 }],
  })

  ws.columns = cols.map(c => ({ key: c.key, width: c.width }))

  // Cabeçalho
  const headerRow = ws.addRow(cols.map(c => c.header))
  headerRow.eachCell(cell => {
    cell.font  = { bold: true, color: { argb: HEADER_FONT }, size: 11 }
    cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_BG } }
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
  })
  headerRow.height = 22

  // Linha de exemplo em azul claro
  const exRow = ws.addRow(cols.map(c => exemplo[c.key] ?? ''))
  exRow.eachCell(cell => {
    cell.font = { italic: true, color: { argb: EXAMPLE_FONT } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXAMPLE_BG } }
    cell.alignment = { vertical: 'middle' }
  })

  const buf = await wb.xlsx.writeBuffer()
  return buf as ArrayBuffer
}
