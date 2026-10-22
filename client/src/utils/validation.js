const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateName(name) {
  const value = String(name || '').trim();
  if (!value) {
    return 'Name is required.';
  }
  if (value.length < 2) {
    return 'Name must be at least 2 characters.';
  }
  if (value.length > 80) {
    return 'Name cannot exceed 80 characters.';
  }
  return null;
}

export function validateEmail(email) {
  const value = String(email || '').trim();
  if (!value) {
    return 'Email is required.';
  }
  if (!EMAIL_PATTERN.test(value)) {
    return 'Enter a valid email address.';
  }
  return null;
}

export function validatePassword(password) {
  const value = String(password || '');
  if (!value) {
    return 'Password is required.';
  }
  if (value.length < 8) {
    return 'Password must be at least 8 characters.';
  }
  if (value.length > 72) {
    return 'Password cannot exceed 72 characters.';
  }
  if (!/[A-Za-z]/.test(value)) {
    return 'Password must include at least one letter.';
  }
  if (!/\d/.test(value)) {
    return 'Password must include at least one number.';
  }
  return null;
}

export function validateConfirmation(password, confirmation) {
  if (!confirmation) {
    return 'Confirm your password.';
  }
  if (password !== confirmation) {
    return 'Passwords do not match.';
  }
  return null;
}
