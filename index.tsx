
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
  ChevronDown,
  Upload,
  ImageIcon,
  FileText,
  Instagram,
  Facebook,
  Linkedin,
  Mail,
  Search,
  Globe,
  Monitor,
  Smartphone,
  Cpu,
  Heart,
  Unlock,
  Activity,
  Twitter,
  Share2,
  Rocket
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

function createWavBlob(pcmData: Uint8Array, sampleRate: number = 24000) {
  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i));
  };
  writeString(0, 'RIFF');
  view.setUint32(4, 32 + pcmData.length, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, pcmData.length, true);
  return new Blob([header, pcmData], { type: 'audio/wav' });
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

// --- Social Launch Component ---
const SocialLaunchOverlay = ({ content, caption, onClose }: { content: string, caption?: string, onClose: () => void }) => {
  const shareData = {
    title: 'Nexus AI Creation',
    text: caption || '¡Mira lo que he creado con Nexus Studio!',
    url: window.location.href
  };

  const handleShare = (platform: string) => {
    const text = encodeURIComponent(caption || 'Nexus Studio Creative Asset');
    const url = encodeURIComponent(window.location.href);
    
    const intents: Record<string, string> = {
      twitter: `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`
    };

    if (platform === 'native' && navigator.share) {
      navigator.share(shareData).catch(console.error);
    } else if (intents[platform]) {
      window.open(intents[platform], '_blank', 'width=600,height=400');
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="glass w-full max-w-md rounded-[2.5rem] border-white/10 p-8 space-y-8 animate-in zoom-in duration-500">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
             <Rocket className="text-indigo-400 animate-bounce" size={24} />
             <h3 className="text-lg font-black tracking-tight text-white uppercase italic">Lanzar al Mundo</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white"><X size={20} /></button>
        </div>

        <div className="aspect-video w-full rounded-2xl overflow-hidden bg-slate-900 border border-white/5">
          {content.startsWith('data:image') ? (
            <img src={content} className="w-full h-full object-cover" />
          ) : content.startsWith('blob:') ? (
            <video src={content} className="w-full h-full object-cover" autoPlay loop muted />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-500 font-bold uppercase text-[10px]">Asset de Audio</div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => handleShare('twitter')} className="flex items-center justify-center gap-3 py-4 bg-slate-900 hover:bg-[#1DA1F2]/20 border border-white/5 rounded-2xl transition-all group">
            <Twitter size={20} className="text-[#1DA1F2] group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-black uppercase text-slate-400 group-hover:text-white">Twitter</span>
          </button>
          <button onClick={() => handleShare('linkedin')} className="flex items-center justify-center gap-3 py-4 bg-slate-900 hover:bg-[#0077b5]/20 border border-white/5 rounded-2xl transition-all group">
            <Linkedin size={20} className="text-[#0077b5] group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-black uppercase text-slate-400 group-hover:text-white">LinkedIn</span>
          </button>
          <button onClick={() => handleShare('facebook')} className="flex items-center justify-center gap-3 py-4 bg-slate-900 hover:bg-[#1877F2]/20 border border-white/5 rounded-2xl transition-all group">
            <Facebook size={20} className="text-[#1877F2] group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-black uppercase text-slate-400 group-hover:text-white">Facebook</span>
          </button>
          <button onClick={() => handleShare('native')} className="flex items-center justify-center gap-3 py-4 bg-slate-900 hover:bg-emerald-500/20 border border-white/5 rounded-2xl transition-all group">
            <Share2 size={20} className="text-emerald-400 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-black uppercase text-slate-400 group-hover:text-white">Otros</span>
          </button>
        </div>

        <div className="bg-slate-900/50 p-4 rounded-xl border border-white/5">
          <p className="text-[10px] text-slate-500 uppercase font-black mb-2 flex items-center gap-2"><Target size={12} /> Caption sugerida (IA)</p>
          <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">{caption || 'Creado con Nexus Creative Hub.'}</p>
        </div>
      </div>
    </div>
  );
};

// --- Entry Gate Component ---
const EntryGate = ({ onUnlock }: { onUnlock: () => void }) => {
  const [loading, setLoading] = useState(false);

  const handleUnlock = async () => {
    setLoading(true);
    try {
      await window.aistudio.openSelectKey();
      onUnlock();
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,#1e1b4b_0%,#020617_100%)] opacity-50" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-500/5 rounded-full blur-[120px] animate-pulse" />
      <div className="relative text-center space-y-12 max-w-lg px-6 animate-in zoom-in fade-in duration-1000">
        <div className="flex flex-col items-center gap-6">
          <div className="w-24 h-24 bg-indigo-600 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-indigo-500/20 transform hover:rotate-6 transition-all cursor-pointer"><Layers className="text-white" size={48} /></div>
          <div className="space-y-2">
            <h1 className="text-7xl font-black tracking-tighter gradient-text leading-none">NEXUS.</h1>
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.6em]">Creative Intelligence Hub</p>
          </div>
        </div>
        <div className="space-y-6">
          <div className="p-6 glass rounded-3xl border-white/5 space-y-4 text-center">
            <div className="flex items-center gap-3 text-emerald-400 justify-center"><ShieldAlert size={18} /><span className="text-[10px] font-black uppercase tracking-widest">Protocolo de Seguridad</span></div>
            <p className="text-xs text-slate-400 leading-relaxed font-medium">Accede al estudio avanzado de generación multi-modal vinculando tu clave API institucional.</p>
            <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold flex items-center justify-center gap-1 transition-colors">FACTURACIÓN Y DOCS <ExternalLink size={10} /></a>
          </div>
          <button onClick={handleUnlock} disabled={loading} className="w-full py-5 bg-white text-slate-950 rounded-2xl font-black text-xs tracking-[0.3em] hover:bg-indigo-50 transition-all shadow-xl active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3">
            {loading ? <Loader2 className="animate-spin" size={18} /> : <><Unlock size={16} /> ACTIVAR ESTUDIO</>}
          </button>
        </div>
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
  const [quality, setQuality] = useState<'Standard' | 'High'>('Standard');
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<{message: string, isQuota: boolean, isForbidden: boolean, isFallback?: boolean} | null>(null);
  const [marketingCopy, setMarketingCopy] = useState<string | null>(null);
  const [copyLoading, setCopyLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [refImage, setRefImage] = useState<{data: string, mimeType: string} | null>(null);
  const [selectedChannels, setSelectedChannels] = useState<string[]>(['Social Media']);
  const [socialLaunch, setSocialLaunch] = useState<{content: string, caption: string} | null>(null);
  
  const channels = [
    { id: 'Social Media', label: 'Social Ads', icon: Instagram },
    { id: 'LinkedIn B2B', label: 'LinkedIn', icon: Linkedin },
    { id: 'Email Marketing', label: 'Email', icon: Mail },
    { id: 'SEO/SEM', label: 'Búsqueda', icon: Search },
    { id: 'Web/Landing', label: 'Web/Content', icon: Globe }
  ];

  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleChannel = (id: string) => {
    setSelectedChannels(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };

  const handleHighQualitySelect = async () => {
    if (quality === 'High') { setQuality('Standard'); return; }
    await window.aistudio.openSelectKey();
    setQuality('High');
  };

  const generateImage = async () => {
    if (!prompt.trim()) return;
    setLoading(true); setError(null); setImages([]); setMarketingCopy(null); setCurrentStep(0);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const modelName = quality === 'High' ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';
      const styles: Record<string, string> = {
        'Luxury Studio': 'High-end luxury commercial photography, cinematic lighting, sharp focus, 8k.',
        'Minimalist': 'Clean minimalist, white space, soft shadows, neutral tones.',
        'Vibrant Tech': 'Cyberpunk neon, sharp reflections, high contrast, digital futuristic.',
        'Urban Lifestyle': 'Natural sunlight, authentic urban setting, shallow depth of field.'
      };
      const finalPrompt = `${styles[marketingStyle]} Subject: ${prompt}. Campaign Goal: ${campaignGoal || 'General promotion'}. Professional commercial grade photography.`;

      let completedCount = 0;
      const generationPromises = Array.from({ length: batchSize }).map(async (_, i) => {
        try {
          const parts: any[] = [{ text: `${finalPrompt} --variation ${i+1}` }];
          if (refImage) parts.unshift({ inlineData: { data: refImage.data, mimeType: refImage.mimeType } });
          const config: any = { imageConfig: { aspectRatio } };
          if (quality === 'High') config.imageConfig.imageSize = "2K";
          const response = await ai.models.generateContent({ model: modelName, contents: { parts }, config: config });
          const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
          completedCount++; setCurrentStep(completedCount);
          return part ? `data:image/png;base64,${part.inlineData.data}` : null;
        } catch (err: any) { return null; }
      });

      const results = await Promise.all(generationPromises);
      const validImages = results.filter((img): img is string => img !== null);
      if (validImages.length === 0) throw new Error("Generación fallida.");
      setImages(validImages);
      generateCopy(validImages[0], prompt);
    } catch (err: any) { setError({ message: err.message, isQuota: false, isForbidden: false }); } finally { setLoading(false); }
  };

  const generateCopy = async (imageBuffer: string, originalPrompt: string) => {
    setCopyLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const base64Data = imageBuffer.split(',')[1];
      const channelsText = selectedChannels.join(', ');
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          { parts: [
              { inlineData: { data: base64Data, mimeType: 'image/png' } },
              { text: `Create a marketing post caption in Spanish for ${originalPrompt} targeted at ${channelsText}. Make it high-converting.` }
            ] }
        ]
      });
      setMarketingCopy(response.text || "");
    } catch (e: any) { setMarketingCopy(""); } finally { setCopyLoading(false); }
  };

  return (
    <div className="grid lg:grid-cols-[380px_1fr] gap-8">
      {socialLaunch && <SocialLaunchOverlay content={socialLaunch.content} caption={socialLaunch.caption} onClose={() => setSocialLaunch(null)} />}
      <div className="glass p-6 rounded-3xl h-fit border-white/5 shadow-2xl space-y-6">
        <div className="flex items-center gap-3 mb-4"><ShoppingBag className="text-emerald-400" size={20} /><h2 className="font-bold text-white uppercase tracking-widest text-sm">Marketing Hub</h2></div>
        <div className="space-y-4">
          <textarea className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white min-h-[80px] outline-none" placeholder="Brief del producto..." value={prompt} onChange={e => setPrompt(e.target.value)} />
          <div onClick={() => fileInputRef.current?.click()} className={`w-full border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer ${refImage ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-slate-800 bg-slate-900/50'}`}>
            {refImage ? <img src={`data:${refImage.mimeType};base64,${refImage.data}`} className="w-full aspect-video object-cover rounded-lg" /> : <><Upload size={20} className="text-slate-600 mb-2" /><span className="text-[9px] font-bold text-slate-500 uppercase">Referencia Visual</span></>}
            <input type="file" ref={fileInputRef} onChange={e => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = () => setRefImage({ data: (r.result as string).split(',')[1], mimeType: f.type }); r.readAsDataURL(f); } }} className="hidden" accept="image/*" />
          </div>
          <div className="grid grid-cols-5 gap-2">{channels.map(c => <button key={c.id} onClick={() => toggleChannel(c.id)} className={`p-3 rounded-xl border transition-all ${selectedChannels.includes(c.id) ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-500'}`}><c.icon size={16} /></button>)}</div>
          <div className="grid grid-cols-2 gap-2"><button onClick={() => setQuality('Standard')} className={`py-2 rounded-xl border text-[10px] font-bold ${quality === 'Standard' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>Standard</button><button onClick={handleHighQualitySelect} className={`py-2 rounded-xl border flex items-center justify-center gap-2 text-[10px] font-bold ${quality === 'High' ? 'bg-amber-600 border-amber-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-500'}`}><Award size={14} /> Pro</button></div>
          <button onClick={generateImage} disabled={loading || !prompt} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs active:scale-95 transition-all">{loading ? <Loader2 className="animate-spin mx-auto" /> : 'DESPLEGAR CAMPAÑA'}</button>
        </div>
      </div>
      <div className="flex flex-col gap-6">
        <div className="min-h-[400px] glass rounded-3xl border-white/5 p-6 relative">
          {images.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {images.map((img, i) => (
                <div key={i} className="group relative aspect-square rounded-2xl overflow-hidden border border-white/5 bg-slate-900 animate-in zoom-in">
                  <img src={img} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent flex items-end justify-between p-4 opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={() => setSocialLaunch({content: img, caption: marketingCopy || ''})} className="p-3 bg-white text-slate-950 rounded-xl font-bold text-[10px] flex items-center gap-2"><Rocket size={14} /> LANZAR</button>
                    <button onClick={() => { const l = document.createElement('a'); l.href = img; l.download = `nexus-${i}.png`; l.click(); }} className="p-3 bg-emerald-600 rounded-xl text-white"><Download size={18} /></button>
                  </div>
                </div>
              ))}
            </div>
          ) : !loading && <div className="h-[400px] flex flex-col items-center justify-center text-slate-800 opacity-20"><ShoppingBag size={64} /><p className="text-[10px] font-black uppercase mt-6">Nexus Creative Ready</p></div>}
          {loading && <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-950/40 backdrop-blur-sm"><Loader2 className="animate-spin text-emerald-400" size={48} /></div>}
        </div>
        {marketingCopy && (
          <div className="glass p-8 rounded-3xl animate-in slide-in-from-bottom">
            <h3 className="font-bold text-white uppercase text-xs tracking-widest mb-4 flex items-center gap-2"><Target size={14} /> Copy Sugerido</h3>
            <div className="text-sm text-slate-300 whitespace-pre-wrap bg-slate-900/50 p-6 rounded-2xl border border-white/5">{marketingCopy}</div>
          </div>
        )}
      </div>
    </div>
  );
};

const MotionStudio = () => {
  const [prompt, setPrompt] = useState('');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [refImage, setRefImage] = useState<{data: string, mimeType: string} | null>(null);
  const [socialLaunch, setSocialLaunch] = useState<{content: string, caption: string} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateVideo = async () => {
    if (!prompt.trim() && !refImage) return;
    setLoading(true); setError(null); setVideoUrl(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const params: any = { model: 'veo-3.1-fast-generate-preview', config: { numberOfVideos: 1, resolution: '1080p', aspectRatio } };
      if (prompt.trim()) params.prompt = prompt;
      if (refImage) params.image = { imageBytes: refImage.data, mimeType: refImage.mimeType };
      let op = await ai.models.generateVideos(params);
      while (!op.done) { await new Promise(r => setTimeout(r, 7000)); op = await ai.operations.getVideosOperation({ operation: op }); }
      const link = op.response?.generatedVideos?.[0]?.video?.uri;
      if (link) { const res = await fetch(`${link}&key=${process.env.API_KEY}`); const blob = await res.blob(); setVideoUrl(URL.createObjectURL(blob)); }
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  };

  return (
    <div className="grid md:grid-cols-[380px_1fr] gap-8">
      {socialLaunch && <SocialLaunchOverlay content={socialLaunch.content} caption={socialLaunch.caption} onClose={() => setSocialLaunch(null)} />}
      <div className="glass p-6 rounded-3xl border-white/5 space-y-6">
        <div className="flex items-center gap-2 mb-4"><Video className="text-pink-400" size={20} /><h2 className="font-bold text-white uppercase text-xs tracking-widest">Motion Studio Pro</h2></div>
        <textarea className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs text-white min-h-[120px] outline-none" placeholder="Descripción de movimiento..." value={prompt} onChange={e => setPrompt(e.target.value)} />
        <div onClick={() => fileInputRef.current?.click()} className="w-full border-2 border-dashed border-slate-800 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer">
          {refImage ? <img src={`data:${refImage.mimeType};base64,${refImage.data}`} className="w-full aspect-video object-cover rounded-lg" /> : <><ImageIcon size={20} className="text-slate-600 mb-2" /><span className="text-[9px] font-bold text-slate-500 uppercase">Cargar para Animar</span></>}
          <input type="file" ref={fileInputRef} onChange={e => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = () => setRefImage({ data: (r.result as string).split(',')[1], mimeType: f.type }); r.readAsDataURL(f); } }} className="hidden" accept="image/*" />
        </div>
        <button onClick={generateVideo} disabled={loading} className="w-full py-4 bg-pink-600 text-white rounded-2xl font-black text-xs transition-all">{loading ? <Loader2 className="animate-spin mx-auto" /> : 'GENERAR CINEMATIC'}</button>
      </div>
      <div className="glass rounded-[2rem] min-h-[550px] flex flex-col items-center justify-center bg-black overflow-hidden relative border-white/5">
        {videoUrl ? (
          <>
            <video src={videoUrl} controls autoPlay loop className="w-full h-full object-cover" />
            <div className="absolute bottom-6 right-6 flex gap-3">
              <button onClick={() => setSocialLaunch({content: videoUrl, caption: prompt})} className="px-6 py-3 bg-white text-slate-950 rounded-xl font-bold text-xs flex items-center gap-2 shadow-2xl"><Rocket size={16} /> LANZAR A REDES</button>
            </div>
          </>
        ) : !loading && <Play size={40} className="text-slate-800 opacity-20" />}
        {loading && <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/40 backdrop-blur-sm"><Loader2 className="animate-spin text-pink-400" size={48} /><p className="text-pink-100 font-black text-[10px] uppercase tracking-widest animate-pulse">Sintetizando Cinematic...</p></div>}
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
            src.connect(proc); proc.connect(inCtx.destination);
            setActive(true);
          },
          onmessage: async (m: LiveServerMessage) => {
            const audio = m.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audio) {
              const buf = await decodeAudioData(decode(audio), outCtx, 24000, 1);
              const s = outCtx.createBufferSource(); s.buffer = buf; s.connect(outCtx.destination); s.start();
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
          inputAudioTranscription: {}, outputAudioTranscription: {}
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (e) { console.error(e); }
  };

  return (
    <div className="grid md:grid-cols-[380px_1fr] gap-6">
      <div className="glass p-8 rounded-[2.5rem] flex flex-col items-center justify-center text-center border-white/5">
        <button onClick={active ? () => { sessionRef.current?.close(); setActive(false); } : start} className={`w-32 h-32 rounded-full flex items-center justify-center transition-all ${active ? 'bg-indigo-500 shadow-xl scale-110' : 'bg-slate-800'}`}>{active ? <Volume2 size={40} className="animate-pulse" /> : <Mic size={40} />}</button>
        <p className={`mt-8 text-[10px] font-black uppercase tracking-widest ${active ? 'text-indigo-400' : 'text-slate-500'}`}>{active ? 'SESIÓN ACTIVA' : 'INICIAR VOZ'}</p>
      </div>
      <div className="glass p-8 rounded-[2.5rem] h-[550px] flex flex-col border-white/5 overflow-hidden">
        <div className="flex-1 overflow-y-auto space-y-4 custom-scroll">
          {msgs.map((m, i) => <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom`}><div className={`max-w-[80%] px-5 py-3 rounded-2xl text-[13px] ${m.role === 'user' ? 'bg-indigo-600 text-white shadow-xl' : 'bg-slate-800 text-slate-200 border border-white/5'}`}>{m.text}</div></div>)}
        </div>
      </div>
    </div>
  );
};

