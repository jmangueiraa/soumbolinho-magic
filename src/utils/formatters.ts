/**
 * Formata um valor numérico para o padrão de moeda Real Brasileiro (R$)
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Formata número de telefone brasileiro no formato (XX) XXXXX-XXXX
 */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

/**
 * Converte data ISO YYYY-MM-DD para DD/MM/YYYY
 */
export function formatDate(dateString?: string): string {
  if (!dateString) return 'A combinar';
  const parts = dateString.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateString;
}

/**
 * Gera um CPF válido aleatório (com dígitos verificadores calculados pelo algoritmo Módulo 11)
 * Utilizado para pagamentos transparentes sem atrito no checkout
 */
export function generateValidRandomCpf(): string {
  const rnd = (n: number) => Math.floor(Math.random() * n);
  const digits = Array.from({ length: 9 }, () => rnd(10));

  // Primeiro dígito verificador
  let sum1 = 0;
  for (let i = 0; i < 9; i++) {
    sum1 += digits[i] * (10 - i);
  }
  let rem1 = sum1 % 11;
  const d10 = rem1 < 2 ? 0 : 11 - rem1;
  digits.push(d10);

  // Segundo dígito verificador
  let sum2 = 0;
  for (let i = 0; i < 10; i++) {
    sum2 += digits[i] * (11 - i);
  }
  let rem2 = sum2 % 11;
  const d11 = rem2 < 2 ? 0 : 11 - rem2;
  digits.push(d11);

  return digits.join('');
}

