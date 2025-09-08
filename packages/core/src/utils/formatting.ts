export function sanitizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

export function sanitizePhoneNumber(phone: string): string {
  return phone.replace(/\D/g, '');
}

export function formatPhoneNumber(phone: string): string {
  const cleaned = sanitizePhoneNumber(phone);
  if (cleaned.startsWith('64')) {
    return `+${cleaned}`;
  }
  if (cleaned.startsWith('0')) {
    return `+64${cleaned.substring(1)}`;
  }
  return cleaned;
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

export function extractEmailDomain(email: string): string {
  const parts = email.split('@');
  return parts.length === 2 ? parts[1] : '';
}

export function maskEmail(email: string): string {
  const [localPart, domain] = email.split('@');
  if (!domain) return email;
  
  const maskedLocal = localPart.length > 2
    ? localPart[0] + '*'.repeat(Math.min(localPart.length - 2, 5)) + localPart[localPart.length - 1]
    : localPart;
  
  return `${maskedLocal}@${domain}`;
}

export function generateCorrelationId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function parseNameFromEmail(email: string): string {
  const localPart = email.split('@')[0];
  return localPart
    .replace(/[._-]/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-NZ', {
    style: 'currency',
    currency: 'NZD',
  }).format(amount);
}