/**
 * Decodes a JWT token payload and checks if it is expired.
 * @param {string} token - The JWT token string.
 * @param {number} [bufferSeconds=10] - Safety buffer in seconds (default 10s).
 * @returns {boolean} True if token is null/invalid/expired, false if valid.
 */
export const isTokenExpired = (token, bufferSeconds = 10) => {
  if (!token || typeof token !== 'string') {
    return true;
  }

  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return true;
    }

    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    const payload = JSON.parse(jsonPayload);

    if (!payload.exp || typeof payload.exp !== 'number') {
      // If there is no exp claim, consider it not expired locally
      return false;
    }

    const currentTime = Date.now() / 1000;
    return payload.exp <= (currentTime + bufferSeconds);
  } catch (error) {
    console.error('Error decoding JWT token:', error);
    return true;
  }
};
