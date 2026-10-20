import Image from "next/image";
import { DiscoveryCoachPreview } from "./DiscoveryCoachPreview";
import Link from "next/link";
import styles from "./home-refined.module.css";
import { insights, localeColumns, locales, metrics } from "./home-data";


export function HomeBelowFoldSections() {
  return (
    <>
      <section className={styles.metricsSection} data-gym-ui="metricsSection" data-gsap-scene="metrics">
        <div className={styles.metricsGrid} data-gym-ui="metricsGrid">
          {metrics.map((metric) => (
            <div key={metric.label} className={styles.metric} data-gym-ui="metric" data-gsap-stagger>
              <strong>{metric.value}</strong><span>{metric.label}</span>
            </div>
          ))}
        </div>
      </section>
      <section className={styles.section} data-gym-ui="section" data-gsap-scene="routine" id="coach-space">
        <div className={styles.sectionHeading} data-gym-ui="sectionHeading"><h2>Construis une routine que tu peux tenir</h2></div>
        <div className={styles.insightsGrid} data-gym-ui="insightsGrid">
          {insights.map((item) => (
            <article key={`${item.value}-${item.copy}`} className={`${styles.insightCard} ${item.featured ? styles.insightCardFeatured : ""}`} data-gym-ui="insightCard" data-gsap-stagger>
              <strong>{item.value}</strong><p>{item.copy}</p>
              {item.featured ? <Link href="/compte" className={styles.insightButton} data-gym-ui="insightButton">Je suis coach</Link> : null}
            </article>
          ))}
        </div>
      </section>
      <DiscoveryCoachPreview />
      <section className={styles.recruitSection} data-gym-ui="recruitSection" data-gsap-scene="recruit">
        <div className={styles.recruitMedia} data-gym-ui="recruitMedia" data-gsap-recruit-media>
          <Image src="/images/demo-sport.svg" alt="Coach sur terrain" fill loading="lazy" sizes="(max-width: 900px) 100vw, 50vw" className={styles.cardImage} data-gym-ui="cardImage" />
        </div>
        <div className={styles.recruitCopy} data-gym-ui="recruitCopy" data-gsap-recruit-copy>
          <p className={styles.sectionKicker} data-gym-ui="sectionKicker">Professionnel</p>
          <h2>GetYourMentor recherche des profils partout en France pour digitaliser le coaching sportif</h2>
          <p>Une vitrine claire, un tunnel de réservation lisible, et une gestion du parcours qui reste premium pour les élèves comme pour les coachs.</p>
          <Link href="/compte" className={styles.darkButtonLink} data-gym-ui="darkButtonLink">Découvrir nos offres</Link>
        </div>
      </section>
      <section className={styles.section} data-gym-ui="section" data-gsap-scene="locales">
        <div className={styles.sectionHeading} data-gym-ui="sectionHeading"><h2>Des coachs pour chaque façon de progresser</h2></div>
        <div className={styles.localesGrid} data-gym-ui="localesGrid">
          {localeColumns.map((column) => (
            <article key={column.slug} className={styles.localeColumn} data-gym-ui="localeColumn" data-gsap-stagger>
              <h3>{column.title}</h3><p>{column.copy}</p>
              <div className={styles.localeLinks} data-gym-ui="localeLinks">{locales.map((city) => <Link key={`${column.slug}-${city}`} href={`/coachs?sport=${column.slug}&city=${city}`}>{city}</Link>)}</div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
