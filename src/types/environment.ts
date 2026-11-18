import type { AirQualitySnapshot } from '../services/airQualityService';
import type { WeatherSnapshot } from '../services/weatherService';
import type { DeterministicSafetyGuidance } from '../services/safetyRules';

export interface ActiveLocation {
  id: string;
  name: string;
  admin1: string;
  country: string;
  lat: number;
  lon: number;
  timezone: string;
  source: 'preset' | 'open-meteo-geocoding' | 'browser-geolocation';
  areaLabel?: string;
}

export type AsyncFetchStatus = 'idle' | 'loading' | 'success' | 'error';

export interface EnvironmentalState {
  location: ActiveLocation;
  weather: WeatherSnapshot | null;
  weatherStatus: AsyncFetchStatus;
  weatherError: string | null;
  airQuality: AirQualitySnapshot | null;
  airQualityStatus: AsyncFetchStatus;
  airQualityError: string | null;
  safety: DeterministicSafetyGuidance;
}
