const TOKEN_KEY = 'token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);

export const saveToken = (token) => localStorage.setItem(TOKEN_KEY, token);

export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

const decodeTokenPayload = (token) => {
  try {
    const payloadPart = token.split('.')[1];
    const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');

    return JSON.parse(atob(padded));
  } catch (error) {
    return null;
  }
};

export const isTokenExpired = (token) => {
  const payload = decodeTokenPayload(token);

  if (!payload || typeof payload.exp !== 'number') return true;

  return payload.exp * 1000 <= Date.now();
};

export const getValidToken = () => {
  const token = getToken();

  if (!token) return null;

  if (isTokenExpired(token)) {
    clearToken();
    return null;
  }

  return token;
};