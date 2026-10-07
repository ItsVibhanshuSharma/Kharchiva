import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {Text} from '../../components/Text';
import {ExportStatementScreen} from './ExportStatementScreen';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({navigate: mockNavigate, goBack: mockGoBack}),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({top: 0, right: 0, bottom: 0, left: 0}),
}));

describe('ExportStatementScreen', () => {
  const renderScreen = () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<ExportStatementScreen />);
    });
    if (!renderer) {
      throw new Error('Export statement screen did not render');
    }
    return renderer;
  };

  it('renders the available data, date ranges, formats and preview information', () => {
    const renderer = renderScreen();
    const labels = renderer.root.findAllByType(Text).map(item => item.props.children);
    expect(labels).toContain('Export your data');
    expect(labels).toContain('Transactions');
    expect(labels).toContain('Budgets');
    expect(labels).toContain('Recurring');
    expect(labels).toContain('DATE RANGE');
    expect(labels).toContain('CSV');
    expect(labels).toContain('XLSX');
    expect(labels).toContain('PDF');
    expect(labels).toContain('Export Preview');
  });

  it('changes the selected format and opens Profile from the header', () => {
    const renderer = renderScreen();
    const pdf = renderer.root.findByProps({accessibilityLabel: 'PDF .pdf'});
    ReactTestRenderer.act(() => pdf.props.onPress());
    expect(renderer.root.findByProps({accessibilityLabel: 'Export September 2026 statement (PDF)'})).toBeTruthy();

    mockNavigate.mockClear();
    ReactTestRenderer.act(() => renderer.root.findByProps({accessibilityLabel: 'Open Profile'}).props.onPress());
    expect(mockNavigate).toHaveBeenCalledWith('Profile');
  });
});
