import { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, Download, Printer, Wand2, Eraser, Check, ArrowLeft, Image as ImageIcon, Layers, Minus, Plus } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { removeBackground } from '@imgly/background-removal';

type Phase = 'UPLOAD' | 'ADJUST' | 'RESULT';
type PaperSize = '4x6' | '5x7' | '8x10' | 'A4';
type PhotoSize = 'US' | 'EU';

export default function PassportPhotoMaker() {
  const [phase, setPhase] = useState<Phase>('UPLOAD');
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [processedPhotoUrl, setProcessedPhotoUrl] = useState<string | null>(null);
  const [resultSheetUrl, setResultSheetUrl] = useState<string | null>(null);

  // ADJUST Phase states
  const [isRemovingBg, setIsRemovingBg] = useState(false);
  const [bgColor, setBgColor] = useState('#ffffff');
  const [brightness, setBrightness] = useState(100); // 100%
  const [brushSize, setBrushSize] = useState(20);
  const [dpi, setDpi] = useState(300);

  // Result Phase states
  const [paperSize, setPaperSize] = useState<PaperSize>('4x6');
  const [photoSize, setPhotoSize] = useState<PhotoSize>('US');
  const [quality] = useState(0.9);
  const [photoCount, setPhotoCount] = useState(0);

  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // 1. UPLOAD
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const url = URL.createObjectURL(acceptedFiles[0]);
      setImgUrl(url);
      setPhase('ADJUST');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
    maxFiles: 1,
  });

  // 2. ADJUST (Background removal & Canvas setup)
  useEffect(() => {
    if (phase === 'ADJUST' && imgUrl && !isRemovingBg) {
      const img = new Image();
      img.src = imgUrl;
      img.onload = () => {
        const maskCanvas = maskCanvasRef.current;
        if (!maskCanvas) return;
        maskCanvas.width = img.width;
        maskCanvas.height = img.height;
        const ctx = maskCanvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
        }
      };
    }
  }, [phase, imgUrl, isRemovingBg]);

  const handleAutoRemoveBg = async () => {
    if (!imgUrl) return;
    setIsRemovingBg(true);
    try {
      const blob = await removeBackground(imgUrl);
      const url = URL.createObjectURL(blob);
      setImgUrl(url);
      // Reset mask for new base image
      const img = new Image();
      img.src = url;
      img.onload = () => {
        const m = maskCanvasRef.current;
        if (m) {
          const ctx = m.getContext('2d');
          if (ctx) {
            m.width = img.width;
            m.height = img.height;
            ctx.drawImage(img, 0, 0);
          }
        }
      };
    } catch (e) {
      console.error(e);
      alert('Background removal failed.');
    } finally {
      setIsRemovingBg(false);
    }
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    draw(e);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = maskCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, brushSize, 0, Math.PI * 2);
    ctx.fill();
  };

  const stopDrawing = () => setIsDrawing(false);

  const applyEditsAndProceed = () => {
    const m = maskCanvasRef.current;
    if (!m) return;
    
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = m.width;
    finalCanvas.height = m.height;
    const ctx = finalCanvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, m.width, m.height);
    ctx.filter = `brightness(${brightness}%)`;
    ctx.drawImage(m, 0, 0);
    
    setProcessedPhotoUrl(finalCanvas.toDataURL('image/jpeg', 0.95));
    setPhase('RESULT');
  };

  const generateSheet = useCallback(() => {
    if (!processedPhotoUrl) return;

    const img = new Image();
    img.src = processedPhotoUrl;
    img.onload = () => {
      let printWidth = 0, printHeight = 0;
      switch (paperSize) {
        case '4x6': printWidth = 4 * dpi; printHeight = 6 * dpi; break;
        case '5x7': printWidth = 5 * dpi; printHeight = 7 * dpi; break;
        case '8x10': printWidth = 8 * dpi; printHeight = 10 * dpi; break;
        case 'A4': printWidth = 2480 * (dpi / 300); printHeight = 3508 * (dpi / 300); break;
      }

      let passW = 0, passH = 0;
      if (photoSize === 'US') { passW = 2 * dpi; passH = 2 * dpi; }
      else { passW = 1.37 * dpi; passH = 1.77 * dpi; }

      const canvas = document.createElement('canvas');
      canvas.width = printWidth;
      canvas.height = printHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, printWidth, printHeight);

      const padding = dpi * 0.2; 
      const availableW = printWidth - padding * 2;
      const availableH = printHeight - padding * 2;
      const cols = Math.floor(availableW / passW);
      const rows = Math.floor(availableH / passH);
      setPhotoCount(cols * rows);

      const spacingX = (availableW - (cols * passW)) / (cols + 1 || 1);
      const spacingY = (availableH - (rows * passH)) / (rows + 1 || 1);

      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const x = padding + spacingX + i * (passW + spacingX);
          const y = padding + spacingY + j * (passH + spacingY);
          ctx.drawImage(img, x, y, passW, passH);
          ctx.strokeStyle = "#eee";
          ctx.lineWidth = 1;
          ctx.strokeRect(x, y, passW, passH);
        }
      }
      setResultSheetUrl(canvas.toDataURL('image/jpeg', quality));
    };
  }, [processedPhotoUrl, paperSize, photoSize, quality, dpi]);

  useEffect(() => {
    if (phase === 'RESULT') generateSheet();
  }, [phase, paperSize, photoSize, quality, dpi, generateSheet]);

  const goBack = () => {
    if (phase === 'RESULT') setPhase('ADJUST');
    else if (phase === 'ADJUST') setPhase('UPLOAD');
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 space-y-8 animate-in fade-in duration-500">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold text-white">Passport Engine 2.0</h1>
        <p className="text-slate-400">Professional biometric-compliant photo tools with AI background replacement.</p>
      </div>

      <AnimatePresence mode="wait">
        {phase === 'UPLOAD' && (
          <motion.div key="upload" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}>
            <div
              {...getRootProps()}
              className={cn(
                "border-2 border-dashed rounded-3xl p-16 flex flex-col items-center justify-center gap-6 cursor-pointer bg-slate-800/20 transition-all duration-300",
                isDragActive ? "border-indigo-400 bg-indigo-400/10 scale-105" : "border-slate-700 hover:border-slate-500 hover:bg-slate-800/40"
              )}
            >
              <input {...getInputProps()} />
              <div className="bg-indigo-500/20 p-6 rounded-full"><Upload className="w-12 h-12 text-indigo-400" /></div>
              <div className="text-center">
                <p className="text-xl font-medium text-slate-200">Upload Portrait Photo</p>
                <p className="text-slate-500 mt-2">White or light backgrounds work best. We'll handle the rest.</p>
              </div>
            </div>
          </motion.div>
        )}

        {phase === 'ADJUST' && (
          <motion.div key="adjust" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid lg:grid-cols-4 gap-8">
            <div className="lg:col-span-1 border border-white/5 bg-slate-800/40 rounded-3xl p-6 h-fit space-y-8">
              <div className="flex items-center justify-between">
                <button onClick={goBack} className="p-2 hover:bg-white/10 rounded-lg text-slate-400"><ArrowLeft className="w-5 h-5"/></button>
                <h3 className="font-bold">Adjust Photo</h3>
                <div className="w-9" />
              </div>

              <div className="space-y-6">
                <button 
                  onClick={handleAutoRemoveBg} 
                  disabled={isRemovingBg}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/20"
                >
                  {isRemovingBg ? "Processing AI..." : <><Wand2 className="w-4 h-4"/> Auto Remove BG</>}
                </button>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><Eraser className="w-4 h-4"/> Manual Erase</label>
                    <div className="flex items-center gap-2">
                       <button onClick={() => setBrushSize(Math.max(5, brushSize - 5))} className="p-1 hover:bg-white/10 rounded"><Minus className="w-4 h-4"/></button>
                       <span className="text-xs font-mono">{brushSize}</span>
                       <button onClick={() => setBrushSize(Math.min(100, brushSize + 5))} className="p-1 hover:bg-white/10 rounded"><Plus className="w-4 h-4"/></button>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-white/5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Background Color</label>
                  <div className="grid grid-cols-4 gap-2">
                    {['#ffffff', '#3b82f6', '#ef4444', '#f1f5f9', '#ffcc00', '#00b894', '#6c5ce7', '#000000'].map(c => (
                      <button 
                        key={c} onClick={() => setBgColor(c)}
                        className={cn("h-8 rounded-lg border border-white/10 transition-transform hover:scale-110", bgColor === c && "ring-2 ring-indigo-500 scale-110")}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                    <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} className="w-full h-8 bg-transparent border-0 cursor-pointer" />
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-white/5">
                  <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-widest">
                    <label>Brightness</label>
                    <span className="text-indigo-400">{brightness}%</span>
                  </div>
                  <input type="range" min="50" max="200" value={brightness} onChange={e => setBrightness(Number(e.target.value))} className="w-full accent-indigo-500" />
                </div>
              </div>

              <button 
                onClick={applyEditsAndProceed}
                className="w-full py-4 bg-green-600 hover:bg-green-500 text-white rounded-2xl font-black tracking-wide flex items-center justify-center gap-2 shadow-xl shadow-green-500/10 transition-all active:scale-95"
              >
                <Check className="w-6 h-6"/> Confirm Edits
              </button>
            </div>

            <div className="lg:col-span-3 flex flex-col gap-4">
              <div className="bg-black/40 border border-white/10 rounded-[2rem] p-4 min-h-[600px] flex items-center justify-center overflow-hidden relative cursor-crosshair">
                <canvas 
                  ref={maskCanvasRef}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="max-h-[700px] max-w-full shadow-2xl rounded-lg"
                  style={{ backgroundColor: bgColor }}
                />
              </div>
            </div>
          </motion.div>
        )}

        {phase === 'RESULT' && (
          <motion.div key="result" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="grid lg:grid-cols-4 gap-8">
            <div className="lg:col-span-1 border border-white/5 bg-slate-800/40 rounded-3xl p-6 space-y-8">
              <div className="flex items-center justify-between">
                <button onClick={goBack} className="p-2 hover:bg-white/10 rounded-lg text-slate-400"><ArrowLeft className="w-5 h-5"/></button>
                <h3 className="font-bold flex items-center gap-2"><Printer className="w-4 h-4"/> Layout Options</h3>
                <div className="w-9" />
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase">Sheet Size</label>
                  <select value={paperSize} onChange={e => setPaperSize(e.target.value as PaperSize)} className="w-full bg-black/40 border border-slate-700 rounded-xl p-3 text-white text-sm">
                    <option value="4x6">4x6" Standard Photo</option>
                    <option value="5x7">5x7" Large Photo</option>
                    <option value="8x10">8x10" Home Printer</option>
                    <option value="A4">A4 Document Sheet</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase">Photo Standard</label>
                  <select value={photoSize} onChange={e => setPhotoSize(e.target.value as PhotoSize)} className="w-full bg-black/40 border border-slate-700 rounded-xl p-3 text-white text-sm">
                    <option value="US">2x2" (US / India Passport)</option>
                    <option value="EU">35x45mm (EU / UK / Schengen)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase">Print Resolution (DPI)</label>
                  <select value={dpi} onChange={e => setDpi(Number(e.target.value))} className="w-full bg-black/40 border border-slate-700 rounded-xl p-3 text-white text-sm">
                    <option value={300}>300 DPI (Standard)</option>
                    <option value={600}>600 DPI (High Res)</option>
                    <option value={150}>150 DPI (Fast Draft)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3 pt-6 border-t border-white/5">
                <p className="text-xs font-medium text-slate-400 italic">Individual Photo</p>
                <a href={processedPhotoUrl!} download="passport_single.jpg" className="w-full py-3 border border-white/10 hover:bg-white/5 rounded-xl flex items-center justify-center gap-2 text-sm transition-all">
                  <ImageIcon className="w-4 h-4"/> Download Single
                </a>
                <p className="text-xs font-medium text-slate-400 italic pt-2">Full Print Sheet ({photoCount} Tiles)</p>
                <a href={resultSheetUrl!} download={`passport_sheet_${paperSize}.jpg`} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-xl shadow-indigo-500/20 transition-all active:scale-95">
                  <Download className="w-5 h-5" /> Download Sheet
                </a>
              </div>
            </div>

            <div className="lg:col-span-3 space-y-8">
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-500 uppercase flex items-center gap-2"><ImageIcon className="w-4 h-4"/> Single Photo Preview</h4>
                  <div className="bg-black/40 border border-white/5 rounded-3xl p-8 flex items-center justify-center min-h-[300px]">
                    <img src={processedPhotoUrl!} alt="Single" className="max-h-64 shadow-2xl border-4 border-white" />
                  </div>
                </div>

                <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-3xl p-8 flex flex-col justify-center gap-4">
                   <div className="flex items-center gap-4">
                     <div className="p-3 bg-indigo-500/20 rounded-2xl"><Layers className="w-6 h-6 text-indigo-400"/></div>
                     <div>
                       <h4 className="font-bold text-lg">{photoCount} Photos Positioned</h4>
                       <p className="text-sm text-slate-400">Perfectly spaced with edge-to-edge alignment.</p>
                     </div>
                   </div>
                   <div className="flex items-center gap-4">
                     <div className="p-3 bg-indigo-500/20 rounded-2xl"><Printer className="w-6 h-6 text-indigo-400"/></div>
                     <div>
                       <h4 className="font-bold text-lg">{dpi} DPI Rendering</h4>
                       <p className="text-sm text-slate-400">High-fidelity matrix for professional printing.</p>
                     </div>
                   </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-500 uppercase flex items-center gap-2"><Layers className="w-4 h-4"/> Full Printing Sheet Preview</h4>
                <div className="bg-black/40 border border-white/10 rounded-[2rem] p-8 flex items-center justify-center min-h-[500px]">
                  {resultSheetUrl ? (
                    <img src={resultSheetUrl} alt="Sheet" className="max-h-[600px] shadow-2xl bg-white p-2 drop-shadow-2xl border border-white/20" />
                  ) : (
                    <div className="animate-pulse flex flex-col items-center gap-4 text-slate-500">
                      <Layers className="w-12 h-12" />
                      <p>Calculating Sheet Grid...</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
