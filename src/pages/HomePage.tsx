import { ArrowRight, CalendarDays, Check, FlaskConical, FolderOpen, Lock, Plus, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import { roleHome, useAuth } from '@/features/auth'
import { paths } from '@/shared/config/paths'
import styles from './HomePage.module.css'

const services = [
  { icon: CalendarDays, title: 'Gérer mes rendez-vous', description: 'Consultez, reportez ou annulez vos réservations.', to: paths.patient.appointments },
  { icon: FlaskConical, title: 'Consulter mes résultats', description: 'Retrouvez les résultats transmis par vos praticiens.', to: paths.patient.results },
  { icon: FolderOpen, title: 'Mes documents médicaux', description: 'Accédez à vos documents et comptes-rendus.', to: paths.patient.documents },
] as const

const steps = [
  ['Accédez à votre compte', 'Connectez-vous ou créez un compte si l’inscription est disponible.'],
  ['Choisissez votre consultation', 'Sélectionnez une spécialité, un praticien, une clinique et un créneau libre.'],
  ['Confirmez votre rendez-vous', 'Vérifiez les détails avant de réserver et retrouvez votre confirmation dans votre espace.'],
] as const

const questions = [
  ['Ai-je besoin d’un compte pour réserver ?', 'Oui, votre compte permet de réserver et de retrouver vos rendez-vous.'],
  ['Comment reporter ou annuler un rendez-vous ?', 'Connectez-vous à votre espace patient, ouvrez le rendez-vous concerné et choisissez une action disponible.'],
  ['Où retrouver mes documents et résultats ?', 'Les informations mises à votre disposition sont consultables depuis votre espace patient après connexion.'],
  ['MedLink est-il un service d’urgence ?', 'Non. En cas d’urgence médicale, contactez les services d’urgence ou votre établissement de santé.'],
] as const

function Brand() {
  return <Link to={paths.home} className={styles.brand} aria-label="MedLink, accueil"><span className={styles.mark}><Plus size={25} strokeWidth={2.6} aria-hidden="true" /></span>MedLink</Link>
}

/** Decorative example only, never represents a real appointment, practitioner or availability. */
function BookingIllustration() {
  return (
    <div className={styles.visual} aria-hidden="true">
      <span className={styles.figureCaption}>ILLUSTRATION DU PARCOURS</span>
      <div className={styles.calendar}>
        <div className={styles.calendarHead}><span><CalendarDays size={20} /></span><div>Choisissez votre date<small>Décembre</small></div></div>
        <div className={styles.calendarGrid}>
          {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, i) => <span className={styles.weekday} key={i}>{day}</span>)}
          {Array.from({ length: 35 }, (_, i) => <span key={i} className={i === 9 ? styles.picked : i === 0 || i > 31 ? styles.other : [3, 5, 8, 12, 16, 18, 23].includes(i) ? styles.available : undefined}>{i === 0 ? 30 : i > 31 ? i - 31 : i}</span>)}
        </div>
      </div>
      <div className={styles.ticket}><span className={styles.tick}><Check size={22} /></span><div><strong>Rendez-vous confirmé</strong><small>Retrouvez-le dans votre espace patient.</small></div></div>
    </div>
  )
}

