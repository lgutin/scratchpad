import styles from "./TopNav.module.css";
import {
  StLogoSymbol,
  StLogoWord,
  TopManageSearch,
  TopHelp,
  TopMarketplace,
  TopSettings,
  TopAccount,
  SearchFieldIcon,
  ChevronDownSmall,
} from "./officeNav";

/**
 * ServiceTitan (Anvil2) office web-app global top nav: logo, centered global search
 * field, and the right-side utility icon cluster. Fixed 48px tall, white with a hairline
 * bottom border. Fluid full-width (no device frame).
 */
export function TopNav() {
  return (
    <header className={styles.bar}>
      <div className={styles.logo}>
        <StLogoSymbol />
        <StLogoWord />
      </div>

      <div className={styles.search}>
        <div className={styles.searchLeft}>
          <span className={styles.searchIcon}>
            <SearchFieldIcon />
          </span>
          <span className={styles.searchPlaceholder}>Search</span>
        </div>
        <div className={styles.shortcut}>
          <span className={styles.key}>CTRL</span>
          <span className={styles.plus}>+</span>
          <span className={styles.key}>/</span>
        </div>
      </div>

      <div className={styles.utilities}>
        <button className={styles.iconBtn} aria-label="Saved searches">
          <TopManageSearch />
        </button>
        <button className={styles.iconBtn} aria-label="Help">
          <TopHelp />
        </button>
        <button className={styles.iconBtn} aria-label="Marketplace">
          <TopMarketplace />
        </button>
        <button className={styles.iconBtn} aria-label="Settings">
          <TopSettings />
        </button>
        <button className={styles.account} aria-label="Account">
          <span className={styles.accountGlyph}>
            <TopAccount />
          </span>
          <span className={styles.accountChevron}>
            <ChevronDownSmall />
          </span>
        </button>
      </div>
    </header>
  );
}
