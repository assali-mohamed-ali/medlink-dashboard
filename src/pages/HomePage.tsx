import { Link } from 'react-router-dom'
import PublicHeader from '@/shared/layout/PublicHeader'
import { paths } from '@/shared/config/paths'
import {
  ArrowRight,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Download,
  Lock,
  MapPin,
  Phone,
  Plus,
  Search,
  ShieldCheck,
  AlertCircle,
  Stethoscope,
  ThumbsUp,
  User,
} from 'lucide-react'
import './HomePage.css'
import clinicBaie from '@/assets/home/clinic-baie.jpg'
import clinicBergesDuLac from '@/assets/home/clinic-berges-du-lac.jpg'
import clinicSud from '@/assets/home/clinic-sud.jpg'
import heroImg from '@/assets/home/hero.jpg'

// Self-hosted (MLink-128): no request to a third party from a health portal, and the CSP stays 'self'
const HERO_IMG = heroImg

const CLINIC_IMGS = [clinicBergesDuLac, clinicBaie, clinicSud]

const clinics = [
  {
    city: 'Tunis • Berges du Lac II',
    name: 'Clinique Les Berges du Lac',
    address: "Rue de l'Île de Rhodes, Les Berges du Lac II, 1053 Tunis",
    specialties: [
      'Chirurgie Cardiovasculaire',
      'Oncologie Intégrée',
      'Neurochirurgie',
      'IRM 3 Tesla',
    ],
    phone: '+216 71 800 900',
    cta: 'Prendre RDV sur le site de Tunis',
    image: CLINIC_IMGS[0],
  },
  {
    city: 'Sousse • Zone Touristique',
    name: 'Clinique de la Baie',
    address: 'Boulevard 14 Janvier, Kantaoui, 4089 Sousse',
    specialties: [
      'Orthopédie & Traumatologie',
      'Maternité & PMA',
      'Ophtalmologie Laser',
      'Scanner 128 Coupes',
    ],
    phone: '+216 73 300 400',
    cta: 'Prendre RDV sur le site de Sousse',
    image: CLINIC_IMGS[1],
  },
  {
    city: 'Sfax • Route de Téniour',
    name: 'Polyclinique du Sud',
    address: 'Km 1.5 Route de Téniour, 3002 Sfax',
    specialties: [
      'Néphrologie & Dialyse',
      'Urologie & Lithotripsie',
      'Gastro-Entérologie',
      'Laboratoire H24',
    ],
    phone: '+216 74 400 500',
    cta: 'Prendre RDV sur le site de Sfax',
    image: CLINIC_IMGS[2],
  },
]

const whyCards = [
  {
    badge: 'Parcours Synchronisé',
    title: 'Coordination multi-sites',
    icon: Stethoscope,
    body: "Vos antécédents, bilans et imageries sont instantanément consultables par les équipes autorisées à Tunis, Sousse et Sfax. Plus besoin de répéter des examens coûteux ou inutiles lors d'un déplacement ou d'une évacuation inter-clinique.",
    link: 'Dossier unifié MedLink',
  },
  {
    badge: 'Accès Continu 24/7',
    title: 'Résultats & Imagerie instantanés',
    icon: Download,
    body: "Téléchargez vos comptes-rendus biologiques, clichés d'imagerie haute résolution (DICOM) et ordonnances numérisées dès leur validation par le praticien. Partagez-les d'un clic avec le médecin de votre choix.",
    link: 'Portail Patient & Mobiles',
  },
  {
    badge: 'Normes Médicales Strictes',
    title: 'Sécurité & Confidentialité maximale',
    icon: ShieldCheck,
    body: "Hébergement agréé Données de Santé (HDS), chiffrement de bout en bout et stricte conformité aux exigences de l'INPDP et du RGPD. Seuls vous et les soignants désignés pouvez délivrer/ouvrir vos informations cliniques.",
    link: 'Certification INPDP Validée',
  },
]

