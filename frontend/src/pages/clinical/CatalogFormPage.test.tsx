import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithApp } from '../../test/render';
import { CatalogFormPage } from './CatalogFormPage';
import { findCatalog } from '../../config/catalogs';

vi.mock('react-i18next', async () => (await import('../../test/render')).i18nMock);

const catalog = findCatalog('bowel_function')!;
afterEach(() => vi.restoreAllMocks());

describe('CatalogFormPage', () => {
  it('não salva sem nome', async () => {
    vi.spyOn(catalog.service, 'getAll').mockResolvedValue([]);
    const create = vi.spyOn(catalog.service, 'create');
    renderWithApp(<CatalogFormPage catalog={catalog} />, { route: '/bowel-functions/new', path: '/bowel-functions/new' });
    await userEvent.click(await screen.findByRole('button', { name: /common.register/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('csvImport.nameRequired');
    expect(create).not.toHaveBeenCalled();
  });

  it('cadastra e volta para a lista', async () => {
    vi.spyOn(catalog.service, 'getAll').mockResolvedValue([]);
    const create = vi.spyOn(catalog.service, 'create').mockResolvedValue({});
    renderWithApp(<CatalogFormPage catalog={catalog} />, { route: '/bowel-functions/new', path: '/bowel-functions/new' });
    await userEvent.type(await screen.findByLabelText('entities.entityName'), ' Constipação ');
    await userEvent.click(screen.getByRole('button', { name: /common.register/ }));
    await waitFor(() => expect(create).toHaveBeenCalledWith({ name: 'Constipação' }));
    expect(await screen.findByTestId('elsewhere')).toBeInTheDocument();
  });

  it('carrega o nome na edição e atualiza pelo id', async () => {
    vi.spyOn(catalog.service, 'getAll').mockResolvedValue([{ id: 4, name: 'Diarreia' }]);
    const update = vi.spyOn(catalog.service, 'update').mockResolvedValue({});
    renderWithApp(<CatalogFormPage catalog={catalog} />, { route: '/bowel-functions/4/edit', path: '/bowel-functions/:id/edit' });
    expect(await screen.findByDisplayValue('Diarreia')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /common.saveChanges/ }));
    await waitFor(() => expect(update).toHaveBeenCalledWith(4, { name: 'Diarreia' }));
  });

  it('mostra erro quando o registro não existe', async () => {
    vi.spyOn(catalog.service, 'getAll').mockResolvedValue([]);
    renderWithApp(<CatalogFormPage catalog={catalog} />, { route: '/bowel-functions/99/edit', path: '/bowel-functions/:id/edit' });
    expect(await screen.findByRole('alert')).toHaveTextContent('entities.noRecordFound');
  });
});
