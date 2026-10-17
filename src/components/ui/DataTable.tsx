import { ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState, type ReactNode } from 'react'

export interface Column<Row> {
  key: string
  header: string
  align?: 'left' | 'right'
  width?: string
  sortable?: boolean
  sortValue?: (row: Row) => string | number
  render: (row: Row) => ReactNode
}

export function DataTable<Row>({
  columns,
  rows,
  rowKey,
  selectable = false,
  onRowClick,
  empty,
}: {
  columns: Column<Row>[]
  rows: Row[]
  rowKey: (row: Row) => string
  selectable?: boolean
  onRowClick?: (row: Row) => void
  empty?: ReactNode
}) {
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null)
  const [checked, setChecked] = useState<Set<string>>(new Set())

  const sorted = sort
    ? [...rows].sort((a, b) => {
        const col = columns.find((c) => c.key === sort.key)
        const av = col?.sortValue ? col.sortValue(a) : String(a)
        const bv = col?.sortValue ? col.sortValue(b) : String(b)
        const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv))
        return sort.dir === 'asc' ? cmp : -cmp
      })
    : rows

  const allChecked = rows.length > 0 && rows.every((r) => checked.has(rowKey(r)))

  const toggleAll = () => {
    setChecked(allChecked ? new Set() : new Set(rows.map(rowKey)))
  }
  const toggle = (key: string) => {
    const next = new Set(checked)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    setChecked(next)
  }

  const clickable = !!onRowClick

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-line">
            {selectable ? (
              <th className="w-10 px-4 py-2.5">
                <input
                  type="checkbox"
                  aria-label="Select all rows"
                  checked={allChecked}
                  onChange={toggleAll}
                  className="h-3.5 w-3.5 accent-primary"
                />
              </th>
            ) : null}
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                style={col.width ? { width: col.width } : undefined}
                className={`px-4 py-2.5 text-[12px] font-medium text-ink-3 ${col.align === 'right' ? 'text-right' : ''}`}
              >
                {col.sortable ? (
                  <button
                    type="button"
                    onClick={() =>
                      setSort(
                        sort?.key === col.key
                          ? sort.dir === 'asc'
                            ? { key: col.key, dir: 'desc' }
                            : null
                          : { key: col.key, dir: 'asc' },
                      )
                    }
                    className={`inline-flex items-center gap-1 font-medium text-ink-3 hover:text-ink-2 ${col.align === 'right' ? 'flex-row-reverse' : ''}`}
                  >
                    {col.header}
                    <ArrowUpDown aria-hidden className="h-3 w-3" />
                  </button>
                ) : (
                  col.header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => {
            const key = rowKey(row)
            return (
              <tr
                key={key}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`border-b border-line last:border-0 transition-colors hover:bg-sunken ${clickable ? 'cursor-pointer' : ''}`}
              >
                {selectable ? (
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      aria-label={`Select row ${key}`}
                      checked={checked.has(key)}
                      onChange={() => toggle(key)}
                      className="h-3.5 w-3.5 accent-primary"
                    />
                  </td>
                ) : null}
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-3 text-[13px] text-ink-2 ${col.align === 'right' ? 'tnum text-right' : ''}`}
                  >
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
      {sorted.length === 0 && empty ? empty : null}
    </div>
  )
}

export function PaginationFooter({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(total, page * pageSize)
  return (
    <div className="flex items-center justify-between border-t border-line px-4 py-3">
      <p className="text-[12px] text-ink-3">
        Showing <span className="tnum">{from}–{to}</span> of <span className="tnum">{total}</span>
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label="Previous page"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="flex h-7 w-7 items-center justify-center rounded-control text-ink-3 hover:bg-sunken hover:text-ink-2 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft aria-hidden className="h-4 w-4" />
        </button>
        {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
          <button
            key={p}
            type="button"
            aria-label={`Page ${p}`}
            aria-current={p === page ? 'page' : undefined}
            onClick={() => onPageChange(p)}
            className={`tnum h-7 min-w-7 rounded-control px-1.5 text-[13px] font-medium transition-colors ${
              p === page ? 'bg-primary-soft text-[#1e40af]' : 'text-ink-3 hover:bg-sunken hover:text-ink-2'
            }`}
          >
            {p}
          </button>
        ))}
        <button
          type="button"
          aria-label="Next page"
          disabled={page >= pages}
          onClick={() => onPageChange(page + 1)}
          className="flex h-7 w-7 items-center justify-center rounded-control text-ink-3 hover:bg-sunken hover:text-ink-2 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronRight aria-hidden className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
