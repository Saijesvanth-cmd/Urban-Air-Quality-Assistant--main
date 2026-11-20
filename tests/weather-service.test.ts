
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  degreesToCardinal,
  describeWmoWeatherCode,
  fetchOpenMeteoWeather,
  WeatherServiceError,
} from '../src/services/weatherService.ts';

describe('degreesToCardinal', () => {
  it('converts compass directions correctly', () => {
    assert.equal(degreesToCardinal(0), 'N');
    assert.equal(degreesToCardinal(45), 'NE');
    assert.equal(degreesToCardinal(90), 'E');
    assert.equal(degreesToCardinal(180), 'S');
    assert.equal(degreesToCardinal(270), 'W');
    assert.equal(degreesToCardinal(360), 'N');
  });

  it('handles invalid directions', () => {
    assert.equal(degreesToCardinal(null), '—');
    assert.equal(degreesToCardinal(NaN), '—');
    assert.equal(degreesToCardinal(Infinity), '—');
  });
});

describe('describeWmoWeatherCode', () => {
  it('describes common weather codes', () => {
    assert.equal(describeWmoWeatherCode(0), 'Clear sky');
    assert.equal(describeWmoWeatherCode(3), 'Overcast');
    assert.equal(describeWmoWeatherCode(61), 'Slight rain');
    assert.equal(describeWmoWeatherCode(95), 'Thunderstorm');
  });

  it('handles unknown and unavailable codes', () => {
    assert.equal(describeWmoWeatherCode(null), 'Data unavailable');
    assert.equal(describeWmoWeatherCode(999), 'Weather code 999');
  });
});

describe('fetchOpenMeteoWeather', () => {
  it('rejects invalid coordinates before making a request', async () => {
    for (const [lat, lon] of [
      [91, 0],
      [-91, 0],
      [0, 181],
      [0, -181],
      [NaN, 0],
      [0, Infinity],
    ]) {
      await assert.rejects(
        fetchOpenMeteoWeather(lat, lon),
        (error: unknown) =>
          error instanceof WeatherServiceError &&
          error.code === 'UPSTREAM_ERROR'
      );
    }
  });

  it('maps a successful Open-Meteo response correctly', async () => {
    const originalFetch = globalThis.fetch;

    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          timezone: 'Asia/Kolkata',
          current: {
            time: '2026-11-20T12:00',
            temperature_2m: 28.26,
            relative_humidity_2m: 65,
            apparent_temperature: 30,
            precipitation: 0,
            weather_code: 0,
            cloud_cover: 20,
            wind_speed_10m: 12.4,
            wind_direction_10m: 90,
          },
          hourly: {
            time: ['2026-11-20T12:00'],
            temperature_2m: [28.26],
            relative_humidity_2m: [65],
            wind_speed_10m: [12],
            wind_direction_10m: [90],
            precipitation_probability: [10],
            precipitation: [0],
            cloud_cover: [20],
          },
          daily: {
            time: ['2026-11-20'],
            temperature_2m_max: [32],
            temperature_2m_min: [22],
            sunrise: ['2026-11-20T06:15'],
            sunset: ['2026-11-20T17:45'],
            wind_speed_10m_max: [18],
            precipitation_probability_max: [20],
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )) as typeof fetch;

    try {
      const result = await fetchOpenMeteoWeather(17.3, 78.4);

      assert.equal(result.timezone, 'Asia/Kolkata');
      assert.equal(result.current.temperatureC, 28.3);
      assert.equal(result.current.windCardinal, 'E');
      assert.equal(result.current.conditionLabel, 'Clear sky');
      assert.equal(result.hourly[0].hourLabel, '12:00');
      assert.equal(result.hourly[0].temperatureC, 28.3);
      assert.equal(result.daily[0].dayLabel, 'Today');
      assert.equal(result.daily[0].tempMaxC, 32);
      assert.equal(result.isCached, false);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
