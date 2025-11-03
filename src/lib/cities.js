export const CITIES_API =
  'https://data.gov.il/api/3/action/datastore_search?resource_id=d4901968-dad3-4845-a9b0-a57d027f11ab&limit=1272';
export const LS_CITIES = 'crm:cities:list';

const stripNiqqud = (s) => String(s || '').replace(/[\u0591-\u05C7]/g, '');
const normalizeHe = (s) =>
  stripNiqqud(String(s || '').toLocaleLowerCase('he')).normalize('NFKD').trim();

export async function loadCitiesFromApi() {
  const res = await fetch(CITIES_API);
  if (!res.ok) throw new Error('Failed to fetch cities');
  const json = await res.json();
  const records = json?.result?.records ?? [];
  const names = Array.from(
    new Set(
      records
        .map((r) => (r && r['שם_ישוב'] ? String(r['שם_ישוב']).trim() : ''))
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b, 'he', { sensitivity: 'base' }));
  return names;
}

export async function getCities(force = false) {
  if (!force) {
    try {
      const cached = JSON.parse(localStorage.getItem(LS_CITIES) || 'null');
      if (Array.isArray(cached) && cached.length) return cached;
      if (cached && Array.isArray(cached.names)) return cached.names;
    } catch {}
  }
  const names = await loadCitiesFromApi();
  try {
    localStorage.setItem(LS_CITIES, JSON.stringify(names));
  } catch {}
  return names;
}

export function filterCities(cities, query) {
  if (!query) return cities;
  const q = normalizeHe(query);
  return cities.filter((name) => normalizeHe(name).includes(q));
}

