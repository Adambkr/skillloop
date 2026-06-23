import { Check, ChevronDown } from 'lucide-react'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'

export type FilterOption = { value: string; label: string; hint?: string; icon?: ReactNode }

type Props = {
  label: string
  value: string
  options: FilterOption[]
  onChange: (value: string) => void
  icon?: ReactNode
  inline?: boolean
}

// Accessible, premium dropdown used for the discovery filters.
// Keyboard: Up/Down to move, Enter/Space to open & select, Escape to close.
export function FilterSelect({ label, value, options, onChange, icon, inline = false }: Props) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const listId = useId()
  const current = options.find(o => o.value === value) || options[0]

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  function openMenu() { setActive(Math.max(0, options.findIndex(o => o.value === value))); setOpen(true) }
  function choose(next: string) { onChange(next); setOpen(false) }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { setOpen(false); return }
    if (!open && (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown')) { e.preventDefault(); openMenu(); return }
    if (!open) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(i => Math.min(options.length - 1, i + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(i => Math.max(0, i - 1)) }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(options[active].value) }
  }

  return (
    <div className={`filter-select${inline ? ' inline' : ''}${open ? ' open' : ''}`} ref={rootRef}>
      {!inline && <span className="filter-select-label">{label}</span>}
      <button
        type="button"
        className="filter-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${label}: ${current?.label || ''}`}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={onKeyDown}
      >
        {icon && <i className="filter-select-icon">{icon}</i>}
        {inline && <span className="filter-select-prefix">{label}</span>}
        <span className="filter-select-value">{current?.label}</span>
        <ChevronDown className="filter-select-caret" />
      </button>
      {open && (
        <ul className="filter-select-menu" role="listbox" id={listId} aria-label={label}>
          {options.map((option, index) => (
            <li
              key={option.value}
              role="option"
              aria-selected={option.value === value}
              className={`${option.value === value ? 'selected' : ''}${index === active ? ' active' : ''}`}
              onMouseEnter={() => setActive(index)}
              onMouseDown={e => { e.preventDefault(); choose(option.value) }}
            >
              {option.icon && <i className="filter-option-icon">{option.icon}</i>}
              <span className="filter-option-text">
                <strong>{option.label}</strong>
                {option.hint && <small>{option.hint}</small>}
              </span>
              {option.value === value && <Check className="filter-option-check" />}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
