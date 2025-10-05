import { REASON_LABELS } from '../config.js';

const REASON_TEMPLATES = {
  en: {
    SPAM: 'Repeated spamming in text or voice channels despite prior warnings',
    HARASS: 'Targeted insults and harassment of members',
    NSFW: 'Sharing inappropriate NSFW material in unsuitable channels',
    ALT: 'Using alternative accounts to evade punishments',
    D0X: 'Sharing personal information of others (doxxing)',
  },
  de: {
    SPAM: 'Mehrfaches Spamming in Text- oder Voice-Kanälen trotz Verwarnungen',
    HARASS: 'Gezielte Beleidigungen und Belästigung von Mitgliedern',
    NSFW: 'Veröffentlichung unangemessener NSFW-Inhalte in ungeeigneten Kanälen',
    ALT: 'Nutzung von Alt-Accounts zur Umgehung von Strafen',
    D0X: 'Veröffentlichung persönlicher Daten (Doxxing)',
  },
};

export function composeReasonText(codes = [], customReason = '', lang = 'en') {
  const language = lang === 'de' ? 'de' : 'en';
  const templates = REASON_TEMPLATES[language];
  const labels = REASON_LABELS[language] ?? {};

  const uniqueCodes = Array.from(new Set(Array.isArray(codes) ? codes : []));
  const sentences = [];

  for (const code of uniqueCodes) {
    if (templates[code]) {
      sentences.push(templates[code]);
    } else if (labels[code]) {
      sentences.push(labels[code]);
    }
  }

  let text = '';

  if (sentences.length === 1) {
    text = `${sentences[0]}.`;
  } else if (sentences.length > 1) {
    const last = sentences.pop();
    const joinWord = language === 'de' ? ' und ' : ' and ';
    text = `${sentences.join(', ')}${joinWord}${last}.`;
  }

  const custom = typeof customReason === 'string' ? customReason.trim() : '';
  if (custom) {
    const suffix = custom.endsWith('.') ? custom : `${custom}.`;
    text = text ? `${text} ${suffix}` : suffix;
  }

  if (!text) {
    const fallback = labels.CUSTOM ?? 'Custom reason';
    return fallback;
  }

  return text;
}
