import { Check, X } from 'lucide-react'
import type { PasswordRule } from '../passwordRules'
import styles from './PasswordRules.module.css'

type PasswordRulesProps = {
  id: string
  rules: PasswordRule[]
  password: string
  email: string
}

/**
 * The password rules as a live checklist: each line says whether the typed password meets it, by an icon and by
 * text for screen readers (never by colour alone). It is help: the API's own message wins (PASSWORD_POLICY).
 */
export default function PasswordRules({ id, rules, password, email }: PasswordRulesProps) {
  return (
    <ul id={id} className={styles.list} aria-label="Règles du mot de passe">
      {rules.map((rule) => {
        const ok = rule.test(password, email)
        return (
          <li key={rule.id} className={ok ? styles.ok : styles.todo} data-ok={ok}>
            {ok ? <Check size={16} aria-hidden="true" /> : <X size={16} aria-hidden="true" />}
            <span>{rule.label}</span>
            <span className="visually-hidden">{ok ? ' : respectée' : ' : à respecter'}</span>
          </li>
        )
      })}
    </ul>
  )
}
