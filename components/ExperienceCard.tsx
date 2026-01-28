
import React from 'react';
import { Experience } from '../types';
import { Stamp } from './Stamp';

interface ExperienceCardProps {
  experience: Experience;
  onClick: (exp: Experience) => void;
}

export const ExperienceCard: React.FC<ExperienceCardProps> = ({ experience, onClick }) => {
  return (
    <div 
      onClick={() => onClick(experience)}
      className="bg-white rounded-3xl p-6 shadow-md border-2 border-gray-100 flex flex-col items-center gap-4 cursor-pointer hover:border-orange-400 transition-all transform active:scale-95"
    >
      <Stamp type={experience.type} size="md" date={experience.date} />
      
      <div className="text-center">
        <h3 className="text-lg font-black text-black line-clamp-1">{experience.title}</h3>
        <p className="text-sm font-bold text-gray-800">{experience.locationName}</p>
        <p className="text-xs font-black text-orange-800 mt-1 uppercase tracking-tighter">
          {new Date(experience.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>
      </div>
    </div>
  );
};
