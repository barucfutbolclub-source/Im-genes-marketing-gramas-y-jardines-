
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
  Upload,
  Share2,
  Copy,
  Check,
  Instagram,
  Linkedin,
  Twitter,
  MessageSquare
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

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve(base64String);
    };
    reader.onerror = error => reject(error);
  });
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

// --- Shared History Component ---
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
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 text-slate-400">
          <Icon size={14} /> {title}
        </h4>
        <button onClick={onClear} className="text-[10px] text-slate-500 hover:text-red-400 transition-colors flex items-center gap-1 font-bold">
          <Trash2 size={10} /> CLEAR ALL
        </button>
      </div>
      <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-2">
        {history.map((item, idx) => (
          <div key={idx} className="group relative">
            <button
              onClick={() => onSelect(item)}
              className="text-xs bg-slate-800/40 hover:bg-slate-700/60 text-slate-300 px-3 py-2 rounded-lg border border-slate-700/50 transition-all flex items-center gap-2 pr-8 truncate max-w-[180px]"
            >
              <ChevronRight size={10} className="text-slate-600" />
              <span className="truncate">{item}</span>
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onRemove(item); }}
              className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X size={12} />
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
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [qualityLevel, setQualityLevel] = useState(0); 
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [refImage, setRefImage] = useState<{data: string, mime: string} | null>(null);
  const [postVariations, setPostVariations] = useState<{instagram: string, linkedin: string, twitter: string} | null>(null);
  const [activePostTab, setActivePostTab] = useState<'instagram' | 'linkedin' | 'twitter'>('instagram');
  const [writingPost, setWritingPost] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('nexus_dream_history');
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const base64 = await fileToBase64(file);
      setRefImage({ data: base64, mime: file.type });
    }
  };

  const saveToHistory = (p: string) => {
    const newHistory = [p, ...history.filter(h => h !== p)].slice(0, 15);
    setHistory(newHistory);
    localStorage.setItem('nexus_dream_history', JSON.stringify(newHistory));
  };

  const removeHistoryItem = (p: string) => {
    const newHistory = history.filter(h => h !== p);
    setHistory(newHistory);
    localStorage.setItem('nexus_dream_history', JSON.stringify(newHistory));
  };

  const getQualityLabel = (level: number) => {
    switch (level) {
      case 0: return { label: 'Standard', icon: Zap, color: 'text-slate-400' };
      case 1: return { label: 'HD (1K)', icon: Award, color: 'text-indigo-400' };
      case 2: return { label: 'Ultra HD (2K)', icon: Crown, color: 'text-amber-400' };
      default: return { label: 'Standard', icon: Zap, color: 'text-slate-400' };
    }
  };

  const currentQuality = getQualityLabel(qualityLevel);

  const generateImage = async () => {
    if (!prompt.trim()) return;

    if (qualityLevel > 0) {
      // @ts-ignore
      const hasKey = await window.aistudio?.hasSelectedApiKey();
      if (!hasKey && window.aistudio) {
        // @ts-ignore
        await window.aistudio.openSelectKey();
      }
    }

    setLoading(true);
    setError(null);
    setImages([]);
    setPostVariations(null);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      let modelName = qualityLevel > 0 ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';
      let imageConfig: any = { aspectRatio };
      if (qualityLevel === 1) imageConfig.imageSize = "1K";
      if (qualityLevel === 2) imageConfig.imageSize = "2K";

      const tasks = Array.from({ length: 5 }).map(async (_, i) => {
        const parts: any[] = [{ text: `${prompt} variation ${i + 1} --style high-detail` }];
        if (refImage) {
          parts.unshift({
            inlineData: {
              data: refImage.data,
              mimeType: refImage.mime
            }
          });
        }

        const response = await ai.models.generateContent({
          model: modelName,
          contents: { parts },
          config: { imageConfig }
        });

        const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
        return part ? `data:image/png;base64,${part.inlineData.data}` : null;
      });

      const results = await Promise.all(tasks);
      const validImages = results.filter((img): img is string => img !== null);
      
      if (validImages.length > 0) {
        setImages(validImages);
        saveToHistory(prompt);
      } else {
        throw new Error("No se pudieron generar imágenes.");
      }
    } catch (err: any) {
      setError(err.message || "Error al generar imagen");
      if (qualityLevel > 0 && err.message?.includes("Requested entity was not found") && window.aistudio) {
        // @ts-ignore
        window.aistudio.openSelectKey();
      }
    } finally {
      setLoading(false);
    }
  };

  const createSocialPosts = async () => {
    if (images.length === 0) return;
    setWritingPost(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const base64Data = images[0].split(',')[1];
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            { inlineData: { data: base64Data, mimeType: 'image/png' } },
            { text: `Genera 3 variaciones de posts sociales para esta imagen (Prompt: "${prompt}") en formato JSON con los campos "instagram", "linkedin" y "twitter". 
            - Instagram: Enfocado en estética, visuales y storytelling emocional.
            - LinkedIn: Enfocado en profesionalismo, innovación y negocios.
            - Twitter: Enfocado en viralidad, brevedad y punchline.` }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              instagram: { type: Type.STRING },
              linkedin: { type: Type.STRING },
              twitter: { type: Type.STRING }
            }
          }
        }
      });
      const data = JSON.parse(response.text);
      setPostVariations(data);
    } catch (e) {
      setError("Error al redactar variaciones de posts.");
    } finally {
      setWritingPost(false);
    }
  };

  const downloadImage = (url: string, index: number) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `nexus-dream-${Date.now()}-${index + 1}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyToClipboard = () => {
    if (postVariations) {
      navigator.clipboard.writeText(postVariations[activePostTab]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="grid lg:grid-cols-[380px_1fr] gap-8">
      <aside className="space-y-6">
        <div className="glass p-6 rounded-3xl h-fit border-white/5 shadow-2xl">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-white">
            <Sparkles className="text-indigo-400" size={20} /> Dream Canvas
          </h2>
          
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Referencia Visual</label>
              <div className="relative group">
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleFileUpload}
                  className="hidden" 
                  id="img-upload" 
                />
                <label 
                  htmlFor="img-upload"
                  className={`flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-4 transition-all cursor-pointer ${refImage ? 'border-indigo-500/50 bg-indigo-500/5' : 'border-slate-800 hover:border-slate-700 hover:bg-white/5'}`}
                >
                  {refImage ? (
                    <div className="relative w-full h-24">
                      <img src={`data:${refImage.mime};base64,${refImage.data}`} className="w-full h-full object-cover rounded-lg shadow-lg" alt="Ref" />
                      <button onClick={(e) => { e.preventDefault(); setRefImage(null); }} className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-400">
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <Upload className="text-slate-600 mb-2 group-hover:text-indigo-400 transition-colors" size={20} />
                      <span className="text-[10px] text-slate-500 font-bold uppercase">Subir Imagen Base</span>
                    </>
                  )}
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Concepto Artístico</label>
              <textarea
                className="w-full bg-slate-900/50 border border-slate-700/50 rounded-2xl p-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 min-h-[100px] text-sm resize-none text-slate-200"
                placeholder="Escribe tu visión aquí..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </div>
            
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Formato</label>
              <div className="grid grid-cols-4 gap-2">
                {['1:1', '16:9', '9:16', '4:3'].map(ratio => (
                  <button
                    key={ratio}
                    onClick={() => setAspectRatio(ratio)}
                    className={`py-2 rounded-xl text-[10px] font-black transition-all border ${aspectRatio === ratio ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 'bg-slate-800/50 border-slate-700 text-slate-500 hover:bg-slate-700'}`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Motor de Calidad</label>
                <div className={`flex items-center gap-1 text-[10px] font-black uppercase ${currentQuality.color}`}>
                  <currentQuality.icon size={12} />
                  {currentQuality.label}
                </div>
              </div>
              
              <div className="px-2 pb-2">
                <input 
                  type="range" min="0" max="2" step="1"
                  value={qualityLevel}
                  onChange={(e) => setQualityLevel(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>
            </div>

            <button
              onClick={generateImage}
              disabled={loading || !prompt.trim()}
              className={`w-full py-4 rounded-2xl font-black text-xs tracking-[0.2em] transition-all flex items-center justify-center gap-2 shadow-lg ${loading ? 'bg-slate-800 text-slate-600' : 'bg-gradient-to-br from-indigo-600 via-indigo-500 to-purple-600 hover:scale-[1.02] text-white shadow-indigo-900/20 active:scale-[0.98]'}`}
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : (
                <>
                  <Layers size={16} /> 
                  GENERA PENTÁGONO (x5)
                </>
              )}
            </button>
            
            <HistorySection 
              history={history} 
              onSelect={setPrompt} 
              onRemove={removeHistoryItem}
              onClear={() => { setHistory([]); localStorage.removeItem('nexus_dream_history'); }}
              title="HISTORIAL NEXUS"
              icon={Clock} 
            />
          </div>
        </div>

        {images.length > 0 && (
          <div className="glass p-6 rounded-3xl border-white/5 animate-in slide-in-from-bottom duration-500">
             <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Share2 size={14} /> Nexus Scribe (Post Variations)
             </h3>
             {postVariations ? (
               <div className="space-y-4">
                  <div className="flex bg-slate-900/50 p-1 rounded-xl gap-1">
                    {[
                      { id: 'instagram', icon: Instagram },
                      { id: 'linkedin', icon: Linkedin },
                      { id: 'twitter', icon: Twitter }
                    ].map(tab => (
                      <button 
                        key={tab.id}
                        onClick={() => setActivePostTab(tab.id as any)}
                        className={`flex-1 py-2 rounded-lg flex items-center justify-center transition-all ${activePostTab === tab.id ? 'bg-white/10 text-white shadow-lg' : 'text-slate-500 hover:text-slate-400'}`}
                      >
                        <tab.icon size={16} />
                      </button>
                    ))}
                  </div>
                  <div className="bg-slate-900/80 rounded-2xl p-4 text-xs text-slate-300 leading-relaxed max-h-60 overflow-y-auto border border-white/5 font-mono whitespace-pre-wrap">
                    {postVariations[activePostTab]}
                  </div>
                  <button onClick={copyToClipboard} className="w-full bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl text-[10px] font-black tracking-widest flex items-center justify-center gap-2 transition-all">
                    {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    {copied ? 'COPIADO' : 'COPIAR AL PORTAPAPELES'}
                  </button>
               </div>
             ) : (
                <button 
                  onClick={createSocialPosts}
                  disabled={writingPost}
                  className="w-full bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 py-4 rounded-2xl text-[10px] font-black tracking-widest transition-all flex items-center justify-center gap-2"
                >
                  {writingPost ? <Loader2 className="animate-spin" size={14} /> : 'REDACTAR VARIACIONES DE POSTS'}
                </button>
             )}
          </div>
        )}
      </aside>

      <main className="space-y-6">
        {loading ? (
          <div className="glass rounded-3xl min-h-[600px] flex flex-col items-center justify-center gap-8 relative overflow-hidden">
            <div className="absolute inset-0 bg-indigo-600/5 animate-pulse"></div>
            <div className="relative">
              <div className="w-24 h-24 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
              <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-400" size={32} />
            </div>
            <div className="text-center space-y-2">
               <p className="text-indigo-100 font-black tracking-[0.4em] text-sm uppercase">Sintetizando Variaciones...</p>
               <p className="text-slate-500 text-[10px] font-bold uppercase">Nexus está invocando 5 realidades diferentes</p>
            </div>
          </div>
        ) : error ? (
           <div className="glass rounded-3xl min-h-[600px] flex items-center justify-center">
             <div className="text-red-400 p-8 flex items-center gap-3 bg-red-950/20 border border-red-900/50 rounded-2xl max-w-md mx-4">
                <AlertCircle size={24} className="flex-shrink-0" /> 
                <span className="text-sm font-medium">{error}</span>
             </div>
           </div>
        ) : images.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in duration-700">
             {images.map((img, i) => (
               <div key={i} className={`group relative rounded-3xl overflow-hidden border border-white/5 bg-slate-900 shadow-xl ${i === 0 ? 'md:col-span-2 md:row-span-2' : ''}`}>
                 <img src={img} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt={`Gen ${i+1}`} />
                 <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-6">
                    <div className="flex items-center justify-between">
                       <span className="text-[10px] font-black text-white tracking-widest uppercase">VARIANTE #{i+1}</span>
                       <div className="flex gap-2">
                        <button 
                          onClick={() => downloadImage(img, i)}
                          className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white p-3 rounded-2xl border border-white/20 transition-all active:scale-95"
                        >
                          <Download size={18} />
                        </button>
                       </div>
                    </div>
                 </div>
               </div>
             ))}
          </div>
        ) : (
          <div className="glass rounded-3xl min-h-[600px] flex items-center justify-center group">
            <div className="text-slate-700 text-center">
              <div className="w-24 h-24 mx-auto mb-6 bg-slate-900/50 rounded-full flex items-center justify-center border border-slate-800 opacity-20 group-hover:opacity-40 transition-all duration-700 group-hover:rotate-12">
                 <Layers size={40} />
              </div>
              <p className="font-bold tracking-[0.5em] text-[10px] uppercase opacity-20">El Lienzo está Vacío</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

const MotionStudio = () => {
  const [prompt, setPrompt] = useState('');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('nexus_motion_history');
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  const saveToHistory = (p: string) => {
    const newHistory = [p, ...history.filter(h => h !== p)].slice(0, 15);
    setHistory(newHistory);
    localStorage.setItem('nexus_motion_history', JSON.stringify(newHistory));
  };

  const removeHistoryItem = (p: string) => {
    const newHistory = history.filter(h => h !== p);
    setHistory(newHistory);
    localStorage.setItem('nexus_motion_history', JSON.stringify(newHistory));
  };

  const generateVideo = async () => {
    if (!prompt.trim()) return;
    
    // @ts-ignore
    const hasKey = await window.aistudio?.hasSelectedApiKey();
    if (!hasKey && window.aistudio) {
      // @ts-ignore
      await window.aistudio.openSelectKey();
    }

    setLoading(true);
    setError(null);
    setStatus('Iniciando Motor Veo...');
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: prompt,
        config: { numberOfVideos: 1, resolution: '1080p', aspectRatio: '16:9' }
      });

      const phases = ["Analizando Escena...", "Sintetizando Movimiento...", "Renderizando Frames...", "Finalizando Cinematic..."];
      let i = 0;

      while (!operation.done) {
        setStatus(phases[i % phases.length]);
        i++;
        await new Promise(r => setTimeout(r, 10000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
      }

      const link = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (link) {
        const res = await fetch(`${link}&key=${process.env.API_KEY}`);
        if (!res.ok) throw new Error("Fallo al descargar el video");
        const blob = await res.blob();
        setVideoUrl(URL.createObjectURL(blob));
        saveToHistory(prompt);
      } else {
        throw new Error("No se generó el video.");
      }
    } catch (err: any) {
      setError(err.message || "Error en generación");
      if (err.message?.includes("Requested entity was not found") && window.aistudio) {
        // @ts-ignore
        window.aistudio.openSelectKey();
      }
    } finally {
      setLoading(false);
    }
  };

  const downloadVideo = () => {
    if (videoUrl) {
      const link = document.createElement('a');
      link.href = videoUrl;
      link.download = `nexus-motion-${Date.now()}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="grid md:grid-cols-[350px_1fr] gap-6">
      <div className="glass p-6 rounded-3xl h-fit border-white/5">
        <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
          <Video className="text-pink-400" size={20} /> Motion Studio
        </h2>
        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-6 border-b border-slate-800 pb-2">Veo 3.1 Pro Engine</p>
        
        <div className="space-y-4">
          <textarea
            className="w-full bg-slate-900/50 border border-slate-700/50 rounded-2xl p-4 focus:outline-none focus:ring-2 focus:ring-pink-500/50 min-h-[120px] text-sm resize-none text-slate-200"
            placeholder="Describe la secuencia cinematográfica..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
          <button
            onClick={generateVideo}
            disabled={loading || !prompt.trim()}
            className="w-full bg-pink-600 hover:bg-pink-500 disabled:bg-slate-800 disabled:text-slate-600 text-white py-4 rounded-2xl font-black text-xs tracking-[0.2em] transition-all flex items-center justify-center gap-2 shadow-lg shadow-pink-900/20 active:scale-[0.98]"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : 'LANZAR CÁMARAS'}
          </button>

          <HistorySection 
            history={history} 
            onSelect={setPrompt} 
            onRemove={removeHistoryItem}
            onClear={() => { setHistory([]); localStorage.removeItem('nexus_motion_history'); }}
            title="HISTORIAL CINEMÁTICO"
            icon={HistoryIcon} 
          />
        </div>
      </div>

      <div className="glass rounded-3xl min-h-[500px] flex items-center justify-center overflow-hidden relative bg-black border-slate-700/30 shadow-2xl">
        {loading && (
          <div className="absolute inset-0 z-20 bg-black/80 backdrop-blur-xl flex items-center justify-center flex-col gap-6 p-12 text-center">
            <div className="w-full max-w-xs bg-slate-800 h-1 rounded-full overflow-hidden">
              <div className="h-full bg-pink-500 animate-[loading_2s_ease-in-out_infinite]" style={{width: '60%'}}></div>
            </div>
            <p className="text-pink-100 font-black tracking-[0.2em] text-sm uppercase">{status}</p>
            <p className="text-slate-500 text-[10px] uppercase font-bold">Tiempo estimado: 2-3 minutos</p>
          </div>
        )}
        {error && <div className="text-red-400 p-8 flex items-center gap-3 bg-red-950/20 border border-red-900/50 rounded-2xl"><AlertCircle size={24} /> {error}</div>}
        {videoUrl ? (
          <div className="relative w-full h-full group">
            <video src={videoUrl} controls autoPlay loop className="w-full h-full object-cover" />
            <button onClick={downloadVideo} className="absolute top-4 right-4 bg-black/60 backdrop-blur-md text-white p-3 rounded-2xl border border-white/20 opacity-0 group-hover:opacity-100 transition-all hover:bg-black/80">
               <Download size={20} />
            </button>
          </div>
        ) : !loading && (
          <div className="text-slate-700 text-center">
            <Play size={64} className="mx-auto mb-6 opacity-10" />
            <p className="font-bold tracking-widest text-[10px] uppercase opacity-40">READY FOR PRODUCTION</p>
          </div>
        )}
      </div>
    </div>
  );
};

