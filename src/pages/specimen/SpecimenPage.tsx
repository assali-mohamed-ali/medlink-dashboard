import '@fontsource-variable/plus-jakarta-sans/wght.css'
import '@fontsource-variable/geist/wght.css'
import '@fontsource/instrument-serif/400.css'
import '@fontsource/instrument-serif/400-italic.css'
import {
  CalendarDays,
  FileText,
  House,
  LifeBuoy,
  Mail,
  MessageSquare,
  ShieldCheck,
} from 'lucide-react'
import { useId, useState, type CSSProperties, type ReactNode } from 'react'
import { Avatar, AvatarFallback } from '@/shared/components/ui/avatar'
import Badge12 from '@/shared/components/watermelon/badge-12'
import Badge13 from '@/shared/components/watermelon/badge-13'
import Badge15 from '@/shared/components/watermelon/badge-15'
import { Alert, Button, PasswordField, TextField } from '@/shared/ui'
import { NEUTRALS, contrastChecks, neutralVars, type NeutralSet } from './neutrals'
import styles from './SpecimenPage.module.css'

/**
 * UI refresh step B0 (docs/ui-refresh/PLAN.md §5): a dev-only page (`npm run dev`, then /__specimen) where the team
 * picks the type pairing (D1) and agrees the greys (D2) on real MedLink screens. Never in a production build
 * (routes.tsx). The fonts are imported here only, so nothing else downloads them.
 */

const PAIRINGS = {
  a: { name: 'Option A', fonts: 'Plus Jakarta Sans + Instrument Serif', sans: 'Plus Jakarta Sans' },
  b: { name: 'Option B', fonts: 'Geist + Instrument Serif', sans: 'Geist' },
} as const
type Pairing = keyof typeof PAIRINGS

const SANS: Record<Pairing, string> = {
  a: "'Plus Jakarta Sans Variable', system-ui, sans-serif",
  b: "'Geist Variable', system-ui, sans-serif",
}

function fontVars(pairing: Pairing) {
  return { '--font': SANS[pairing], '--font-display': "'Instrument Serif', Georgia, serif" } as CSSProperties
}

/** French typography: a non-breaking space before : ; ? ! » and after «, so they never start a line. */
function fr(text: string) {
  return text.replace(/ ([:;?!»])/g, ' $1').replace(/« /g, '« ')
}

const TYPE_SCALE = [
  ['--display-lg', 'clamp(40–56 px) · 1.1', styles.displayLg, 'Votre santé, entre de bonnes mains.'],
  ['--display-sm', '36 / 40', styles.displaySm, 'Bienvenue sur MedLink'],
  ['--text-3xl', '30 / 36', styles.text3xl, 'Espace patient'],
  ['--text-2xl', '24 / 32', styles.text2xl, 'Vos rendez-vous'],
  ['--text-xl', '20 / 28', styles.textXl, 'Prochain rendez-vous'],
  ['--text-lg', '18 / 28', styles.textLg, 'Retrouvez vos soignants et vos documents au même endroit.'],
  ['--text-md', '16 / 24', styles.textMd, 'Arrivez dix minutes avant votre rendez-vous.'],
  ['--text-sm', '14 / 20', styles.textSm, 'Modifiable jusqu’à 24 heures avant.'],
  ['--text-xs', '12 / 16', styles.textXs, 'CONFIRMÉ · 14 NOV.'],
] as const

function Section({ title, intro, children }: { title: string; intro?: ReactNode; children: ReactNode }) {
  const id = useId()
  return (
    <section className={styles.section} aria-labelledby={id}>
      <h2 id={id} className={styles.sectionTitle}>
        {title}
      </h2>
      {intro && <p className={styles.sectionIntro}>{intro}</p>}
      {children}
    </section>
  )
}

function Toggle({ pressed, onClick, children }: { pressed: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" className={styles.toggle} aria-pressed={pressed} onClick={onClick}>
      {children}
    </button>
  )
}

