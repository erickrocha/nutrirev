import { canonicalHeader, errorKey, formatBytes, validateRows, type CsvColumn } from './csvImport';

const t = (key: string) => key;
const text: CsvColumn[] = [{ key: 'name', label: 'Nome', type: 'text' }];
const withKcal: CsvColumn[] = [...text, { key: 'kcal', label: 'Kcal', type: 'number' }, { key: 'fiber', label: 'Fibra', type: 'number', required: false }];

describe('canonicalHeader', () => {
  it('normaliza nomes alternativos, BOM e caixa', () => {
    expect(canonicalHeader('﻿Nome')).toBe('name');
    expect(canonicalHeader('Energia (kcal)')).toBe('kcal');
    expect(canonicalHeader('Poli-insaturados (g)')).toBe('polyunsaturated_fat');
    expect(canonicalHeader('  Vitamina C (mg) ')).toBe('vitamin_c');
  });

  it('mantém cabeçalho desconhecido em minúsculas', () => {
    expect(canonicalHeader('Outro')).toBe('outro');
    expect(canonicalHeader(undefined)).toBe('');
  });
});

describe('validateRows', () => {
  it('exige nome e limita o tamanho', () => {
    const errors = validateRows([{ name: ' ' }, { name: 'abcdef' }], text, 5, t);
    expect(errors.map((e) => [e.rowIndex, e.message])).toEqual([[0, 'csvImport.nameRequired'], [1, 'csvImport.nameTooLong']]);
  });

  it('aponta as duas linhas de um nome duplicado, ignorando caixa', () => {
    const errors = validateRows([{ name: 'Arroz' }, { name: 'Feijão' }, { name: 'arroz' }], text, 50, t);
    expect(errors.map((e) => e.rowIndex).sort()).toEqual([0, 2]);
    expect(errors[0].row).toBe(2);
  });

  it('valida números: vírgula decimal, marcadores de traço e opcionais', () => {
    expect(validateRows([{ name: 'A', kcal: '1,5', fiber: '' }], withKcal, 50, t)).toEqual([]);
    expect(validateRows([{ name: 'A', kcal: 'tr' }], withKcal, 50, t)).toEqual([]);
    const errors = validateRows([{ name: 'A', kcal: '' }, { name: 'B', kcal: '-1' }, { name: 'C', kcal: 'x' }], withKcal, 50, t);
    expect(errors.map((e) => e.rowIndex)).toEqual([0, 1, 2]);
  });
});

describe('helpers', () => {
  it('formata tamanhos e chaves de erro', () => {
    expect(formatBytes(0)).toBe('0 KB');
    expect(formatBytes(2048)).toBe('2.0 KB');
    expect(formatBytes(3 * 1024 * 1024)).toBe('3072 KB');
    expect(errorKey(3, 'name')).toBe('3:name');
    expect(errorKey(3)).toBe('3:*');
  });
});
