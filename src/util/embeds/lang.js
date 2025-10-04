/*
### Zweck: Hilfsfunktion zur Spracherkennung für Interaktionen.
*/
export function detectLangFromInteraction(i) {
  const locale = i?.locale ?? i?.guild?.preferredLocale ?? 'en';
  const normalised = typeof locale === 'string' ? locale.toLowerCase() : 'en';
  return normalised.startsWith('de') ? 'de' : 'en';
}
