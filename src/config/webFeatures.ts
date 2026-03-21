export const TELEGRAM_PAYMENTS_ENABLED = false;
export const TELEGRAM_BROADCASTS_ENABLED = false;
export const TELEGRAM_ACCOUNT_LINKING_ENABLED = false;

export function isTelegramPaymentMethod(methodId: string): boolean {
  return methodId.toLowerCase() === 'telegram_stars';
}
