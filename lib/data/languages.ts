export interface Language {
  code: string;
  name: string;
  native: string;
  /** spoken in Kenya — grouped first in pickers */
  kenyan?: boolean;
  /** BCP-47 tag for speech recognition / synthesis */
  speech?: string;
  /** Local Kenyan language served by the Tembea phrasebook (no public MT engine yet) */
  local?: boolean;
  /** MyMemory language code */
  mt?: string;
}

export const LANGUAGES: Language[] = [
  { code: "en", name: "English", native: "English", speech: "en-GB", mt: "en" },
  { code: "sw", name: "Swahili", native: "Kiswahili", kenyan: true, speech: "sw-KE", mt: "sw" },
  { code: "ki", name: "Kikuyu", native: "Gĩkũyũ", kenyan: true, local: true, speech: "sw-KE" },
  { code: "luo", name: "Luo", native: "Dholuo", kenyan: true, local: true, speech: "sw-KE" },
  { code: "mas", name: "Maasai", native: "Maa", kenyan: true, local: true, speech: "sw-KE" },
  { code: "kln", name: "Kalenjin", native: "Kalenjin", kenyan: true, local: true, speech: "sw-KE" },
  { code: "fr", name: "French", native: "Français", speech: "fr-FR", mt: "fr" },
  { code: "de", name: "German", native: "Deutsch", speech: "de-DE", mt: "de" },
  { code: "es", name: "Spanish", native: "Español", speech: "es-ES", mt: "es" },
  { code: "it", name: "Italian", native: "Italiano", speech: "it-IT", mt: "it" },
  { code: "pt", name: "Portuguese", native: "Português", speech: "pt-PT", mt: "pt" },
  { code: "nl", name: "Dutch", native: "Nederlands", speech: "nl-NL", mt: "nl" },
  { code: "zh", name: "Chinese", native: "中文", speech: "zh-CN", mt: "zh-CN" },
  { code: "ja", name: "Japanese", native: "日本語", speech: "ja-JP", mt: "ja" },
  { code: "ar", name: "Arabic", native: "العربية", speech: "ar-SA", mt: "ar" },
  { code: "hi", name: "Hindi", native: "हिन्दी", speech: "hi-IN", mt: "hi" },
  { code: "so", name: "Somali", native: "Soomaali", speech: "so-SO", mt: "so" },
];

export const LANG_BY_CODE = Object.fromEntries(LANGUAGES.map((l) => [l.code, l])) as Record<string, Language>;

/**
 * Starter phrasebook for Kenyan languages. English is the pivot.
 * Only common, widely-attested phrases are included; entries without a confident
 * translation are left out rather than guessed. Have native speakers review before launch.
 */
export interface Phrase {
  id: string;
  en: string;
  category: "Greetings" | "Courtesy" | "Getting around" | "Food & shopping" | "Emergencies" | "Safari";
  sw?: string;
  ki?: string;
  luo?: string;
  mas?: string;
  kln?: string;
}

