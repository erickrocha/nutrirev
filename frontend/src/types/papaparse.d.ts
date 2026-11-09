// Declaração mínima do que o projeto usa de papaparse (não há @types instalado).
declare module 'papaparse' {
  export interface ParseError { row?: number; message: string }
  export interface ParseResult<T> { data: T[]; errors: ParseError[]; meta: { fields?: string[] } }
  export interface ParseConfig<T> {
    header?: boolean;
    delimiter?: string;
    skipEmptyLines?: boolean | 'greedy';
    transformHeader?: (header: string, index: number) => string;
    complete?: (results: ParseResult<T>) => void;
    error?: (error: Error) => void;
  }
  const Papa: {
    parse<T>(file: File, config: ParseConfig<T>): void;
    unparse(input: { fields: string[]; data: unknown[] }, config?: { newline?: string }): string;
  };
  export default Papa;
}
