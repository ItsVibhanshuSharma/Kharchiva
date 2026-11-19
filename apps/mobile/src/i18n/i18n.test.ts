import { LANGUAGES } from './languages';
import { translate } from './i18n';

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

  it('fills {name} placeholders', () => {
    expect(translate('en', 'Hello {name}', { name: 'Asha' })).toBe(
      'Hello Asha',
    );
  });
});