const LiveCompanion = () => {
  const [active, setActive] = useState(false);
  const [msgs, setMsgs] = useState<{role: string, text: string}[]>([]);
  const [error, setError] = useState<string | null>(null);
  const sessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const inCtx = new AudioContext({ sampleRate: 16000 });
      const outCtx = new AudioContext({ sampleRate: 24000 });

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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
              s.buffer = buf;
              s.connect(outCtx.destination);
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outCtx.currentTime);
              s.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buf.duration;
              sourcesRef.current.add(s);
              s.onended = () => sourcesRef.current.delete(s);
            }
            if (m.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => { try { s.stop(); } catch(e){} });
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
            if (m.serverContent?.inputTranscription) setMsgs(p => [...p, {role: 'user', text: m.serverContent!.inputTranscription!.text}]);
            if (m.serverContent?.outputTranscription) setMsgs(p => [...p, {role: 'model', text: m.serverContent!.outputTranscription!.text}]);
          },
          onerror: () => setError("Error de conexión"),
          onclose: () => setActive(false),
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (e: any) { setError(e.message || "Error de micrófono"); }
  };

  const stop = () => { if (sessionRef.current) sessionRef.current.close(); setActive(false); };

  return (
    <div className="grid md:grid-cols-[400px_1fr] gap-6">
      <div className="glass p-8 rounded-3xl flex flex-col items-center justify-center text-center border-white/5 shadow-2xl">
        <h2 className="text-xl font-bold mb-8 flex items-center gap-2">
          <Mic className="text-emerald-400" size={20} /> Live Companion
        </h2>
        <div className={`relative w-48 h-48 rounded-full flex items-center justify-center transition-all duration-500 ${active ? 'bg-emerald-500/20 neon-glow scale-110' : 'bg-slate-800'}`}>
          {active && <div className="absolute inset-0 rounded-full border-2 border-emerald-500/50 animate-ping"></div>}
          <button onClick={active ? stop : start} className={`w-32 h-32 rounded-full flex items-center justify-center transition-all ${active ? 'bg-emerald-500 text-white shadow-xl rotate-0' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}>
            {active ? <Volume2 size={48} className="animate-pulse" /> : <Mic size={48} />}
          </button>
        </div>
        <p className="mt-8 text-slate-400 text-xs font-bold tracking-[0.2em] uppercase">{active ? 'TRANSMITIENDO' : 'LISTO PARA ESCUCHAR'}</p>
        {error && <p className="mt-4 text-red-400 text-xs font-bold uppercase">{error}</p>}
      </div>
      <div className="glass p-6 rounded-3xl h-[600px] flex flex-col border-white/5 shadow-2xl">
        <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-4">
          <h3 className="text-slate-500 font-bold text-xs tracking-widest uppercase">TRANSCRIPCIÓN EN VIVO</h3>
          <button onClick={() => setMsgs([])} className="text-[10px] text-slate-600 hover:text-red-400 font-bold uppercase">Limpiar</button>
        </div>
        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {msgs.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] px-5 py-3 rounded-2xl text-sm leading-relaxed ${m.role === 'user' ? 'bg-indigo-600/20 border border-indigo-500/30 text-indigo-100' : 'bg-slate-800/50 border border-slate-700 text-slate-300'}`}>
                {m.text}
              </div>
            </div>
          ))}
          {msgs.length === 0 && <div className="h-full flex flex-col items-center justify-center opacity-20"><Mic size={48} className="mb-4"/><p className="text-xs font-bold tracking-widest">NO HAY DATOS DE VOZ</p></div>}
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
        contents: [{ parts: [{ text: `Dilo con naturalidad: ${text}` }] }],
        config: {
          responseModalalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
        },
      });
      const data = res.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
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
    <div className="glass p-8 rounded-3xl max-w-4xl mx-auto border-white/5 shadow-2xl">
      <h2 className="text-xl font-bold mb-8 flex items-center gap-2">
        <Volume2 className="text-amber-400" size={24} /> Vox Studio
      </h2>
      <div className="space-y-6">
        <textarea
          className="w-full bg-slate-900/50 border border-slate-700/50 rounded-2xl p-6 focus:outline-none focus:ring-2 focus:ring-amber-500/30 min-h-[180px] text-lg leading-relaxed placeholder:opacity-20 text-slate-200"
          placeholder="Escribe el texto que Nexus debe vocalizar..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex bg-slate-800/50 p-1.5 rounded-2xl gap-1 border border-white/5">
            {['Kore', 'Puck', 'Charon', 'Fenrir'].map(v => (
              <button key={v} onClick={() => setVoice(v)} className={`px-5 py-2 rounded-xl text-[10px] font-black tracking-widest transition-all ${voice === v ? 'bg-amber-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
                {v}
              </button>
            ))}
          </div>
          <button onClick={speak} disabled={loading || !text.trim()} className="bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 text-white px-10 py-3.5 rounded-2xl font-black text-xs tracking-widest transition-all shadow-xl shadow-amber-900/20 flex items-center gap-3 active:scale-[0.98]">
            {loading ? <Loader2 className="animate-spin" size={18} /> : isPlaying ? <Volume2 className="animate-pulse" size={18} /> : 'EJECUTAR VOZ'}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- App Layout ---
const App = () => {
  const [tab, setTab] = useState('images');

  const tabs = [
    { id: 'images', label: 'DREAMS', icon: Sparkles, color: 'text-indigo-400' },
    { id: 'video', label: 'MOTION', icon: Video, color: 'text-pink-400' },
    { id: 'live', label: 'LIVE', icon: Mic, color: 'text-emerald-400' },
    { id: 'tts', label: 'VOX', icon: Volume2, color: 'text-amber-400' },
  ];

  return (
    <div className="min-h-screen p-4 md:p-12 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row items-center justify-between mb-16 gap-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30 border border-indigo-400/20">
              <Layers className="text-white" size={20} />
            </div>
            <h1 className="text-5xl font-black tracking-tighter gradient-text">NEXUS.</h1>
          </div>
          <p className="text-slate-500 font-bold text-[10px] tracking-[0.4em] uppercase ml-1">Multi-Modal Generative AI</p>
        </div>
        
        <nav className="glass p-1.5 rounded-2xl flex gap-1 shadow-2xl border-white/5">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-3 px-6 py-3 rounded-xl transition-all ${tab === t.id ? 'bg-white/10 text-white shadow-inner' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
            >
              <t.icon size={18} className={tab === t.id ? t.color : 'text-slate-600'} />
              <span className="font-black text-[10px] tracking-widest">{t.label}</span>
            </button>
          ))}
        </nav>
      </header>

      <main className="animate-in fade-in duration-700">
        {tab === 'images' && <DreamCanvas />}
        {tab === 'video' && <MotionStudio />}
        {tab === 'live' && <LiveCompanion />}
        {tab === 'tts' && <Vox />}
      </main>

      <footer className="mt-24 text-center border-t border-slate-900 pt-12 pb-16">
        <p className="text-slate-700 font-bold text-[10px] tracking-[0.3em] uppercase">Built with Gemini 2.5 Multi-Modal & Native Audio Preview</p>
      </footer>
    </div>
  );
};

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(<App />);
} else {
  console.error("No se encontró el elemento root");
}
