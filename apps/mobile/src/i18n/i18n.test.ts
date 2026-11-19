import { LANGUAGES } from './languages';
import { translate } from './i18n';
import { ALL_STRINGS } from './strings';

describe('translate', () => {
  it('returns the English text unchanged for English', () => {
    expect(translate('en', 'Profile')).toBe('Profile');
  });

  it('translates known text into every non-English language', () => {
    for (const { code } of LANGUAGES.filter(item => item.code !== 'en')) {
      const result = translate(code, 'Profile');
      expect(result).not.toBe('Profile');
      expect(result.length).toBeGreaterThan(0);
    }
    expect(translate('hi', 'Profile')).toBe('प्रोफ़ाइल');
    expect(translate('pa', 'Home')).toBe('ਹੋਮ');
  });

  it('falls back to the original text when there is no translation', () => {
    expect(translate('gu', 'Some text nobody translated')).toBe(
      'Some text nobody translated',
    );
  });

  it('keeps the same {placeholders} in every translation', () => {
    const markers = (text: string) =>
      (text.match(/\{\w+\}/g) ?? []).sort().join(',');
    for (const [key, entry] of Object.entries(ALL_STRINGS)) {
      for (const [code, text] of Object.entries(entry)) {
        expect([key, code, markers(text)]).toEqual([key, code, markers(key)]);
      }
    }
  });

  it('translates month and weekday names inside dates', () => {
    expect(translate('hi', 'Mon, 16 Nov')).toBe('सोम, 16 नव');
    expect(translate('mr', 'November 2026')).toBe('नोव्हेंबर 2026');
    expect(translate('en', 'Mon, 16 Nov')).toBe('Mon, 16 Nov');
  });

  it('translates categories and filled messages together', () => {
    expect(translate('gu', 'Rent')).toBe('ભાડું');
    expect(translate('hi', '{n} din ka hisaab baaki', { n: 3 })).toBe(
      '3 दिन का हिसाब बाकी',
    );
  });

  it('fills {name} placeholders', () => {
    expect(translate('en', 'Hello {name}', { name: 'Asha' })).toBe(
      'Hello Asha',
    );
  });
});
