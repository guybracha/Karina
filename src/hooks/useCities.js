import { useEffect, useMemo, useState } from 'react';
import { getCities, filterCities } from '../lib/cities';

export default function useCities(query = '', opts = {}) {
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { force = false } = opts;

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getCities(force)
      .then((list) => {
        if (alive) {
          setCities(list);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (alive) {
          setError(e);
          setLoading(false);
        }
      });
    return () => {
      alive = false;
    };
  }, [force]);

  const filtered = useMemo(() => filterCities(cities, query), [cities, query]);

  return { cities, filtered, loading, error };
}

