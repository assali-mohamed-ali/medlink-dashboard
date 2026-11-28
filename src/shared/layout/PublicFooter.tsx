import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { paths } from '@/shared/config/paths'
import './PublicFooter.css'

export default function PublicFooter() {
  return <footer className="public-footer">
    <div className="public-footer__bottom">
      <div className="public-footer__logo"><span className="public-footer__logo-icon"><Plus size={20} strokeWidth={3} aria-hidden="true" /></span><span className="public-footer__logo-text"><strong>MedLink</strong><span>Santé</span></span></div>
      <nav className="public-footer__links" aria-label="Pied de page">
        <Link to={paths.home}>Accueil</Link>
        <Link to={paths.login}>Connexion</Link>
        <Link to={paths.forgotPassword}>Mot de passe oublié</Link>
      </nav>
      <p>MedLink · Réseau de cliniques</p>
    </div>
  </footer>
}
