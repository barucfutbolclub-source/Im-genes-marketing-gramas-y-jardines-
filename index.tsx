
import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  GoogleGenAI, 
  Modality, 
  Type, 
  LiveServerMessage 
} from "@google/genai";
import { 
  Sparkles, 
  Video, 
  Mic, 
  Volume2, 
  Layers, 
  AlertCircle, 
  Loader2, 
  Play, 
  History as HistoryIcon, 
  Trash2, 
  Clock, 
  X, 
  ChevronRight,
  Zap,
  Award,
  Crown,
  Download,
  Target,
  ShoppingBag,
  TrendingUp,
  MessageSquare,
  Settings2,
  Lock,
  RefreshCcw,
  ShieldAlert,
  Key,
  ExternalLink,
  Palette,
  Check,
  Copy,
  ChevronDown
} from 'lucide-react';

// --- Utilities ---
const encode = (bytes: Uint8Array) => {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
};

const decode = (base64: string) => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
};

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
  }
  return buffer;
}

// --- Shared Components ---
const HistorySection = ({ history, onSelect, onRemove, onClear, title, icon: Icon }: { 
  history: string[], 
  onSelect: (p: string) => void, 
  onRemove: (p: string) => void,
  onClear: () => void,
  title: string,
  icon: any
}) => {
  if (history.length === 0) return null;
  return (
    <div className="mt-6 border-t border-slate-700/50 pt-4">
      <div className="flex items-center justify-between mb-3 px-1">
        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
          <Icon size={12} /> {title}
        </h4>
        <button onClick={onClear} className="text-[10px] text-slate-600 hover:text-red-400 transition-colors font-bold">
          <Trash2 size={10} className="inline mr-1" /> LIMPIAR
        </button>
      </div>
      <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-2 custom-scroll">
        {history.map((item, idx) => (
          <div key={idx} className="group relative">
            <button
              onClick={() => onSelect(item)}
              className="text-[10px] bg-slate-800/40 hover:bg-slate-700/60 text-slate-400 px-3 py-1.5 rounded-lg border border-slate-700/50 transition-all flex items-center gap-2 pr-8 truncate max-w-[150px]"
            >
              <span className="truncate">{item}</span>
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onRemove(item); }}
              className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X size={10} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- Features ---
const DreamCanvas = () => {
  const [prompt, setPrompt] = useState('');
  const [campaignGoal, setCampaignGoal] = useState('');
  const [marketingStyle, setMarketingStyle] = useState('Luxury Studio');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [batchSize, setBatchSize] = useState(1);
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<{message: string, isQuota: boolean, isForbidden: boolean, isFallback?: boolean} | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [marketingCopy, setMarketingCopy] = useState<string | null>(null);
  const [copyLoading, setCopyLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('nexus_dream_history');
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  const saveToHistory = (p: string) => {
    const newHistory = [p, ...history.filter(h => h !== p)].slice(0, 10);
    setHistory(newHistory);
    localStorage.setItem('nexus_dream_history', JSON.stringify(newHistory));
  };

  const generateImage = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);
    setImages([]);
    setMarketingCopy(null);
    setCurrentStep(0);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      let modelName = 'gemini-2.5-flash-image';
      
      const styles: Record<string, string> = {
        'Luxury Studio': 'High-end luxury commercial photography, cinematic lighting, sharp focus, 8k.',
        'Minimalist': 'Clean minimalist, white space, soft shadows, neutral tones.',
        'Vibrant Tech': 'Cyberpunk neon, sharp reflections, high contrast, digital futuristic.',
        'Urban Lifestyle': 'Natural sunlight, authentic urban setting, shallow depth of field.'
      };

      const finalPrompt = `${styles[marketingStyle]} Subject: ${prompt}. Campaign Goal: ${campaignGoal || 'General promotion'}. Professional commercial grade photography.`;

      // Parallelize generation for speed
      let completedCount = 0;
      const generationPromises = Array.from({ length: batchSize }).map(async (_, i) => {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: { parts: [{ text: `${finalPrompt} --variation ${i+1}` }] },
            config: { imageConfig: { aspectRatio } }
          });

          const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
          completedCount++;
          setCurrentStep(completedCount);
          
          if (part) {
            const base64 = `data:image/png;base64,${part.inlineData.data}`;
            return base64;
          }
          return null;
        } catch (err: any) {
          console.error(`Error generating variation ${i+1}:`, err);
          return null;
        }
      });

      const results = await Promise.all(generationPromises);
      const validImages = results.filter((img): img is string => img !== null);
      
      if (validImages.length === 0) {
        throw new Error("No se pudo generar ninguna imagen. Revisa tu cuota de API.");
      }

      setImages(validImages);
      saveToHistory(prompt);
      
      // Auto-generate copy immediately after images are ready
      generateCopy(validImages[0], prompt);

    } catch (err: any) {
      setError({ message: err.message, isQuota: err.message?.includes("429"), isForbidden: err.message?.includes("403") });
    } finally {
      setLoading(false);
    }
  };

  const generateCopy = async (imageBuffer: string, originalPrompt: string) => {
    setCopyLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const base64Data = imageBuffer.split(',')[1];
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          {
            parts: [
              { inlineData: { data: base64Data, mimeType: 'image/png' } },
              { text: `Based on this marketing image and the concept "${originalPrompt}", write a high-converting marketing copy for social media. Include a headline, a short body description with benefits, and a call to action. Use emojis and make it persuasive for the goal: ${campaignGoal || 'Sales'}. Response in the same language as the prompt.` }
            ]
          }
        ]
      });
      
      setMarketingCopy(response.text || "No copy generated.");
    } catch (e: any) {
      console.error("Copy generation failed", e);
      setMarketingCopy("Fallo al generar el copy de marketing.");
    } finally {
      setCopyLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!marketingCopy) return;
    navigator.clipboard.writeText(marketingCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="grid lg:grid-cols-[380px_1fr] gap-8">
      <div className="glass p-6 rounded-3xl h-fit border-white/5 shadow-2xl space-y-6">
        <div className="flex items-center gap-3 mb-4">
          <ShoppingBag className="text-emerald-400" size={20} />
          <h2 className="font-bold text-white uppercase tracking-widest text-sm">Marketing Studio</h2>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block">Brief del Producto</label>
            <textarea 
              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white min-h-[80px] focus:ring-1 focus:ring-emerald-500 transition-all outline-none"
              placeholder="Describe tu producto..."
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block">Objetivo Comercial</label>
            <input 
              type="text"
              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white focus:ring-1 focus:ring-emerald-500 transition-all outline-none"
              placeholder="Ej: Lanzamiento, Rebajas..."
              value={campaignGoal}
              onChange={e => setCampaignGoal(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
             <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block">Estilo Visual</label>
             <div className="grid grid-cols-2 gap-2">
              {['Luxury Studio', 'Minimalist', 'Vibrant Tech', 'Urban Lifestyle'].map(s => (
                <button 
                  key={s} 
                  onClick={() => setMarketingStyle(s)}
                  className={`py-2 rounded-lg text-[9px] font-bold border transition-all ${marketingStyle === s ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg' : 'bg-slate-800 border-slate-700 text-slate-500 hover:border-slate-600'}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block">Cantidad de Imágenes</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(n => (
                <button 
                  key={n}
                  onClick={() => setBatchSize(n)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${batchSize === n ? 'bg-emerald-500 text-white shadow-md' : 'bg-slate-800 text-slate-500 hover:bg-slate-700'}`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <button 
            onClick={generateImage}
            disabled={loading || !prompt}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-xs tracking-widest disabled:opacity-50 transition-all active:scale-95 shadow-lg shadow-emerald-900/20"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-3">
                <Loader2 className="animate-spin" size={18} />
                <span>PROCESANDO...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <TrendingUp size={16} />
                SINTETIZAR {batchSize > 1 ? `${batchSize} ASSETS` : 'ASSET'}
              </div>
            )}
          </button>
        </div>
        
        <HistorySection 
          history={history} 
          onSelect={setPrompt} 
          onRemove={(p) => setHistory(h => h.filter(x => x !== p))}
          onClear={() => { setHistory([]); localStorage.removeItem('nexus_dream_history'); }}
          title="HISTORIAL BRIEFS"
          icon={Clock}
        />
      </div>

      <div className="flex flex-col gap-6">
        <div className="min-h-[400px] glass rounded-3xl border-white/5 p-6 relative overflow-hidden transition-all duration-500">
          {loading && (
            <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-6 animate-in fade-in duration-300">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center font-black text-[10px] text-emerald-400">
                  {Math.round((currentStep / batchSize) * 100)}%
                </div>
              </div>
              <div className="text-center">
                <p className="text-emerald-400 font-bold text-[10px] uppercase tracking-[0.3em] mb-1">Generando Lote Inteligente</p>
                <p className="text-slate-400 text-[9px] font-bold uppercase">{currentStep} de {batchSize} completados</p>
              </div>
            </div>
          )}
          
          {error && (
            <div className="p-4 bg-red-950/20 border border-red-900/50 rounded-2xl text-red-400 text-xs mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle size={14} /> 
                <span>{error.message}</span>
              </div>
              {error.isForbidden && <button onClick={() => window.aistudio?.openSelectKey()} className="px-3 py-1 bg-red-900/40 rounded-lg underline font-bold">Cambiar Clave</button>}
            </div>
          )}

          {images.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {images.map((img, i) => (
                <div key={i} className="group relative aspect-square rounded-2xl overflow-hidden border border-white/5 bg-slate-900 animate-in zoom-in duration-500" style={{ animationDelay: `${i * 100}ms` }}>
                  <img src={img} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-end justify-between p-4">
                    <span className="text-[10px] font-black text-white/50">ASSET {i+1}</span>
                    <button 
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = img;
                        link.download = `nexus-marketing-${i}.png`;
                        link.click();
                      }}
                      className="p-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-white shadow-xl transform translate-y-2 group-hover:translate-y-0 transition-all"
                    >
                      <Download size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : !loading && (
            <div className="h-[400px] flex flex-col items-center justify-center text-slate-800 opacity-20">
              <div className="p-8 border-2 border-dashed border-slate-700 rounded-[3rem] mb-6">
                <ShoppingBag size={64} />
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.4em]">Nexus Studio Ready</p>
            </div>
          )}
        </div>

        { (marketingCopy || copyLoading) && (
          <div className="glass p-8 rounded-3xl border-white/5 shadow-2xl animate-in slide-in-from-bottom duration-700">
            <div className="flex items-center justify-between mb-6">
               <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                    <MessageSquare className="text-emerald-400" size={16} />
                  </div>
                  <h3 className="font-bold text-white uppercase text-xs tracking-widest">IA Marketing Copy</h3>
               </div>
               {marketingCopy && !copyLoading && (
                 <button 
                  onClick={copyToClipboard}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-[10px] font-bold text-slate-300 transition-all active:scale-95"
                 >
                   {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                   {copied ? 'COPIADO' : 'COPIAR TEXTO'}
                 </button>
               )}
            </div>
            
            {copyLoading ? (
              <div className="flex flex-col items-center py-12 gap-4">
                 <Loader2 className="animate-spin text-emerald-400" size={24} />
                 <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest animate-pulse">Redactando estrategia...</p>
              </div>
            ) : (
              <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap bg-slate-900/50 p-6 rounded-2xl border border-white/5 font-medium">
                {marketingCopy}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

interface VideoHistoryItem {
  prompt: string;
  url: string;
  timestamp: number;
}

const MotionStudio = () => {
  const [prompt, setPrompt] = useState('');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoHistory, setVideoHistory] = useState<VideoHistoryItem[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('nexus_motion_history_v2');
    if (saved) setVideoHistory(JSON.parse(saved));
  }, []);

  const saveToVideoHistory = (p: string, url: string) => {
    const newItem: VideoHistoryItem = { prompt: p, url, timestamp: Date.now() };
    const newHistory = [newItem, ...videoHistory.filter(h => h.prompt !== p)].slice(0, 10);
    setVideoHistory(newHistory);
    localStorage.setItem('nexus_motion_history_v2', JSON.stringify(newHistory));
  };

  const generateVideo = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);
    setVideoUrl(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      let op = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: prompt,
        config: { numberOfVideos: 1, resolution: '1080p', aspectRatio: '16:9' }
      });
      while (!op.done) {
        // Reduced polling interval for faster perceived result
        await new Promise(r => setTimeout(r, 7000));
        op = await ai.operations.getVideosOperation({ operation: op });
      }
      const link = op.response?.generatedVideos?.[0]?.video?.uri;
      if (link) {
        const res = await fetch(`${link}&key=${process.env.API_KEY}`);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        setVideoUrl(url);
        saveToVideoHistory(prompt, url);
      }
    } catch (e: any) {
      setError(e.message?.includes("403") ? "Error de Permisos: Veo requiere clave Paid activa en tu proyecto." : e.message);
    } finally { setLoading(false); }
  };

  const clearHistory = () => {
    setVideoHistory([]);
    localStorage.removeItem('nexus_motion_history_v2');
  };

  const removeHistoryItem = (timestamp: number) => {
    const newHistory = videoHistory.filter(h => h.timestamp !== timestamp);
    setVideoHistory(newHistory);
    localStorage.setItem('nexus_motion_history_v2', JSON.stringify(newHistory));
  };

  return (
    <div className="grid md:grid-cols-[380px_1fr] gap-8">
      <div className="glass p-6 rounded-3xl h-fit border-white/5 shadow-2xl space-y-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-pink-500/10 rounded-lg">
            <Video className="text-pink-400" size={20} />
          </div>
          <h2 className="font-bold text-white uppercase text-xs tracking-widest">Motion Studio Pro</h2>
        </div>
        
        <div className="space-y-4">
          <label className="text-[10px] font-bold text-slate-500 uppercase block">Concepto de Escena</label>
          <textarea 
            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs text-white min-h-[140px] focus:ring-1 focus:ring-pink-500 outline-none transition-all"
            placeholder="Describe el movimiento, la cámara y el sujeto cinematográfico..."
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
          />
          <button 
            onClick={generateVideo} 
            disabled={loading || !prompt} 
            className="w-full py-4 bg-pink-600 hover:bg-pink-500 text-white rounded-2xl font-black text-[11px] tracking-widest transition-all active:scale-95 shadow-lg shadow-pink-900/20"
          >
            {loading ? <Loader2 className="animate-spin mx-auto" /> : (
              <div className="flex items-center justify-center gap-2">
                <Play size={14} fill="white" />
                LANZAR CÁMARAS VEO
              </div>
            )}
          </button>
        </div>

        {videoHistory.length > 0 && (
          <div className="mt-8 border-t border-slate-800 pt-6">
            <div className="flex items-center justify-between mb-4">
               <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                 <HistoryIcon size={12} /> HISTORIAL VIDEO
               </h4>
               <button onClick={clearHistory} className="text-[10px] text-slate-600 hover:text-red-400 font-bold transition-colors">
                 LIMPIAR
               </button>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scroll">
               {videoHistory.map((item) => (
                 <div key={item.timestamp} className="group relative flex flex-col gap-1 p-3 bg-slate-900/50 border border-slate-800 rounded-xl hover:bg-slate-800 transition-all cursor-pointer" onClick={() => {setPrompt(item.prompt); setVideoUrl(item.url);}}>
                    <p className="text-[10px] text-slate-300 font-medium line-clamp-2 pr-4">{item.prompt}</p>
                    <span className="text-[9px] text-slate-600 font-bold">{new Date(item.timestamp).toLocaleDateString()}</span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); removeHistoryItem(item.timestamp); }}
                      className="absolute top-2 right-2 p-1 text-slate-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={10} />
                    </button>
                 </div>
               ))}
            </div>
          </div>
        )}
      </div>

      <div className="glass rounded-[2rem] min-h-[550px] flex items-center justify-center bg-black overflow-hidden border-white/5 relative shadow-inner transition-all duration-700">
        {loading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-6 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
             <div className="relative">
               <div className="w-24 h-24 border-4 border-pink-500/10 border-t-pink-500 rounded-full animate-spin"></div>
               <div className="absolute inset-0 flex items-center justify-center">
                  <Video size={24} className="text-pink-500 animate-pulse" />
               </div>
             </div>
             <div className="text-center space-y-1">
                <p className="text-pink-100 font-black text-xs uppercase tracking-[0.3em] animate-pulse">Sintetizando Cinematic...</p>
                <p className="text-slate-500 text-[9px] font-bold uppercase">Optimizado para alta resolución</p>
             </div>
          </div>
        )}
        
        {error && (
          <div className="flex flex-col items-center gap-4 text-center max-w-sm px-8 animate-in zoom-in duration-300">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-2">
              <ShieldAlert size={32} className="text-red-500" />
            </div>
            <p className="text-red-400 text-sm font-medium leading-relaxed">{error}</p>
            <button onClick={() => window.aistudio?.openSelectKey()} className="px-6 py-2 bg-slate-800 rounded-xl text-[10px] font-black uppercase text-slate-400 hover:text-white transition-all">Configurar API</button>
          </div>
        )}

        {videoUrl ? (
          <video src={videoUrl} controls autoPlay loop className="w-full h-full object-cover animate-in fade-in duration-1000" />
        ) : !loading && !error && (
          <div className="text-center space-y-6 group cursor-pointer" onClick={() => document.querySelector('textarea')?.focus()}>
            <div className="w-24 h-24 bg-slate-900 rounded-[2.5rem] flex items-center justify-center mx-auto border border-slate-800 group-hover:scale-110 group-hover:border-pink-500/30 transition-all duration-500 shadow-2xl">
               <Play size={40} className="text-slate-800 group-hover:text-pink-500 transition-colors" fill="currentColor" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-800 group-hover:text-slate-500 transition-colors">Esperando Producción</p>
          </div>
        )}
      </div>
    </div>
  );
};

