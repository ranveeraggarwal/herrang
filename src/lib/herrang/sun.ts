// Sunrise/sunset for Herräng, computed offline via the NOAA solar position
// algorithm: fractional year of the date -> equation of time + solar
// declination -> hour angle at zenith 90.833° (the standard "official"
// sunrise/sunset zenith, which already bakes in atmospheric refraction and
// the sun's apparent radius, not just the geometric horizon). No I/O, no
// React — same rules as the rest of this folder. This is not a general
// solar library: the coordinates are hardcoded because the app only ever
// means one field in Sweden.

import { addDays } from '@/lib/dates';

const LAT = 60.1306; // Herräng, Sweden
const LON = 18.6537; // east of Greenwich, positive per the NOAA formula below

const ZENITH_DEG = 90.833;

/** Day-of-year (1-366), read from the date's UTC day — see solarEventsUTC. */
function dayOfYearUTC(dayStartUTC: Date): number {
  const yearStartUTC = Date.UTC(dayStartUTC.getUTCFullYear(), 0, 1);
  return Math.round((dayStartUTC.getTime() - yearStartUTC) / 86_400_000) + 1;
}

/**
 * Sunrise and sunset, as real UTC instants, for the given calendar date. The
 * date is read as a UTC day-of-year rather than a Stockholm one — camp runs
 * in July at 60°N where the equation-of-time/declination pair barely moves
 * day to day, so the few-hour offset between UTC and CEST midnight has no
 * meaningful effect on which "day" the calculation lands on.
 */
function solarEventsUTC(dateISO: string): { sunriseUTC: Date; sunsetUTC: Date } {
  const dayStartUTC = new Date(`${dateISO}T00:00:00Z`);
  const year = dayStartUTC.getUTCFullYear();
  const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const daysInYear = isLeap ? 366 : 365;
  const N = dayOfYearUTC(dayStartUTC);

  // Fractional year in radians, evaluated at noon — the standard NOAA
  // simplification of one equation-of-time/declination pair per day.
  const gamma = ((2 * Math.PI) / daysInYear) * (N - 1 + 12 / 24);

  // Equation of time, in minutes: how far true solar time drifts from mean
  // clock time over the year (Earth's elliptical orbit + axial tilt).
  const eqTimeMin =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(gamma) -
      0.032077 * Math.sin(gamma) -
      0.014615 * Math.cos(2 * gamma) -
      0.040849 * Math.sin(2 * gamma));

  // Solar declination, in radians.
  const declRad =
    0.006918 -
    0.399912 * Math.cos(gamma) +
    0.070257 * Math.sin(gamma) -
    0.006758 * Math.cos(2 * gamma) +
    0.000907 * Math.sin(2 * gamma) -
    0.002697 * Math.cos(3 * gamma) +
    0.00148 * Math.sin(3 * gamma);

  const latRad = (LAT * Math.PI) / 180;
  const zenithRad = (ZENITH_DEG * Math.PI) / 180;

  // Hour angle (degrees) of sunrise/sunset from solar noon, for this
  // latitude and declination at the official zenith. At 60°N in July this
  // is comfortably < 180°, i.e. the sun does set — no polar-day special
  // case needed.
  const cosHourAngle =
    Math.cos(zenithRad) / (Math.cos(latRad) * Math.cos(declRad)) -
    Math.tan(latRad) * Math.tan(declRad);
  const hourAngleDeg = (Math.acos(cosHourAngle) * 180) / Math.PI;

  // Solar noon in UTC minutes-since-midnight: 4 minutes of time per degree
  // of longitude (1440 min / 360°), minus the equation-of-time correction.
  // Longitude is signed east-positive here, matching LON above.
  const solarNoonUTCMin = 720 - 4 * LON - eqTimeMin;
  const sunriseUTCMin = solarNoonUTCMin - 4 * hourAngleDeg;
  const sunsetUTCMin = solarNoonUTCMin + 4 * hourAngleDeg;

  const dayStartMs = dayStartUTC.getTime();
  return {
    sunriseUTC: new Date(dayStartMs + sunriseUTCMin * 60_000),
    sunsetUTC: new Date(dayStartMs + sunsetUTCMin * 60_000),
  };
}

/**
 * Format a UTC instant as the app's "HH:MM" in Europe/Stockholm local time.
 * Camp runs in July, so this is always CEST (UTC+2) — computed via Intl
 * rather than a hardcoded +2 so it stays correct if the app is ever opened
 * outside camp season.
 */
function toStockholmHHMM(instantUTC: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Stockholm',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(instantUTC);
}

/**
 * Tonight's sunset and the following morning's sunrise, in Europe/Stockholm
 * local time, for a given poster date. A poster's night runs past midnight
 * (see TIME.md), so the sunrise a dancer actually sees at the end of it
 * belongs to the *next* calendar day, not the poster date itself.
 */
export function sunTimesFor(posterDate: string): { sunset: string; sunrise: string } {
  const { sunsetUTC } = solarEventsUTC(posterDate);
  const { sunriseUTC } = solarEventsUTC(addDays(posterDate, 1));
  return {
    sunset: toStockholmHHMM(sunsetUTC),
    sunrise: toStockholmHHMM(sunriseUTC),
  };
}
