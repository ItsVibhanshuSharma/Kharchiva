import type { LanguageCode } from './languages';

type CalendarNames = {
  months: string[];
  shortMonths: string[];
  weekdays: string[];
};

const EN_MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const EN_SHORT_MONTHS = EN_MONTHS.map(name => name.slice(0, 3));
const EN_WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const split = (text: string) => text.split(',');

/** Month and weekday names per language (Sunday first). Digits stay as 0-9. */
const NAMES: Partial<Record<LanguageCode, CalendarNames>> = {
  hi: {
    months: split(
      'जनवरी,फ़रवरी,मार्च,अप्रैल,मई,जून,जुलाई,अगस्त,सितंबर,अक्टूबर,नवंबर,दिसंबर',
    ),
    shortMonths: split('जन,फ़र,मार्च,अप्रै,मई,जून,जुला,अग,सित,अक्टू,नव,दिस'),
    weekdays: split('रवि,सोम,मंगल,बुध,गुरु,शुक्र,शनि'),
  },
  pa: {
    months: split(
      'ਜਨਵਰੀ,ਫ਼ਰਵਰੀ,ਮਾਰਚ,ਅਪ੍ਰੈਲ,ਮਈ,ਜੂਨ,ਜੁਲਾਈ,ਅਗਸਤ,ਸਤੰਬਰ,ਅਕਤੂਬਰ,ਨਵੰਬਰ,ਦਸੰਬਰ',
    ),
    shortMonths: split('ਜਨ,ਫ਼ਰ,ਮਾਰਚ,ਅਪ੍ਰੈ,ਮਈ,ਜੂਨ,ਜੁਲਾ,ਅਗ,ਸਤੰ,ਅਕਤੂ,ਨਵੰ,ਦਸੰ'),
    weekdays: split('ਐਤ,ਸੋਮ,ਮੰਗਲ,ਬੁੱਧ,ਵੀਰ,ਸ਼ੁੱਕਰ,ਸ਼ਨੀ'),
  },
  gu: {
    months: split(
      'જાન્યુઆરી,ફેબ્રુઆરી,માર્ચ,એપ્રિલ,મે,જૂન,જુલાઈ,ઓગસ્ટ,સપ્ટેમ્બર,ઓક્ટોબર,નવેમ્બર,ડિસેમ્બર',
    ),
    shortMonths: split(
      'જાન્યુ,ફેબ્રુ,માર્ચ,એપ્રિ,મે,જૂન,જુલા,ઓગ,સપ્ટે,ઓક્ટો,નવે,ડિસે',
    ),
    weekdays: split('રવિ,સોમ,મંગળ,બુધ,ગુરુ,શુક્ર,શનિ'),
  },
  mr: {
    months: split(
      'जानेवारी,फेब्रुवारी,मार्च,एप्रिल,मे,जून,जुलै,ऑगस्ट,सप्टेंबर,ऑक्टोबर,नोव्हेंबर,डिसेंबर',
    ),
    shortMonths: split(
      'जाने,फेब्रु,मार्च,एप्रि,मे,जून,जुलै,ऑग,सप्टें,ऑक्टो,नोव्हें,डिसें',
    ),
    weekdays: split('रवि,सोम,मंगळ,बुध,गुरु,शुक्र,शनि'),
  },
  bn: {
    months: split(
      'জানুয়ারি,ফেব্রুয়ারি,মার্চ,এপ্রিল,মে,জুন,জুলাই,আগস্ট,সেপ্টেম্বর,অক্টোবর,নভেম্বর,ডিসেম্বর',
    ),
    shortMonths: split(
      'জানু,ফেব্রু,মার্চ,এপ্রি,মে,জুন,জুলা,আগ,সেপ্টে,অক্টো,নভে,ডিসে',
    ),
    weekdays: split('রবি,সোম,মঙ্গল,বুধ,বৃহ,শুক্র,শনি'),
  },
  ta: {
    months: split(
      'ஜனவரி,பிப்ரவரி,மார்ச்,ஏப்ரல்,மே,ஜூன்,ஜூலை,ஆகஸ்ட்,செப்டம்பர்,அக்டோபர்,நவம்பர்,டிசம்பர்',
    ),
    shortMonths: split('ஜன,பிப்,மார்,ஏப்,மே,ஜூன்,ஜூலை,ஆக,செப்,அக்,நவ,டிச'),
    weekdays: split('ஞாயி,திங்,செவ்,புத,வியா,வெள்,சனி'),
  },
  te: {
    months: split(
      'జనవరి,ఫిబ్రవరి,మార్చి,ఏప్రిల్,మే,జూన్,జూలై,ఆగస్టు,సెప్టెంబర్,అక్టోబర్,నవంబర్,డిసెంబర్',
    ),
    shortMonths: split(
      'జన,ఫిబ్ర,మార్చి,ఏప్రి,మే,జూన్,జూలై,ఆగ,సెప్టె,అక్టో,నవం,డిసెం',
    ),
    weekdays: split('ఆది,సోమ,మంగళ,బుధ,గురు,శుక్ర,శని'),
  },
  kn: {
    months: split(
      'ಜನವರಿ,ಫೆಬ್ರವರಿ,ಮಾರ್ಚ್,ಏಪ್ರಿಲ್,ಮೇ,ಜೂನ್,ಜುಲೈ,ಆಗಸ್ಟ್,ಸೆಪ್ಟೆಂಬರ್,ಅಕ್ಟೋಬರ್,ನವೆಂಬರ್,ಡಿಸೆಂಬರ್',
    ),
    shortMonths: split(
      'ಜನ,ಫೆಬ್ರ,ಮಾರ್ಚ್,ಏಪ್ರಿ,ಮೇ,ಜೂನ್,ಜುಲೈ,ಆಗ,ಸೆಪ್ಟೆ,ಅಕ್ಟೋ,ನವೆಂ,ಡಿಸೆಂ',
    ),
    weekdays: split('ಭಾನು,ಸೋಮ,ಮಂಗಳ,ಬುಧ,ಗುರು,ಶುಕ್ರ,ಶನಿ'),
  },
  ml: {
    months: split(
      'ജനുവരി,ഫെബ്രുവരി,മാർച്ച്,ഏപ്രിൽ,മേയ്,ജൂൺ,ജൂലൈ,ഓഗസ്റ്റ്,സെപ്റ്റംബർ,ഒക്ടോബർ,നവംബർ,ഡിസംബർ',
    ),
    shortMonths: split(
      'ജനു,ഫെബ്രു,മാർച്ച്,ഏപ്രി,മേയ്,ജൂൺ,ജൂലൈ,ഓഗ,സെപ്റ്റ,ഒക്ടോ,നവം,ഡിസം',
    ),
    weekdays: split('ഞായർ,തിങ്കൾ,ചൊവ്വ,ബുധൻ,വ്യാഴം,വെള്ളി,ശനി'),
  },
};

/**
 * Swaps English month and weekday names inside a date text ("Mon, 16 Nov", "10 Sep 2026",
 * "November 2026") for the language's own. Other text is left untouched.
 */
export function localizeDates(language: LanguageCode, text: string): string {
  const names = NAMES[language];
  if (!names) return text;
  return text.replace(
    /\b(January|February|March|April|June|July|August|September|October|November|December|May|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Sun|Mon|Tue|Wed|Thu|Fri|Sat)\b/g,
    (word: string) => {
      const full = EN_MONTHS.indexOf(word);
      if (full >= 0) return names.months[full];
      const short = EN_SHORT_MONTHS.indexOf(word);
      if (short >= 0) return names.shortMonths[short];
      const day = EN_WEEKDAYS.indexOf(word);
      return day >= 0 ? names.weekdays[day] : word;
    },
  );
}
