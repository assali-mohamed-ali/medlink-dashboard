export type PasswordRuleId =
  | 'length'
  | 'uppercase'
  | 'lowercase'
  | 'digit'
  | 'special'
  | 'notEmail'

export type PasswordRule = {
  id: PasswordRuleId
  label: string
  test: (password: string, email: string) => boolean
}

const SPECIAL = /[^A-Za-z0-9]/

export const PASSWORD_RULES: PasswordRule[] = [
  {
    id: 'length',
    label: '12 caractères ou plus',
    test: (password) => password.length >= 12,
  },
  {
    id: 'uppercase',
    label: 'Une majuscule',
    test: (password) => /[A-Z]/.test(password),
  },
  {
    id: 'lowercase',
    label: 'Une minuscule',
    test: (password) => /[a-z]/.test(password),
  },
  {
    id: 'digit',
    label: 'Un chiffre',
    test: (password) => /\d/.test(password),
  },
  {
    id: 'special',
    label: 'Un caractère spécial',
    test: (password) => SPECIAL.test(password),
  },
  {
    id: 'notEmail',
    label: 'Différent de l’adresse e-mail',
    test: (password, email) => {
      const trimmed = email.trim().toLowerCase()
      if (!password || !trimmed) return false
      return password.toLowerCase() !== trimmed
    },
  },
]

export function evaluatePasswordRules(password: string, email: string) {
  return PASSWORD_RULES.map((rule) => ({
    id: rule.id,
    label: rule.label,
    ok: rule.test(password, email),
  }))
}

export function allPasswordRulesPass(password: string, email: string) {
  return PASSWORD_RULES.every((rule) => rule.test(password, email))
}
