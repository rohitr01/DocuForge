import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Download, Settings2, Trash2, CheckCircle2, AlertCircle, Loader2, Image as ImageIcon, Move, ArrowRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

type Unit = 'px' | 'in' | 'mm' | 'cm';

interface ResizeItem {
  id: string;
  original: File;
  resized: string | null;
  previewOriginal: string;
  status: 'idle' | 'processing' | 'done' | 'error';
  width?: number;
  height?: number;
}

export default function ImageResize() {
  const [items, setItems] = useState<ResizeItem[]>([]);
  const [isProcessingAll, setIsProcessingAll] = useState(false);

  // Global Settings
  const [width, setWidth] = useState<number | ''>(500);
  const [height, setHeight] = useState<number | ''>(500);
  const [unit, setUnit] = useState<Unit>('px');
  const [dpi, setDpi] = useState(300);

  const [showOverlay, setShowOverlay] = useState(false);
  const [overlayName, setOverlayName] = useState('');
  const [overlayDOB, setOverlayDOB] = useState('');

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newItems: ResizeItem[] = acceptedFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      original: file,
      resized: null,
      previewOriginal: URL.createObjectURL(file),
      status: 'idle'
    }));
    setItems(prev => [...prev, ...newItems]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    multiple: true
  });

  const convertToPixels = (val: number, fromUnit: Unit) => {
    switch (fromUnit) {
      case 'in': return Math.round(val * dpi);
      case 'mm': return Math.round((val / 25.4) * dpi);
      case 'cm': return Math.round((val / 2.54) * dpi);
      default: return val;
    }
  };

  const processItem = async (id: string) => {
    const item = items.find(i => i.id === id);
    if (!item || item.status === 'processing' || typeof width !== 'number' || typeof height !== 'number') return;

    setItems(prev => prev.map(i => i.id === id ? { ...i, status: 'processing' } : i));

    try {
      const img = new Image();
      img.src = item.previewOriginal;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const pxWidth = convertToPixels(width, unit);
      const pxHeight = convertToPixels(height, unit);

      const canvas = document.createElement('canvas');
      canvas.width = pxWidth;
      canvas.height = pxHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("Canvas context failed");
      
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, pxWidth, pxHeight);

      if (showOverlay && (overlayName || overlayDOB)) {
        const overlayHeight = Math.round(pxHeight * 0.2);
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, pxHeight - overlayHeight, pxWidth, overlayHeight);
        
        ctx.fillStyle = '#ffffff';
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

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(b => b ? resolve(b) : reject(new Error("Blob failed")), item.original.type, 0.95);
      });

      const url = URL.createObjectURL(blob);
      setItems(prev => prev.map(i => i.id === id ? { 
        ...i, 
        resized: url, 
        status: 'done',
        width: pxWidth,
        height: pxHeight
      } : i));
    } catch (e) {
      console.error(e);
      setItems(prev => prev.map(i => i.id === id ? { ...i, status: 'error' } : i));
    }
  };

  const handleBatchProcess = async () => {
    setIsProcessingAll(true);
    const pending = items.filter(i => i.status !== 'done');
    for (const item of pending) {
      await processItem(item.id);
    }
    setIsProcessingAll(false);
  };

  const removeItem = (id: string) => {
    setItems(prev => {
      const item = prev.find(i => i.id === id);
      if (item) {
        URL.revokeObjectURL(item.previewOriginal);
        if (item.resized) URL.revokeObjectURL(item.resized);
      }
      return prev.filter(i => i.id !== id);
    });
  };

  const downloadAll = () => {
    items.forEach(item => {
      if (item.resized) {
        const link = document.createElement('a');
        link.href = item.resized;
        link.download = `resized_${item.original.name}`;
        link.click();
      }
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 py-8 px-4">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold text-white tracking-tight">Batch Image Resizer</h1>
        <p className="text-slate-400">Resize hundreds of images at once with custom dimensions and official identity overlays.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Settings Panel */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-800/30 border border-white/5 rounded-3xl p-6 space-y-6 sticky top-24">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2"><Settings2 className="w-5 h-5 text-indigo-400"/> Scaling Config</h3>
              {items.length > 0 && (
                <button onClick={() => setItems([])} className="text-xs text-red-400 hover:underline">Clear Queue</button>
              )}
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Unit</label>
                  <select value={unit} onChange={e => setUnit(e.target.value as Unit)} className="w-full bg-black/40 border border-slate-700 rounded-xl p-2.5 text-white text-sm outline-none focus:border-indigo-500">
                    <option value="px">Pixels</option>
                    <option value="in">Inches</option>
                    <option value="mm">mm</option>
                    <option value="cm">cm</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">DPI</label>
                  <select value={dpi} onChange={e => setDpi(Number(e.target.value))} className="w-full bg-black/40 border border-slate-700 rounded-xl p-2.5 text-white text-sm outline-none focus:border-indigo-500">
                    <option value={72}>72</option>
                    <option value={96}>96</option>
                    <option value={300}>300</option>
                    <option value={600}>600</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Width ({unit})</label>
                  <input type="number" value={width} onChange={e => setWidth(parseFloat(e.target.value) || '')} className="w-full bg-black/40 border border-slate-700 rounded-xl p-2.5 text-white text-sm outline-none focus:border-indigo-500" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Height ({unit})</label>
                  <input type="number" value={height} onChange={e => setHeight(parseFloat(e.target.value) || '')} className="w-full bg-black/40 border border-slate-700 rounded-xl p-2.5 text-white text-sm outline-none focus:border-indigo-500" />
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 space-y-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={showOverlay} onChange={(e) => setShowOverlay(e.target.checked)} className="w-4 h-4 rounded accent-indigo-500" />
                  <span className="text-xs font-bold text-slate-300 uppercase">Apply Identity Overlay</span>
                </label>
                
                {showOverlay && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-3 overflow-hidden">
                    <input type="text" placeholder="FULL NAME" value={overlayName} onChange={e => setOverlayName(e.target.value)} className="w-full bg-black/40 border border-slate-700 rounded-lg p-2 text-white text-xs outline-none" />
                    <input type="text" placeholder="DATE OF BIRTH" value={overlayDOB} onChange={e => setOverlayDOB(e.target.value)} className="w-full bg-black/40 border border-slate-700 rounded-lg p-2 text-white text-xs outline-none" />
                  </motion.div>
                )}
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-white/10">
              <button 
                onClick={handleBatchProcess}
                disabled={items.length === 0 || isProcessingAll}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold transition-all disabled:opacity-50 active:scale-95 shadow-lg shadow-indigo-500/20"
              >
                {isProcessingAll ? "Processing..." : <><Move className="w-5 h-5 inline mr-2"/> Resize All</>}
              </button>
              
              {items.some(i => i.status === 'done') && (
                <button 
                  onClick={downloadAll}
                  className="w-full py-4 bg-green-600 hover:bg-green-500 text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-green-500/20"
                >
                  <Download className="w-5 h-5"/> Download All
                </button>
              )}
            </div>
          </div>
        </div>

        {/* List Panel */}
        <div className="lg:col-span-2 space-y-4">
          <div
            {...getRootProps()}
            className={cn(
              "border-2 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all duration-300",
              isDragActive ? "border-indigo-400 bg-indigo-400/10 scale-105" : "border-slate-800 bg-slate-900/40 hover:border-slate-600"
            )}
          >
            <input {...getInputProps()} />
            <div className="bg-indigo-500/20 p-4 rounded-full">
              <Upload className="w-8 h-8 text-indigo-400" />
            </div>
            <p className="text-slate-300 font-medium text-lg">Batch Upload for Resizing</p>
            <p className="text-xs text-slate-500">Perfect for Passport Photos & Form Requirements</p>
          </div>

          <div className="bg-black/40 border border-white/5 rounded-3xl p-6 min-h-[500px]">
             <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500">Processing Queue</h4>
              <span className="text-xs font-mono text-indigo-400 bg-indigo-400/10 px-3 py-1 rounded-full">{items.length} Files</span>
            </div>

            <div className="space-y-3">
              <AnimatePresence initial={false}>
                {items.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center text-slate-600 gap-4 opacity-30">
                    <ImageIcon className="w-16 h-16" />
                    <p>No images selected.</p>
                  </div>
                ) : (
                  items.map((item) => (
                    <motion.div 
                      key={item.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between group hover:border-indigo-500/30 transition-all"
                    >
                      <div className="flex items-center gap-4 truncate flex-1">
                        <div className="w-14 h-14 bg-black/40 rounded-xl overflow-hidden flex-shrink-0 border border-white/10 relative">
                          <img src={item.previewOriginal} alt="Thumb" className="w-full h-full object-cover" />
                          {item.status === 'processing' && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                              <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
                            </div>
                          )}
                        </div>
                        <div className="truncate space-y-1">
                          <p className="text-sm font-semibold text-slate-200 truncate" title={item.original.name}>{item.original.name}</p>
                          {item.status === 'done' ? (
                            <div className="flex items-center gap-2">
                               <span className="text-[10px] text-green-400 font-bold uppercase">Success</span>
                               <ArrowRight className="w-3 h-3 text-slate-700" />
                               <span className="text-[10px] text-slate-500">{item.width}x{item.height}px</span>
                            </div>
                          ) : (
                             <span className="text-[10px] text-slate-500 uppercase">{item.original.type.split('/')[1]}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        {item.status === 'done' && item.resized && (
                          <a 
                            href={item.resized} download={`resized_${item.original.name}`}
                            className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl hover:bg-indigo-500 hover:text-white transition-all shadow-lg"
                          >
                            <Download className="w-5 h-5" />
                          </a>
                        )}
                        {item.status === 'error' && <AlertCircle className="w-5 h-5 text-red-500" />}
                        {item.status === 'done' && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                        
                        <button 
                          onClick={() => removeItem(item.id)}
                          className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
