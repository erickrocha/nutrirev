import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithApp } from '../../test/render';
import { DoctorListPage } from './DoctorListPage';
import { DoctorFormPage } from './DoctorFormPage';
import { cityService, provinceService } from '../../services/clinicalService';
import { doctorService } from '../../services/doctorService';

vi.mock('react-i18next', async () => (await import('../../test/render')).i18nMock);
afterEach(() => vi.restoreAllMocks());

const carlos = { id: 1, name: 'Dr. Carlos', document: 'CRM/SP 1', email: 'c@x.com', phone: '11987654321', city: 'Recife', province: 'PE', dateOfBirth: '1980-02-01' };
const ana = { id: 2, name: 'Dra. Ana', email: 'a@x.com' };

describe('DoctorListPage', () => {
  it('lista em cartões com KPIs, telefone formatado e links', async () => {
    vi.spyOn(doctorService, 'getAll').mockResolvedValue([carlos, ana]);
    renderWithApp(<DoctorListPage />);
    expect(await screen.findByText('Dr. Carlos')).toBeInTheDocument();
    expect(screen.getByText('(11) 98765-4321')).toBeInTheDocument();
    expect(screen.getByText('doctors.withCRM').previousSibling).toHaveTextContent('1');
    expect(screen.getAllByRole('link', { name: /common.edit/ })[0]).toHaveAttribute('href', '/doctors/1/edit');
  });

  it('filtra pela busca e alterna para a tabela', async () => {
    vi.spyOn(doctorService, 'getAll').mockResolvedValue([carlos, ana]);
    renderWithApp(<DoctorListPage />);
    await screen.findByText('Dr. Carlos');
    await userEvent.type(screen.getByRole('searchbox'), 'recife');
    expect(screen.queryByText('Dra. Ana')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /common.table/ }));
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('Recife, PE')).toBeInTheDocument();
  });

  it('exclui depois de confirmar e mostra o erro da API se falhar', async () => {
    vi.spyOn(doctorService, 'getAll').mockResolvedValue([carlos]);
    const remove = vi.spyOn(doctorService, 'delete').mockRejectedValueOnce({ response: { data: { message: 'vinculado a planos' } } }).mockResolvedValueOnce({});
    renderWithApp(<DoctorListPage />);
    await userEvent.click(await screen.findByRole('button', { name: /common.delete/ }));
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'common.delete' }));
    expect(await screen.findByText('vinculado a planos')).toBeInTheDocument();
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'common.delete' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(remove).toHaveBeenCalledTimes(2);
  });

  it('mostra estado vazio e erro de carregamento', async () => {
    vi.spyOn(doctorService, 'getAll').mockResolvedValueOnce([]);
    const { unmount } = renderWithApp(<DoctorListPage />);
    expect(await screen.findByText('doctors.noDoctorsFound')).toBeInTheDocument();
    unmount();
    vi.spyOn(doctorService, 'getAll').mockRejectedValueOnce({});
    renderWithApp(<DoctorListPage />);
    expect(await screen.findByText('doctors.errorLoading')).toBeInTheDocument();
  });
});

describe('DoctorFormPage', () => {
  beforeEach(() => {
    vi.spyOn(provinceService, 'getAll').mockResolvedValue([]);
    vi.spyOn(cityService, 'getByProvinceId').mockResolvedValue([]);
  });

  it('exige o nome', async () => {
    vi.spyOn(doctorService, 'getAll').mockResolvedValue([]);
    const create = vi.spyOn(doctorService, 'create');
    renderWithApp(<DoctorFormPage />, { route: '/doctors/new', path: '/doctors/new' });
    await userEvent.click(await screen.findByRole('button', { name: /doctors.addDoctor/ }));
    expect(await screen.findByText('doctors.nameRequired')).toBeInTheDocument();
    expect(create).not.toHaveBeenCalled();
  });

  it('cadastra enviando o telefone só com dígitos', async () => {
    vi.spyOn(doctorService, 'getAll').mockResolvedValue([]);
    const create = vi.spyOn(doctorService, 'create').mockResolvedValue({});
    renderWithApp(<DoctorFormPage />, { route: '/doctors/new', path: '/doctors/new' });
    await userEvent.type(await screen.findByLabelText(/doctors.fullName/), 'Dr. Novo');
    await userEvent.type(screen.getByLabelText('doctors.phone'), '11999998888');
    expect(screen.getByLabelText('doctors.phone')).toHaveValue('(11) 99999-8888');
    await userEvent.click(screen.getByRole('button', { name: /doctors.addDoctor/ }));
    await waitFor(() => expect(create).toHaveBeenCalledWith({ name: 'Dr. Novo', document: null, email: null, phone: '11999998888', dateOfBirth: null, province: null, city: null }));
    expect(await screen.findByTestId('elsewhere')).toBeInTheDocument();
  });

  it('carrega o médico na edição e atualiza pelo id', async () => {
    vi.spyOn(doctorService, 'getAll').mockResolvedValue([carlos]);
    const update = vi.spyOn(doctorService, 'update').mockResolvedValue({});
    renderWithApp(<DoctorFormPage />, { route: '/doctors/1/edit', path: '/doctors/:id/edit' });
    expect(await screen.findByDisplayValue('Dr. Carlos')).toBeInTheDocument();
    expect(screen.getByLabelText('doctors.phone')).toHaveValue('(11) 98765-4321');
    await userEvent.click(screen.getByRole('button', { name: /common.saveChanges/ }));
    await waitFor(() => expect(update).toHaveBeenCalledWith(1, expect.objectContaining({ name: 'Dr. Carlos', phone: '11987654321', province: 'PE', city: 'Recife' })));
  });

  it('mostra erro da API ao salvar e quando o médico não existe', async () => {
    vi.spyOn(doctorService, 'getAll').mockResolvedValue([carlos]);
    vi.spyOn(doctorService, 'update').mockRejectedValue({ response: { data: { message: 'CRM duplicado' } } });
    const { unmount } = renderWithApp(<DoctorFormPage />, { route: '/doctors/1/edit', path: '/doctors/:id/edit' });
    await userEvent.click(await screen.findByRole('button', { name: /common.saveChanges/ }));
    expect(await screen.findByText('CRM duplicado')).toBeInTheDocument();
    unmount();
    renderWithApp(<DoctorFormPage />, { route: '/doctors/99/edit', path: '/doctors/:id/edit' });
    expect(await screen.findByText('doctors.noDoctorsFound')).toBeInTheDocument();
  });
});
