import { appTabItems, navigateToTab } from './appTabs';

describe('appTabs', () => {
  it('puts two tabs on each side of "+" and marks the active one', () => {
    const items = appTabItems('statement');
    expect(items.map(item => item.id)).toEqual(['home', 'transactions', 'add', 'statement', 'profile']);
    expect(items.filter(item => item.active).map(item => item.id)).toEqual(['statement']);
  });

  it.each([
    ['home', ['Home']],
    ['transactions', ['Transactions']],
    ['add', ['AddExpense', { type: 'expense' }]],
    ['statement', ['Statement']],
    ['profile', ['Profile']],
  ])('%s navigates to %j', (id, args) => {
    const navigate = jest.fn();
    navigateToTab({ navigate } as never, id);
    expect(navigate).toHaveBeenCalledWith(...args);
  });
});
