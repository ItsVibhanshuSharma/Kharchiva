import { generatePDF } from 'react-native-html-to-pdf';
import Share from 'react-native-share';
import { showSnackbar } from '../../components/snackbar';
import { dateForExpenseInput } from '../../screens/expenses/expenseInputUtils';
import { formatShortDate } from '../../utils/dates';
import { canSaveToDownloads, openSavedStatement, saveStatementToDownloads, type StatementPdf } from '../statement/shareStatement';
import { buildGroupSummaryHtml } from './groupSummaryHtml';
import { getGroupsApi } from './groupsApi';

/** Builds the trip summary PDF on the phone. Nothing leaves the device until it is saved or shared. */
export async function createGroupSummaryPdf(groupId: string): Promise<StatementPdf> {
  const api = getGroupsApi();
  const [group, expenses, settlements] = await Promise.all([
    api.detail(groupId),
    api.listExpenses(groupId),
    api.listSettlements(groupId),
  ]);
  const html = buildGroupSummaryHtml(group, expenses, settlements, formatShortDate(dateForExpenseInput(new Date())));
  const fileName = `Kharchiva-${group.title.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'Group'}`;
  const result = await generatePDF({ html, fileName, base64: true, width: 595, height: 842, padding: 24 });
  if (!result.filePath || !result.base64) throw new Error('PDF was not created');
  return { filePath: result.filePath, base64: result.base64, fileName, title: group.title };
}

/** Opens the share sheet (WhatsApp, Drive, email...). */
export async function shareGroupSummary(groupId: string): Promise<void> {
  const pdf = await createGroupSummaryPdf(groupId);
  await Share.open({
    url: `data:application/pdf;base64,${pdf.base64}`,
    filename: pdf.fileName,
    type: 'application/pdf',
    title: `${pdf.title} summary`,
    useInternalStorage: true,
    failOnCancel: false,
  });
}

/** Saves into Downloads and offers to open it. Where that is not possible the share sheet is used instead. */
export async function downloadGroupSummary(groupId: string): Promise<void> {
  const pdf = await createGroupSummaryPdf(groupId);
  if (!canSaveToDownloads()) {
    await Share.open({
      url: `data:application/pdf;base64,${pdf.base64}`,
      filename: pdf.fileName,
      type: 'application/pdf',
      title: `${pdf.title} summary`,
      useInternalStorage: true,
      failOnCancel: false,
    });
    return;
  }
  const uri = await saveStatementToDownloads(pdf);
  showSnackbar({
    message: 'Summary PDF saved in Downloads',
    tone: 'success',
    action: {
      label: 'Open',
      onPress: () => {
        openSavedStatement(uri).catch(() => showSnackbar({ tone: 'error', message: 'No app found to open the PDF' }));
      },
    },
  });
}
