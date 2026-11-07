import { AlertCircle, Lock, Plus, ShieldCheck } from 'lucide-react'
import './PublicFooter.css'

export default function PublicFooter() {
  return (
    <footer className="public-footer">
      <div className="public-footer__grid">
        <div className="public-footer__brand">
          <div className="public-footer__logo">
            <span className="public-footer__logo-icon" aria-hidden="true">
              <Plus size={20} strokeWidth={3} />
            </span>
            <span className="public-footer__logo-text">
              <strong>MedLink</strong>
              <span>Santé</span>
            </span>
          </div>
          <p>
            Réseau de soins connecté et coordonné, garantissant un suivi médical
            humanisé, fluide et sécurisé pour chaque patient.
          </p>
          <span className="public-footer__cert">
            <ShieldCheck size={14} aria-hidden="true" />
            Données de santé protégées
          </span>
        </div>

        <div>
          <h4>Nos Réseaux Cliniques</h4>
          <ul>
            <li>
              Clinique Hannibal &amp; Les Berges • <strong>Tunis</strong>
            </li>
            <li>
              Clinique Méditerranéenne • <strong>Sousse</strong>
            </li>
            <li>
              Pôle Médico-Chirurgical • <strong>Sfax</strong>
            </li>
            <li className="public-footer__muted">
              Plateaux techniques &amp; urgences continues
            </li>
          </ul>
        </div>

        <div>
          <h4>Assistance &amp; Permanence</h4>
          <p className="public-footer__urgent">
            <AlertCircle size={16} aria-hidden="true" />
            Service d&apos;Urgence 24/7 : 190 / +216 71 000 112
          </p>
          <p className="public-footer__muted">
            Téléconsultation de garde active tous les jours, dimanches et fériés
            inclus.
          </p>
        </div>

        <div>
          <h4>Conformité Réglementaire</h4>
          <p className="public-footer__muted">
            Traitements conformes aux directives de l&apos;INPDP (Instance
            Nationale de Protection des Données Personnelles).
          </p>
          <span className="public-footer__cert">
            <Lock size={14} aria-hidden="true" />
            Accès sécurisé à votre dossier
          </span>
        </div>
      </div>

      <div className="public-footer__bottom">
        <p>© 2025 MedLink Santé Tunisie. Tous droits réservés.</p>
        <div className="public-footer__links">
          <a href="#">Mentions Légales</a>
          <a href="#">Politique de Confidentialité</a>
          <a href="#">Charte des Patients</a>
        </div>
      </div>
    </footer>
  )
}