const Vox = () => {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [voice, setVoice] = useState('Kore');
  const [tone, setTone] = useState('Profesional');
  const [isPlaying, setIsPlaying] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [socialLaunch, setSocialLaunch] = useState<{content: string, caption: string} | null>(null);

  const speak = async () => {
    if (!text.trim()) return;
    setLoading(true); setDownloadUrl(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const res = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Say ${tone.toLowerCase()}: ${text}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
        },
      });
      const data = res.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;
      if (data) {
        const rawBytes = decode(data);
        const ctx = new AudioContext({ sampleRate: 24000 });
        const buf = await decodeAudioData(rawBytes, ctx, 24000, 1);
        const url = URL.createObjectURL(createWavBlob(rawBytes, 24000));
        setDownloadUrl(url);
        const s = ctx.createBufferSource(); s.buffer = buf; s.connect(ctx.destination); 
        setIsPlaying(true); s.start(); s.onended = () => setIsPlaying(false);
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  return (
    <div className="glass p-12 rounded-[3.5rem] max-w-4xl mx-auto border-white/5 space-y-8 relative overflow-hidden">
      {socialLaunch && <SocialLaunchOverlay content={socialLaunch.content} caption={socialLaunch.caption} onClose={() => setSocialLaunch(null)} />}
      <h2 className="font-bold text-white text-sm uppercase tracking-widest flex items-center gap-4"><Volume2 className="text-amber-400" /> Vox Locución Premium</h2>
      <textarea className="w-full bg-slate-900/40 border border-slate-800 rounded-[2rem] p-8 text-slate-200 text-lg min-h-[220px] outline-none" placeholder="Texto para vocalizar..." value={text} onChange={e => setText(e.target.value)} />
      <div className="grid grid-cols-2 gap-6">
        <select className="bg-slate-800 border-slate-700 rounded-xl px-6 py-4 text-xs font-bold text-slate-300 outline-none" value={voice} onChange={e => setVoice(e.target.value)}>{['Kore', 'Puck', 'Charon', 'Fenrir'].map(v => <option key={v}>{v}</option>)}</select>
        <select className="bg-slate-800 border-slate-700 rounded-xl px-6 py-4 text-xs font-bold text-slate-300 outline-none" value={tone} onChange={e => setTone(e.target.value)}>{['Profesional', 'Entusiasta', 'Calmado', 'Serio', 'Alegre'].map(t => <option key={t}>{t}</option>)}</select>
      </div>
      <div className="flex justify-between items-center border-t border-slate-800 pt-8">
        <div className="flex gap-3">
          {downloadUrl && <button onClick={() => setSocialLaunch({content: 'audio_placeholder', caption: text})} className="p-4 bg-white text-slate-950 rounded-xl font-bold text-xs flex items-center gap-2"><Rocket size={16} /> LANZAR</button>}
          {downloadUrl && <a href={downloadUrl} download="nexus-audio.wav" className="p-4 bg-slate-800 text-amber-400 rounded-xl"><Download size={20} /></a>}
        </div>
        <button onClick={speak} disabled={loading || isPlaying} className="bg-amber-600 px-12 py-5 rounded-2xl font-black text-[11px] tracking-widest text-white">{loading ? <Loader2 className="animate-spin" /> : 'SINTETIZAR VOZ'}</button>
      </div>
    </div>
  );
};

