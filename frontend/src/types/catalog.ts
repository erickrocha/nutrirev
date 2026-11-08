export interface CatalogItem {
  id: number;
  name: string;
}

export interface CatalogService {
  getAll: () => Promise<unknown>;
  getById: (id: number) => Promise<unknown>;
  create: (data: { name: string }) => Promise<unknown>;
  update: (id: number, data: { name: string }) => Promise<unknown>;
  importCsv: (file: File, tenantId?: number) => Promise<unknown>;
}
