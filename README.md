# Urban Air Quality Assistant

An AI-powered environmental intelligence platform that helps users understand local air quality, explore weather conditions, and make informed decisions about everyday outdoor activities.

## 1. Overview

Urban Air Quality Assistant is a location-aware web application designed to make environmental information more accessible and actionable.

The platform integrates air quality estimates, weather data, geolocation, spatial environmental visualization, deterministic safety guidance, and an AI-powered assistant into a unified dashboard.

Rather than presenting environmental measurements in isolation, the application helps users interpret conditions, explore nearby spatial variations, and consider practical ways to reduce their exposure.

## 2. Problem Statement

Air pollution and changing weather conditions directly affect everyday activities and environmental well-being. However, environmental data is often difficult for ordinary users to interpret and translate into practical decisions.

Urban Air Quality Assistant addresses this challenge by providing an accessible interface that combines environmental information with contextual explanations and personalized features.

## 3. Key Features

### Environmental Intelligence
- Location-based air quality estimates.
- Weather forecasts and current weather information.
- Separate US AQI and European AQI readings.
- Pollutant information, including PM2.5, PM10, NO2, O3, SO2, and CO where available.
- Environmental data retrieval using geographic coordinates.

### Interactive Spatial Visualization
- Five-sector environmental grid representing the core, northwest, northeast, southeast, and southwest directions.
- Spatial exploration of AQI and pollutant estimates.
- Interactive sector selection.
- Environmental data validation and request timeout handling.

### AI Environmental Assistant
- AI-powered environmental question answering using the Google Gemini API.
- Streaming chat responses.
- Contextual environmental assistance.

### Location Intelligence
- Browser-based geolocation.
- Manual location selection.
- Location presets and recently selected locations.
- Reverse geocoding for locality information.

### Personalized Environmental Workspace
- Firebase Authentication with Google sign-in.
- Household profiles.
- Saved environmental queries.
- Personalized mitigation routines.
- Saved environmental observations.

### Safety and Reliability
- Deterministic environmental safety guidance.
- Safer activity-window calculations.
- Input and coordinate validation.
- API response validation.
- Request cancellation and stale-response protection.
- Caching and deduplication of environmental data requests.

## 4. How It Works

1. The user selects a location or grants browser location access.
2. The application retrieves weather and air quality information using geographic coordinates.
3. Environmental information is processed and validated by dedicated service modules.
4. The spatial grid retrieves environmental estimates for five surrounding sectors.
5. Deterministic safety rules generate contextual environmental guidance.
6. Users can interact with the AI assistant for additional explanations.
7. Authenticated users can manage household profiles, routines, and saved queries.

## 5. Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React 19, TypeScript |
| Styling | Tailwind CSS 4 |
| Backend | Node.js 24, Express 4 |
| AI Integration | Google Gemini API |
| Authentication | Firebase Authentication |
| Client Data | Firebase Firestore |
| Database | PostgreSQL, Drizzle ORM |
| Environmental Data | Open-Meteo APIs |
| Geocoding | Open-Meteo Geocoding, OpenStreetMap Nominatim |
| Visualization | Three.js, React Three Fiber, Recharts |
| Animations | GSAP, Motion |
| Build Tools | Vite, Bun, esbuild |
| Deployment | Vercel |

## 6. Project Architecture

The application uses a React frontend supported by an Express backend and dedicated service modules.

```text
Urban-Air-Quality-Assistant/
│
├── public/
│
├── src/
│   ├── components/
│   │   ├── AiAssistantChat.tsx
│   │   ├── AtmosphericMapSection.tsx
│   │   ├── HouseholdDbPanel.tsx
│   │   ├── HeroSection.tsx
│   │   └── ...
│   │
│   ├── context/
│   │   └── AuthContext.tsx
│   │
│   ├── data/
│   │
│   ├── db/
│   │   ├── schema.ts
│   │   ├── repository.ts
│   │   └── index.ts
│   │
│   ├── lib/
│   │   ├── firebase.ts
│   │   └── firebase-admin.ts
│   │
│   ├── middleware/
│   │   └── auth.ts
│   │
│   ├── services/
│   │   ├── airQualityService.ts
│   │   ├── weatherService.ts
│   │   ├── environmentalDataService.ts
│   │   ├── geolocationService.ts
│   │   ├── geocodingService.ts
│   │   └── safetyRules.ts
│   │
│   └── types/
│
├── tests/
│
├── server.entry.ts
├── package.json
├── tsconfig.json
├── vite.config.ts
└── vercel.json
```

