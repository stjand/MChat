// src/utils/emailVerification.ts
const ALLOWED_DOMAINS = [
  'edu', 'ac.uk', 'ac.in', // Add your college domains
];

export function isCollegeEmail(email: string): boolean {
  const domain = email.split('@')[1];
  return ALLOWED_DOMAINS.some(allowed => domain.endsWith(allowed));
}

// Example login function:
function login(email: string) {
  if (!isCollegeEmail(email)) {
    throw new Error('Please use a valid college email address');
  }
}