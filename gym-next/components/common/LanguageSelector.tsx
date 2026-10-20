import styles from "./LanguageSelector.module.css";

// French is the only implemented content language. No storage-based pseudo-translation.
export function LanguageSelector({className="",placement="header"}:{className?:string;placement?:"header"|"footer"}) {
 return <span className={`${styles.language} ${styles[placement]} ${className}`.trim()} data-site-language lang="fr" aria-label="Langue du site : français"><span aria-hidden="true">{placement === "footer" ? "Langue du site : Français" : "Français"}</span></span>;
}
