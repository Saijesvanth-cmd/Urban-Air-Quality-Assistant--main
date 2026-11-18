export interface ShowcaseProject {
  id: string;
  channel: string;
  title: string;
  client: string;
  category: string;
  year: string;
  image: string;
  alt: string;
  summary: string;
  challenge: string;
  direction: string;
  deliverables: string[];
  metricLabel: string;
  metricValue: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  discipline: string;
  location: string;
  image: string;
  alt: string;
  bio: string;
  credits: string[];
}

export interface StudioCapability {
  index: string;
  title: string;
  description: string;
}

export const SHOWCASE_PROJECTS: ShowcaseProject[] = [
  {
    id: 'aurora-mk2',
    channel: 'CH 01',
    title: 'Aurora Mk.II Analog Telemetry',
    client: 'Aurora Instruments UK',
    category: 'Hardware Identity & Broadcast UI',
    year: '2026',
    image: '/src/assets/images/crt_synth_telemetry_1794998734001.jpg',
    alt: 'Brushed black analog synthesizer with glowing amber vacuum tubes and segmented LED meters',
    summary:
      'Industrial typography, amber vacuum-tube hardware art direction, and companion spatial patch interface for an analog mastering synthesizer.',
    challenge:
      'Bridge tactile 1970s British console ergonomics with modern browser-based patch recall without losing the warmth of physical metering.',
    direction:
      'We crafted bespoke condensed numerals, tungsten-calibrated amber LED indicators, and a low-latency WebGL oscilloscope visualizer.',
    deliverables: ['Brand Identity', 'Hardware Typography', 'Interactive Patch UI', 'Launch Film'],
    metricLabel: 'First-Batch Allocation',
    metricValue: 'Sold Out in 14m',
  },
  {
    id: 'monolith-kunsthalle',
    channel: 'CH 02',
    title: 'Kunsthalle Brutalist Atrium',
    client: 'Kunsthalle Basel Archive',
    category: 'Spatial Direction & Exhibition Film',
    year: '2025',
    image: '/src/assets/images/crt_monolith_gallery_1794998733089.jpg',
    alt: 'Monumental concrete museum atrium illuminated by a shaft of warm golden sunlight',
    summary:
      'Architectural exhibition identity, cast-bronze wayfinding system, and 35mm documentary short celebrating post-war raw concrete acoustics.',
    challenge:
      'Unify three multi-level gallery wings with an unobtrusive visual system that respects raw board-formed concrete surfaces.',
    direction:
      'Inspired by solar noon light shafts, we designed directional light-projected signage paired with a digital monograph archive.',
    deliverables: ['Exhibition Identity', '35mm Documentary', 'Digital Archive', 'Print Monograph'],
    metricLabel: 'Exhibition Attendance',
    metricValue: '142,000 Visitors',
  },
  {
    id: 'atelier-nocturne',
    channel: 'CH 03',
    title: 'Atelier Nocturne 35mm Campaign',
    client: 'Maison Nocturne Paris',
    category: 'Creative Direction & Motion System',
    year: '2025',
    image: '/src/assets/images/crt_cinema_fashion_1794998732674.jpg',
    alt: 'High-contrast 35mm fashion editorial portrait in dark sculptural coat lit by warm projector beam',
    summary:
      'Projector-lit lookbook cinema, kinetic title architecture, and bespoke digital flagship for an independent Parisian outerwear house.',
    challenge:
      'Replace sterile white-box e-commerce templates with the atmospheric tension of an analog projection room.',
    direction:
      'Shot entirely on tungsten-balanced 35mm film stock and translated into an ultra-smooth, scroll-choreographed digital showroom.',
    deliverables: ['Art Direction', '35mm Lookbook', 'Digital Flagship', 'Sound Design'],
    metricLabel: 'Average Session Dwell',
    metricValue: '4m 48s',
  },
];

export const TEAM_MEMBERS: TeamMember[] = [
  {
    id: 'julian-vance',
    name: 'Julian Vance',
    role: 'Founding Creative Director',
    discipline: 'Identity & Architectural Art Direction',
    location: 'London · Zurich',
    image: '/src/assets/images/team_creative_director_1794998733176.jpg',
    alt: 'Editorial studio portrait of Julian Vance in black turtleneck with warm amber rim lighting',
    bio: 'Fifteen years shaping cultural institutions, audio hardware brands, and monograph systems across Europe. Leads creative strategy and typographic rigor.',
    credits: ['D&AD Graphite Pencil', 'Swiss Design Award Nominee', 'Type Directors Club'],
  },
  {
    id: 'sora-takahashi',
    name: 'Sora Takahashi',
    role: 'Head of Motion & Broadcast',
    discipline: '35mm Cinema & Kinetic Systems',
    location: 'Tokyo · London',
    image: '/src/assets/images/team_motion_lead_1794998735906.jpg',
    alt: 'Editorial studio portrait of Sora Takahashi wearing architectural glasses in moody studio light',
    bio: 'Directs optical title sequences, analog-hybrid lookbooks, and spatial projection installations where broadcast pacing meets Swiss grid discipline.',
    credits: ['ADC Gold Cube', 'Cannes Lions Shortlist', 'Vimeo Staff Pick x4'],
  },
  {
    id: 'marcus-lindqvist',
    name: 'Marcus Lindqvist',
    role: 'Principal Interactive Technologist',
    discipline: 'WebGL Shaders & Tactile Interfaces',
    location: 'Stockholm · Berlin',
    image: '/src/assets/images/team_tech_lead_1794998734994.jpg',
    alt: 'Editorial studio portrait of Marcus Lindqvist in minimalist dark jacket in front of studio displays',
    bio: 'Architects hardware-accelerated web experiences, custom shader pipelines, and zero-latency interactive flagships built to age gracefully.',
    credits: ['FWA of the Month', 'Awwwards Developer Award', 'WebGL Audio Lab'],
  },
];

export const STUDIO_CAPABILITIES: StudioCapability[] = [
  {
    index: '01.',
    title: 'Identity & Editorial Systems',
    description:
      'Foundational brand worlds, custom typographic specimens, and tactile print-to-screen design languages built with unmistakable restraint.',
  },
  {
    index: '02.',
    title: 'Broadcast & Analog Motion',
    description:
      'Title sequences, optical 35mm campaigns, and kinetic identity systems calibrated for cinemas, hardware launches, and cultural stages.',
  },
  {
    index: '03.',
    title: 'Interactive Flagships',
    description:
      'High-craft web architecture, subtle custom physics, and hardware-accelerated storytelling engineered to hold attention without clutter.',
  },
];
