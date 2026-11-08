import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithApp } from '../../test/render';
import { CsvImportModal } from './CsvImportModal';
import { findCatalog } from '../../config/catalogs';

vi.mock('react-i18next', async () => (await import('../../test/render')).i18nMock);

const columns = [{ key: 'name', label: 'Nome', type: 'text' as const }];
const service = findCatalog('bowel_function')!.service;
const csv = (content: string, name = 'a.csv') => new File([content], name, { type: 'text/csv' });

const open = (props = {}) => renderWithApp(
  <CsvImportModal isOpen onClose={vi.fn()} target="bowel_function" columns={columns} templateRow={{ name: 'x' }} title="Importar" {...props} />,
);

afterEach(() => vi.restoreAllMocks());

describe('CsvImportModal', () => {
  it('não renderiza fechado', () => {
    renderWithApp(<CsvImportModal isOpen={false} onClose={vi.fn()} target="bowel_function" columns={columns} templateRow={{}} title="x" />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('rejeita arquivo que não é CSV', async () => {
    open();
    await userEvent.upload(screen.getByLabelText('csvImport.chooseFile', { selector: 'input' }), new File(['x'], 'a.txt', { type: 'text/plain' }), { applyAccept: false });
    expect(await screen.findByRole('alert')).toHaveTextContent('csvImport.csvOnly');
  });

  it('mostra a prévia, bloqueia importação com erro e libera ao corrigir', async () => {
    open();
    await userEvent.upload(screen.getByLabelText('csvImport.chooseFile', { selector: 'input' }), csv('name\nNormal\nNormal\n'));
    expect(await screen.findByText('csvImport.errorCount')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /csvImport.import$/ })).toBeDisabled();

    await userEvent.clear(screen.getByLabelText('Nome 3'));
    await userEvent.type(screen.getByLabelText('Nome 3'), 'Diarreia');
    expect(await screen.findByText('csvImport.ready')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /csvImport.import$/ })).toBeEnabled();
  });

  it('avisa quando falta o cabeçalho obrigatório', async () => {
    open();
    await userEvent.upload(screen.getByLabelText('csvImport.chooseFile', { selector: 'input' }), csv('outro\nA\n'));
    expect(await screen.findByText('csvImport.unknownHeader')).toBeInTheDocument();
    expect(screen.getByText('csvImport.missingHeader')).toBeInTheDocument();
  });

  it('envia o CSV editado, mostra o resultado e avisa o sucesso', async () => {
    const importCsv = vi.spyOn(service, 'importCsv').mockResolvedValue({ total: 1, created: 1, updated: 0 });
    const onSuccess = vi.fn();
    open({ onSuccess });
    await userEvent.upload(screen.getByLabelText('csvImport.chooseFile', { selector: 'input' }), csv('name\nNormal\n'));
    await userEvent.click(await screen.findByRole('button', { name: /csvImport.import$/ }));
    expect(await screen.findByText('csvImport.successTitle')).toBeInTheDocument();
    expect(importCsv).toHaveBeenCalledTimes(1);
    expect(await importCsv.mock.calls[0][0].text()).toBe('name\nNormal');
    expect(onSuccess).toHaveBeenCalled();
  });

  it('mostra o erro devolvido pela API na célula da linha', async () => {
    vi.spyOn(service, 'importCsv').mockRejectedValue({ response: { data: { message: 'rejeitado', errors: [{ row: 2, column: 'name', message: 'já existe' }] } } });
    open();
    await userEvent.upload(screen.getByLabelText('csvImport.chooseFile', { selector: 'input' }), csv('name\nNormal\n'));
    await userEvent.click(await screen.findByRole('button', { name: /csvImport.import$/ }));
    expect(await screen.findByText('rejeitado')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('já existe')).toBeInTheDocument());
  });
});
