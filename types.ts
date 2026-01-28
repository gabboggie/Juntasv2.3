
export enum ExperienceType {
  COCINA = 'Cocina en casa',
  ASADO = 'Asado',
  JUEGOS = 'Juegos de mesa',
  CINE = 'Día de Película',
  PLAYA = 'Playa',
  ROADTRIP = 'Roadtrip',
  EVENTO = 'Evento especial',
  AVION = 'Viaje en avión'
}

export interface Experience {
  id: string;
  title: string;
  type: ExperienceType;
  date: string;
  locationName: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  note: string;
  photoUrl?: string;
  createdBy: string;
  createdAt: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  partnerId: string;
}

export type ViewType = 'passport' | 'map' | 'calendar' | 'categories' | 'add' | 'settings';
