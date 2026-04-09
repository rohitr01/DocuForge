import { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Download, Settings2, Trash2, Type, Move } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

type Unit = 'px' | 'in' | 'mm' | 'cm';

export default function ImageResize() {
  const [file, setFile] = useState<File | null>(null);
  const [previewOriginal, setPreviewOriginal] = useState<string | null>(null);
  const [resizedUrl, setResizedUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const imgRef = useRef<HTMLImageElement>(null);
  const [width, setWidth] = useState<number | ''>('');
  const [height, setHeight] = useState<number | ''>('');
  const [unit, setUnit] = useState<Unit>('px');
  const [dpi, setDpi] = useState(300);
  const [maintainAspect, setMaintainAspect] = useState(true);

  // Overlay states
  const [showOverlay, setShowOverlay] = useState(false);
  const [overlayName, setOverlayName] = useState('');
  const [overlayDOB, setOverlayDOB] = useState('');
  const [overlayBg] = useState('rgba(0,0,0,0.6)');
  const [overlayTextColor] = useState('#ffffff');

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const selected = acceptedFiles[0];
      setFile(selected);
      setPreviewOriginal(URL.createObjectURL(selected));
      setResizedUrl(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    maxFiles: 1,
  });

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    if (unit === 'px') {
      setWidth(e.currentTarget.naturalWidth);
      setHeight(e.currentTarget.naturalHeight);
    }
  };

  const convertToPixels = (val: number, fromUnit: Unit) => {
    switch (fromUnit) {
      case 'in': return Math.round(val * dpi);
      case 'mm': return Math.round((val / 25.4) * dpi);
      case 'cm': return Math.round((val / 2.54) * dpi);
      default: return val;
    }
  };

  const handleWidthChange = (val: string) => {
    const num = parseFloat(val) || '';
    setWidth(num);
    if (maintainAspect && num !== '' && imgRef.current) {
      const ratio = imgRef.current.naturalHeight / imgRef.current.naturalWidth;
      const newHeight = num * ratio;
      setHeight(unit === 'px' ? Math.round(newHeight) : Number(newHeight.toFixed(2)));
    }
  };

  const handleHeightChange = (val: string) => {
    const num = parseFloat(val) || '';
    setHeight(num);
    if (maintainAspect && num !== '' && imgRef.current) {
      const ratio = imgRef.current.naturalWidth / imgRef.current.naturalHeight;
      const newWidth = num * ratio;
      setWidth(unit === 'px' ? Math.round(newWidth) : Number(newWidth.toFixed(2)));
    }
  };

  const handleResize = async () => {
    if (!file || !imgRef.current || typeof width !== 'number' || typeof height !== 'number') return;
    setIsProcessing(true);
    try {
      const pxWidth = convertToPixels(width, unit);
      const pxHeight = convertToPixels(height, unit);

      const canvas = document.createElement('canvas');
      canvas.width = pxWidth;
      canvas.height = pxHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(imgRef.current, 0, 0, pxWidth, pxHeight);

      if (showOverlay && (overlayName || overlayDOB)) {
        const overlayHeight = Math.round(pxHeight * 0.2);
        ctx.fillStyle = overlayBg;
        ctx.fillRect(0, pxHeight - overlayHeight, pxWidth, overlayHeight);
        
        ctx.fillStyle = overlayTextColor;
        const fontSize = Math.max(12, Math.round(overlayHeight * 0.35));
        ctx.font = `bold ${fontSize}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        
        if (overlayName && overlayDOB) {
           ctx.fillText(overlayName, pxWidth / 2, pxHeight - (overlayHeight * 0.55));
           ctx.font = `${Math.round(fontSize * 0.8)}px Inter, sans-serif`;
           ctx.fillText(`DOB: ${overlayDOB}`, pxWidth / 2, pxHeight - (overlayHeight * 0.15));
        } else {
           ctx.fillText(overlayName || overlayDOB, pxWidth / 2, pxHeight - (overlayHeight * 0.35));
        }
      }

      const quality = 0.95;
      const blob = await new Promise<Blob>((resolve) => canvas.toBlob(b => resolve(b!), file.type, quality));
      setResizedUrl(URL.createObjectURL(blob));
    } catch(e) {
      console.error(e);
      alert("Processing failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  const removeFile = () => {
    setFile(null);
    setResizedUrl(null);
    setPreviewOriginal(null);
    setWidth('');
    setHeight('');
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 space-y-8 animate-in fade-in duration-500">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold text-white">Smart Image Scaler</h1>
        <p className="text-slate-400">Resize by pixels, inches, or mm with custom DPI and Name/DOB overlays for official forms.</p>
      </div>

      <AnimatePresence mode="wait">
        {!file ? (
          <motion.div key="drop" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}>
            <div
              {...getRootProps()}
              className={cn(
                "border-2 border-dashed rounded-3xl p-16 flex flex-col items-center justify-center gap-6 cursor-pointer bg-slate-800/20 transition-all duration-300",
                isDragActive ? "border-indigo-400 bg-indigo-400/10 scale-105" : "border-slate-700 hover:border-slate-500 hover:bg-slate-800/40"
              )}
            >
              <input {...getInputProps()} />
              <div className="bg-indigo-500/20 p-6 rounded-full"><Upload className="w-12 h-12 text-indigo-400" /></div>
              <p className="text-xl font-medium text-slate-200">Upload Identity Image</p>
            </div>
          </motion.div>
        ) : (
          <motion.div key="edit" className="grid lg:grid-cols-4 gap-8">
            <div className="lg:col-span-1 border border-white/5 bg-slate-800/40 rounded-3xl p-6 h-fit space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2"><Settings2 className="w-5 h-5 text-indigo-400"/> Scaling Engine</h3>
                <button onClick={removeFile} className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"><Trash2 className="w-5 h-5"/></button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Unit</label>
                    <select value={unit} onChange={e => setUnit(e.target.value as Unit)} className="w-full bg-black/40 border border-slate-700 rounded-lg p-2 text-white text-sm">
                      <option value="px">Pixels</option>
                      <option value="in">Inches</option>
                      <option value="mm">mm</option>
                      <option value="cm">cm</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">DPI</label>
                    <select value={dpi} onChange={e => setDpi(Number(e.target.value))} className="w-full bg-black/40 border border-slate-700 rounded-lg p-2 text-white text-sm">
                      <option value={72}>72 (Web)</option>
                      <option value={96}>96 (Windows)</option>
                      <option value={200}>200 (Form Standard)</option>
                      <option value={300}>300 (Print)</option>
                      <option value={600}>600 (High Res)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Width ({unit})</label>
                    <input type="number" step="0.01" value={width} onChange={e => handleWidthChange(e.target.value)} className="w-full bg-black/40 border border-slate-700 rounded-lg p-2 text-white text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Height ({unit})</label>
                    <input type="number" step="0.01" value={height} onChange={e => handleHeightChange(e.target.value)} className="w-full bg-black/40 border border-slate-700 rounded-lg p-2 text-white text-sm" />
                  </div>
                </div>
                
                <label className="flex items-center gap-2 cursor-pointer pt-2">
                  <input type="checkbox" checked={maintainAspect} onChange={(e) => setMaintainAspect(e.target.checked)} className="w-4 h-4 rounded accent-indigo-500" />
                  <span className="text-xs text-slate-400">Lock Aspect Ratio</span>
                </label>

                <div className="pt-4 border-t border-white/10 space-y-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={showOverlay} onChange={(e) => setShowOverlay(e.target.checked)} className="w-4 h-4 rounded accent-indigo-500" />
                    <span className="text-xs font-bold text-slate-300 uppercase">Add Name/DOB Tag</span>
                  </label>
                  
                  {showOverlay && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-3 overflow-hidden">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Full Name</label>
                        <input type="text" placeholder="e.g. JOHN DOE" value={overlayName} onChange={e => setOverlayName(e.target.value)} className="w-full bg-black/40 border border-slate-700 rounded-lg p-2 text-white text-xs" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Date of Birth</label>
                        <input type="text" placeholder="e.g. 01/01/1990" value={overlayDOB} onChange={e => setOverlayDOB(e.target.value)} className="w-full bg-black/40 border border-slate-700 rounded-lg p-2 text-white text-xs" />
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>

              <button 
                onClick={handleResize}
                disabled={isProcessing || !width || !height}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black tracking-wide flex items-center justify-center gap-2 transition-all shadow-xl shadow-indigo-500/10 disabled:opacity-50"
              >
                {isProcessing ? "Rendering..." : <><Move className="w-5 h-5"/> Process Matrix</>}
              </button>

              {resizedUrl && (
                <div className="pt-4 border-t border-white/10 mt-4">
                  <a 
                    href={resizedUrl} 
                    download={`scaled_${file.name.split('.')[0]}.png`}
                    className="w-full py-4 bg-green-600 hover:bg-green-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-xl shadow-green-500/10 transition-all"
                  >
                    <Download className="w-5 h-5"/> Download Result
                  </a>
                </div>
              )}
            </div>

            <div className="lg:col-span-3 space-y-6">
               <div className="bg-black/40 border border-white/5 rounded-[2rem] p-6 h-[600px] flex items-center justify-center overflow-hidden relative">
                 <img ref={imgRef} src={previewOriginal!} alt="Original" onLoad={onImageLoad} className="max-w-full max-h-full object-contain shadow-2xl" />
                 <div className="absolute top-4 right-4 bg-black/60 backdrop-blur px-3 py-1 rounded-full text-[10px] text-white/60 border border-white/10">
                   Native: {imgRef.current?.naturalWidth}x{imgRef.current?.naturalHeight}px
                 </div>
               </div>
               
               {resizedUrl && (
                 <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-4">
                    <h4 className="text-sm font-bold text-slate-400 uppercase flex items-center gap-2"><Type className="w-4 h-4"/> Live Output Preview</h4>
                    <div className="flex justify-center bg-black/20 rounded-2xl p-4 min-h-[200px]">
                       <img src={resizedUrl} alt="Resized" className="max-h-[300px] shadow-xl border border-white/10" />
                    </div>
                 </motion.div>
               )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
