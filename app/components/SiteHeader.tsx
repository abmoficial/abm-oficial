import styles from './SiteHeader.module.css';

type Props = {
  showStories?: boolean;
  showImpact?: boolean;
  showGallery?: boolean;
  showProjects?: boolean;
};

export default function SiteHeader({
  showStories = true,
  showImpact = true,
  showGallery = false,
  showProjects = false,
}: Props) {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <a className={styles.brand} href="/" aria-label="Associação Beneficiente Manancial — página inicial">
          <img className={styles.logo} src="/logo-oficial-abm.png" alt="Logo oficial da associação" width="66" height="66" />
          <span className={styles.brandDivider} aria-hidden="true" />
          <span className={styles.brandText}>
            <span className={styles.brandSmall}>Associação Beneficiente</span>
            <span className={styles.brandLarge}>Manancial</span>
            <span className={styles.brandAccent} aria-hidden="true" />
          </span>
        </a>

        <nav className={styles.desktopNav} aria-label="Navegação principal">
          {showStories && <a href="/#historias">Histórias</a>}
          {showImpact && <a href="/#impacto">Impacto</a>}
          {showGallery && <a href="/#galeria">Galeria</a>}
          {showProjects && <a href="/#projetos">Projetos</a>}
          <a href="/#doar">Doar</a>
          <a href="/loja">Lojinha</a>
        </nav>

        <a className={styles.donateButton} href="/#doar">
          <span className={styles.heart} aria-hidden="true">♡</span>
          <span>Quero doar</span>
        </a>

        <details className={styles.mobileMenu}>
          <summary aria-label="Abrir menu de navegação"><span /><span /><span /></summary>
          <nav className={styles.mobileNav} aria-label="Menu mobile">
            {showStories && <a href="/#historias">Histórias</a>}
            {showImpact && <a href="/#impacto">Impacto</a>}
            {showGallery && <a href="/#galeria">Galeria</a>}
            {showProjects && <a href="/#projetos">Projetos</a>}
            <a href="/#doar">Doar</a>
            <a href="/loja">Lojinha</a>
          </nav>
        </details>
      </div>
    </header>
  );
}