const metrics = [
  {
    icon: Stethoscope,
    label: 'Agrément National',
    value: '40+',
    detail: 'Spécialistes conventionnés',
    sub: 'Professeurs et praticiens hospitaliers référents',
  },
  {
    icon: Building2,
    label: 'Tunis • Sousse • Sfax',
    value: '3',
    detail: 'Pôles cliniques certifiés',
    sub: 'Blocs opératoires ISO 7 & urgences continues',
  },
  {
    icon: Lock,
    label: '100% Sécurisé',
    value: '24/7',
    detail: 'Dossier médical accessible',
    sub: 'Analyses et imagerie téléchargeables instantanément',
  },
  {
    icon: ThumbsUp,
    label: 'Avis Vérifiés',
    value: '98.4%',
    detail: 'Indice de satisfaction',
    sub: 'Sur plus de 18 500 patients suivis en 2024',
  },
]

export default function HomePage() {
  return (
    <div className="home">
      <PublicHeader variant="home" />

      <main className="home__main">
        <section className="home__hero">
          <div className="home__glow" aria-hidden="true" />
          <div className="home__badge">
            <span className="home__badge-dot" />
            <span className="home__badge-primary">
              Réseau Hospitalier Agréé • Tunisie
            </span>
            <span className="home__badge-sep">•</span>
            <span className="home__badge-secondary">Hébergement Santé Sécurisé</span>
          </div>

          <h1 className="home__title">
            L&apos;excellence médicale et le parcours de soin connecté pour toute
            la Tunisie.
          </h1>
          <p className="home__subtitle">
            Prenez rendez-vous en ligne, consultez vos résultats d&apos;analyses et
            téléchargez vos ordonnances dans nos cliniques de Tunis, Sousse et Sfax
            en toute sérénité.
          </p>

          <div className="home__ctas">
            <div className="home__cta-block">
              <Link to={paths.signup} className="home__btn-primary">
                <User size={18} aria-hidden="true" />
                Créer un compte patient
              </Link>
              <span className="home__cta-hint">
                <ShieldCheck size={14} aria-hidden="true" />
                Inscription rapide et gratuite en 2 minutes
              </span>
            </div>
            <a href="#cliniques" className="home__btn-outline">
              Prendre un rendez-vous
            </a>
          </div>

          <form
            className="home__search"
            role="search"
            aria-label="Rechercher un rendez-vous"
            onSubmit={(e) => {
              e.preventDefault()
              const el = document.getElementById('cliniques')
              el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }}
          >
            <div className="home__search-fields">
              <label className="home__search-field">
                <span className="home__search-label">
                  <Stethoscope size={14} aria-hidden="true" />
                  Médecin ou spécialité
                </span>
                <input
                  type="search"
                  name="q"
                  className="home__search-input"
                  placeholder="Ex: Cardiologue, Dr. Ben Salah, Pédiatrie…"
                  autoComplete="off"
                />
              </label>

              <label className="home__search-field">
                <span className="home__search-label">
                  <Building2 size={14} aria-hidden="true" />
                  Établissement &amp; pôle
                </span>
                <select name="site" className="home__search-select" defaultValue="">
                  <option value="">Tous les établissements (3 sites)</option>
                  <option value="tunis">Tunis — Berges du Lac</option>
                  <option value="sousse">Sousse — Kantaoui</option>
                  <option value="sfax">Sfax — El Medina</option>
                </select>
              </label>

              <label className="home__search-field">
                <span className="home__search-label">
                  <Calendar size={14} aria-hidden="true" />
                  Disponibilité
                </span>
                <select name="when" className="home__search-select" defaultValue="">
                  <option value="">Peu importe la date</option>
                  <option value="today">Aujourd&apos;hui</option>
                  <option value="week">Cette semaine</option>
                  <option value="month">Ce mois-ci</option>
                </select>
              </label>

              <button type="submit" className="home__search-submit">
                <Search size={18} aria-hidden="true" />
                Rechercher
              </button>
            </div>

            <div className="home__search-quick">
              <span className="home__search-quick-label">Accès immédiat :</span>
              <div className="home__search-chips" role="list">
                <button type="button" className="home__search-chip" role="listitem">
                  Cardiologie
                </button>
                <button type="button" className="home__search-chip" role="listitem">
                  Oncologie
                </button>
                <button type="button" className="home__search-chip" role="listitem">
                  Pédiatrie &amp; Maternité
                </button>
                <button type="button" className="home__search-chip" role="listitem">
                  Scanner &amp; IRM 3T
                </button>
                <button type="button" className="home__search-chip" role="listitem">
                  Téléconsultation
                </button>
              </div>
            </div>
          </form>

          <div className="home__mosaic">
            <div className="home__hero-card">
              <img
                src={HERO_IMG}
                alt="Équipe médicale MedLink en consultation"
                className="home__hero-img"
                width={512}
                height={279}
                fetchPriority="high"
              />
              <div className="home__hero-overlay">
                <span className="home__hero-tag">Plateforme Médicale Inter-Régionale</span>
                <h2>
                  Des soins coordonnés, du diagnostic au suivi post-opératoire.
                </h2>
                <p>
                  Chaque patient dispose d&apos;un dossier clinique unique et
                  sécurisé, partagé en temps réel avec son équipe médicale
                  référente.
                </p>
              </div>
            </div>

            <div className="home__metrics">
              {metrics.map((m) => (
                <article key={m.value + m.label} className="home__metric">
                  <div className="home__metric-head">
                    <span className="home__metric-icon" aria-hidden="true">
                      <m.icon size={18} />
                    </span>
                    <span className="home__metric-label">{m.label}</span>
                  </div>
                  <p className="home__metric-value">{m.value}</p>
                  <p className="home__metric-detail">{m.detail}</p>
                  <p className="home__metric-sub">{m.sub}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="home__why" id="pourquoi">
          <p className="home__eyebrow">Un nouveau standard de soin</p>
          <h2 className="home__section-title">
            Pourquoi choisir le réseau MedLink pour votre santé&nbsp;?
          </h2>
          <p className="home__section-sub">
            Une infrastructure interconnectée pensée pour supprimer les pertes de
            temps, les démarches redondantes et les retards de diagnostic.
          </p>

          <div className="home__why-grid">
            {whyCards.map((card) => (
              <article key={card.title} className="home__why-card">
                <span className="home__why-badge">{card.badge}</span>
                <span className="home__why-icon" aria-hidden="true">
                  <card.icon size={22} />
                </span>
                <h3>{card.title}</h3>
                <p>{card.body}</p>
                <a href="#inscription" className="home__why-link">
                  {card.link}
                  <ArrowRight size={16} aria-hidden="true" />
                </a>
              </article>
            ))}
          </div>
        </section>

        <section className="home__clinics" id="cliniques">
          <div className="home__clinics-head">
            <div>
              <p className="home__eyebrow home__eyebrow--row">
                <Building2 size={16} aria-hidden="true" />
                Infrastructure Territoriale
              </p>
              <h2 className="home__section-title">Nos 3 Cliniques d&apos;Excellence</h2>
              <p className="home__section-sub home__section-sub--left">
                Des plateaux médico-chirurgicaux de pointe répartis sur les
                bassins de vie stratégiques de Tunisie.
              </p>
            </div>
            <a href="#cliniques" className="home__link-arrow">
              Comparer les plateaux techniques
              <ArrowRight size={16} aria-hidden="true" />
            </a>
          </div>

          <div className="home__clinics-grid">
            {clinics.map((c) => (
              <article key={c.name} className="home__clinic">
                <div className="home__clinic-img-wrap">
                  <img src={c.image} alt={c.name} className="home__clinic-img" width={512} height={279} loading="lazy" decoding="async" />
                  <span className="home__clinic-city">{c.city}</span>
                  <span className="home__clinic-urg">
                    <AlertCircle size={12} aria-hidden="true" />
                    Urgences 24/7
                  </span>
                </div>
                <div className="home__clinic-body">
                  <h3>{c.name}</h3>
                  <p className="home__clinic-addr">
                    <MapPin size={14} aria-hidden="true" />
                    {c.address}
                  </p>
                  <p className="home__clinic-poles">Pôles d&apos;expertise prioritaires :</p>
                  <ul className="home__clinic-tags">
                    {c.specialties.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                  <div className="home__clinic-phone">
                    <span>Ligne Garde & Urgences :</span>
                    <a href={`tel:${c.phone.replace(/\s/g, '')}`}>
                      <Phone size={14} aria-hidden="true" />
                      {c.phone}
                    </a>
                  </div>
                  <a href="#inscription" className="home__clinic-cta">
                    {c.cta}
                    <ChevronRight size={16} aria-hidden="true" />
                  </a>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="home__banner" id="inscription">
          <div className="home__banner-inner">
            <div className="home__banner-copy">
              <span className="home__banner-tag">
                Espace Santé Patient Crypté & Gratuit
              </span>
              <h2>Votre santé mérite un suivi fluide, rapide et centralisé.</h2>
              <p>
                Ouvrez votre compte en 2 minutes pour réserver vos consultations,
                recevoir vos rappels par SMS et archiver vos ordonnances en toute
                confidentialité.
              </p>
              <ul className="home__banner-checks">
                <li>
                  <CheckCircle2 size={18} aria-hidden="true" />
                  Rappels de consultation automatiques
                </li>
                <li>
                  <CheckCircle2 size={18} aria-hidden="true" />
                  Télétransmission des ordonnances
                </li>
                <li>
                  <CheckCircle2 size={18} aria-hidden="true" />
                  Accès gratuit sans abonnement
                </li>
              </ul>
            </div>
            <div className="home__banner-actions">
              <Link to={paths.signup} className="home__btn-yellow">
                Créer mon compte patient gratuitement
              </Link>
              <Link to={paths.login} className="home__btn-ghost">
                Accéder à mon espace sécurisé
              </Link>
              <Link to={paths.login} className="home__banner-prac">
                Vous êtes médecin conventionné ? Accès au portail praticien
              </Link>
            </div>
          </div>
        </section>

        <div className="home__emergency-wrap" id="urgence">
          <div className="home__emergency">
            <div className="home__emergency-left">
              <span className="home__emergency-icon" aria-hidden="true">
                <AlertCircle size={20} />
              </span>
              <div>
                <h4>Besoin d&apos;une prise en charge immédiate&nbsp;?</h4>
                <p>
                  Nos services de réanimation et de garde d&apos;urgence sont
                  opérationnels 24h/24, 7j/7.
                </p>
              </div>
            </div>
            <a href="tel:+21671800900" className="home__btn-emergency">
              <Phone size={16} aria-hidden="true" />
              Appeler le SAMU ou MedLink : +216 71 800 900
            </a>
          </div>
        </div>
      </main>

      <footer className="home__footer">
        <div className="home__footer-grid">
          <div className="home__footer-brand">
            <div className="home__brand home__brand--footer">
              <span className="home__brand-icon" aria-hidden="true">
                <Plus size={20} strokeWidth={3} />
              </span>
              <span className="home__brand-text">
                <strong>MedLink</strong>
                <span>Santé</span>
              </span>
            </div>
            <p>
              Réseau de soins connecté et coordonné, garantissant un suivi médical
              humanisé, fluide et sécurisé pour chaque patient.
            </p>
            <span className="home__footer-cert">
              <ShieldCheck size={14} aria-hidden="true" />
              Certification HDS & Sécurité Santé
            </span>
          </div>

          <div>
            <h4>Nos Réseaux Cliniques</h4>
            <ul>
              <li>
                Clinique Hannibal & Les Berges • <strong>Tunis</strong>
              </li>
              <li>
                Clinique Méditerranéenne • <strong>Sousse</strong>
              </li>
              <li>
                Pôle Médico-Chirurgical • <strong>Sfax</strong>
              </li>
              <li className="home__footer-muted">
                Plateaux techniques agréés & urgences continues
              </li>
            </ul>
          </div>

          <div>
            <h4>Assistance & Permanence</h4>
            <p className="home__footer-urgent">
              <AlertCircle size={16} aria-hidden="true" />
              Service d&apos;Urgence 24/7 : 190 / +216 71 000 112
            </p>
            <p className="home__footer-muted">
              Téléconsultation de garde active tous les jours, dimanches et
              fériés inclus.
            </p>
          </div>

          <div>
            <h4>Conformité Réglementaire</h4>
            <p className="home__footer-muted">
              Traitements conformes aux directives de l&apos;INPDP (Instance
              Nationale de Protection des Données Personnelles) et aux standards
              RGPD de confidentialité médicale.
            </p>
            <span className="home__footer-cert">
              <Lock size={14} aria-hidden="true" />
              Données de santé cryptées de bout en bout
            </span>
          </div>
        </div>

        <div className="home__footer-bottom">
          <p>© 2025 MedLink Santé Tunisie. Tous droits réservés.</p>
          <div className="home__footer-links">
            <a href="#">Mentions Légales</a>
            <a href="#">Politique de Confidentialité</a>
            <a href="#">Charte des Patients</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