/** One pairing on the same text: what D1 compares. */
function PairingSample({ pairing }: { pairing: Pairing }) {
  const id = useId()
  const { name, fonts } = PAIRINGS[pairing]
  return (
    <section className={styles.pairing} style={fontVars(pairing)} aria-labelledby={id}>
      <h3 id={id} className={styles.eyebrow}>
        {name}
      </h3>
      <p className={styles.pairingFonts}>{fonts}</p>
      <p className={styles.displayLg}>Votre santé, entre de bonnes mains.</p>
      <p className={styles.textLg}>
        Prenez rendez-vous avec les soignants de nos trois cliniques, retrouvez vos documents et échangez avec votre
        médecin, au même endroit.
      </p>
      <hr className={styles.rule} />
      <p className={styles.textXl}>Prochain rendez-vous</p>
      <p className={styles.textMd}>
        {fr(
          'Jeudi 14 novembre à 09:30, Dr Amel Ben Salah, cardiologie. Arrivez dix minutes avant : l’accueil vérifie votre carte. Un empêchement ? Prévenez-nous !',
        )}
      </p>
      <dl className={styles.facts}>
        <div>
          <dt>Graisses</dt>
          <dd>
            <span className={styles.w400}>Texte 400</span> · <span className={styles.w500}>Libellé 500</span> ·{' '}
            <span className={styles.w600}>Titre 600</span>
          </dd>
        </div>
        <div>
          <dt>Chiffres tabulaires</dt>
          <dd className={styles.tabular}>
            08:15 · 09:30 · 11:05 · 14:40
            <br />
            1 248 · 0 375 · 7 111
          </dd>
        </div>
        <div>
          <dt>Chiffres proportionnels</dt>
          <dd>
            08:15 · 09:30 · 11:05 · 14:40
            <br />
            1 248 · 0 375 · 7 111
          </dd>
        </div>
        <div>
          <dt>Accents</dt>
          <dd>{fr('À é è ê ë î ï ô œ ù û ü ç · ÉCOLE, ÇA, ŒIL · « Bonjour ! »')}</dd>
        </div>
      </dl>
    </section>
  )
}

function SampleNote() {
  return <p className={styles.sampleNote}>Exemple · données fictives</p>
}

