import { screen } from '@testing-library/react';
import { renderWithApp } from '../../test/render';
import { CatalogListPage } from './CatalogListPage';
import { findCatalog } from '../../config/catalogs';

vi.mock('react-i18next', async () => (await import('../../test/render')).i18nMock);
vi.mock('../../components/common/CsvImportModal', () => ({ CsvImportModal: () => null }));

const catalog = findCatalog('bowel_function')!;
afterEach(() => vi.restoreAllMocks());

describe('CatalogListPage', () => {
  it('lista os registros com link de edição e de cadastro', async () => {
    vi.spyOn(catalog.service, 'getAll').mockResolvedValue([{ id: 7, name: 'Normal' }]);
    renderWithApp(<CatalogListPage catalog={catalog} />);
    expect(await screen.findByText('Normal')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /common.edit/ })).toHaveAttribute('href', '/bowel-functions/7/edit');
    expect(screen.getByRole('link', { name: /entities.addEntity/ })).toHaveAttribute('href', '/bowel-functions/new');
  });

  it('mostra estado vazio', async () => {
    vi.spyOn(catalog.service, 'getAll').mockResolvedValue([]);
    renderWithApp(<CatalogListPage catalog={catalog} />);
    expect(await screen.findByText('entities.noRecordFound')).toBeInTheDocument();
  });

  it('mostra o erro de carregamento', async () => {
    vi.spyOn(catalog.service, 'getAll').mockRejectedValue({ response: { data: { message: 'boom' } } });
    renderWithApp(<CatalogListPage catalog={catalog} />);
    expect(await screen.findByText('boom')).toBeInTheDocument();
  });

  it('só oferece importação nos catálogos que a habilitam', async () => {
    vi.spyOn(catalog.service, 'getAll').mockResolvedValue([]);
    renderWithApp(<CatalogListPage catalog={{ ...catalog, importEnabled: false }} />);
    await screen.findByText('entities.noRecordFound');
    expect(screen.queryByText('csvImport.button')).not.toBeInTheDocument();
  });
});
