export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidPassword = (password: string): boolean => {
  return password.length >= 6;
};

export const cleanInput = (input: string): string => {
  return input.trim().replace(/[<>]/g, ''); // Basic XSS sanitization
};