export const PHRASES: Phrase[] = [
  { id: "hello", en: "Hello", category: "Greetings", sw: "Jambo / Habari", ki: "Wĩ mwega?", luo: "Ere kaka idhi?", mas: "Sopa", kln: "Chamgei" },
  { id: "how-are-you", en: "How are you?", category: "Greetings", sw: "Habari yako?", ki: "Wĩ mwega?", luo: "Ere kaka idhi?" },
  { id: "im-fine", en: "I am fine", category: "Greetings", sw: "Nzuri / Niko salama", ki: "Ndĩ mwega", luo: "Adhi maber" },
  { id: "good-morning", en: "Good morning", category: "Greetings", sw: "Habari ya asubuhi", luo: "Oyawore" },
  { id: "good-evening", en: "Good afternoon / good evening", category: "Greetings", sw: "Habari ya jioni", luo: "Oimore" },
  { id: "greet-elder", en: "Greeting for an elder", category: "Greetings", sw: "Shikamoo", mas: "Takuenya" },
  { id: "welcome", en: "Welcome", category: "Greetings", sw: "Karibu" },
  { id: "goodbye", en: "Goodbye", category: "Greetings", sw: "Kwaheri", ki: "Tigwo na wega", luo: "Oriti", mas: "Sere" },
  { id: "name-q", en: "What is your name?", category: "Greetings", sw: "Jina lako nani?", ki: "Wĩtagwo atĩa?", luo: "Nyingi in ng'a?" },
  { id: "name", en: "My name is…", category: "Greetings", sw: "Jina langu ni…", ki: "Njĩtagwo…", luo: "Nyinga en…" },
  { id: "thanks", en: "Thank you", category: "Courtesy", sw: "Asante", ki: "Nĩ ngatho", luo: "Erokamano", mas: "Ashe", kln: "Kongoi" },
  { id: "thanks-much", en: "Thank you very much", category: "Courtesy", sw: "Asante sana", ki: "Nĩ ngatho mũno", luo: "Erokamano ahinya", mas: "Ashe oleng", kln: "Kongoi missing" },
  { id: "please", en: "Please", category: "Courtesy", sw: "Tafadhali" },
  { id: "yes", en: "Yes", category: "Courtesy", sw: "Ndiyo", ki: "Ĩĩ", luo: "Ee", mas: "Ee" },
  { id: "no", en: "No", category: "Courtesy", sw: "Hapana", ki: "Aca", luo: "Ooyo" },
  { id: "sorry", en: "Sorry", category: "Courtesy", sw: "Pole" },
  { id: "excuse-me", en: "Excuse me", category: "Courtesy", sw: "Samahani" },
  { id: "no-problem", en: "No problem", category: "Courtesy", sw: "Hakuna matata / Hakuna shida" },
  { id: "dont-understand", en: "I don't understand", category: "Courtesy", sw: "Sielewi" },
  { id: "slowly", en: "Slowly, please", category: "Courtesy", sw: "Pole pole, tafadhali" },
  { id: "where-toilet", en: "Where is the toilet?", category: "Getting around", sw: "Choo kiko wapi?" },
  { id: "lets-go", en: "Let's go", category: "Getting around", sw: "Twende" },
  { id: "stop-here", en: "Stop here, please", category: "Getting around", sw: "Simama hapa, tafadhali" },
  { id: "how-far", en: "How far is it?", category: "Getting around", sw: "Ni umbali gani?" },
  { id: "water", en: "Water", category: "Food & shopping", sw: "Maji", ki: "Maaĩ", luo: "Pi", mas: "Enkare", kln: "Bek" },
  { id: "food", en: "Food", category: "Food & shopping", sw: "Chakula", ki: "Irio", luo: "Chiemo", mas: "Endaa", kln: "Omitwogik" },
  { id: "milk", en: "Milk", category: "Food & shopping", sw: "Maziwa", luo: "Chak", kln: "Cheko" },
  { id: "how-much", en: "How much is this?", category: "Food & shopping", sw: "Hii ni bei gani?" },
  { id: "too-expensive", en: "That's too expensive", category: "Food & shopping", sw: "Ni ghali sana" },
  { id: "the-bill", en: "The bill, please", category: "Food & shopping", sw: "Lete bili, tafadhali" },
  { id: "delicious", en: "Delicious!", category: "Food & shopping", sw: "Kitamu sana!" },
  { id: "help", en: "I need help", category: "Emergencies", sw: "Nahitaji msaada" },
  { id: "doctor", en: "Call a doctor", category: "Emergencies", sw: "Ita daktari" },
  { id: "police", en: "Call the police", category: "Emergencies", sw: "Ita polisi" },
  { id: "lost", en: "I am lost", category: "Emergencies", sw: "Nimepotea" },
  { id: "lion", en: "Lion", category: "Safari", sw: "Simba" },
  { id: "elephant", en: "Elephant", category: "Safari", sw: "Tembo / Ndovu" },
  { id: "giraffe", en: "Giraffe", category: "Safari", sw: "Twiga" },
  { id: "cow", en: "Cow", category: "Safari", sw: "Ng'ombe", ki: "Ng'ombe", mas: "Enkiteng" },
  { id: "beautiful", en: "Beautiful", category: "Safari", sw: "Nzuri sana / Maridadi", kln: "Kararan" },
];

export const PHRASE_LANGS = ["en", "sw", "ki", "luo", "mas", "kln"] as const;
export type PhraseLang = (typeof PHRASE_LANGS)[number];
