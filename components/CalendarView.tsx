import React, { useState } from 'react';
import { Experience } from '../types.ts';
import { Stamp } from './Stamp.tsx';

interface CalendarViewProps {
  experiences: Experience[];
  onSelectExperience: (exp: Experience) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ experiences, onSelectExperience }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const monthName = currentDate.toLocaleString('es-ES', { month: 'long' });
  const year = currentDate.getFullYear();

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const totalDays = daysInMonth(currentDate.getFullYear(), currentDate.getMonth());
  const startOffset = firstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth());

  const days = [];
  for (let i = 0; i < startOffset; i++) days.push(null);
  for (let i = 1; i <= totalDays; i++) days.push(i);

  const getMemoriesForDay = (day: number) => {
    return experiences.filter(exp => {
      const d = new Date(exp.date);
      // Adding offset fix for localized dates if needed, but standard ISO should work
      return d.getUTCDate() === day && d.getUTCMonth() === currentDate.getMonth() && d.getUTCFullYear() === currentDate.getFullYear();
    });
  };

  return (
    <div className="bg-white rounded-[2rem] border-8 border-black p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-6">
        <button onClick={prevMonth} className="p-2 border-4 border-black rounded-xl hover:bg-orange-50 transition-all active:scale-90">
          <svg viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="4" className="w-5 h-5"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <h2 className="text-2xl font-black text-black capitalize font-serif">{monthName} <span className="text-orange-600">{year}</span></h2>
        <button onClick={nextMonth} className="p-2 border-4 border-black rounded-xl hover:bg-orange-50 transition-all active:scale-90">
          <svg viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="4" className="w-5 h-5"><polyline points="9 18 15 12 9 6" /></svg>
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map(d => (
          <div key={d} className="text-center text-[10px] font-black text-gray-400 uppercase">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day, idx) => {
          if (day === null) return <div key={`empty-${idx}`} className="h-20" />;
          
          const memories = getMemoriesForDay(day);
          const isToday = day === new Date().getDate() && currentDate.getMonth() === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear();

          return (
            <div 
              key={day} 
              className={`h-20 sm:h-24 border-2 border-black rounded-xl p-1 relative flex flex-col items-center justify-start overflow-hidden transition-all ${isToday ? 'bg-orange-50 ring-2 ring-orange-500 ring-inset' : 'bg-white'}`}
            >
              <span className={`text-[10px] font-black absolute top-1 left-1.5 ${isToday ? 'text-orange-600' : 'text-black opacity-30'}`}>{day}</span>
              <div className="mt-4 flex flex-wrap gap-0.5 justify-center w-full">
                {memories.map(mem => (
                  <div key={mem.id} onClick={() => onSelectExperience(mem)} className="scale-75 -m-2 hover:scale-100 transition-transform">
                    <Stamp type={mem.type} size="xs" />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};