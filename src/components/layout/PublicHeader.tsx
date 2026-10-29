import { Link } from 'react-router-dom'
import { Plus, User } from 'lucide-react'
import './PublicHeader.css'

export type PublicHeaderVariant = 'home' | 'login' | 'signup'

type PublicHeaderProps = {
  variant?: PublicHeaderVariant
}

export default function PublicHeader({ variant = 'home' }: PublicHeaderProps) {
  const showMarketingNav = variant === 'home'

  return (
    <header className="public-header">
      <div className="public-header__inner">
        <div className="public-header__left">
          <Link to="/" className="public-header__brand">
            <span className="public-header__brand-icon" aria-hidden="true">
              <Plus size={22} strokeWidth={3} />
            </span>
            <span className="public-header__brand-text">
              <strong>MedLink</strong>
              <span>Santé</span>
            </span>
          </Link>

          {showMarketingNav && (
            <nav className="public-header__nav" aria-label="Navigation principale">
              <a href="#cliniques">Nos Cliniques</a>
              <a href="#pourquoi">Spécialités</a>
              <a href="#inscription">Téléconsultation</a>
              <a href="#urgence">Urgence &amp; Contact</a>
            </nav>
          )}
        </div>

        <div className="public-header__actions">
          {variant !== 'login' && (
            <Link
              to="/connexion"
              className={
                variant === 'signup'
                  ? 'public-header__btn public-header__btn--primary'
                  : 'public-header__btn public-header__btn--text'
              }
            >
              Se connecter
            </Link>
          )}
          {variant !== 'signup' && (
            <Link
              to="/inscription"
              className={
                variant === 'login'
                  ? 'public-header__btn public-header__btn--primary'
                  : 'public-header__btn public-header__btn--primary public-header__btn--sm'
              }
            >
              Créer un compte
            </Link>
          )}
          {variant === 'home' && (
            <span className="public-header__avatar" aria-hidden="true">
              <User size={16} />
            </span>
          )}
        </div>
      </div>
    </header>
  )
}