// --- Main App ---
const App = () => {
  const [tab, setTab] = useState('images');
  const [isUnlocked, setIsUnlocked] = useState(false);

  useEffect(() => {
    const checkKey = async () => {
      const hasKey = await window.aistudio.hasSelectedApiKey();
      if (hasKey) setIsUnlocked(true);
    };
    checkKey();
  }, []);

  if (!isUnlocked) return <EntryGate onUnlock={() => setIsUnlocked(true)} />;

  const tabs = [
    { id: 'images', label: 'MARKETING', icon: ShoppingBag, color: 'text-emerald-400' },
    { id: 'video', label: 'MOTION', icon: Video, color: 'text-pink-400' },
    { id: 'live', label: 'LIVE', icon: Mic, color: 'text-indigo-400' },
    { id: 'tts', label: 'VOX', icon: Volume2, color: 'text-amber-400' },
  ];

  return (
    <div className="min-h-screen p-4 md:p-12 max-w-7xl mx-auto flex flex-col animate-in fade-in duration-1000">
      <header className="flex flex-col md:flex-row items-center justify-between mb-16 gap-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-500/20"><Layers className="text-white" size={28} /></div>
          <div><h1 className="text-6xl font-black tracking-tighter gradient-text leading-none">NEXUS.</h1><p className="text-slate-600 font-bold text-[10px] uppercase tracking-[0.6em]">Creative Intelligence</p></div>
        </div>
        <nav className="glass p-2 rounded-[1.75rem] flex gap-1 overflow-x-auto no-scrollbar">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-3 px-8 py-4 rounded-[1.25rem] transition-all whitespace-nowrap group ${tab === t.id ? 'bg-white/10 text-white shadow-inner' : 'text-slate-500 hover:text-slate-300'}`}>
              <t.icon size={20} className={`transition-transform duration-300 group-hover:scale-110 ${tab === t.id ? t.color : 'text-slate-600'}`} />
              <span className="font-black text-[11px] tracking-widest">{t.label}</span>
            </button>
          ))}
        </nav>
      </header>
      <main className="flex-1">{tab === 'images' && <DreamCanvas />}{tab === 'video' && <MotionStudio />}{tab === 'live' && <LiveCompanion />}{tab === 'tts' && <Vox />}</main>
      <footer className="mt-32 text-center border-t border-slate-900 pt-16 pb-20 opacity-20"><p className="text-[11px] font-black text-slate-500 tracking-[0.7em] uppercase">Nexus Studio v5.0 • Enterprise Edition</p></footer>
    </div>
  );
};

const root = document.getElementById('root');
if (root) createRoot(root).render(<App />);
