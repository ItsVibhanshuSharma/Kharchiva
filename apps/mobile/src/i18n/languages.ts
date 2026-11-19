export type LanguageCode =
  | 'en'
  | 'hi'
  | 'pa'
  | 'gu'
  | 'mr'
  | 'bn'
  | 'ta'
  | 'te'
  | 'kn'
  | 'ml';
export type LanguageInfo = {
  code: LanguageCode;
  /** Name written in the language itself, so people can find theirs. */
  nativeName: string;
  englishName: string;
};
export const DEFAULT_LANGUAGE: LanguageCode = 'en';
export const LANGUAGES: readonly LanguageInfo[] = [
  { code: 'en', nativeName: 'English', englishName: 'English' },
  { code: 'hi', nativeName: 'हिन्दी', englishName: 'Hindi' },
  { code: 'pa', nativeName: 'ਪੰਜਾਬੀ', englishName: 'Punjabi' },
  { code: 'gu', nativeName: 'ગુજરાતી', englishName: 'Gujarati' },
  { code: 'mr', nativeName: 'मराठी', englishName: 'Marathi' },
  { code: 'bn', nativeName: 'বাংলা', englishName: 'Bengali' },
  { code: 'ta', nativeName: 'தமிழ்', englishName: 'Tamil' },
  { code: 'te', nativeName: 'తెలుగు', englishName: 'Telugu' },
  { code: 'kn', nativeName: 'ಕನ್ನಡ', englishName: 'Kannada' },
  { code: 'ml', nativeName: 'മലയാളം', englishName: 'Malayalam' },
];
export const isLanguageCode = (value: unknown): value is LanguageCode =>
  LANGUAGES.some(language => language.code === value);
