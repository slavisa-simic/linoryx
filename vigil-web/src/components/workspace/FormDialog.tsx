import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { Icon } from '../Icon'

interface FormDialogProps {
  id: string
  title: string
  busy: boolean
  onClose(): void
  children: ReactNode
  wide?: boolean
}

export function FormDialog({ id, title, busy, onClose, children, wide = false }: FormDialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) {
      return
    }
    dialog.showModal()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      dialog.close()
      document.body.style.overflow = previousOverflow
    }
  }, [])

  return (
    <dialog ref={ref} id={id} className={wide ? 'incident-dialog incident-detail-modal' : 'incident-dialog service-form-dialog'}
      aria-labelledby={id + '-title'}
      onCancel={(event) => {
        event.preventDefault()
        if (!busy) onClose()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) onClose()
      }}>
      <div className="incident-dialog-content">
        <div className="incident-modal-heading">
          <h2 id={id + '-title'}>{title}</h2>
          <button className="icon-button" type="button" onClick={onClose} disabled={busy}
            aria-label={'Close ' + title.toLowerCase()}><Icon name="close" size={20} /></button>
        </div>
        {children}
      </div>
    </dialog>
  )
}