const LiveCompanion = () => {
  const [active, setActive] = useState(false);
  const [msgs, setMsgs] = useState<{role: string, text: string}[]>([]);
  const sessionRef = useRef<any>(null);

  const start = async () => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const inCtx = new AudioContext({ sampleRate: 16000 });
      const outCtx = new AudioContext({ sampleRate: 24000 });
      
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            const src = inCtx.createMediaStreamSource(stream);
            const proc = inCtx.createScriptProcessor(4096, 1, 1);
            proc.onaudioprocess = (e) => {
              const data = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(data.length);
              for (let i = 0; i < data.length; i++) int16[i] = data[i] * 32768;
              sessionPromise.then(s => s.sendRealtimeInput({ media: { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' } }));
            };
            src.connect(proc);
            proc.connect(inCtx.destination);
            setActive(true);
          },
          onmessage: async (m: LiveServerMessage) => {
            const audio = m.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audio) {
              const buf = await decodeAudioData(decode(audio), outCtx, 24000, 1);
              const s = outCtx.createBufferSource();
              s.buffer = buf; s.connect(outCtx.destination);
              s.start();
            }
            if (m.serverContent?.inputTranscription) setMsgs(p => [...p, {role: 'user', text: m.serverContent!.inputTranscription!.text}]);
            if (m.serverContent?.outputTranscription) setMsgs(p => [...p, {role: 'model', text: m.serverContent!.outputTranscription!.text}]);
          },
          onerror: (e) => console.error(e),
          onclose: () => setActive(false)
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
          inputAudioTranscription: {},
          outputAudioTranscription: {}
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (e) { console.error(e); }
  };

  return (
    <div className="grid md:grid-cols-[380px_1fr] gap-6">
      <div className="glass p-8 rounded-[2.5rem] flex flex-col items-center justify-center text-center border-white/5 shadow-2xl">
        <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center mb-6">
           <Mic className="text-indigo-400" size={28} />
        </div>
        <h2 className="font-bold text-white mb-8 tracking-widest text-xs uppercase">Ventas en Tiempo Real</h2>
        <button 
          onClick={active ? () => { sessionRef.current?.close(); setActive(false); } : start} 
          className={`w-36 h-36 rounded-full flex items-center justify-center transition-all duration-500 border-4 ${active ? 'bg-indigo-500 border-indigo-400 shadow-[0_0_60px_rgba(99,102,241,0.4)] scale-105' : 'bg-slate-800 border-slate-700 hover:border-indigo-500/50'}`}
        >
          {active ? <Volume2 size={48} className="text-white animate-pulse" /> : <Mic size={48} className="text-slate-400" />}
        </button>
        <div className="mt-8 flex flex-col gap-1">
           <p className={`text-[10px] font-black tracking-widest uppercase transition-colors ${active ? 'text-indigo-400' : 'text-slate-500'}`}>{active ? 'EN LÍNEA / TRANSMITIENDO' : 'LISTO PARA INTERACTUAR'}</p>
           {!active && <p className="text-[9px] text-slate-600 font-bold">Inicia la voz para cerrar acuerdos</p>}
        </div>
      </div>
      <div className="glass p-8 rounded-[2.5rem] h-[550px] flex flex-col border-white/5 overflow-hidden shadow-2xl">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-800">
           <div className="p-1.5 bg-slate-800 rounded-md">
            <MessageSquare size={14} className="text-indigo-400" />
           </div>
           <span className="text-[10px] font-black text-slate-500 tracking-widest uppercase">Inteligencia de Diálogo</span>
        </div>
        <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scroll">
          {msgs.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-4 duration-300`}>
              <div className={`max-w-[80%] px-5 py-3 rounded-[1.25rem] text-[13px] leading-relaxed shadow-lg ${m.role === 'user' ? 'bg-indigo-600 text-white border border-indigo-500' : 'bg-slate-800/80 text-slate-200 border border-slate-700 backdrop-blur-sm'}`}>
                {m.text}
              </div>
            </div>
          ))}
          {msgs.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-slate-800 opacity-20">
               <Mic size={48} className="mb-4" />
               <p className="text-[10px] font-black uppercase tracking-[0.4em]">Escuchando sesión...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Vox = () => {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [voice, setVoice] = useState('Kore');
  const [isPlaying, setIsPlaying] = useState(false);

  const speak = async () => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const res = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
        },
      });
      const data = res.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;
      if (data) {
        const ctx = new AudioContext({ sampleRate: 24000 });
        const buf = await decodeAudioData(decode(data), ctx, 24000, 1);
        const s = ctx.createBufferSource();
        s.buffer = buf; 
        s.connect(ctx.destination); 
        setIsPlaying(true);
        s.start();
        s.onended = () => setIsPlaying(false);
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  return (
    <div className="glass p-12 rounded-[3.5rem] max-w-4xl mx-auto border-white/5 shadow-2xl space-y-8 relative overflow-hidden transition-all duration-700">
      <div className="absolute top-0 right-0 p-16 opacity-[0.03] pointer-events-none">
         <Volume2 size={240} />
      </div>
      <div className="flex items-center gap-4 relative z-10">
        <div className="w-14 h-14 bg-amber-500/10 rounded-2xl flex items-center justify-center shadow-lg">
           <Volume2 className="text-amber-400" size={28} />
        </div>
        <div>
          <h2 className="font-bold text-white text-sm uppercase tracking-[0.25em] mb-1">Vox Locución Pro</h2>
          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-[0.2em]">Síntesis Neuronal Premium</p>
        </div>
      </div>
      <div className="space-y-4 relative z-10">
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Script de Audio</label>
        <textarea 
          className="w-full bg-slate-900/40 border border-slate-800 rounded-[2.5rem] p-8 text-slate-200 text-lg leading-relaxed min-h-[220px] focus:ring-1 focus:ring-amber-500 shadow-inner outline-none transition-all duration-300"
          placeholder="Ingresa el texto para vocalizar con la más alta fidelidad..."
          value={text}
          onChange={e => setText(e.target.value)}
        />
      </div>
      <div className="flex flex-col sm:flex-row justify-between items-center gap-6 relative z-10">
        <div className="flex flex-col gap-2">
           <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-4">Perfil Vocal Seleccionado</label>
           <select className="bg-slate-800 border border-slate-700 rounded-2xl text-xs px-8 py-4 font-bold text-slate-300 focus:outline-none focus:ring-1 focus:ring-amber-500 min-w-[220px] shadow-lg hover:border-amber-500/50 transition-all appearance-none cursor-pointer" value={voice} onChange={e => setVoice(e.target.value)}>
            {['Kore', 'Puck', 'Charon', 'Fenrir'].map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <button 
          onClick={speak} 
          disabled={loading || !text || isPlaying} 
          className="bg-amber-600 hover:bg-amber-500 px-14 py-5 rounded-[1.5rem] font-black text-[11px] tracking-[0.25em] text-white transition-all shadow-xl shadow-amber-900/30 active:scale-95 disabled:opacity-50"
        >
          {loading ? <Loader2 className="animate-spin" size={18} /> : isPlaying ? (
            <div className="flex items-center gap-3">
              <div className="flex gap-1 h-3 items-end">
                <div className="w-1 bg-white animate-[bounce_0.6s_infinite] h-2"></div>
                <div className="w-1 bg-white animate-[bounce_0.8s_infinite] h-3"></div>
                <div className="w-1 bg-white animate-[bounce_0.5s_infinite] h-1.5"></div>
              </div>
              REPRODUCIENDO...
            </div>
          ) : 'EJECUTAR LOCUCIÓN'}
        </button>
      </div>
    </div>
  );
};

// --- Main App ---
const App = () => {
  const [tab, setTab] = useState('images');
  const tabs = [
    { id: 'images', label: 'MARKETING', icon: ShoppingBag, color: 'text-emerald-400' },
    { id: 'video', label: 'MOTION', icon: Video, color: 'text-pink-400' },
    { id: 'live', label: 'LIVE', icon: Mic, color: 'text-indigo-400' },
    { id: 'tts', label: 'VOX', icon: Volume2, color: 'text-amber-400' },
  ];

  return (
    <div className="min-h-screen p-4 md:p-12 max-w-7xl mx-auto flex flex-col">
      <header className="flex flex-col md:flex-row items-center justify-between mb-16 gap-8">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-4 mb-1">
            <div className="w-14 h-14 bg-indigo-600 rounded-[1.4rem] flex items-center justify-center shadow-2xl shadow-indigo-500/40 transform hover:rotate-6 transition-transform cursor-pointer">
               <Layers className="text-white" size={28} />
            </div>
            <div>
              <h1 className="text-6xl font-black tracking-tighter gradient-text leading-none">NEXUS.</h1>
              <p className="text-slate-600 font-bold text-[10px] uppercase tracking-[0.6em] ml-1">Advanced Creative Intelligence</p>
            </div>
          </div>
        </div>
        <nav className="glass p-2 rounded-[1.75rem] flex gap-1 shadow-2xl border-white/5 overflow-x-auto max-w-full no-scrollbar">
          {tabs.map(t => (
            <button 
              key={t.id} 
              onClick={() => setTab(t.id)} 
              className={`flex items-center gap-3 px-8 py-4 rounded-[1.25rem] transition-all whitespace-nowrap group ${tab === t.id ? 'bg-white/10 text-white shadow-inner' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
            >
              <t.icon size={20} className={`transition-transform duration-500 group-hover:scale-110 ${tab === t.id ? t.color : 'text-slate-600'}`} />
              <span className="font-black text-[11px] tracking-widest">{t.label}</span>
            </button>
          ))}
        </nav>
      </header>
      
      <main className="flex-1 animate-in fade-in slide-in-from-bottom-12 duration-1000">
        {tab === 'images' && <DreamCanvas />}
        {tab === 'video' && <MotionStudio />}
        {tab === 'live' && <LiveCompanion />}
        {tab === 'tts' && <Vox />}
      </main>
      
      <footer className="mt-32 text-center border-t border-slate-900 pt-16 pb-20">
        <div className="flex flex-col items-center gap-6 opacity-20 hover:opacity-50 transition-all duration-700">
           <div className="flex gap-8 items-center">
             <Zap size={20} />
             <p className="text-[11px] font-black text-slate-500 tracking-[0.7em] uppercase">Nexus Advanced Studio v5.0 • Enterprise Ultra</p>
             <Zap size={20} />
           </div>
           <div className="text-[9px] font-bold text-slate-700 uppercase tracking-widest">Powered by Google Gemini 3 Technology</div>
        </div>
      </footer>
    </div>
  );
};

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(<App />);
}
