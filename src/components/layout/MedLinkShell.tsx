import type { ReactNode } from 'react'
import './MedLinkShell.css'

type MedLinkShellProps = {
  /** Fil d'Ariane + badge (en-tête) */
  header?: ReactNode
  /** Titre / lead au-dessus du contenu */
  intro?: ReactNode
  /** Colonne droite (optionnelle) */
  sidebar?: ReactNode
  /** Contenu principal (formulaire, etc.) */
  children: ReactNode
  /** Pied de page */
  footer?: ReactNode
  /** Mode centré (écran succès, etc.) */
  centered?: boolean
  className?: string
}

/**
 * Coque de page MedLink (fond Sage & Forest, grille 2 colonnes optionnelle).
 * Réutilisable : inscription, connexion, pages métier…
 *
 * @example
 * <MedLinkShell sidebar={<SignupSidebar />} header={...} intro={...}>
 *   <MonFormulaire />
 * </MedLinkShell>
 */
export default function MedLinkShell({
  header,
  intro,
  sidebar,
  children,
  footer,
  centered = false,
  className = '',
}: MedLinkShellProps) {
  return (
    <main className={`ml-shell ${centered ? 'ml-shell--centered' : ''} ${className}`.trim()}>
      <div className="ml-shell__bg" aria-hidden="true" />
      <div className={`ml-shell__inner ${centered ? 'ml-shell__inner--centered' : ''}`}>
        {header}
        {intro}
        {sidebar ? (
          <div className="ml-shell__layout">
            <div className="ml-shell__main">{children}</div>
            <aside className="ml-shell__side" aria-label="Informations">
              {sidebar}
            </aside>
          </div>
        ) : (
          children
        )}
        {footer}
      </div>
    </main>
  )
}
