
import React, { useState, useEffect } from 'react';
import { User, Experience, ViewType, ExperienceType } from './types';
import { Navigation } from './components/Navigation';
import { ExperienceCard } from './components/ExperienceCard';
import { MapView } from './components/MapView';
import { CalendarView } from './components/CalendarView';
import { Stamp } from './components/Stamp';
import { TYPE_CONFIG } from './constants';
import { getGeocodingFromGemini, suggestEmotionalNote } from './services/geminiService';
import { subscribeToMemories, saveMemoryToCloud } from './services/firebaseService';

const LOGO_URL = 'https://gabboggie.com/wp-content/uploads/2026/01/psprt_beige.png';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [view, setView] = useState<ViewType>('passport');
  const [selectedExp, setSelectedExp] = useState<Experience | null>(null);
  const [filterType, setFilterType] = useState<ExperienceType | 'Todas'>('Todas');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCloudSynced, setIsCloudSynced] = useState(false);
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState(false);
  
  const [newExp, setNewExp] = useState({
    title: '',
    type: ExperienceType.COCINA,
    date: new Date().toISOString().split('T')[0],
    locationName: '',
    note: '',
    photoUrl: '',
  });
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('juntas_user');
    if (savedUser) setUser(JSON.parse(savedUser));
  }, []);

  // Sincronización con Firebase
  useEffect(() => {
    if (user) {
      const unsubscribe = subscribeToMemories((cloudMemories) => {
        if (cloudMemories.length > 0) {
          setExperiences(cloudMemories);
          setIsCloudSynced(true);
        } else {
          // Fallback a local si no hay nube o está vacío
          const savedExps = localStorage.getItem('juntas_experiences');
          if (savedExps) setExperiences(JSON.parse(savedExps));
        }
      });
      return () => unsubscribe();
    }
  }, [user]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'Leo' && password === 'Bielorusia_83') {
      const mockUser: User = { id: 'u1', email: 'leo@juntas.app', name: 'Leo', partnerId: 'u2' };
      setUser(mockUser);
      setLoginError(false);
      localStorage.setItem('juntas_user', JSON.stringify(mockUser));
    } else {
      setLoginError(true);
      setTimeout(() => setLoginError(false), 3000);
    }
  };

  const handleLogout = () => {
    if (confirm("¿Cerrar bitácora? Tus datos se mantendrán en la nube.")) {
      setUser(null);
      localStorage.removeItem('juntas_user');
      setIsSidebarOpen(false);
    }
  };

  const compressImage = (base64Str: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 600; // Un poco más pequeño para Firestore (1MB limit por doc)
        let width = img.width;
        let height = img.height;
        if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.5)); // Mayor compresión para la nube
      };
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const compressed = await compressImage(reader.result as string);
        setNewExp(prev => ({ ...prev, photoUrl: compressed }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddExperience = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    let coords = { lat: 0, lng: 0 };
    if (newExp.locationName) {
      const result = await getGeocodingFromGemini(newExp.locationName);
      if (result) coords = result;
    }
    
    const expData = {
      ...newExp,
      coordinates: coords,
      createdBy: user?.name || 'Leo',
      createdAt: Date.now(),
    };

    // Intentar guardar en la nube
    const cloudId = await saveMemoryToCloud(expData);
    
    if (!cloudId) {
      // Si falla Firebase, guardar localmente como antes
      const exp: Experience = { id: Math.random().toString(36).substr(2, 9), ...expData };
      setExperiences(prev => [exp, ...prev]);
      localStorage.setItem('juntas_experiences', JSON.stringify([exp, ...experiences]));
    }

    setIsGenerating(false);
    setView('passport');
    setNewExp({ title: '', type: ExperienceType.COCINA, date: new Date().toISOString().split('T')[0], locationName: '', note: '', photoUrl: '' });
  };

  const generateAIPrompt = async () => {
    if (!newExp.title || !newExp.locationName) return;
    setIsGenerating(true);
    const note = await suggestEmotionalNote(newExp.title, newExp.type, newExp.locationName);
    setNewExp(prev => ({ ...prev, note }));
    setIsGenerating(false);
  };

  const changeView = (newView: ViewType) => { setView(newView); setIsSidebarOpen(false); };

  const filteredExperiences = experiences.filter(exp => filterType === 'Todas' || exp.type === filterType).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#FFFDF7]">
        <div className="w-full max-w-md text-center">
          <div className="mb-6 flex justify-center">
             <div className="w-36 h-36 bg-white border-8 border-black rounded-[2rem] flex items-center justify-center p-0 shadow-[14px_14px_0px_0px_rgba(0,0,0,1)] rotate-[-2deg] overflow-hidden">
               <img src={LOGO_URL} alt="Juntas Logo" className="w-full h-full object-cover" />
             </div>
          </div>
          <h1 className="text-6xl font-black text-black mb-1 font-serif tracking-tighter italic">Juntas</h1>
          <p className="text-black font-bold mb-10 italic px-4 text-sm opacity-80 uppercase tracking-widest">Nuestra bitácora privada</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1 text-left">
              <label className="text-[10px] font-black uppercase text-gray-400 ml-4 tracking-widest">Usuario</label>
              <input type="text" placeholder="Nombre de usuario" className={`w-full px-6 py-4 rounded-2xl bg-white border-4 border-black text-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] outline-none font-black focus:translate-y-[-2px] transition-all ${loginError ? 'border-red-500' : 'border-black'}`} value={username} onChange={(e) => setUsername(e.target.value)} required />
            </div>
            <div className="space-y-1 text-left">
              <label className="text-[10px] font-black uppercase text-gray-400 ml-4 tracking-widest">Clave</label>
              <input type="password" placeholder="Contraseña secreta" className={`w-full px-6 py-4 rounded-2xl bg-white border-4 border-black text-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] outline-none font-black focus:translate-y-[-2px] transition-all ${loginError ? 'border-red-500' : 'border-black'}`} value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {loginError && <p className="text-red-500 text-[10px] font-black uppercase tracking-widest">Credenciales incorrectas</p>}
            <button type="submit" className="w-full bg-black text-white font-black py-5 rounded-2xl shadow-[8px_8px_0px_0px_rgba(251,146,60,1)] hover:translate-y-[-2px] active:translate-y-[2px] transition-all uppercase tracking-widest text-lg mt-4">Abrir bitácora</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 bg-[#FFFDF7]">
      {isSidebarOpen && (
        <>
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200]" onClick={() => setIsSidebarOpen(false)} />
          <div className="fixed top-0 left-0 h-full w-80 bg-white z-[201] shadow-2xl border-r-8 border-black p-8 flex flex-col animate-in slide-in-from-left duration-300">
            <div className="flex items-center gap-4 mb-10">
              <div className="w-14 h-14 border-4 border-black rounded-xl overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <img src={LOGO_URL} alt="Logo" className="w-full h-full object-cover" />
              </div>
              <h2 className="text-3xl font-black text-black font-serif">Menú</h2>
            </div>
            <nav className="flex flex-col gap-4 overflow-y-auto no-scrollbar">
              {[
                { id: 'passport', label: 'Inicio', icon: '📖' },
                { id: 'add', label: 'Agregar sello', icon: '✨' },
                { id: 'map', label: 'Mapa', icon: '🗺️' },
                { id: 'calendar', label: 'Calendario', icon: '📅' },
                { id: 'categories', label: 'Colección', icon: '🗂️' },
                { id: 'settings', label: 'Configuración', icon: '⚙️' },
              ].map((item) => (
                <button key={item.id} onClick={() => changeView(item.id as ViewType)} className={`flex items-center gap-4 text-left p-5 rounded-2xl border-4 transition-all ${view === item.id ? 'bg-black text-white border-black shadow-[6px_6px_0px_0px_rgba(251,146,60,1)]' : 'bg-white text-black border-black hover:bg-orange-50'}`}>
                  <span className="text-2xl">{item.icon}</span>
                  <span className="text-xl font-black uppercase tracking-tight">{item.label}</span>
                </button>
              ))}
              <button onClick={handleLogout} className="flex items-center gap-4 text-left p-5 rounded-2xl border-4 bg-red-50 text-red-600 border-red-600 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.1)] mt-4">
                <span className="text-2xl">👋</span>
                <span className="text-xl font-black uppercase tracking-tight">Salir</span>
              </button>
            </nav>
          </div>
        </>
      )}

      <header className="p-4 flex justify-between items-center bg-white border-b-4 border-black sticky top-0 z-[100]">
        <div className="flex items-center gap-3">
          <button onClick={() => setIsSidebarOpen(true)} className="p-3 bg-white border-4 border-black rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none transition-all">
            <svg viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="4" className="w-6 h-6"><line x1="4" y1="7" x2="20" y2="7" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="17" x2="20" y2="17" /></svg>
          </button>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <img src={LOGO_URL} alt="Juntas Logo" className="w-8 h-8 object-cover rounded-lg border-2 border-black" />
              <h1 className="text-xl font-black text-black font-serif italic pt-1">Juntas</h1>
            </div>
            {isCloudSynced && <span className="text-[8px] font-black uppercase text-green-600 tracking-widest mt-[-2px]">● Compartido en tiempo real</span>}
          </div>
        </div>
      </header>

      <main className="px-6 py-6">
        {view === 'passport' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex gap-2 mb-8 overflow-x-auto pb-4 no-scrollbar">
              {['Todas', ...Object.values(ExperienceType)].map((type) => (
                <button key={type} onClick={() => setFilterType(type as any)} className={`px-5 py-2.5 rounded-full text-xs font-black border-4 whitespace-nowrap transition-all ${filterType === type ? 'bg-black border-black text-white shadow-[4px_4px_0px_0px_rgba(139,69,19,1)]' : 'bg-white text-black border-black hover:bg-orange-50'}`}>{type}</button>
              ))}
            </div>
            {filteredExperiences.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {filteredExperiences.map((exp) => <ExperienceCard key={exp.id} experience={exp} onClick={setSelectedExp} />)}
              </div>
            ) : (
              <div className="text-center py-20 bg-white border-8 border-dashed border-gray-200 rounded-[3rem] flex flex-col items-center">
                 <img src={LOGO_URL} alt="No memories" className="w-20 h-20 opacity-10 mb-4 grayscale rounded-2xl" />
                 <p className="font-black text-gray-300 uppercase tracking-widest text-xs px-10">Esperando el primer sello compartido...</p>
              </div>
            )}
          </div>
        )}

        {view === 'map' && (
          <div className="h-[calc(100vh-240px)] rounded-[2.5rem] overflow-hidden border-8 border-black bg-white shadow-[12px_12px_0px_0px_rgba(56,189,248,0.2)]">
            <MapView experiences={experiences} onPinClick={setSelectedExp} />
          </div>
        )}

        {view === 'calendar' && <CalendarView experiences={experiences} onSelectExperience={setSelectedExp} />}

        {view === 'categories' && (
          <div className="animate-in fade-in duration-500 pb-12">
            <h2 className="text-3xl font-black mb-8 font-serif">Nuestra Colección</h2>
            {Object.values(ExperienceType).map((type) => {
              const typeExps = experiences.filter(e => e.type === type);
              return (
                <div key={type} className="mb-10 bg-white p-6 rounded-3xl border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,0.05)]">
                  <h3 className="font-black text-black text-xl uppercase mb-6 flex items-center gap-2">
                    <div className="w-2 h-8 rounded-full" style={{ backgroundColor: TYPE_CONFIG[type]?.color }} />
                    {type}
                  </h3>
                  <div className="flex gap-6 overflow-x-auto pb-6 no-scrollbar">
                    {typeExps.length > 0 ? typeExps.map(exp => (
                      <div key={exp.id} onClick={() => setSelectedExp(exp)} className="flex-shrink-0 flex flex-col items-center gap-1 hover:scale-110 transition-transform cursor-pointer">
                        <Stamp type={type} size="sm" />
                        <span className="text-[10px] font-black">{new Date(exp.date).getFullYear()}</span>
                      </div>
                    )) : (
                      <div className="opacity-40 grayscale"><Stamp type={type} size="sm" isGrayscale /></div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {view === 'add' && (
          <div className="max-w-md mx-auto animate-in slide-in-from-right-4 duration-500 bg-white p-8 rounded-[3rem] border-8 border-black shadow-[12px_12px_0px_0px_rgba(139,69,19,1)]">
            <h2 className="text-3xl font-black mb-8 text-center font-serif">Agregar sello</h2>
            <form onSubmit={handleAddExperience} className="space-y-6">
              <div className="flex justify-center mb-8 h-44">
                <Stamp type={newExp.type} size="lg" />
              </div>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-500 ml-2">Título de la aventura</label>
                  <input className="w-full px-5 py-4 rounded-2xl border-4 border-black text-black font-black focus:bg-orange-50 transition-colors" placeholder="Ej: Pizza en el sofá..." value={newExp.title} onChange={e => setNewExp({...newExp, title: e.target.value})} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-gray-500 ml-2">Tipo de sello</label>
                    <select className="w-full px-5 py-4 rounded-2xl border-4 border-black font-black bg-white focus:bg-orange-50 transition-colors" value={newExp.type} onChange={e => setNewExp({...newExp, type: e.target.value as ExperienceType})}>
                      {Object.values(ExperienceType).map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-gray-500 ml-2">Fecha</label>
                    <input type="date" className="w-full px-5 py-4 rounded-2xl border-4 border-black font-black focus:bg-orange-50 transition-colors" value={newExp.date} onChange={e => setNewExp({...newExp, date: e.target.value})} required />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-500 ml-2">¿Dónde?</label>
                  <input className="w-full px-5 py-4 rounded-2xl border-4 border-black font-black focus:bg-orange-50 transition-colors" placeholder="Ej: Nuestra casa" value={newExp.locationName} onChange={e => setNewExp({...newExp, locationName: e.target.value})} required />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-500 ml-2">Foto nuestra (Opcional)</label>
                  <div className="relative">
                    <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" id="photo-upload" />
                    <label htmlFor="photo-upload" className="flex flex-col items-center justify-center w-full h-32 border-4 border-dashed border-black rounded-3xl cursor-pointer hover:bg-orange-50 overflow-hidden bg-gray-50">
                      {newExp.photoUrl ? <img src={newExp.photoUrl} className="w-full h-full object-cover" alt="Preview" /> : <div className="flex flex-col items-center gap-1 opacity-40"><span className="text-2xl">📸</span><span className="font-black uppercase text-[10px]">Cargar foto</span></div>}
                    </label>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[10px] font-black uppercase text-gray-500 ml-2">Nota</label>
                    <button type="button" onClick={generateAIPrompt} disabled={isGenerating || !newExp.title} className="text-[10px] font-black bg-orange-200 px-3 py-1 rounded-full border-2 border-black hover:bg-orange-300 transition-colors disabled:opacity-50">✨ IA AYUDA</button>
                  </div>
                  <textarea className="w-full px-5 py-4 rounded-2xl border-4 border-black font-black min-h-[100px] focus:bg-orange-50 transition-colors" placeholder="Escribe algo lindo..." value={newExp.note} onChange={e => setNewExp({...newExp, note: e.target.value})} />
                </div>
              </div>
              <button type="submit" disabled={isGenerating} className="w-full bg-black text-white font-black py-5 rounded-2xl shadow-[8px_8px_0px_0px_rgba(251,146,60,1)] active:translate-y-[4px] active:shadow-none transition-all uppercase text-xl mt-4">
                {isGenerating ? 'Fijando...' : 'Fijar sello'}
              </button>
            </form>
          </div>
        )}

        {view === 'settings' && (
          <div className="max-w-md mx-auto animate-in slide-in-from-right-4 duration-500 bg-white p-8 rounded-[3rem] border-8 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,0.1)]">
            <h2 className="text-3xl font-black mb-8 text-center font-serif">Configuración</h2>
            <div className="space-y-8">
              <div className="text-center p-6 bg-green-50 border-4 border-black rounded-3xl">
                <p className="text-xs font-black uppercase text-green-800 mb-1">Estado de Sincronización</p>
                <p className="text-xl font-black text-black uppercase tracking-widest">{isCloudSynced ? '✨ EN LA NUBE' : '📴 LOCAL'}</p>
                <p className="text-[10px] font-black uppercase text-gray-500 mt-2">Memorias totales: {experiences.length}</p>
              </div>

              <div className="pt-8 border-t-4 border-black">
                <button onClick={handleLogout} className="w-full flex items-center justify-center gap-4 px-5 py-4 rounded-2xl border-4 border-red-600 font-black text-red-600 bg-white hover:bg-red-50 transition-all">
                  <span>Cerrar Sesión</span>
                </button>
              </div>
              
              <p className="text-[9px] font-black text-gray-400 text-center uppercase tracking-widest leading-tight">Juntas v2.0 - Sincronizada</p>
            </div>
          </div>
        )}
      </main>

      {selectedExp && (
        <div className="fixed inset-0 z-[500] flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={() => setSelectedExp(null)} />
          <div className="bg-white w-full max-w-xl rounded-t-[4rem] sm:rounded-[4rem] p-8 shadow-2xl relative animate-in slide-in-from-bottom duration-300 border-8 border-black overflow-y-auto max-h-[90vh] no-scrollbar">
            <button onClick={() => setSelectedExp(null)} className="absolute top-6 right-6 p-2 rounded-full border-4 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] z-10 hover:bg-orange-50 active:scale-95 transition-all"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" className="w-6 h-6"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button>
            <div className="flex flex-col items-center text-center">
              <Stamp type={selectedExp.type} size="lg" date={selectedExp.date} />
              <h2 className="text-4xl font-black text-black my-4 font-serif uppercase tracking-tighter leading-tight italic">{selectedExp.title}</h2>
              {selectedExp.photoUrl && <div className="w-full mb-6 rounded-3xl overflow-hidden border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"><img src={selectedExp.photoUrl} className="w-full h-auto" alt={selectedExp.title} /></div>}
              <div className="w-full bg-white border-4 border-black rounded-3xl p-6 italic font-bold mb-6 shadow-[6px_6px_0px_0px_rgba(251,146,60,1)]"><p className="text-xl">"{selectedExp.note || "Un momento inolvidable juntas."}"</p></div>
              <div className="flex flex-col gap-1 border-t-4 border-black pt-6 w-full">
                <div className="flex justify-between w-full text-[10px] font-black uppercase tracking-widest opacity-60"><span>{selectedExp.locationName}</span><span>{new Date(selectedExp.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</span></div>
                <p className="text-[8px] font-black uppercase text-gray-400 text-right">Sello fijado por {selectedExp.createdBy}</p>
              </div>
            </div>
          </div>
        </div>
      )}
      <Navigation currentView={view} onViewChange={setView} />
    </div>
  );
};

export default App;
