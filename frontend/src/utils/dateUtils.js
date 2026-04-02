/**
 * Date utilities — always use Brasília timezone (America/Sao_Paulo, UTC-3)
 */

const TZ = 'America/Sao_Paulo';

/**
 * Normalizes an ISO date string to be parsed correctly as UTC by browsers.
 * Replaces spaces with 'T' and ensures timezone suffix (Z or +00:00).
 */
function normalizeISO(isoString) {
  if (!isoString) return null;
  let str = isoString.trim().replace(' ', 'T');
  if (!str.includes('Z') && !str.includes('+') && !str.includes('-')) {
    str += 'Z'; // Assume UTC if no TZ info is present
  }
  return str;
}

/**
 * Format an ISO date string to pt-BR with date + time, Brasília timezone.
 * @param {string|null} isoString
 * @returns {string}
 */
export function formatDateTimeBR(isoString) {
  const normalized = normalizeISO(isoString);
  if (!normalized) return '-';
  const dateObj = new Date(normalized);
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(dateObj);
}

/**
 * Format an ISO date string to pt-BR date only, Brasília timezone.
 * @param {string|null} isoString
 * @returns {string}
 */
export function formatDateBR(isoString) {
  const normalized = normalizeISO(isoString);
  if (!normalized) return '-';
  const dateObj = new Date(normalized);
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(dateObj);
}

/**
 * Format an ISO date string to short date (DD/MM), Brasília timezone.
 * @param {string|null} isoString
 * @returns {string}
 */
export function formatShortDateBR(isoString) {
  const normalized = normalizeISO(isoString);
  if (!normalized) return '-';
  const dateObj = new Date(normalized);
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: TZ,
    day: '2-digit',
    month: '2-digit',
  }).format(dateObj);
}

/**
 * Format an ISO date string to time only (HH:mm), Brasília timezone.
 * @param {string|null} isoString
 * @returns {string}
 */
export function formatTimeBR(isoString) {
  const normalized = normalizeISO(isoString);
  if (!normalized) return '';
  const dateObj = new Date(normalized);
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
  }).format(dateObj);
}

/**
 * Get current datetime in Brasília (as Date object, UTC under the hood).
 */
export function nowBR() {
  return new Date();
}
