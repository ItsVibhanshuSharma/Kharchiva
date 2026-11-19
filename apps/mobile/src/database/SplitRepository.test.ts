import { balances, equalShares, ME } from '../features/split/splitMath';
import { initializeDatabase } from './initialize';
import { ListValidationError } from './repositories/CatalogRepository';
import { SQLiteSplitRepository } from './repositories/SplitRepository';
import { InMemoryFinancialDatabase } from './testing/InMemoryFinancialDatabase';

jest.mock('@op-engineering/op-sqlite', () => ({ open: jest.fn() }));

async function setup() {
  const database = new InMemoryFinancialDatabase();
  await initializeDatabase(database);
  let ids = 0;
  let clock = 0;
  return new SQLiteSplitRepository(database, {
    idFactory: () => `s-${++ids}`,
    now: () => new Date(Date.UTC(2026, 10, 19, 10, 0, clock++)),
  });
}

describe('SQLiteSplitRepository', () => {
  it('adds friends and refuses empty, long or duplicate names', async () => {
    const repository = await setup();
    const rahul = await repository.addPerson('  Rahul   Sharma ');
    expect(rahul.name).toBe('Rahul Sharma');
    expect((await repository.listPeople()).map(person => person.name)).toEqual(['Rahul Sharma']);
    await expect(repository.addPerson('   ')).rejects.toBeInstanceOf(ListValidationError);
    await expect(repository.addPerson('x'.repeat(31))).rejects.toBeInstanceOf(ListValidationError);
    await expect(repository.addPerson('rahul sharma')).rejects.toThrow('pehle se hai');
  });

  it('hides a removed friend and lets the name be used again', async () => {
    const repository = await setup();
    const amit = await repository.addPerson('Amit');
    await repository.removePerson(amit.id);
    expect(await repository.listPeople()).toEqual([]);
    await expect(repository.addPerson('Amit')).resolves.toMatchObject({ name: 'Amit' });
  });

  it('saves a split and reads it back for the expense', async () => {
    const repository = await setup();
    const rahul = await repository.addPerson('Rahul');
    const shares = equalShares(400000, [ME, rahul.id]);
    const saved = await repository.saveSplit({
      expenseId: 'e1', title: 'Dinner', date: '2026-11-19', totalPaise: 400000, paidBy: ME, method: 'EQUAL', shares,
    });
    expect(saved.id).toBe('s-2');
    const loaded = await repository.getSplitForExpense('e1');
    expect(loaded).toMatchObject({ expenseId: 'e1', title: 'Dinner', totalPaise: 400000, paidBy: ME, method: 'EQUAL', shares });
    expect(await repository.getSplitForExpense('other')).toBeNull();
  });

  it('keeps the percentages that were typed', async () => {
    const repository = await setup();
    const rahul = await repository.addPerson('Rahul');
    await repository.saveSplit({
      expenseId: 'e1', title: 'Trip', date: '2026-11-19', totalPaise: 10000, paidBy: ME, method: 'PERCENT',
      shares: [{ personId: ME, paise: 7000, percent: 70 }, { personId: rahul.id, paise: 3000, percent: 30 }],
    });
    expect((await repository.getSplitForExpense('e1'))?.shares).toEqual([
      { personId: ME, paise: 7000, percent: 70 },
      { personId: rahul.id, paise: 3000, percent: 30 },
    ]);
  });

  it('replaces the split when the same expense is saved again', async () => {
    const repository = await setup();
    const rahul = await repository.addPerson('Rahul');
    const base = { expenseId: 'e1', title: 'Dinner', date: '2026-11-19', paidBy: ME, method: 'EQUAL' as const };
    await repository.saveSplit({ ...base, totalPaise: 400000, shares: equalShares(400000, [ME, rahul.id]) });
    await repository.saveSplit({ ...base, title: 'Dinner at Taj', totalPaise: 600000, shares: equalShares(600000, [ME, rahul.id]) });
    const all = await repository.listSplits();
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ title: 'Dinner at Taj', totalPaise: 600000 });
  });

  it('refuses splits that do not add up or are missing the user', async () => {
    const repository = await setup();
    const base = { expenseId: 'e1', title: 'Dinner', date: '2026-11-19', totalPaise: 1000, paidBy: ME, method: 'EQUAL' as const };
    await expect(repository.saveSplit({ ...base, shares: [{ personId: ME, paise: 500 }, { personId: 'a', paise: 400 }] })).rejects.toThrow('Hisse jodkar');
    await expect(repository.saveSplit({ ...base, shares: [{ personId: 'a', paise: 500 }, { personId: 'b', paise: 500 }] })).rejects.toThrow('Aapka hissa');
    await expect(repository.saveSplit({ ...base, shares: [{ personId: ME, paise: 1000 }] })).rejects.toThrow('Pehle dost chuno.');
    await expect(repository.saveSplit({ ...base, date: 'today', shares: equalShares(1000, [ME, 'a']) })).rejects.toThrow('Date galat hai.');
    expect(await repository.listSplits()).toEqual([]);
  });

  it('removes the split of a deleted expense', async () => {
    const repository = await setup();
    await repository.saveSplit({
      expenseId: 'e1', title: 'Dinner', date: '2026-11-19', totalPaise: 1000, paidBy: ME, method: 'EQUAL', shares: equalShares(1000, [ME, 'a']),
    });
    await repository.removeForExpense('e1');
    await repository.removeForExpense('never-split');
    expect(await repository.listSplits()).toEqual([]);
  });

  it('records settlements and lets one be undone', async () => {
    const repository = await setup();
    const settled = await repository.addSettlement({ personId: 'a', direction: 'THEY_PAID_ME', amountPaise: 5000, date: '2026-11-19' });
    expect(await repository.listSettlements()).toEqual([expect.objectContaining({ id: settled.id, amountPaise: 5000, direction: 'THEY_PAID_ME', date: '2026-11-19' })]);
    await expect(repository.addSettlement({ personId: 'a', direction: 'THEY_PAID_ME', amountPaise: 0, date: '2026-11-19' })).rejects.toThrow('Amount daalo.');
    await repository.removeSettlement(settled.id);
    expect(await repository.listSettlements()).toEqual([]);
  });

  it('feeds the balance maths end to end', async () => {
    const repository = await setup();
    const rahul = await repository.addPerson('Rahul');
    await repository.saveSplit({
      expenseId: 'e1', title: 'Dinner', date: '2026-11-19', totalPaise: 400000, paidBy: ME, method: 'EQUAL', shares: equalShares(400000, [ME, rahul.id]),
    });
    await repository.addSettlement({ personId: rahul.id, direction: 'THEY_PAID_ME', amountPaise: 50000, date: '2026-11-20' });
    const result = balances(await repository.listSplits(), await repository.listSettlements());
    expect(result.get(rahul.id)).toBe(150000);
  });
});
