import { useCallback, useEffect, useState } from 'react';
import { getToken, login, logout, onUnauthorized } from '../lib/api';

export default function useAuth() {
  const [token, setToken] = useState(() => getToken());
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    return onUnauthorized(() => {
      setToken(null);
      setUser(null);
    });
  }, []);

  const signIn = useCallback(async (username, password) => {
    setLoading(true);
    setError(null);
    try {
      const data = await login(username, password);
      setToken(data.token);
      setUser(data.user);
      return true;
    } catch (err) {
      setError(err.message || 'Login failed');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(() => {
    logout();
    setToken(null);
    setUser(null);
  }, []);

  return { authed: Boolean(token), user, signIn, signOut, error, loading };
}