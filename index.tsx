
import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { GoogleGenAI, Type } from "@google/genai";

// --- CONFIGURACIÓN Y TIPOS ---

enum ExperienceType {
  COCINA = 'Cocina en casa',
  ASADO = 'Asado',
  JUEGOS = 'Juegos de mesa',
  CINE = 'Día de Película',
  PLAYA = 'Playa',
  ROADTRIP = 'Roadtrip',
  EVENTO = 'Evento especial',
  AVION = 'Viaje en avión'
}

interface Experience {
  id: string;
  title: string;
  type: ExperienceType;
  date: string;
  locationName: string;
  coordinates: { lat: number; lng: number };
  note: string;
  photoUrl?: string;
  createdBy: string;
  createdAt: number;
}

const LOGO_URL = 'https://gabboggie.com/wp-content/uploads/2026/01/psprt_beige.png';
const BASE_URL = 'https://gabboggie.com/wp-content/uploads/2026/01/';

const firebaseConfig = {
  apiKey: "AIzaSyCG5yMvm_rKwYrmFW_5QZOn8G4", 
  authDomain: "juntas-bitacora.firebaseapp.com",
  projectId: "juntas-bitacora",
  storageBucket: "juntas-bitacora.firebasestorage.app",
  messagingSenderId: "1054570412142",
  appId: "1:1054570412142:web:3312e3c4e0f4974f7620a2"
};

const TYPE_CONFIG: Record<string, { color: string; image: string }> = {
  [ExperienceType.COCINA]: { color: '#FB923C', image: `${BASE_URL}stamp_cocina.png` },
  [ExperienceType.ASADO]: { color: '#8B4513', image: `${BASE_URL}stamp_asado.png` },
  [ExperienceType.JUEGOS]: { color: '#EF4444', image: `${BASE_URL}stamp_boardg.png` },
  [ExperienceType.CINE]: { color: '#6B7280', image: `${BASE_URL}stamp_movie.png` },
  [ExperienceType.PLAYA]: { color: '#FBBF24', image: `${BASE_URL}stamp_playa.png` },
  [ExperienceType.ROADTRIP]: { color: '#4ADE80', image: `${BASE_URL}stamp_roadtrip.png` },
  [ExperienceType.EVENTO]: { color: '#A78BFA', image: `${BASE_URL}stamp_special.png` },
  [ExperienceType.AVION]: { color: '#38BDF8', image: `${BASE_URL}stamp_viajeavion.png` },
};

// --- SERVICIOS ---

let db: any = null;
try {
  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  db = getFirestore(app);
} catch (e) {
  console.error("Error al inicializar Firebase:", e);
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const getCoordinates = async (location: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Provide the latitude and longitude coordinates for "${location}" in JSON format.`,
      config: { 
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: { lat: { type: Type.NUMBER }, lng: { type: Type.NUMBER } },
          required: ["lat", "lng"]
        }
      }
    });
    return JSON.parse(response.text || "{}");
  } catch (e) { return null; }
};

const suggestNote = async (title: string, type: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Escribe una nota corta, romántica e íntima para una bitácora entre dos mujeres sobre "${title}" (${type}). Máximo 12 palabras.`,
    });
    return response.text?.trim() || "Un momento inolvidable juntas.";
  } catch (e) { return "Un día más en nuestra historia."; }
};

// --- COMPONENTES ---

