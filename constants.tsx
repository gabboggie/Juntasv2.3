import { ExperienceType } from './types.ts';

export const COLORS = {
  Brown: '#8B4513',
  Orange: '#FB923C',
  Blue: '#38BDF8',
  Green: '#4ADE80',
  Red: '#EF4444',
  Purple: '#A78BFA',
  Yellow: '#FBBF24',
  Grey: '#6B7280',
};

const BASE_URL = 'https://gabboggie.com/wp-content/uploads/2026/01/';

export const TYPE_CONFIG: Record<ExperienceType, { color: string; image: string }> = {
  [ExperienceType.COCINA]: {
    color: COLORS.Orange,
    image: `${BASE_URL}stamp_cocina.png`
  },
  [ExperienceType.ASADO]: {
    color: COLORS.Brown,
    image: `${BASE_URL}stamp_asado.png`
  },
  [ExperienceType.JUEGOS]: {
    color: COLORS.Red,
    image: `${BASE_URL}stamp_boardg.png`
  },
  [ExperienceType.CINE]: {
    color: COLORS.Grey,
    image: `${BASE_URL}stamp_movie.png`
  },
  [ExperienceType.PLAYA]: {
    color: COLORS.Yellow,
    image: `${BASE_URL}stamp_playa.png`
  },
  [ExperienceType.ROADTRIP]: {
    color: COLORS.Green,
    image: `${BASE_URL}stamp_roadtrip.png`
  },
  [ExperienceType.EVENTO]: {
    color: COLORS.Purple,
    image: `${BASE_URL}stamp_special.png`
  },
  [ExperienceType.AVION]: {
    color: COLORS.Blue,
    image: `${BASE_URL}stamp_viajeavion.png`
  },
};