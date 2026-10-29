import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import TextField from './TextField'
import type { TextFieldProps } from './TextField'
import styles from './PasswordField.module.css'

/** A TextField for passwords with a show/hide toggle. Same props as TextField (except `type`). */
export default function PasswordField(props: Omit<TextFieldProps, 'type' | 'endAdornment'>) {
  const [visible, setVisible] = useState(false)
  return (
    <TextField
      {...props}
      type={visible ? 'text' : 'password'}
      endAdornment={
        <button
          type="button"
          className={styles.toggle}
          onClick={() => setVisible((shown) => !shown)}
          aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          aria-pressed={visible}
        >
          {visible ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
        </button>
      }
    />
  )
}