export default function SpecimenPage() {
  const [pairing, setPairing] = useState<Pairing>('a')
  const [greys, setGreys] = useState<NeutralSet>('proposed')
  const checks = contrastChecks(NEUTRALS[greys])

  return (
    <div className={styles.root} style={{ ...neutralVars(NEUTRALS[greys]), ...fontVars(pairing) }}>
      <header className={styles.top}>
        <div className={styles.topInner}>
          <div>
            <p className={styles.eyebrow}>Outil de développement · refonte de l’interface, étape B0</p>
            <h1 className={styles.title}>Spécimen de l’interface</h1>
            <p className={styles.lead}>
              {fr(
                'Deux choix à faire : la typographie (D1) et les gris (D2). Les couleurs de l’équipe ne changent pas. Cette page n’existe qu’avec npm run dev.',
              )}
            </p>
          </div>
        </div>
      </header>
      <div className={styles.bar}>
        <div className={styles.barInner}>
          <div role="toolbar" aria-label="Réglages du spécimen" className={styles.toolbar}>
            <div role="group" aria-label="Typographie" className={styles.toggleGroup}>
              {(Object.keys(PAIRINGS) as Pairing[]).map((key) => (
                <Toggle key={key} pressed={pairing === key} onClick={() => setPairing(key)}>
                  {PAIRINGS[key].name} <span className={styles.toggleDetail}>{PAIRINGS[key].sans}</span>
                </Toggle>
              ))}
            </div>
            <div role="group" aria-label="Gris" className={styles.toggleGroup}>
              <Toggle pressed={greys === 'current'} onClick={() => setGreys('current')}>
                Gris actuels
              </Toggle>
              <Toggle pressed={greys === 'proposed'} onClick={() => setGreys('proposed')}>
                Gris proposés
              </Toggle>
            </div>
          </div>
        </div>
      </div>

      <main className={styles.main}>
        <Section
          title="D1 · Les deux typographies, côte à côte"
          intro="Même texte, même taille. Le titre à empattements (Instrument Serif) ne sert qu’aux pages publiques et aux titres de connexion ; tout le reste est en linéale."
        >
          <div className={styles.pairings}>
            <PairingSample pairing="a" />
            <PairingSample pairing="b" />
          </div>
        </Section>

        <Section title="Échelle typographique" intro={`Dans l’option choisie en haut (${PAIRINGS[pairing].name}).`}>
          <table className={styles.scale}>
            <caption className="visually-hidden">Échelle typographique proposée</caption>
            <thead>
              <tr>
                <th scope="col">Jeton</th>
                <th scope="col">Taille / interligne</th>
                <th scope="col">Exemple</th>
              </tr>
            </thead>
            <tbody>
              {TYPE_SCALE.map(([token, size, className, sample]) => (
                <tr key={token}>
                  <th scope="row">
                    <code>{token}</code>
                  </th>
                  <td className={styles.tabular}>{size}</td>
                  <td className={className}>{sample}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        <Section title="Page publique">
          <div className={styles.hero}>
            <p className={styles.eyebrow}>Trois cliniques, un seul accès</p>
            <p className={styles.displayLg}>Votre santé, entre de bonnes mains.</p>
            <p className={`${styles.textLg} ${styles.heroLead}`}>
              Prenez rendez-vous, retrouvez vos documents et échangez avec vos soignants.
            </p>
            <div className={styles.actions}>
              <Button>Prendre rendez-vous</Button>
              <Button variant="secondary">Créer mon compte</Button>
            </div>
            <p className={styles.reassure}>
              <ShieldCheck size={18} aria-hidden="true" />
              Vos données de santé sont protégées et ne sont partagées qu’avec vos soignants.
            </p>
          </div>
        </Section>

        <Section
          title="Carte de connexion"
          intro="Les bords de champ et le texte d’aide sont ce que les gris (D2) changent le plus."
        >
          <div className={styles.authRow}>
            <div className={styles.card}>
              <p className={styles.displaySm}>Bienvenue sur MedLink</p>
              <p className={styles.muted}>Connectez-vous pour retrouver vos rendez-vous.</p>
              <form className={styles.form} noValidate onSubmit={(event) => event.preventDefault()}>
                <Alert tone="error">Adresse e-mail ou mot de passe incorrect.</Alert>
                <TextField
                  label={
                    <>
                      <Mail size={16} aria-hidden="true" />
                      Adresse e-mail
                    </>
                  }
                  type="email"
                  autoComplete="off"
                  placeholder="prenom.nom@exemple.tn"
                />
                <PasswordField label="Mot de passe" autoComplete="off" placeholder="Votre mot de passe" />
                <Button type="submit" fullWidth>
                  Se connecter
                </Button>
                <p className={styles.formLink}>{fr('Mot de passe oublié ?')}</p>
              </form>
            </div>
            <div className={styles.fieldStates}>
              <TextField label="Téléphone" placeholder="20 123 456" hint="8 chiffres, sans indicatif." />
              <TextField
                label="Date de naissance"
                defaultValue="31/02/1990"
                error="Indiquez une date qui existe, au format JJ/MM/AAAA."
              />
              <TextField label="Clinique" defaultValue="Choisie à l’étape suivante" disabled />
              <div className={styles.edgeCompare}>
                {(['current', 'proposed'] as const).map((set) => (
                  <div key={set} className={styles.edgeSample} style={neutralVars(NEUTRALS[set])}>
                    <p className={styles.edgeLabel}>{set === 'current' ? 'Bord actuel' : 'Bord proposé'}</p>
                    <TextField label="Nom" placeholder="Ben Salah" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Section>

        <Section
          title="Page d’un espace"
          intro="Le cadre des espaces (étape B5) : menu à gauche, titre et compte en haut. Aucune typographie de titre ici : tout en linéale, plus dense."
        >
          <div className={styles.space}>
            <aside className={styles.sidebar}>
              <p className={styles.brand}>MedLink</p>
              <ul className={styles.nav} aria-label="Menu (exemple)">
                <li className={styles.navActive} aria-current="page">
                  <House size={18} aria-hidden="true" /> Accueil
                </li>
                <li>
                  <CalendarDays size={18} aria-hidden="true" /> Rendez-vous
                </li>
                <li>
                  <FileText size={18} aria-hidden="true" /> Documents
                </li>
                <li>
                  <MessageSquare size={18} aria-hidden="true" /> Messages
                </li>
              </ul>
              <ul className={`${styles.nav} ${styles.navBottom}`} aria-label="Aide (exemple)">
                <li>
                  <LifeBuoy size={18} aria-hidden="true" /> Aide
                </li>
              </ul>
            </aside>
            <div className={styles.spaceMain}>
              <div className={styles.topbar}>
                <p className={styles.text3xl}>Bonjour Amel</p>
                <span className={styles.account}>
                  <Avatar>
                    <AvatarFallback>AB</AvatarFallback>
                  </Avatar>
                  <span>
                    Amel Ben Salah
                    <span className={styles.role}>Patiente</span>
                  </span>
                </span>
              </div>
              <SampleNote />
              <div className={styles.cards}>
                <div className={styles.card}>
                  <p className={styles.eyebrow}>Prochain rendez-vous</p>
                  <p className={`${styles.bigNumber} ${styles.tabular}`}>09:30</p>
                  <p className={styles.textMd}>Jeudi 14 novembre</p>
                  <p className={styles.muted}>Dr Karim Trabelsi · cardiologie</p>
                  <div className={styles.actions}>
                    <Button>Voir le détail</Button>
                    <Button variant="ghost">Déplacer</Button>
                  </div>
                </div>
                <div className={`${styles.card} ${styles.cardWide}`}>
                  <p className={styles.textXl}>Vos rendez-vous</p>
                  <ul className={styles.list}>
                    <li>
                      <span className={`${styles.tabular} ${styles.time}`}>14 nov. · 09:30</span>
                      <span>Dr Karim Trabelsi, cardiologie</span>
                      <Badge15 />
                    </li>
                    <li>
                      <span className={`${styles.tabular} ${styles.time}`}>21 nov. · 11:05</span>
                      <span>Dr Sonia Gharbi, dermatologie</span>
                      <Badge12 />
                    </li>
                    <li>
                      <span className={`${styles.tabular} ${styles.time}`}>02 oct. · 14:40</span>
                      <span>Dr Youssef Mansour, médecine générale</span>
                      <Badge13 />
                    </li>
                  </ul>
                </div>
                <div className={`${styles.card} ${styles.empty}`}>
                  <span className={styles.emptyIcon} aria-hidden="true">
                    <FileText size={22} />
                  </span>
                  <p className={styles.textXl}>Documents</p>
                  <p className={styles.muted}>Vos comptes rendus et ordonnances apparaîtront ici.</p>
                  <p className={styles.soon}>Bientôt disponible</p>
                </div>
              </div>
            </div>
          </div>
        </Section>

        <Section
          title="D2 · Les gris"
          intro="La page, les cartes et les champs passent d’une teinte lavande à la teinte verte de la marque. Les bords de champ deviennent assez contrastés pour être vus."
        >
          <div className={styles.swatchSets}>
            {(['current', 'proposed'] as const).map((set) => (
              <div key={set} className={styles.swatchSet}>
                <p className={styles.textXl}>{set === 'current' ? 'Actuels' : 'Proposés'}</p>
                <ul className={styles.swatches}>
                  {(
                    [
                      ['Page', 'bg'],
                      ['Carte', 'raised'],
                      ['Fond de champ', 'sunken'],
                      ['Séparateur', 'border'],
                      ['Bord de champ', 'borderStrong'],
                      ['Texte discret', 'textMuted'],
                    ] as const
                  ).map(([label, key]) => (
                    <li key={key}>
                      <span className={styles.swatch} style={{ background: NEUTRALS[set][key] }} aria-hidden="true" />
                      <span>{label}</span>
                      <code>{NEUTRALS[set][key]}</code>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <table className={styles.checks}>
            <caption className={styles.caption}>
              Contrastes des gris {greys === 'current' ? 'actuels' : 'proposés'} (WCAG 2.2)
            </caption>
            <thead>
              <tr>
                <th scope="col">Paire</th>
                <th scope="col">Rapport</th>
                <th scope="col">Minimum</th>
                <th scope="col">Résultat</th>
              </tr>
            </thead>
            <tbody>
              {checks.map((check) => {
                const pass = check.ratio >= check.min
                return (
                  <tr key={check.label}>
                    <th scope="row">
                      <span className={styles.pair} style={{ color: check.fg, background: check.bg }} aria-hidden="true">
                        Aa
                      </span>
                      {check.label}
                    </th>
                    <td className={styles.tabular}>{check.ratio.toFixed(2).replace('.', ',')}{' '}:{' '}1</td>
                    <td className={styles.tabular}>{String(check.min).replace('.', ',')}{' '}:{' '}1</td>
                    <td>{pass ? <Badge15>Conforme</Badge15> : <Badge13>Insuffisant</Badge13>}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Section>
      </main>
    </div>
  )
}
