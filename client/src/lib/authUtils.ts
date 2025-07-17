export function isUnauthorizedError(error: Error): boolean {
  return /^401: .*Authentication required/.test(error.message) || 
         error.message.includes('Authentication required') ||
         error.message.includes('Unauthorized');
}