import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { KeyRound, Search, ShieldCheck, ShieldOff, UserCog, UserPlus, Users } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '@/features/auth'
import StatusBadge from '@/shared/components/StatusBadge'
import UserAvatar from '@/shared/components/UserAvatar'
import { messageFor } from '@/shared/api/errors'
import { Alert, Button, EmptyState, Skeleton } from '@/shared/ui'
import { PAGE_SIZE, fetchAccounts, forcePasswordReset, setAccountEnabled } from '../api'
import ConfirmDialog from '../components/ConfirmDialog'
import CreateAccountDialog from '../components/CreateAccountDialog'
import RoleDialog from '../components/RoleDialog'
import { ROLE_LABELS } from '../components/roleLabels'
import type { Account, AccountPage } from '../types'
import styles from '../accounts.module.css'

type Query = { search: string; page: number; attempt: number }

/** How long the typing must pause before the list is asked again: one request per search, not one per letter. */
const SEARCH_PAUSE_MS = 300

/** The agenda's pastel tones, one per role (tokens --clinic-N-container). */
const ROLE_TONES = { PRACTITIONER: '1', ADMINISTRATIVE_STAFF: '3', PATIENT: '2' } as const
type Notice = { tone: 'success' | 'error'; text: string }
type Open =
  | { kind: 'create' }
  | { kind: 'role'; account: Account }
  | { kind: 'disable' | 'enable' | 'reset'; account: Account }
  | null

const fullName = (account: Account) => `${account.firstName} ${account.lastName}`

function Status({ account }: { account: Account }) {
  if (!account.enabled) return <StatusBadge tone="danger">Désactivé</StatusBadge>
  if (!account.emailVerified) return <StatusBadge tone="warning">Activation en attente</StatusBadge>
  return <StatusBadge tone="success">Actif</StatusBadge>
}

function Role({ account }: { account: Account }) {
  if (account.ambiguousRole || !account.role) return <StatusBadge tone="warning">Rôle à corriger</StatusBadge>
  return (
    <span className={styles.role} data-tone={ROLE_TONES[account.role]}>
      {ROLE_LABELS[account.role]}
    </span>
  )
}

/**
 * MLink-73 (20.5): where the administrative staff manage every account. The list, a search and pages; "Nouveau
 * compte"; on each row, change the role, enable or disable (after a confirmation), force a password change. After
 * each action the page is read again and a short message says what happened.
 */
