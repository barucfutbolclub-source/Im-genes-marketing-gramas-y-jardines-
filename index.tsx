
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
  Target,
  ShoppingBag,
  TrendingUp,
  MessageSquare,
  Mail,
  Store,
  Palette,
  ExternalLink,
  Settings2,
  Lock,
  RefreshCcw,
  ShieldAlert,
  Key
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

// Utility to create a WAV file from PCM data
function createWavBlob(pcmData: Uint8Array, sampleRate: number): Blob {
  const header = new ArrayBuffer(44);
  const view = new DataView(header);

  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 32 + pcmData.length, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // Linear PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // Byte rate
  view.setUint16(32, 2, true); // Block align
  view.setUint16(34, 16, true); // Bits per sample
  writeString(36, 'data');
  view.setUint32(40, pcmData.length, true);

  return new Blob([header, pcmData], { type: 'audio/wav' });
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
  const [campaignGoal, setCampaignGoal] = useState('');
  const [marketingStyle, setMarketingStyle] = useState('Luxury Studio');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [qualityLevel, setQualityLevel] = useState(0); 
  const [batchSize, setBatchSize] = useState(1);
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<{message: string, isQuota: boolean, isForbidden: boolean, isFallback?: boolean} | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [refImage, setRefImage] = useState<{data: string, mime: string} | null>(null);
  const [postVariations, setPostVariations] = useState<{instagram: string, linkedin: string, twitter: string, email: string, ecommerce: string} | null>(null);
  const [activePostTab, setActivePostTab] = useState<'instagram' | 'linkedin' | 'twitter' | 'email' | 'ecommerce'>('instagram');
  const [writingPost, setWritingPost] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('nexus_dream_history');
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  const downloadImage = (url: string, index: number) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `nexus-marketing-asset-${index + 1}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
      case 0: return { label: 'Standard (Fast)', icon: Zap, color: 'text-slate-400' };
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
    setCurrentStep(0);
    
    const validResults: string[] = [];
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      let modelName = qualityLevel > 0 ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';
      let imageConfig: any = { aspectRatio };
      if (qualityLevel === 1) imageConfig.imageSize = "1K";
      if (qualityLevel === 2) imageConfig.imageSize = "2K";

      const styles: Record<string, string> = {
        'Luxury Studio': 'High-end luxury commercial studio photography, soft bokeh, cinematic lighting, sharp focus on product.',
        'Minimalist': 'Clean minimalist aesthetic, white space, soft shadows, geometric composition, modern look.',
        'Vibrant Tech': 'Cyberpunk neon aesthetics, sharp reflections, high contrast, tech-forward commercial style.',
        'Urban Lifestyle': 'Natural sunlight, authentic urban setting, depth of field, lifestyle marketing photography.'
      };

      const marketingEnhancedPrompt = `${styles[marketingStyle]} Subject: ${prompt}. Campaign goal: ${campaignGoal || 'High impact sales advertisement'}. professional commercial grade.`;

      for (let i = 0; i < (typeof batchSize === 'number' ? batchSize : 1); i++) {
        setCurrentStep(i + 1);
        const parts: any[] = [{ text: `${marketingEnhancedPrompt} --variation ${i + 1} --v 6.1` }];
        if (refImage) {
          parts.unshift({
            inlineData: { data: refImage.data, mimeType: refImage.mime }
          });
        }

        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: { parts },
            config: { imageConfig }
          });

          const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
          if (part) {
            const newImg = `data:image/png;base64,${part.inlineData.data}`;
            validResults.push(newImg);
            setImages([...validResults]);
          }
        } catch (innerErr: any) {
          const errMsg = innerErr.message?.toLowerCase() || "";
          const isQuotaError = errMsg.includes("429") || errMsg.includes("quota");
          const isForbiddenError = errMsg.includes("403") || errMsg.includes("permission");
          
          if (isForbiddenError) {
            if (modelName !== 'gemini-2.5-flash-image') {
              setError({
                message: "Acceso Pro restringido. Usando motor Standard...",
                isQuota: false,
                isForbidden: true,
                isFallback: true
              });
              modelName = 'gemini-2.5-flash-image';
              i--; 
              await new Promise(r => setTimeout(r, 800));
              continue;
            }
          }

          if (isQuotaError) {
            setError({ message: "Límite alcanzado. Espera 60s.", isQuota: true, isForbidden: false });
            break;
          }
          throw innerErr;
        }
        if (i < batchSize - 1) await new Promise(resolve => setTimeout(resolve, 1500));
      }

      if (validResults.length > 0) saveToHistory(prompt);
    } catch (err: any) {
      const errMsg = err.message || "Error desconocido";
      setError({
        message: errMsg.includes("403") ? "Error 403: Tu clave de API no tiene permisos. Requiere clave de facturación activa." : errMsg,
        isQuota: errMsg.includes("429"),
        isForbidden: errMsg.includes("403")
      });
    } finally {
      setLoading(false);
    }
  };

  const createMarketingSuite = async () => {
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
            { text: `Genera una suite de marketing AIDA en JSON para: "${prompt}".` }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              instagram: { type: Type.STRING },
              linkedin: { type: Type.STRING },
              twitter: { type: Type.STRING },
              email: { type: Type.STRING },
              ecommerce: { type: Type.STRING }
            }
          }
        }
      });
      const data = JSON.parse(response.text);
      setPostVariations(data);
    } catch (e: any) {
      setError({ message: "Error: " + e.message, isQuota: e.message?.includes("429"), isForbidden: e.message?.includes("403") });
    } finally {
      setWritingPost(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-[400px_1fr] gap-8">
      <aside className="space-y-6">
        <div className="glass p-6 rounded-3xl h-fit border-white/5 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Settings2 size={40} />
          </div>
          
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <ShoppingBag className="text-emerald-400" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Marketing Studio</h2>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Resilient Engine v3.2</p>
            </div>
          </div>
          
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Target size={12} className="text-emerald-400" /> Objetivo Comercial
              </label>
              <input
                className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-xs text-slate-200"
                placeholder="Ej: Promo 2x1, Calidad Premium..."
                value={campaignGoal}
                onChange={(e) => setCampaignGoal(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Concepto</label>
              <textarea
                className="w-full bg-slate-900/50 border border-slate-700/50 rounded-2xl p-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 min-h-[80px] text-sm resize-none text-slate-200"
                placeholder="Producto y escenario..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 px-1">
                <Layers size={12} className="text-amber-400" /> Variaciones
              </label>
              <div className="grid grid-cols-5 gap-1">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    onClick={() => setBatchSize(n)}
                    className={`py-2 rounded-lg text-[10px] font-black border ${batchSize === n ? 'bg-amber-500 border-amber-400 text-slate-950 shadow-lg' : 'bg-slate-800/50 border-slate-700 text-slate-500'}`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={generateImage}
              disabled={loading || !prompt.trim()}
              className={`w-full py-4 rounded-2xl font-black text-xs tracking-[0.2em] transition-all flex items-center justify-center gap-2 shadow-lg ${loading ? 'bg-slate-800 text-slate-600' : 'bg-gradient-to-br from-emerald-600 via-emerald-500 to-indigo-600 hover:scale-[1.02] text-white'}`}
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : 'SINTETIZAR ANUNCIOS'}
            </button>
            
            <HistorySection 
              history={history} 
              onSelect={setPrompt} 
              onRemove={removeHistoryItem}
              onClear={() => setHistory([])}
              title="HISTORIAL"
              icon={Clock} 
            />
          </div>
        </div>
      </aside>

      <main className="space-y-6">
        {loading ? (
          <div className="glass rounded-3xl min-h-[600px] flex flex-col items-center justify-center gap-8 relative border-white/5 shadow-2xl overflow-hidden">
            <div className="w-24 h-24 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
            <p className="text-emerald-100 font-black tracking-[0.5em] text-sm uppercase">Nexus Procesando {currentStep}/{batchSize}...</p>
          </div>
        ) : error ? (
           <div className="glass rounded-3xl min-h-[400px] flex flex-col items-center justify-center border-red-500/10 shadow-2xl p-8">
             <div className={`p-8 flex flex-col items-center gap-4 border rounded-2xl max-w-lg text-center animate-in zoom-in ${error.isFallback ? 'bg-amber-950/20 border-amber-900/50 text-amber-400' : 'bg-red-950/20 border-red-900/50 text-red-400'}`}>
                {error.isForbidden ? <Lock size={40} className="text-red-500" /> : <AlertCircle size={40} className="text-red-500" />}
                <h3 className="font-black text-xs uppercase tracking-widest">{error.isForbidden ? "Acceso Restringido" : "Aviso de Sistema"}</h3>
                <p className="text-sm font-medium leading-relaxed">{error.message}</p>
                {error.isForbidden &&