## 7. Backend API

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Server health check |
| GET | `/api/reverse-geocode` | Reverse geocoding |
| GET | `/api/basin-grid` | Retrieve five-sector environmental grid |
| GET | `/api/user/workspace` | Retrieve user workspace |
| GET | `/api/user/profiles` | Retrieve household profiles |
| POST | `/api/user/profiles` | Create a household profile |
| PATCH | `/api/user/profiles/:id/activate` | Activate a profile |
| DELETE | `/api/user/profiles/:id` | Delete a profile |
| POST | `/api/user/queries` | Save user queries |
| POST | `/api/user/routines` | Create mitigation routines |
| PATCH | `/api/user/routines/:id` | Update mitigation routines |
| DELETE | `/api/user/routines/:id` | Delete mitigation routines |
| POST | `/api/chat` | AI assistant endpoint |

User-specific endpoints require authentication.

## 8. Getting Started

### Prerequisites

- Node.js 24.x
- Bun 1.x
- Git
- Firebase project
- Google Gemini API key
- PostgreSQL database

### Clone the Repository

```bash
git clone https://github.com/Saijesvanth-cmd/Urban-Air-Quality-Assistant--main.git
```

```bash
cd Urban-Air-Quality-Assistant--main
```

### Install Dependencies

```bash
bun install
```

### Configure Environment Variables

Create a `.env` file in the project root.

```env
PORT=3000

# AI Integration
GEMINI_API_KEY=your_gemini_api_key

# Firebase Admin
FIREBASE_SERVICE_ACCOUNT=your_firebase_service_account_json

# PostgreSQL Configuration
SQL_HOST=your_database_host
SQL_USER=your_database_user
SQL_PASSWORD=your_database_password
SQL_DB_NAME=your_database_name
SQL_SSL=true

# Optional
CORS_ORIGIN=
```

Configure the Firebase client using the required `firebase-applet-config.json` file.

Ensure that the Firebase client and Firebase Admin configurations belong to the same Firebase project.

**Security:** Never commit `.env` files, Firebase service-account credentials, or private API keys to version control. Server-side secrets must never use the `VITE_` prefix.

### Start the Development Server

```bash
bun run dev
```

## 9. Testing and Build

### Run Automated Tests

```bash
bun test
```

### TypeScript Validation

```bash
bun run lint
```

### Production Build

```bash
bun run build
```

## 10. Deployment

The project is configured for deployment on Vercel using its Express framework integration.

### Vercel Configuration

- Framework Preset: Express
- Root Directory: `.`
- Node.js Version: 24.x
- Bun Version: 1.x
- Install Command: `bun install --frozen-lockfile`
- Build Command: `bun run build`
- Output Directory: Leave unset.

Configure the required Firebase, Gemini, and PostgreSQL environment variables in Vercel before deployment.

Refer to [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md) for detailed deployment instructions and verification steps.

## 11. Data Sources and Important Notes

- **Open-Meteo:** Weather forecasts, air quality information, and geocoding.
- **OpenStreetMap Nominatim:** Reverse geocoding and locality information.
- **Google Gemini:** AI-powered environmental assistance.

Air quality values are modeled estimates obtained through environmental data services. They should not be interpreted as direct measurements from physical ground-based monitoring stations.

The five-sector spatial grid is an application-level environmental visualization, not a network of independent physical sensors.

Environmental guidance is informational and should not replace official public-health advisories.

## 12. Current Limitations

- Production PostgreSQL persistence and Firebase authentication require deployment-specific configuration and verification.
- Gemini production integration requires a valid server-side API key.
- Nominatim rate limiting is currently process-local; a shared rate limiter is needed when operating across multiple server instances.
- Large frontend bundle size remains a performance optimization opportunity.
- Full browser compatibility, responsive-layout, and production integration testing remain ongoing.

## 13. Future Enhancements

- Expanded environmental trend analysis.
- More granular location-based environmental insights.
- Improved personalized environmental recommendations.
- Enhanced performance and frontend bundle optimization.
- More extensive production and browser testing.

## 14. License

Specify an open-source license before distributing the project under one.
