/**
 * Street-address search over the US Census Bureau geocoder: keyless, public
 * domain, and house-number accurate for US addresses that OpenStreetMap often
 * lacks. Pure helpers shared by the server route and the browser chain.
 */

/** "13725 W 31st Ave, Golden, CO" — a house number, then a street name. */
export function isStreetAddressQuery(query) {
  return /^\s*\d+[a-z]?(?:-\d+)?\s+(?:[nsew]\.?\s+)?[\p{L}\d]/iu.test(
    String(query || ''),
  );
}

/** The leading house number of an address query, or null. */
export function houseNumberOf(query) {
  const match = String(query || '').match(/^\s*(\d+)/);
  return match ? match[1] : null;
}

/**
 * Whether a resolved label names the house number that was asked for. A
 * street-address query answered by a bus stop or a bare street does not.
 */
export function labelMatchesAddress(query, label) {
  const number = houseNumberOf(query);
  if (!number) return true;
  return new RegExp(`(^|\\D)${number}(\\D|$)`).test(String(label || ''));
}

/**
 * One Census `addressMatches` entry as a geocoding result the camera framing
 * reads, or null when its coordinates are not real coordinates.
 */
export function censusToGeocodeResult(match) {
  const lat = Number(match?.coordinates?.y);
  const lng = Number(match?.coordinates?.x);
  const label = String(match?.matchedAddress || '').trim();
  if (
    !label ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    Math.abs(lat) > 90 ||
    Math.abs(lng) > 180
  )
    return null;
  return {
    geometry: { location: { lat, lng } },
    formatted_address: label,
    types: ['street_address'],
    address_components: [],
  };
}
