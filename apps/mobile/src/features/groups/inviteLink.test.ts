import { buildInviteLink, parseInviteCode, parseInviteLink } from './inviteLink';

describe('invite links', () => {
  it('round-trips a code through the https link', () => {
    expect(parseInviteCode(buildInviteLink('abc123XYZ_-9'))).toBe('abc123XYZ_-9');
  });

  it('accepts the app scheme, a pasted message line and a bare code', () => {
    expect(parseInviteCode('kharchiva://join/abc123XYZ')).toBe('abc123XYZ');
    expect(parseInviteCode('  abc123XYZ  ')).toBe('abc123XYZ');
  });

  it('rejects things that are not invite codes', () => {
    expect(parseInviteCode('')).toBeNull();
    expect(parseInviteCode('hi')).toBeNull();
    expect(parseInviteCode('https://example.com/other/abc123XYZ')).toBeNull();
  });
});

describe('parseInviteLink', () => {
  it('only accepts links for our own host or scheme', () => {
    expect(parseInviteLink(buildInviteLink('abc123XYZ'))).toBe('abc123XYZ');
    expect(parseInviteLink('kharchiva://join/abc123XYZ')).toBe('abc123XYZ');
    expect(parseInviteLink('https://evil.example/join/abc123XYZ')).toBeNull();
    expect(parseInviteLink('abc123XYZ')).toBeNull();
  });
});
