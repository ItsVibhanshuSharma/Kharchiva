import { NativeModules, Platform } from 'react-native';
import { generatePDF } from 'react-native-html-to-pdf';
import Share from 'react-native-share';
import type { LedgerTransaction } from '../../database/models/transaction';
import { formatShortDate } from '../../utils/dates';
import { dateForExpenseInput } from '../../screens/expenses/expenseInputUtils';
import { buildStatementHtml } from './statementHtml';
import { rangeFileName, rangeTitle, type DateRange } from './statementRange';

export type StatementPdf = {
  /** App-private temp file (cache dir). */
  filePath: string;
  base64: string;
  /** Without extension, e.g. "Kharchiva-Statement-2026-10". */
  fileName: string;
  title: string;
};

type StatementFilesModule = {
  /** Resolves the content:// URI of the saved file. */
  saveToDownloads(sourcePath: string, displayName: string): Promise<string>;
  openFile(uri: string): Promise<void>;
};

/** Builds the PDF on the phone. Nothing leaves the device until the user saves or shares it. */
export async function createStatementPdf(
  range: DateRange,
  transactions: LedgerTransaction[],
  userName?: string,
): Promise<StatementPdf> {
  const html = buildStatementHtml(range, transactions, formatShortDate(dateForExpenseInput(new Date())), userName);
  const fileName = rangeFileName(range);
  // No `directory`: the file goes to the cache dir, which the share library is allowed to read.
  const result = await generatePDF({ html, fileName, base64: true, width: 595, height: 842, padding: 24 });
  if (!result.filePath || !result.base64) throw new Error('PDF was not created');
  return { filePath: result.filePath, base64: result.base64, fileName, title: rangeTitle(range) };
}

export function canSaveToDownloads(): boolean {
  return Platform.OS === 'android' && Boolean(NativeModules.KharchivaStatementFiles);
}

function filesModule(): StatementFilesModule {
  const module = NativeModules.KharchivaStatementFiles as StatementFilesModule | undefined;
  if (!module) throw new Error('UNSUPPORTED');
  return module;
}

/** Saves into the phone's Downloads folder. Resolves a URI that `openSavedStatement` can open. */
export async function saveStatementToDownloads(pdf: StatementPdf): Promise<string> {
  return filesModule().saveToDownloads(pdf.filePath, `${pdf.fileName}.pdf`);
}

/** Opens a statement saved by `saveStatementToDownloads` in the phone's PDF viewer. */
export async function openSavedStatement(uri: string): Promise<void> {
  return filesModule().openFile(uri);
}

/**
 * Opens the share sheet (WhatsApp, Drive, email…). Shared as base64 so the share library
 * writes a cleanly named copy into its own allowed folder; sharing the cache file path
 * directly failed with a null URI on Android.
 */
export async function shareStatementPdf(pdf: StatementPdf): Promise<void> {
  await Share.open({
    url: `data:application/pdf;base64,${pdf.base64}`,
    filename: pdf.fileName,
    type: 'application/pdf',
    title: `Kharchiva statement ${pdf.title}`,
    useInternalStorage: true,
    failOnCancel: false,
  });
}
