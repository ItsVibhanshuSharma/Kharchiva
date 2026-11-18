import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Text } from '../../components/Text';
import { CategorySpendCard } from './CategorySpendCard';

jest.mock('@op-engineering/op-sqlite', () => ({ open: jest.fn() }));

describe('CategorySpendCard', () => {
  const render = (transactions: React.ComponentProps<typeof CategorySpendCard>['transactions']) => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<CategorySpendCard transactions={transactions} />);
    });
    return renderer!;
  };

  it('stays hidden with no expenses', () => {
    expect(render([{ type: 'income', category: 'Salary', amountPaise: 100 }]).toJSON()).toBeNull();
  });

  it('shows each category with its amount and share', () => {
    const renderer = render([
      { type: 'expense', category: 'Rent', amountPaise: 15_000_00 },
      { type: 'expense', category: 'Food', amountPaise: 5_000_00 },
    ]);
    const texts = renderer.root.findAllByType(Text).map(node => String(node.props.children));
    expect(texts).toEqual(expect.arrayContaining(['Kahan gaya paisa', 'Rent', '₹15,000', '75%', 'Food', '₹5,000', '25%']));
  });
});
