/**
 * Utilitários para operações seguras com arrays
 * Protege contra erros de "Cannot read properties of undefined (reading 'map')"
 */

/**
 * Versão segura de .map() que verifica se o valor é um array válido
 */
export const safeMap = <T, R>(
  arr: T[] | undefined | null, 
  callback: (item: T, index: number, array: T[]) => R
): R[] => {
  if (!Array.isArray(arr)) {
    console.warn('safeMap: valor fornecido não é um array válido:', arr);
    return [];
  }
  return arr.map(callback);
};

/**
 * Versão segura de .filter() que verifica se o valor é um array válido
 */
export const safeFilter = <T>(
  arr: T[] | undefined | null, 
  callback: (item: T, index: number, array: T[]) => boolean
): T[] => {
  if (!Array.isArray(arr)) {
    console.warn('safeFilter: valor fornecido não é um array válido:', arr);
    return [];
  }
  return arr.filter(callback);
};

/**
 * Garante que um valor seja um array válido
 */
export const ensureArray = <T>(value: T[] | undefined | null): T[] => {
  if (Array.isArray(value)) {
    return value;
  }
  console.warn('ensureArray: valor fornecido não é um array, retornando array vazio:', value);
  return [];
};

/**
 * Verifica se um valor é um array válido e não vazio
 */
export const isValidArray = <T>(value: any): value is T[] => {
  return Array.isArray(value) && value.length > 0;
};

/**
 * Cria um array vazio com tipo específico (útil para inicializações)
 */
export const createEmptyArray = <T>(): T[] => {
  return [];
};

/**
 * Aplica transformação segura em dados de resposta de API
 */
export const safeApiResponse = <T>(
  response: any,
  arrayPath: string,
  defaultValue: T[] = []
): T[] => {
  try {
    const pathParts = arrayPath.split('.');
    let data = response;
    
    for (const part of pathParts) {
      if (data && typeof data === 'object' && part in data) {
        data = data[part];
      } else {
        console.warn(`safeApiResponse: caminho '${arrayPath}' não encontrado na resposta:`, response);
        return defaultValue;
      }
    }
    
    return ensureArray(data);
  } catch (error) {
    console.error('safeApiResponse: erro ao processar resposta:', error);
    return defaultValue;
  }
}; 