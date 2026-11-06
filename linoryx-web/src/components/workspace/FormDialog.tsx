import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { Icon } from '../Icon'
import '../../dialogs.css'

interface FormDialogProps {
  id: string
  title: string
  busy: boolean
  onClose(): void
  children: ReactNode
  wide?: boolean
  reference?: string
  description?: ReactNode
  footer?: ReactNode
}

export function FormDialog({ id, title, busy, onClose, children, wide = false, reference, description, footer }: FormDialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) {
      return
    }
    dialog.showModal()
    dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus()
    return () => {
      dialog.close()
    }
  }, [])

  return (
    <dialog ref={ref} id={id} className={'form-dialog' + (wide ? ' form-dialog-wide' : '')}
      aria-labelledby={(reference ? id + '-reference ' : '') + id + '-title'}
      aria-describedby={description ? id + '-description' : undefined}
      onCancel={(event) => {
        event.preventDefault()
        event.stopPropagation()
        if (!busy) onClose()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) onClose()
      }}>
      <div className="dialog-layout">
        <header className="dialog-header">
          <div className="dialog-heading">
            {reference && <span id={id + '-reference'} className="dialog-reference">{reference}</span>}
            <h2 id={id + '-title'}>{title}</h2>
            {description && <p id={id + '-description'} className="dialog-description">{description}</p>}
          </div>
          <button className="icon-button" type="button" onClick={onClose} disabled={busy}
            aria-label={'Close ' + title.toLowerCase()}><Icon name="close" size={20} /></button>
        </header>
        <div className="dialog-body" tabIndex={0} role="region" aria-label={title + ' content'}>{children}</div>
        {footer && <footer className="dialog-footer">{footer}</footer>}
      </div>
    </dialog>
  )
}