export default function AccountsPage() {
  const titleId = useId()
  const searchId = useId()
  const { user } = useAuth()
  const [typed, setTyped] = useState('')
  const [query, setQuery] = useState<Query>({ search: '', page: 0, attempt: 0 })
  const [data, setData] = useState<AccountPage | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)
  // "?nouveau" (the staff home's "Nouveau compte"): the page opens with the new account dialog
  const [params] = useSearchParams()
  const [open, setOpen] = useState<Open>(() => (params.has('nouveau') ? { kind: 'create' } : null))
  const requestRef = useRef(0)

  useEffect(() => {
    const request = ++requestRef.current
    fetchAccounts(query.search, query.page).then(
      (page) => {
        if (request !== requestRef.current) return
        setData(page)
        setLoadError(null)
      },
      (error) => request === requestRef.current && setLoadError(messageFor(error)),
    )
  }, [query])

  /** Reads the current page again (the rows stay on screen meanwhile). */
  const reload = () => setQuery((current) => ({ ...current, attempt: current.attempt + 1 }))

  /** A new search starts from the first page; the same text changes nothing. */
  function applySearch(text: string) {
    const search = text.trim()
    setQuery((current) => (current.search === search ? current : { search, page: 0, attempt: current.attempt + 1 }))
  }

  // The list follows the field as the person types, once the typing pauses
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const search = typed.trim()
      setQuery((current) => (current.search === search ? current : { search, page: 0, attempt: current.attempt + 1 }))
    }, SEARCH_PAUSE_MS)
    return () => window.clearTimeout(timer)
  }, [typed])

  function search(event: FormEvent<HTMLFormElement>) {
    // Enter applies the search at once
    event.preventDefault()
    applySearch(typed)
  }

  /** Runs a row action, closes its dialog, says what happened and, when it worked, reads the page again. */
  async function act(action: () => Promise<void>, success: string) {
    try {
      await action()
      setNotice({ tone: 'success', text: success })
      reload()
    } catch (error) {
      setNotice({ tone: 'error', text: messageFor(error) })
    } finally {
      setOpen(null)
    }
  }

  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1

  return (
    <section aria-labelledby={titleId} className={styles.page} data-width="wide">
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>
            <span className={styles.liveDot} aria-hidden="true" />
            Espace administratif
          </p>
          <h2 id={titleId} className={styles.title}>
            Gestion des comptes
          </h2>
          <p className={styles.subtitle}>Praticiens, personnel administratif et patients des trois cliniques</p>
        </div>
        {/* The agenda's yellow call to action ("Ouvrir un créneau"), the page's one main action */}
        <button type="button" className={styles.newAccount} onClick={() => setOpen({ kind: 'create' })}>
          <UserPlus size={18} aria-hidden="true" />
          Nouveau compte
        </button>
      </header>

      {notice && (
        <Alert tone={notice.tone} title={notice.tone === 'error' ? 'L’action n’a pas abouti.' : undefined}>
          {notice.text}
        </Alert>
      )}

      <div className={styles.card}>
        <div className={styles.toolbar}>
          <form role="search" className={styles.search} onSubmit={search}>
            <label htmlFor={searchId} className={styles.searchLabel}>
              Rechercher un compte
            </label>
            <div className={styles.searchBox}>
              <Search size={18} aria-hidden="true" className={styles.searchIcon} />
              <input
                id={searchId}
                type="search"
                className={styles.searchInput}
                placeholder="E-mail, nom ou prénom"
                autoComplete="off"
                value={typed}
                onChange={(event) => setTyped(event.target.value)}
              />
            </div>
          </form>
          {data && (
            <p className={styles.count} aria-live="polite">
              {data.total} compte{data.total > 1 ? 's' : ''}
            </p>
          )}
        </div>

        {loadError && !data && (
          <div className={styles.failure}>
            <Alert tone="error">{loadError}</Alert>
            <Button variant="secondary" size="sm" onClick={reload}>
              Réessayer
            </Button>
          </div>
        )}
        {!data && !loadError && <Skeleton />}
        {data && data.items.length === 0 && (
          <EmptyState icon={Users} title="Aucun compte" compact>
            Aucun compte ne correspond à votre recherche.
          </EmptyState>
        )}
        {data && data.items.length > 0 && (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <caption className={styles.caption}>Comptes, page {query.page + 1}</caption>
              <thead>
                <tr>
                  <th scope="col">E-mail</th>
                  <th scope="col">Nom</th>
                  <th scope="col">Prénom</th>
                  <th scope="col">Rôle</th>
                  <th scope="col">Statut</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((account) => {
                  const name = fullName(account)
                  return (
                    <tr key={account.id}>
                      <td>
                        <span className={styles.who}>
                          <UserAvatar firstName={account.firstName} lastName={account.lastName} size="sm" />
                          <span className={styles.email}>{account.email}</span>
                        </span>
                      </td>
                      <td>{account.lastName}</td>
                      <td>{account.firstName}</td>
                      <td>
                        <Role account={account} />
                      </td>
                      <td>
                        <Status account={account} />
                      </td>
                      <td>
                        <div className={styles.actions}>
                          {account.role !== 'PATIENT' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label={`Changer le rôle de ${name}`}
                              className={styles.action}
                              data-action="role"
                              onClick={() => setOpen({ kind: 'role', account })}
                            >
                              <UserCog size={16} aria-hidden="true" />
                              Rôle
                            </Button>
                          )}
                          {account.enabled && account.id !== user?.id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label={`Désactiver le compte de ${name}`}
                              className={styles.action}
                              data-action="disable"
                              onClick={() => setOpen({ kind: 'disable', account })}
                            >
                              <ShieldOff size={16} aria-hidden="true" />
                              Désactiver
                            </Button>
                          )}
                          {!account.enabled && (
                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label={`Activer le compte de ${name}`}
                              className={styles.action}
                              data-action="enable"
                              onClick={() => setOpen({ kind: 'enable', account })}
                            >
                              <ShieldCheck size={16} aria-hidden="true" />
                              Activer
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={`Forcer le changement de mot de passe de ${name}`}
                              className={styles.action}
                              data-action="reset"
                            onClick={() => setOpen({ kind: 'reset', account })}
                          >
                            <KeyRound size={16} aria-hidden="true" />
                            Mot de passe
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {data && data.total > 0 && (
          <nav aria-label="Pages des comptes" className={styles.pager}>
            <Button
              variant="secondary"
              size="sm"
              disabled={query.page === 0}
              onClick={() => setQuery((current) => ({ ...current, page: current.page - 1 }))}
            >
              Page précédente
            </Button>
            <span>
              Page {query.page + 1} sur {pages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={query.page + 1 >= pages}
              onClick={() => setQuery((current) => ({ ...current, page: current.page + 1 }))}
            >
              Page suivante
            </Button>
          </nav>
        )}
      </div>

      {open?.kind === 'create' && (
        <CreateAccountDialog
          onClose={() => setOpen(null)}
          onCreated={(created) => {
            setOpen(null)
            setNotice({
              tone: 'success',
              text: `Compte créé pour ${fullName(created)}. Un e-mail d’activation lui a été envoyé.`,
            })
            reload()
          }}
        />
      )}
      {open?.kind === 'role' && (
        <RoleDialog
          account={open.account}
          onClose={() => setOpen(null)}
          onChanged={(role) => {
            setOpen(null)
            setNotice({ tone: 'success', text: `Rôle de ${fullName(open.account)} changé : ${ROLE_LABELS[role]}.` })
            reload()
          }}
        />
      )}
      {open?.kind === 'disable' && (
        <ConfirmDialog
          title={`Désactiver le compte de ${fullName(open.account)} ?`}
          confirmLabel="Désactiver"
          danger
          onClose={() => setOpen(null)}
          onConfirm={() =>
            act(() => setAccountEnabled(open.account.id, false), `Le compte de ${fullName(open.account)} est désactivé.`)
          }
        >
          <p>
            {fullName(open.account)} ne pourra plus se connecter, et ses sessions en cours seront fermées. Vous pourrez
            réactiver le compte plus tard.
          </p>
        </ConfirmDialog>
      )}
      {open?.kind === 'enable' && (
        <ConfirmDialog
          title={`Activer le compte de ${fullName(open.account)} ?`}
          confirmLabel="Activer"
          onClose={() => setOpen(null)}
          onConfirm={() =>
            act(() => setAccountEnabled(open.account.id, true), `Le compte de ${fullName(open.account)} est activé.`)
          }
        >
          <p>{fullName(open.account)} pourra de nouveau se connecter.</p>
        </ConfirmDialog>
      )}
      {open?.kind === 'reset' && (
        <ConfirmDialog
          title={`Forcer le changement de mot de passe de ${fullName(open.account)} ?`}
          confirmLabel="Forcer le changement"
          onClose={() => setOpen(null)}
          onConfirm={() =>
            act(
              () => forcePasswordReset(open.account.id),
              `${fullName(open.account)} devra choisir un nouveau mot de passe à sa prochaine connexion.`,
            )
          }
        >
          <p>
            Ses sessions en cours seront fermées, et {fullName(open.account)} devra choisir un nouveau mot de passe à sa
            prochaine connexion.
          </p>
        </ConfirmDialog>
      )}
    </section>
  )
}