const Stamp = ({ type, size = 'md', date }: { type: string, size?: string, date?: string }) => {
  const [error, setError] = useState(false);
  const config = TYPE_CONFIG[type];
  if (!config) return null;

  const sizeClasses: Record<string, string> = { 
    xs: 'w-10 h-10', sm: 'w-16 h-16', md: 'w-24 h-24', lg: 'w-48 h-48' 
  };

  return (
    <div className={`relative ${sizeClasses[size]} flex items-center justify-center transition-transform active:scale-95`}>
      <div className="w-full h-full relative z-10 stamp-shadow">
        {!error ? (
          <img src={config.image} alt={type} className="w-full h-full object-contain pointer-events-none" onError={() => setError(true)} />
        ) : (
          <div className="w-full h-full rounded-full border-4 border-black bg-white flex items-center justify-center p-2 text-center" style={{ borderColor: config.color }}>
             <span className="text-[9px] font-black uppercase text-black leading-tight">{type}</span>
          </div>
        )}
      </div>
      {date && size === 'lg' && (
        <div className="absolute -bottom-2 z-20 bg-black text-white px-3 py-1 rounded border-2 border-white text-[10px] font-black uppercase rotate-[-2deg] shadow-lg">
          {new Date(date).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })}
        </div>
      )}
    </div>
  );
};

const MapView = ({ experiences, onPinClick }: { experiences: Experience[], onPinClick: (e: Experience) => void }) => {
  const mapRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || typeof (window as any).L === 'undefined') return;
    const L = (window as any).L;

    if (!mapRef.current) {
      mapRef.current = L.map(containerRef.current, { zoomControl: false, attributionControl: false }).setView([20, 0], 2);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png').addTo(mapRef.current);
    }

    const markers = L.featureGroup().addTo(mapRef.current);
    markers.clearLayers();

    experiences.forEach((exp) => {
      if (exp.coordinates?.lat) {
        const icon = L.divIcon({
          className: 'custom-pin',
          html: `<div style="background:${TYPE_CONFIG[exp.type]?.color || '#000'};width:22px;height:22px;border:4px solid black;border-radius:50%;box-shadow:3px 3px 0px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;font-size:12px;">📍</div>`
        });
        L.marker([exp.coordinates.lat, exp.coordinates.lng], { icon })
         .on('click', () => onPinClick(exp))
         .addTo(markers);
      }
    });

    if (experiences.some((e) => e.coordinates?.lat)) {
      try { mapRef.current.fitBounds(markers.getBounds(), { padding: [50, 50] }); } catch(e){}
    }
  }, [experiences]);

  return <div ref={containerRef} className="w-full h-full" />;
};

// --- APP PRINCIPAL ---

