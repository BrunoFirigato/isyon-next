import ExcelJS from 'exceljs'
import type { ColDef } from './columns'

export interface ParsedRow {
  linha:  number
  dados:  Record<string, string>
  erros:  string[]
  valido: boolean
}

/**
 * Faz o parse de um buffer .xlsx ou .csv.
 * Assume que a primeira linha é o cabeçalho.
 * Mapeia colunas pelo header (não pela posição).
 */
export async function parseExcel(
  buffer: Buffer | Uint8Array | ArrayBuffer,
  cols: ColDef[],
  requiredKeys: string[],
): Promise<ParsedRow[]> {
  const wb  = new ExcelJS.Workbook()
  let buf: Buffer
  if (Buffer.isBuffer(buffer)) {
    buf = buffer
  } else if (buffer instanceof ArrayBuffer) {
    buf = Buffer.from(new Uint8Array(buffer))
  } else {
    buf = Buffer.from(buffer)
  }

  // Detecta formato pelo conteúdo
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await wb.xlsx.load(buf as any)
  } catch {
    // Tenta CSV como fallback
    const { Readable } = await import('stream')
    const stream = Readable.from(buf.toString('utf-8'))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (wb.csv as any).read(stream)
  }

  const ws = wb.worksheets[0]
  if (!ws) return []

  // Ler linha de cabeçalho para mapear posições das colunas
  const headerRow = ws.getRow(1)
  const colIndexMap: Record<string, number> = {}

  headerRow.eachCell((cell, colNum) => {
    const text = String(cell.value ?? '').trim()
    // Tolera o asterisco de "obrigatório" nos headers do template
    const normalized = text.replace(/\s*\*$/, '').toLowerCase()
    const match = cols.find(c => c.header.replace(/\s*\*$/, '').toLowerCase() === normalized)
    if (match) colIndexMap[match.key] = colNum
  })

  const rows: ParsedRow[] = []

  ws.eachRow((row, rowNum) => {
    if (rowNum === 1) return // pula cabeçalho
    if (rowNum === 2) {
      // Pula linha de exemplo (começa com o valor do exemplo)
      // Heurística: se todos os campos obrigatórios têm valor mas
      // o conteúdo parece ser de exemplo, pula
      // Na prática, deixamos o usuário preencher a partir da linha 2
    }

    // Ler valores da linha
    const dados: Record<string, string> = {}
    cols.forEach(c => {
      const idx = colIndexMap[c.key]
      if (idx) {
        const cell = row.getCell(idx)
        const val  = cell.value
        // Tratar datas
        if (val instanceof Date) {
          dados[c.key] = val.toLocaleDateString('pt-BR')
        } else {
          dados[c.key] = String(val ?? '').trim()
        }
      } else {
        dados[c.key] = ''
      }
    })

    // Verificar se a linha está completamente vazia
    const hasAnyValue = Object.values(dados).some(v => v !== '')
    if (!hasAnyValue) return

    // Validar campos obrigatórios
    const erros: string[] = []
    requiredKeys.forEach(k => {
      if (!dados[k]?.trim()) {
        const col = cols.find(c => c.key === k)
        erros.push(`Campo obrigatório ausente: ${col?.header ?? k}`)
      }
    })

    rows.push({
      linha:  rowNum,
      dados,
      erros,
      valido: erros.length === 0,
    })
  })

  return rows
}