export default function HomePage() {
  const { user } = useAuth()
  const ownSpace = user ? roleHome(user.roles) : paths.login
  // For anonymous visitors use the existing protected routes: RequireAuth saves the destination.
  // A professional already signed in goes to their own space rather than an inaccessible patient page.
  const patientDestination = (to: string) => user && user.roles[0] !== 'PATIENT' ? ownSpace : to
  const account = user ? ownSpace : paths.signup
  const accountLabel = user ? 'Mon espace' : 'Créer un compte'
  return (
    <div className={styles.home}>
      <a className={styles.skip} href="#contenu-public">Aller au contenu</a>
      <header className={styles.header}>
        <div className={styles.wrap}>
          <Brand />
          <nav className={styles.nav} aria-label="Navigation publique">
            <a href="#services">Services patients</a><a href="#guide">Comment ça marche</a><a href="#aide">Aide</a>
          </nav>
          <div className={styles.account}>
            {!user && <Link to={account} className={styles.textLink}>{accountLabel}</Link>}
            <Link to={ownSpace} className={`${styles.button} ${styles.outline}`}><UserRound size={18} aria-hidden="true" />{user ? 'Mon espace' : 'Se connecter'}</Link>
          </div>
        </div>
      </header>
      <main id="contenu-public" tabIndex={-1}>
        <section className={styles.hero}>
          <div className={styles.wrap}>
            <div>
              <p className={styles.eyebrow}>Votre santé, vos rendez-vous</p>
              <h1>Vos soins commencent <em>ici.</em></h1>
              <p className={styles.lead}>Trouvez un praticien dans votre réseau de cliniques, réservez une consultation et retrouvez vos informations médicales au même endroit.</p>
              <div className={styles.ctas}>
                <Link to={patientDestination(paths.patient.slots)} className={styles.button}>Prendre rendez-vous <ArrowRight size={20} aria-hidden="true" /></Link>
                <Link to={account} className={`${styles.button} ${styles.outline}`}>{user ? 'Mon espace' : 'Créer mon compte'}</Link>
              </div>
              <p className={styles.note}><Lock size={16} aria-hidden="true" />{user ? 'Retrouvez les services disponibles dans votre espace.' : 'Connectez-vous à votre espace patient pour réserver.'}</p>
            </div>
            <BookingIllustration />
          </div>
        </section>
        <section id="services" className={styles.services} aria-labelledby="services-title">
          <div className={styles.wrap}>
            <div className={styles.sectionHead}><h2 id="services-title">Votre espace patient, au quotidien</h2><p>Accédez directement aux services dont vous avez besoin.</p></div>
            <div className={styles.cards}>
              {services.map(({ icon: Icon, title, description, to }) => <Link key={to} to={patientDestination(to)} className={styles.service}><span className={styles.cardTop}><span className={styles.cardIcon}><Icon size={22} aria-hidden="true" /></span><ArrowRight size={20} aria-hidden="true" /></span><span className={styles.cardCopy}><strong>{title}</strong><small>{description}</small></span></Link>)}
            </div>
          </div>
        </section>
        <section id="guide" className={styles.steps} aria-labelledby="guide-title">
          <div className={styles.wrap}>
            <div className={styles.intro}><p className={styles.eyebrow}>Première visite ?</p><h2 id="guide-title">Un rendez-vous en trois étapes.</h2><p>Vous gardez la main sur le choix de votre praticien et de votre créneau.</p><Link to={account} className={styles.textLink}>{user ? 'Accéder à mon espace' : 'Créer mon compte patient'} <ArrowRight size={18} aria-hidden="true" /></Link></div>
            <ol className={styles.stepList}>{steps.map(([title, description], i) => <li key={title}><span className={styles.number} aria-hidden="true">0{i + 1}</span><div><h3>{title}</h3><p>{description}</p></div></li>)}</ol>
          </div>
        </section>
        <section className={styles.access} aria-labelledby="professional-title">
          <div className={styles.wrap}><div className={styles.accessInner}><div><h2 id="professional-title">Vous êtes praticien ou membre du personnel ?</h2><p>Retrouvez votre espace de travail avec votre compte professionnel.</p></div><Link to={ownSpace} className={`${styles.button} ${styles.white}`}>Accès professionnel <ArrowRight size={18} aria-hidden="true" /></Link></div></div>
        </section>
        <section id="aide" className={styles.faq} aria-labelledby="faq-title">
          <div className={styles.wrap}><div className={styles.intro}><p className={styles.eyebrow}>Assistance</p><h2 id="faq-title">On vous accompagne.</h2><p>Une question sur votre compte ou votre rendez-vous ?</p><Link to={paths.forgotPassword} className={styles.textLink}>Mot de passe oublié ? <ArrowRight size={18} aria-hidden="true" /></Link></div><div>{questions.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div></div>
        </section>
      </main>
      <footer className={styles.footer}><div className={styles.wrap}><Brand /><nav className={styles.footLinks} aria-label="Pied de page"><Link to={ownSpace}>{user ? 'Mon espace' : 'Connexion'}</Link>{!user && <Link to={paths.signup}>Inscription</Link>}<a href="#aide">Aide</a></nav><p className={styles.footnote}>MedLink · Réseau de cliniques</p></div></footer>
    </div>
  )
}
