
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
  Rocket,
  Briefcase,
  Lightbulb,
  Building,
  Box,
  BarChart3
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
  const [selectedBriefType, setSelectedBriefType] = useState('Publicitario');
  
  const briefTypes = [
    { id: 'Publicitario', label: 'Publicitario', icon: Target, example: 'Lanzamiento de una nueva bebida energética dirigida a gamers de 18-25 años. Mensaje: "Energía infinita para tus sesiones nocturnas". Estilo neón y dinámico.' },
    { id: 'Marketing', label: 'Marketing', icon: TrendingUp, example: 'Aumentar la cuota de mercado en el sector de cosméticos orgánicos en un 15%. Target: Mujeres 30-45 años interesadas en sostenibilidad. Competencia premium.' },
    { id: 'Creativo', label: 'Creativo', icon: Lightbulb, example: 'Rediseño visual para cafetería artesanal. Tono cálido, rústico pero moderno. Uso de texturas de madera, colores tierra y ambiente acogedor.' },
    { id: 'Empresa', label: 'Empresa', icon: Building, example: 'Startup tecnológica de IA para agricultura. Valores: Innovación y respeto ambiental. Historia: Fundada por agrónomos en 2023. Identidad minimalista.' },
    { id: 'Producto', label: 'Producto', icon: Box, example: 'Auriculares con cancelación de ruido activa. Batería de 50h, diseño plegable. Beneficio: Aislamiento total en entornos urbanos ruidosos.' },
    { id: 'Investigación', label: 'Investigación', icon: BarChart3, example: 'Estudio sobre consumo de café en oficinas. El 70% prefiere café de especialidad. Insight: Insatisfacción actual con máquinas automáticas.' }
  ];

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

  const loadExample = () => {
    const example = briefTypes.find(b => b.id === selectedBriefType)?.example;
    if (example) setPrompt(example);
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
      const finalPrompt = `Brief Type: ${selectedBriefType}. Context: ${prompt}. Marketing Style: ${styles[marketingStyle]}. Campaign Goal: ${campaignGoal || 'General promotion'}. Professional commercial grade photography.`;

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
              { text: `Based on a ${selectedBriefType} brief, create a high-converting post caption in Spanish for this asset: ${originalPrompt}. Focus on ${channelsText}. Include hashtags.` }
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
        <div className="flex items-center gap-3 mb-4"><ShoppingBag className="text-emerald-400" size={20} /><h2 className="font-bold text-white uppercase tracking-widest text-sm">Brief Studio</h2></div>
        
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase mb-3 block tracking-[0.1em]">Tipo de Arquitectura</label>
            <div className="grid grid-cols-3 gap-2">
              {briefTypes.map(b => (
                <button
                  key={b.id}
                  onClick={() => setSelectedBriefType(b.id)}
                  className={`flex flex-col items-center gap-2 p-2 rounded-xl border transition-all ${selectedBriefType === b.id ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-500/10' : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700'}`}
                >
                  <b.icon size={14} className={selectedBriefType === b.id ? 'text-indigo-400' : 'text-slate-600'} />
                  <span className="text-[9px] font-bold uppercase truncate w-full text-center">{b.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
               <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.1em]">Instrucciones del Brief</label>
               <button onClick={loadExample} className="text-[9px] font-black text-indigo-400 hover:text-indigo-300 flex items-center gap-1 uppercase tracking-tighter transition-colors">✨ Cargar Ejemplo</button>
            </div>
            <textarea 
              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white min-h-[100px] outline-none focus:ring-1 focus:ring-indigo-500 transition-all" 
              placeholder={`Escribe o carga un ejemplo de brief ${selectedBriefType.toLowerCase()}...`}
              value={prompt} 
              onChange={e => setPrompt(e.target.value)} 
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block tracking-[0.1em]">Referencia Visual</label>
            <div onClick={() => fileInputRef.current?.click()} className={`w-full border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer ${refImage ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-slate-800 bg-slate-900/50 hover:border-slate-700 transition-colors'}`}>
              {refImage ? <img src={`data:${refImage.mimeType};base64,${refImage.data}`} className="w-full aspect-video object-cover rounded-lg" /> : <><Upload size={18} className="text-slate-600 mb-2" /><span className="text-[9px] font-bold text-slate-500 uppercase">Añadir Guía</span></>}
              <input type="file" ref={fileInputRef} onChange={e => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = () => setRefImage({ data: (r.result as string).split(',')[1], mimeType: f.type }); r.readAsDataURL(f); } }} className="hidden" accept="image/*" />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block tracking-[0.1em]">Estilo Visual</label>
            <div className="grid grid-cols-2 gap-2">
              {['Luxury Studio', 'Minimalist', 'Vibrant Tech', 'Urban Lifestyle'].map(s => (
                <button 
                  key={s} 
                  onClick={() => setMarketingStyle(s)} 
                  className={`py-2 rounded-lg text-[9px] font-black border transition-all uppercase ${marketingStyle === s ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 'bg-slate-900 border-slate-800 text-slate-500'}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4">
            <button onClick={generateImage} disabled={loading || !prompt} className="w-full py-4 bg-white text-slate-950 rounded-2xl font-black text-xs active:scale-95 transition-all shadow-[0_10px_30px_rgba(255,255,255,0.1)] flex items-center justify-center gap-2">
              {loading ? <Loader2 className="animate-spin" size={18} /> : <><Rocket size={16} /> DESPLEGAR CAMPAÑA</>}
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <div className="min-h-[450px] glass rounded-[2.5rem] border-white/5 p-8 relative overflow-hidden">
          {images.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
              {images.map((img, i) => (
                <div key={i} className="group relative aspect-square rounded-[2rem] overflow-hidden border border-white/5 bg-slate-900">
                  <img src={img} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex items-end justify-between p-6 opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <button onClick={() => setSocialLaunch({content: img, caption: marketingCopy || ''})} className="px-5 py-2.5 bg-white text-slate-950 rounded-xl font-black text-[10px] flex items-center gap-2 shadow-xl transform translate-y-2 group-hover:translate-y-0 transition-all duration-300"><Rocket size={14} /> LANZAR</button>
                    <button onClick={() => { const l = document.createElement('a'); l.href = img; l.download = `nexus-${i}.png`; l.click(); }} className="p-3 bg-slate-800/80 hover:bg-slate-700 text-white rounded-xl transition-colors"><Download size={18} /></button>
                  </div>
                </div>
              ))}
            </div>
          ) : !loading && (
            <div className="h-full flex flex-col items-center justify-center text-slate-800/20 py-24">
              <div className="p-10 border-2 border-dashed border-slate-800 rounded-[3rem] mb-6">
                <ShoppingBag size={80} />
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.5em]">Esperando Directrices Estratégicas</p>
            </div>
          )}
          {loading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-950/40 backdrop-blur-sm animate-in fade-in">
              <div className="w-20 h-20 border-4 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin mb-6"></div>
              <p className="text-white font-black text-xs uppercase tracking-[0.3em] animate-pulse">Sintetizando Lote Creativo...</p>
              <p className="text-slate-500 text-[9px] mt-2 font-bold uppercase tracking-widest">{currentStep} de {batchSize} completados</p>
            </div>
          )}
        </div>
        
        {marketingCopy && (
          <div className="glass p-10 rounded-[2.5rem] border-white/5 shadow-2xl animate-in slide-in-from-bottom duration-700">
            <div className="flex items-center justify-between mb-8">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center shadow-lg"><Target className="text-indigo-400" size={18} /></div>
                  <div>
                    <h3 className="font-black text-white uppercase text-xs tracking-widest">Plan de Captions IA</h3>
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Optimizado para {selectedBriefType}</p>
                  </div>
               </div>
               <button onClick={() => { navigator.clipboard.writeText(marketingCopy); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-300 transition-all">
                 {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                 {copied ? 'Copiado' : 'Copiar'}
               </button>
            </div>
            <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap bg-slate-950/50 p-8 rounded-[1.5rem] border border-white/5 font-medium shadow-inner">{marketingCopy}</div>
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
        <textarea className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs text-white min-h-[120px] outline-none" placeholder="Descripción de movimiento cinematográfico..." value={prompt} onChange={e => setPrompt(e.target.value)} />
        <div onClick={() => fileInputRef.current?.click()} className="w-full border-2 border-dashed border-slate-800 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer hover:border-pink-500/30 transition-colors">
          {refImage ? <img src={`data:${refImage.mimeType};base64,${refImage.data}`} className="w-full aspect-video object-cover rounded-lg" /> : <><ImageIcon size={20} className="text-slate-600 mb-2" /><span className="text-[9px] font-bold text-slate-500 uppercase">Cargar para Animar</span></>}
          <input type="file" ref={fileInputRef} onChange={e => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = () => setRefImage({ data: (r.result as string).split(',')[1], mimeType: f.type }); r.readAsDataURL(f); } }} className="hidden" accept="image/*" />
        </div>
        <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setAspectRatio('16:9')} className={`py-2 rounded-xl border text-[10px] font-bold transition-all ${aspectRatio === '16:9' ? 'bg-pink-600 border-pink-500 text-white shadow-lg' : 'bg-slate-900 border-slate-800 text-slate-500'}`}><Monitor size={14} className="mx-auto" /></button>
            <button onClick={() => setAspectRatio('9:16')} className={`py-2 rounded-xl border text-[10px] font-bold transition-all ${aspectRatio === '9:16' ? 'bg-pink-600 border-pink-500 text-white shadow-lg' : 'bg-slate-900 border-slate-800 text-slate-500'}`}><Smartphone size={14} className="mx-auto" /></button>
        </div>
        <button onClick={generateVideo} disabled={loading} className="w-full py-4 bg-pink-600 hover:bg-pink-500 text-white rounded-2xl font-black text-xs transition-all shadow-lg active:scale-95 shadow-pink-900/20">{loading ? <Loader2 className="animate-spin mx-auto" /> : 'GENERAR CINEMATIC'}</button>
      </div>
      <div className="glass rounded-[2.5rem] min-h-[550px] flex flex-col items-center justify-center bg-black overflow-hidden relative border-white/5 shadow-inner">
        {videoUrl ? (
          <>
            <video src={videoUrl} controls autoPlay loop className="w-full h-full object-cover" />
            <div className="absolute bottom-8 right-8 flex gap-3">
              <button onClick={() => setSocialLaunch({content: videoUrl, caption: prompt})} className="px-6 py-3 bg-white text-slate-950 rounded-xl font-black text-[10px] tracking-widest flex items-center gap-2 shadow-2xl hover:bg-slate-50 transition-colors"><Rocket size={16} /> LANZAR A REDES</button>
            </div>
          </>
        ) : !loading && (
          <div className="flex flex-col items-center gap-4 opacity-20">
             <div className="p-8 border-2 border-dashed border-slate-800 rounded-[2.5rem]">
               <Play size={48} className="text-slate-500" />
             </div>
             <p className="text-[10px] font-black uppercase tracking-[0.4em]">Sin Producción Activa</p>
          </div>
        )}
        {loading && <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/40 backdrop-blur-sm animate-in fade-in"><Loader2 className="animate-spin text-pink-400" size={48} /><p className="text-pink-100 font-black text-[10px] uppercase tracking-widest animate-pulse">Sintetizando Cinematic...</p></div>}
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
      <div className="glass p-10 rounded-[2.5rem] flex flex-col items-center justify-center text-center border-white/5 shadow-2xl">
        <button onClick={active ? () => { sessionRef.current?.close(); setActive(false); } : start} className={`w-36 h-36 rounded-full flex items-center justify-center transition-all duration-500 ${active ? 'bg-indigo-500 shadow-[0_0_60px_rgba(99,102,241,0.4)] scale-105' : 'bg-slate-800 hover:bg-slate-700'}`}>{active ? <Volume2 size={48} className="animate-pulse text-white" /> : <Mic size={48} className="text-slate-400" />}</button>
        <p className={`mt-10 text-[10px] font-black uppercase tracking-[0.3em] transition-colors ${active ? 'text-indigo-400' : 'text-slate-500'}`}>{active ? 'INTELIGENCIA ACTIVA' : 'INICIAR VOZ'}</p>
        {!active && <p className="text-[9px] text-slate-600 font-bold mt-2 uppercase tracking-widest">Protocolo de Cierre en Ventas</p>}
      </div>
      <div className="glass p-10 rounded-[2.5rem] h-[550px] flex flex-col border-white/5 overflow-hidden shadow-inner bg-slate-950/20">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/5">
           <MessageSquare size={16} className="text-indigo-400" />
           <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Transcripción de Sesión</span>
        </div>
        <div className="flex-1 overflow-y-auto space-y-4 custom-scroll pr-4">
          {msgs.map((m, i) => <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom duration-300`}><div className={`max-w-[80%] px-5 py-3 rounded-2xl text-[13px] leading-relaxed ${m.role === 'user' ? 'bg-indigo-600 text-white shadow-xl' : 'bg-slate-800 text-slate-200 border border-white/5 backdrop-blur-sm'}`}>{m.text}</div></div>)}
          {msgs.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-slate-800/20 opacity-50">
               <Activity size={40} className="mb-4" />
               <p className="text-[9px] font-black uppercase tracking-widest">Esperando Diálogo...</p>
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
        contents: [{ parts: [{ text: `Say ${tone.toLowerCase()} with high fidelity: ${text}` }] }],
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
    <div className="glass p-12 rounded-[3.5rem] max-w-4xl mx-auto border-white/5 space-y-8 relative overflow-hidden transition-all duration-700 shadow-2xl">
      {socialLaunch && <SocialLaunchOverlay content={socialLaunch.content} caption={socialLaunch.caption} onClose={() => setSocialLaunch(null)} />}
      <div className="flex items-center gap-4 border-b border-white/5 pb-8">
        <div className="w-14 h-14 bg-amber-500/10 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/5">
           <Volume2 className="text-amber-400" size={28} />
        </div>
        <div>
          <h2 className="font-black text-white text-sm uppercase tracking-widest">Vox Locución Premium</h2>
          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Síntesis Neuronal • Fidelidad Ultra</p>
        </div>
      </div>
      <textarea className="w-full bg-slate-900/40 border border-slate-800 rounded-[2rem] p-8 text-slate-200 text-lg leading-relaxed min-h-[240px] outline-none focus:ring-1 focus:ring-amber-500 transition-all shadow-inner" placeholder="Escribe el script para vocalizar..." value={text} onChange={e => setText(e.target.value)} />
      <div className="grid grid-cols-2 gap-6">
        <div className="flex flex-col gap-2">
           <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-4">Perfil Vocal</label>
           <select className="bg-slate-800 border-slate-700 rounded-xl px-6 py-4 text-xs font-bold text-slate-300 outline-none hover:border-amber-500/30 transition-colors cursor-pointer appearance-none" value={voice} onChange={e => setVoice(e.target.value)}>{['Kore', 'Puck', 'Charon', 'Fenrir'].map(v => <option key={v}>{v}</option>)}</select>
        </div>
        <div className="flex flex-col gap-2">
           <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-4">Matiz Emocional</label>
           <select className="bg-slate-800 border-slate-700 rounded-xl px-6 py-4 text-xs font-bold text-slate-300 outline-none hover:border-amber-500/30 transition-colors cursor-pointer appearance-none" value={tone} onChange={e => setTone(e.target.value)}>{['Profesional', 'Entusiasta', 'Calmado', 'Serio', 'Alegre'].map(t => <option key={t}>{t}</option>)}</select>
        </div>
      </div>
      <div className="flex justify-between items-center border-t border-slate-800 pt-8">
        <div className="flex gap-4">
          {downloadUrl && <button onClick={() => setSocialLaunch({content: 'audio_placeholder', caption: text})} className="px-6 py-4 bg-white text-slate-950 rounded-xl font-black text-[10px] tracking-widest flex items-center gap-2 hover:bg-slate-100 transition-colors"><Rocket size={16} /> LANZAR</button>}
          {downloadUrl && <a href={downloadUrl} download="nexus-audio.wav" className="p-4 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-xl transition-colors border border-amber-500/10 shadow-lg"><Download size={20} /></a>}
        </div>
        <button onClick={speak} disabled={loading || isPlaying} className="bg-amber-600 hover:bg-amber-500 px-14 py-5 rounded-2xl font-black text-[11px] tracking-widest text-white transition-all shadow-xl shadow-amber-900/20 active:scale-95">
          {loading ? <Loader2 className="animate-spin" size={18} /> : isPlaying ? 'REPRODUCIENDO...' : 'SINTETIZAR VOZ'}
        </button>
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
    { id: 'images', label: 'BRIEF STUDIO', icon: FileText, color: 'text-emerald-400' },
    { id: 'video', label: 'MOTION', icon: Video, color: 'text-pink-400' },
    { id: 'live', label: 'LIVE', icon: Mic, color: 'text-indigo-400' },
    { id: 'tts', label: 'VOX', icon: Volume2, color: 'text-amber-400' },
  ];

  return (
    <div className="min-h-screen p-4 md:p-12 max-w-7xl mx-auto flex flex-col animate-in fade-in duration-1000">
      <header className="flex flex-col md:flex-row items-center justify-between mb-20 gap-8">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 bg-indigo-600 rounded-[1.5rem] flex items-center justify-center shadow-[0_20px_40px_rgba(79,70,229,0.3)] transform hover:rotate-6 transition-transform duration-500"><Layers className="text-white" size={32} /></div>
          <div><h1 className="text-7xl font-black tracking-tighter gradient-text leading-none">NEXUS.</h1><p className="text-slate-600 font-bold text-[10px] uppercase tracking-[0.7em] ml-1 mt-1">Advanced Creative Intelligence</p></div>
        </div>
        <nav className="glass p-2 rounded-[2rem] flex gap-1 overflow-x-auto no-scrollbar shadow-2xl border-white/5">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-3 px-8 py-4 rounded-[1.5rem] transition-all whitespace-nowrap group ${tab === t.id ? 'bg-white/10 text-white shadow-inner' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}>
              <t.icon size={20} className={`transition-transform duration-500 group-hover:scale-110 ${tab === t.id ? t.color : 'text-slate-600'}`} />
              <span className="font-black text-[11px] tracking-widest">{t.label}</span>
            </button>
          ))}
        </nav>
      </header>
      <main className="flex-1 animate-in fade-in slide-in-from-bottom-8 duration-700">
        {tab === 'images' && <DreamCanvas />}
        {tab === 'video' && <MotionStudio />}
        {tab === 'live' && <LiveCompanion />}
        {tab === 'tts' && <Vox />}
      </main>
      <footer className="mt-40 text-center border-t border-white/5 pt-20 pb-24 opacity-20 hover:opacity-40 transition-opacity duration-700">
        <div className="flex flex-col items-center gap-4">
           <div className="flex items-center gap-8">
              <Zap size={20} />
              <p className="text-[12px] font-black text-slate-500 tracking-[0.8em] uppercase">Nexus Studio v5.1 • Enterprise Ultra Edition</p>
              <Zap size={20} />
           </div>
           <p className="text-[10px] font-bold text-slate-700 uppercase tracking-widest">Powered by Google Gemini 3 Technology & Creative Intelligence</p>
        </div>
      </footer>
    </div>
  );
};

const root = document.getElementById('root');
if (root) createRoot(root).render(<App />);
