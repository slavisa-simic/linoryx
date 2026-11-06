import { Icon } from '../Icon'

export const pageSize = 8

interface Props {
  page: number
  total: number
  label: string
  onPageChange(page: number): void
}

export function TablePagination({ page, total, label, onPageChange }: Props) {
  const pages = Math.ceil(total / pageSize)
  let start = 0
  let displayedPage = 0
  if (total > 0) {
    start = page * pageSize + 1
    displayedPage = page + 1
  }
  const end = Math.min((page + 1) * pageSize, total)

  return (
    <footer className="table-pagination">
      <span aria-live="polite">{start}-{end} of {total} {label}</span>
      <div>
        <button className="icon-button" type="button" disabled={page === 0}
          aria-label={'Previous page of ' + label} onClick={() => onPageChange(page - 1)}>
          <Icon name="chevron-left" size={17} />
        </button>
        <span>{displayedPage} / {pages}</span>
        <button className="icon-button" type="button" disabled={page >= pages - 1}
          aria-label={'Next page of ' + label} onClick={() => onPageChange(page + 1)}>
          <Icon name="chevron-right" size={17} />
        </button>
      </div>
    </footer>
  )
}