const App = () => {
  const [user, setUser] = useState<any>(null);
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [view, setView] = useState('passport');
  const [selectedExp, setSelectedExp] = useState<Experience | null>(null);
  const [loading, setLoading] = useState(true);
  const [suggesting, setSuggesting] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [newExp, setNewExp] = useState({ title: '', type: ExperienceType.COCINA, date: new Date().toISOString().split('T')[0], locationName: '', note: '', photoUrl: '' });

  useEffect(() => {
    const saved = localStorage.getItem('juntas_v3_session');
    if (saved) setUser(JSON.parse(saved));
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user && db) {
      const q = query(collection(db, "memories"), orderBy("date", "desc"));
      return onSnapshot(q, (snapshot) => {
        setExperiences(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Experience)));
      });
    }
  }, [user]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.toLowerCase() === 'leo' && password === 'Bielorusia_83') {
      const session = { name: 'Leo', loginAt: Date.now() };
      setUser(session);
      localStorage.setItem('juntas_v3_session', JSON.stringify(session));
    } else { alert("Acceso denegado 🔒"); }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const coords = await getCoordinates(newExp.locationName);
      await addDoc(collection(db, "memories"), { 
        ...newExp, 
        coordinates: coords,
        createdAt: Date.now(), 
        createdBy: user.name 
      });
      (window as any).confetti && (window as any).confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
      setView('passport');
      setNewExp({ title: '', type: ExperienceType.COCINA, date: new Date().toISOString().split('T')[0], locationName: '', note: '', photoUrl: '' });
    } catch (err) { alert("Error al guardar"); }
    finally { setLoading(false); }
  };

  const handleSuggest = async () => {
    if (!newExp.title) return alert("Escribe un título primero");
    setSuggesting(true);
    const note = await suggestNote(newExp.title, newExp.type);
    setNewExp(prev => ({ ...prev, note }));
    setSuggesting(false);
  };

  if (loading && !user) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FFFDF7]">
      <img src={LOGO_URL} className="w-16 h-16 animate-pulse-soft rounded-2xl mb-4" />
      <div className="w-8 h-8 border-4 border-black border-t-orange-500 rounded-full animate-spin"></div>
    </div>
  );

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-[#FFFDF7]">
      <div className="w-full max-w-sm text-center">
        <img src={LOGO_URL} className="w-24 h-24 mx-auto mb-10 rounded-[2rem] border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]" />
        <h1 className="text-5xl font-black mb-10 italic font-serif tracking-tighter">Juntas</h1>
        <form onSubmit={handleLogin} className="space-y-4">
          <input type="text" placeholder="¿Quién eres?" className="w-full p-5 border-4 border-black rounded-2xl font-black bg-white focus:translate-y-[-2px] transition-all outline-none" onChange={e => setUsername(e.target.value)} />
          <input type="password" placeholder="Clave secreta" className="w-full p-5 border-4 border-black rounded-2xl font-black bg-white focus:translate-y-[-2px] transition-all outline-none" onChange={e => setPassword(e.target.value)} />
          <button className="w-full bg-black text-white p-5 rounded-2xl font-black uppercase shadow-[6px_6px_0px_0px_rgba(251,146,60,1)] active:translate-y-1 active:shadow-none transition-all">Abrir Bitácora</button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pb-32 bg-[#FFFDF7]">
      <header className="p-5 bg-white border-b-4 border-black flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-2" onClick={() => setView('passport')}>
          <img src={LOGO_URL} className="w-10 h-10 rounded-xl border-2 border-black" />
          <span className="text-2xl font-black italic font-serif">Juntas</span>
        </div>
        <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-[10px] font-black uppercase text-gray-400">En la nube</span>
        </div>
      </header>

      <main className="p-6">
        {view === 'passport' && (
          <div className="grid grid-cols-2 gap-5">
            {experiences.map(exp => (
              <div key={exp.id} onClick={() => setSelectedExp(exp)} className="bg-white p-5 border-4 border-black rounded-[2.5rem] text-center active:scale-95 transition-all shadow-sm">
                <div className="flex justify-center"><Stamp type={exp.type} size="md" /></div>
                <h3 className="font-black text-[11px] mt-4 uppercase truncate text-black tracking-tight">{exp.title}</h3>
                <p className="text-[9px] font-bold text-gray-400 mt-1">{new Date(exp.date).toLocaleDateString('es-ES')}</p>
              </div>
            ))}
            {experiences.length === 0 && (
                <div className="col-span-2 py-40 text-center opacity-20">
                    <p className="font-black uppercase tracking-widest text-xs">Bitácora vacía...</p>
                </div>
            )}
          </div>
        )}

        {view === 'map' && (
          <div className="h-[75vh] w-full rounded-[3rem] border-4 border-black overflow-hidden shadow-lg">
            <MapView experiences={experiences} onPinClick={setSelectedExp} />
          </div>
        )}

        {view === 'add' && (
          <form onSubmit={handleAdd} className="space-y-5 bg-white p-8 border-4 border-black rounded-[3rem] shadow-[12px_12px_0px_0px_rgba(251,146,60,1)] max-w-md mx-auto">
            <h2 className="text-3xl font-black font-serif italic mb-6">Nuevo Sello</h2>
            <div className="flex justify-center py-4">
              <Stamp type={newExp.type} size="lg" />
            </div>
            <input placeholder="Título del momento" className="w-full p-4 border-2 border-black rounded-2xl font-bold bg-[#F9F9F9]" value={newExp.title} onChange={e => setNewExp({...newExp, title: e.target.value})} required />
            <div className="grid grid-cols-2 gap-3">
              <select className="p-4 border-2 border-black rounded-2xl font-bold bg-white text-xs" value={newExp.type} onChange={e => setNewExp({...newExp, type: e.target.value as ExperienceType})}>
                {Object.values(ExperienceType).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <input type="date" className="p-4 border-2 border-black rounded-2xl font-bold text-xs" value={newExp.date} onChange={e => setNewExp({...newExp, date: e.target.value})} required />
            </div>
            <input placeholder="Ubicación (Ciudad, País)" className="w-full p-4 border-2 border-black rounded-2xl font-bold bg-[#F9F9F9]" value={newExp.locationName} onChange={e => setNewExp({...newExp, locationName: e.target.value})} required />
            <div className="relative">
              <div className="flex justify-between items-center mb-1 ml-2">
                <label className="text-[10px] font-black uppercase text-gray-400">Nota</label>
                <button type="button" onClick={handleSuggest} className="text-[9px] font-black bg-orange-100 text-orange-600 px-3 py-1 rounded-full uppercase hover:bg-orange-200 transition-colors">
                    {suggesting ? '✨...' : '✨ Inspiración'}
                </button>
              </div>
              <textarea placeholder="Cuéntame algo de ese día..." className="w-full p-4 border-2 border-black rounded-2xl font-bold h-24 resize-none bg-[#F9F9F9]" value={newExp.note} onChange={e => setNewExp({...newExp, note: e.target.value})} />
            </div>
            <button type="submit" className="w-full bg-black text-white p-5 rounded-2xl font-black uppercase tracking-widest shadow-lg active:translate-y-1 transition-all">Sellar Pasaporte</button>
          </form>
        )}
      </main>

      {selectedExp && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md" onClick={() => setSelectedExp(null)}>
          <div className="bg-white p-10 border-8 border-black rounded-[4rem] w-full max-w-sm text-center relative shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-center"><Stamp type={selectedExp.type} size="lg" date={selectedExp.date} /></div>
            <h2 className="text-4xl font-black italic mt-10 leading-tight font-serif text-black">{selectedExp.title}</h2>
            <div className="w-12 h-1 bg-orange-400 mx-auto my-8 rounded-full"></div>
            <p className="text-xl font-bold italic text-gray-700 leading-relaxed">"{selectedExp.note || 'Un día más juntas.'}"</p>
            <div className="mt-10 bg-gray-50 p-5 rounded-3xl border-2 border-gray-100">
               <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">{selectedExp.locationName}</p>
               <span className="text-[8px] font-black uppercase opacity-30">Registrado por {selectedExp.createdBy}</span>
            </div>
            <button onClick={async () => {
                if(confirm("¿Borrar este recuerdo?")){
                    await deleteDoc(doc(db, "memories", selectedExp.id));
                    setSelectedExp(null);
                }
            }} className="mt-8 text-[10px] font-black uppercase text-red-300 hover:text-red-500 transition-colors">Eliminar Sello</button>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t-4 border-black p-5 flex justify-around items-center z-50 pb-safe shadow-2xl">
        <button onClick={() => setView('add')} className={`flex flex-col items-center gap-1 ${view === 'add' ? 'text-orange-500 scale-110' : 'text-gray-300'} transition-all`}>
          <span className="text-2xl">✨</span>
          <span className="text-[8px] font-black uppercase">Nuevo</span>
        </button>
        <button onClick={() => setView('map')} className={`flex flex-col items-center gap-1 ${view === 'map' ? 'text-orange-500 scale-110' : 'text-gray-300'} transition-all`}>
          <span className="text-2xl">🗺️</span>
          <span className="text-[8px] font-black uppercase">Mapa</span>
        </button>
        <button onClick={() => setView('passport')} className={`flex flex-col items-center gap-1 ${view === 'passport' ? 'text-orange-500 scale-110' : 'text-gray-300'} transition-all`}>
          <span className="text-2xl">📖</span>
          <span className="text-[8px] font-black uppercase">Bitácora</span>
        </button>
      </nav>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
