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
    <div className={styles.box}>
      <p className={styles.title} aria-hidden="true">
        Votre nouveau mot de passe doit contenir :
      </p>
      <ul id={id} className={styles.list} aria-label="Règles du mot de passe">
        {rules.map((rule) => {
          const ok = rule.test(password, email)
          return (
            <li key={rule.id} className={ok ? styles.ok : styles.todo} data-ok={ok}>
              <span className={styles.mark} aria-hidden="true">
                {ok ? <Check size={12} strokeWidth={3} /> : <X size={12} strokeWidth={3} />}
              </span>
              <span>{rule.label}</span>
              <span className="visually-hidden">{ok ? ' : respectée' : ' : à respecter'}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
