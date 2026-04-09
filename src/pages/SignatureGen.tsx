import { useRef, useState, useEffect } from 'react';
import { Download, Eraser, PenTool, Type, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';

const SIGNATURE_FONTS = [
  { name: 'Classic Script', family: "'Dancing Script', cursive" },
  { name: 'Casual Hand', family: "'Caveat', cursive" },
  { name: 'Elegant', family: "'Great Vibes', cursive" },
  { name: 'Bold Flow', family: "'Pacifico', cursive" },
  { name: 'Artistic', family: "'Satisfy', cursive" },
  { name: 'Formal', family: "'Alex Brush', cursive" },
];

export default function SignatureGen() {
  const [mode, setMode] = useState<'DRAW' | 'TEXT'>('DRAW');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  
  // Text Mode states
  const [text, setText] = useState('');
  const [selectedFont, setSelectedFont] = useState(SIGNATURE_FONTS[0]);

  useEffect(() => {
    // Inject fonts
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Alex+Brush&family=Caveat:wght@400;700&family=Dancing+Script:wght@400;700&family=Great+Vibes&family=Pacifico&family=Satisfy&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }, []);

  useEffect(() => {
    if (mode === 'DRAW') {
      initCanvas();
    }
  }, [mode]);

  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * 2;
      canvas.height = rect.height * 2;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(2, 2);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#000000';
      }
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (mode !== 'DRAW') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setSignatureUrl(null);
    
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || mode !== 'DRAW') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => setIsDrawing(false);

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setSignatureUrl(null);
    if (mode === 'TEXT') setText('');
  };

  const generateFromText = () => {
    if (!text) return;
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // We want transparent BG
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#000000';
    ctx.font = `italic 120px ${selectedFont.family}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Check text width and scale down if needed
    let size = 120;
    while (ctx.measureText(text).width > canvas.width - 40 && size > 40) {
      size -= 10;
      ctx.font = `italic ${size}px ${selectedFont.family}`;
    }
    
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    setSignatureUrl(canvas.toDataURL('image/png'));
  };

  const saveDrawnSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setSignatureUrl(canvas.toDataURL('image/png'));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 py-8 px-4">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold text-white">Signature Machine</h1>
        <p className="text-slate-400">Hand-draw your signature or generate one from text with premium script fonts.</p>
      </div>

      <div className="flex justify-center">
        <div className="bg-slate-800/40 p-1 rounded-2xl border border-white/10 flex gap-1">
          <button 
            onClick={() => setMode('DRAW')}
            className={cn("px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2", mode === 'DRAW' ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-white")}
          >
            <PenTool className="w-4 h-4"/> Draw Mode
          </button>
          <button 
            onClick={() => setMode('TEXT')}
            className={cn("px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2", mode === 'TEXT' ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-white")}
          >
            <Type className="w-4 h-4"/> Text Mode
          </button>
        </div>
      </div>

      <div className="bg-slate-800/30 border border-white/5 rounded-3xl p-8 space-y-6">
        <AnimatePresence mode="wait">
          {mode === 'DRAW' ? (
            <motion.div key="draw" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2"><PenTool className="w-5 h-5 text-indigo-400"/> Signing Canvas</h3>
                <button onClick={clearSignature} className="flex items-center gap-2 px-4 py-2 bg-slate-700/50 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors">
                  <Eraser className="w-4 h-4"/> Clear
                </button>
              </div>

              <div className="relative border-2 border-dashed border-indigo-500/30 rounded-2xl overflow-hidden bg-white/90 shadow-inner">
                <canvas
                  ref={canvasRef}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-80 cursor-crosshair touch-none"
                  style={{ touchAction: 'none' }}
                />
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-5">
                  <p className="text-6xl font-black uppercase tracking-tighter text-indigo-900 select-none">Manual Sign</p>
                </div>
              </div>

              <button 
                onClick={saveDrawnSignature}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-xl shadow-indigo-500/20"
              >
                Capture Drawn Signature
              </button>
            </motion.div>
          ) : (
            <motion.div key="text" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
               <div className="space-y-4">
                  <label className="text-sm font-bold text-slate-400 uppercase tracking-widest">Your Name</label>
                  <input 
                    type="text" 
                    value={text}
                    onChange={e => setText(e.target.value)}
                    placeholder="Type name here..."
                    className="w-full bg-black/40 border border-slate-700 rounded-2xl p-6 text-2xl text-white focus:border-indigo-500 transition-all outline-none"
                  />
               </div>

               <div className="space-y-4">
                  <label className="text-sm font-bold text-slate-400 uppercase tracking-widest">Signature Style</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {SIGNATURE_FONTS.map(f => (
                      <button 
                        key={f.name}
                        onClick={() => setSelectedFont(f)}
                        className={cn(
                          "p-4 rounded-xl border text-left transition-all relative overflow-hidden group",
                          selectedFont.name === f.name ? "bg-indigo-600/20 border-indigo-500 shadow-indigo-500/10 shadow-lg" : "bg-white/5 border-white/10 hover:border-white/20"
                        )}
                        style={{ fontFamily: f.family }}
                      >
                         <span className="text-lg text-white block truncate">{text || "Signature"}</span>
                         <span className="text-[10px] text-slate-500 font-sans mt-1 block group-hover:text-slate-300 transition-colors uppercase font-bold">{f.name}</span>
                         {selectedFont.name === f.name && (
                           <div className="absolute top-2 right-2 text-indigo-400"><Check className="w-4 h-4"/></div>
                         )}
                      </button>
                    ))}
                  </div>
               </div>

               <button 
                onClick={generateFromText}
                disabled={!text}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-xl shadow-indigo-500/20"
              >
                Create Digital Signature
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {signatureUrl && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="pt-6 border-t border-white/10"
            >
              <div className="bg-black/60 backdrop-blur rounded-2xl p-8 flex flex-col items-center gap-6 border border-white/5 shadow-2xl">
                <div className="w-full flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-widest px-2">
                   <span>Generated Result</span>
                   <span className="text-indigo-400">Transparent PNG</span>
                </div>
                <div className="bg-white/95 rounded-xl p-8 shadow-inner w-full flex justify-center border-4 border-indigo-500/20">
                  <img src={signatureUrl} alt="Signature" className="max-h-40 object-contain drop-shadow-md" />
                </div>
                <div className="flex gap-4 w-full">
                   <button onClick={() => setSignatureUrl(null)} className="px-6 py-3 border border-white/10 hover:bg-white/5 text-slate-400 rounded-xl transition-all">Dismiss</button>
                   <a 
                    href={signatureUrl} 
                    download={`signature_${text || 'manual'}.png`}
                    className="flex-1 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-xl shadow-green-500/20"
                   >
                    <Download className="w-5 h-5"/> Download Signature
                   </a>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

