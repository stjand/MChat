// src/utils/emailVerification.ts

// Comprehensive list of college email domains
const COLLEGE_DOMAINS = [
  // International domains
  'edu',
  'ac.uk',
  'ac.in',
  'edu.au',
  'ac.nz',
  'edu.sg',
  'ac.jp',
  'edu.cn',
  'ac.za',
  'edu.my',
  'ac.th',
  'edu.ph',
  'ac.kr',
  'edu.bd',
  'ac.lk',
  'edu.pk',
  'ac.ae',
  
  // Specific Indian institutions
  'iitkgp.ac.in',
  'iitb.ac.in',
  'iitd.ac.in',
  'iitm.ac.in',
  'iitk.ac.in',
  'iitr.ac.in',
  'iitg.ac.in',
  'iisc.ac.in',
  'bits-pilani.ac.in',
  'du.ac.in',
  'jnu.ac.in',
  
  // Add more as needed
];

/**
 * Checks if an email is from a valid college/university domain
 * @param email - Email address to validate
 * @returns true if email is from a recognized college domain
 */
export function isCollegeEmail(email: string): boolean {
  if (!email || !email.includes('@')) {
    return false;
  }

  const emailLower = email.toLowerCase().trim();
  const domain = emailLower.split('@')[1];

  if (!domain) {
    return false;
  }

  // Check against known college domains
  return COLLEGE_DOMAINS.some(collegeDomain => {
    return domain === collegeDomain || domain.endsWith('.' + collegeDomain);
  });
}

/**
 * Extracts college name from email domain
 * @param email - College email address
 * @returns Formatted college name or null
 */
export function extractCollegeName(email: string): string | null {
  if (!isCollegeEmail(email)) {
    return null;
  }

  const domain = email.split('@')[1];
  
  // Remove common TLDs and format
  const name = domain
    .replace(/\.(edu|ac)\.(uk|in|au|nz|sg|jp|cn|za|my|th|ph|kr|bd|lk|pk|ae)$/i, '')
    .replace(/\.edu$/i, '')
    .replace(/\./g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return name;
}

/**
 * Validates and formats a college email
 * @param email - Email to validate
 * @returns Validation result with formatted email and college name
 */
export function validateCollegeEmail(email: string): {
  isValid: boolean;
  email?: string;
  collegeName?: string;
  error?: string;
} {
  if (!email) {
    return { isValid: false, error: 'Email is required' };
  }

  const emailLower = email.toLowerCase().trim();

  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(emailLower)) {
    return { isValid: false, error: 'Invalid email format' };
  }

  if (!isCollegeEmail(emailLower)) {
    return {
      isValid: false,
      error: 'Please use a valid college/university email address (e.g., ending in .edu, .ac.uk, .ac.in)',
    };
  }

  return {
    isValid: true,
    email: emailLower,
    collegeName: extractCollegeName(emailLower) || undefined,
  };
}

/**
 * Gets a user-friendly error message for invalid emails
 */
export function getEmailErrorMessage(email: string): string {
  if (!email) {
    return 'Please enter your college email address';
  }

  if (!email.includes('@')) {
    return 'Invalid email format';
  }

  return 'Please use your official college/university email address (e.g., .edu, .ac.uk, .ac.in)';
}