import { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Download, Trash2, Maximize, Crop } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type Unit = 'px' | 'in' | 'mm' | 'cm';

export default function SignatureResize() {
  const [file, setFile] = useState<File | null>(null);
  const [previewOriginal, setPreviewOriginal] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const imgRef = useRef<HTMLImageElement>(null);
  const [width, setWidth] = useState<number | ''>(140);
  const [height, setHeight] = useState<number | ''>(60);
  const [unit, setUnit] = useState<Unit>('px');
  const [dpi, setDpi] = useState(200);
  const [autoCrop, setAutoCrop] = useState(true);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const selected = acceptedFiles[0];
      setFile(selected);
      setPreviewOriginal(URL.createObjectURL(selected));
      setResultUrl(null);
    }
  }, []);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    maxFiles: 1,
  });

  const convertToPixels = (val: number, fromUnit: Unit) => {
    switch (fromUnit) {
      case 'in': return Math.round(val * dpi);
      case 'mm': return Math.round((val / 25.4) * dpi);
      case 'cm': return Math.round((val / 2.54) * dpi);
      default: return val;
    }
  };

  const handleProcess = async () => {
    if (!file || !imgRef.current || typeof width !== 'number' || typeof height !== 'number') return;
    setIsProcessing(true);
    try {
      const pxWidth = convertToPixels(width, unit);
      const pxHeight = convertToPixels(height, unit);

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
      if (!tempCtx) return;

      tempCanvas.width = imgRef.current.naturalWidth;
      tempCanvas.height = imgRef.current.naturalHeight;
      tempCtx.drawImage(imgRef.current, 0, 0);

      let sourceX = 0, sourceY = 0, sourceW = tempCanvas.width, sourceH = tempCanvas.height;

      if (autoCrop) {
        const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        const data = imageData.data;
        let minX = tempCanvas.width, minY = tempCanvas.height, maxX = 0, maxY = 0;
        let found = false;

        for (let y = 0; y < tempCanvas.height; y++) {
          for (let x = 0; x < tempCanvas.width; x++) {
            const i = (y * tempCanvas.width + x) * 4;
            if (data[i] < 240 || data[i+1] < 240 || data[i+2] < 240) {
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
              found = true;
            }
          }
        }

        if (found) {
          const padding = 10;
          sourceX = Math.max(0, minX - padding);
          sourceY = Math.max(0, minY - padding);
          sourceW = Math.min(tempCanvas.width - sourceX, (maxX - minX) + padding * 2);
          sourceH = Math.min(tempCanvas.height - sourceY, (maxY - minY) + padding * 2);
        }
      }

      canvas.width = pxWidth;
      canvas.height = pxHeight;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, pxWidth, pxHeight);
      
      const ratio = Math.min(pxWidth / sourceW, pxHeight / sourceH);
      const targetW = sourceW * ratio;
      const targetH = sourceH * ratio;
      const offsetX = (pxWidth - targetW) / 2;
      const offsetY = (pxHeight - targetH) / 2;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(tempCanvas, sourceX, sourceY, sourceW, sourceH, offsetX, offsetY, targetW, targetH);

      const blob = await new Promise<Blob>((resolve) => canvas.toBlob(b => resolve(b!), 'image/jpeg', 0.9));
      setResultUrl(URL.createObjectURL(blob));
    } catch(e) {
      console.error(e);
      alert("Processing failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 py-8 px-4">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold text-white">Signature Resizer</h1>
        <p className="text-slate-400">Scale signatures to official dimensions (e.g. 140x60px) with auto-cropping.</p>
      </div>

      <AnimatePresence mode="wait">
        {!file ? (
          <motion.div key="drop" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div {...getRootProps()} className="border-2 border-dashed border-slate-700 rounded-3xl p-16 flex flex-col items-center justify-center gap-6 cursor-pointer bg-slate-800/20 hover:border-indigo-400 transition-all">
              <input {...getInputProps()} />
              <div className="bg-indigo-500/20 p-6 rounded-full"><Upload className="w-12 h-12 text-indigo-400" /></div>
              <p className="text-xl font-medium text-slate-200">Upload Signature Image</p>
            </div>
          </motion.div>
        ) : (
          <motion.div key="edit" className="grid lg:grid-cols-4 gap-8">
            <div className="lg:col-span-1 border border-white/5 bg-slate-800/40 rounded-3xl p-6 space-y-6">
               <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2"><Maximize className="w-5 h-5 text-indigo-400"/> Sign Settings</h3>
                <button onClick={() => setFile(null)} className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"><Trash2 className="w-5 h-5"/></button>
              </div>

              <div className="space-y-4">
                 <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Unit</label>
                      <select value={unit} onChange={e => setUnit(e.target.value as Unit)} className="w-full bg-black/40 border border-slate-700 rounded-lg p-2 text-white text-sm">
                        <option value="px">Pixels</option>
                        <option value="mm">mm</option>
                        <option value="cm">cm</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">DPI</label>
                      <select value={dpi} onChange={e => setDpi(Number(e.target.value))} className="w-full bg-black/40 border border-slate-700 rounded-lg p-2 text-white text-sm">
                        <option value={200}>200 DPI</option>
                        <option value={300}>300 DPI</option>
                        <option value={600}>600 DPI</option>
                      </select>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Width</label>
                      <input type="number" value={width} onChange={e => setWidth(parseFloat(e.target.value))} className="w-full bg-black/40 border border-slate-700 rounded-lg p-2 text-white text-sm" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Height</label>
                      <input type="number" value={height} onChange={e => setHeight(parseFloat(e.target.value))} className="w-full bg-black/40 border border-slate-700 rounded-lg p-2 text-white text-sm" />
                    </div>
                 </div>

                 <label className="flex items-center gap-2 cursor-pointer pt-2">
                    <input type="checkbox" checked={autoCrop} onChange={(e) => setAutoCrop(e.target.checked)} className="w-4 h-4 rounded accent-indigo-500" />
                    <span className="text-xs text-slate-400 flex items-center gap-1"><Crop className="w-3 h-3"/> Auto-Crop Sign</span>
                  </label>

                  <div className="pt-4 border-t border-white/10">
                    <p className="text-[10px] text-slate-500 font-bold mb-2 uppercase">Common Standards</p>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => { setUnit('px'); setWidth(140); setHeight(60); }} className="px-2 py-1 text-[10px] bg-white/5 hover:bg-white/10 rounded border border-white/10">140x60 (SSC)</button>
                      <button onClick={() => { setUnit('px'); setWidth(350); setHeight(150); }} className="px-2 py-1 text-[10px] bg-white/5 hover:bg-white/10 rounded border border-white/10">350x150 (IBPS)</button>
                    </div>
                  </div>
              </div>

              <button 
                onClick={handleProcess}
                disabled={isProcessing}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black tracking-wide shadow-xl shadow-indigo-500/10 transition-all"
              >
                {isProcessing ? "Processing..." : "Resize & Export"}
              </button>

              {resultUrl && (
                <a href={resultUrl} download="resized_sign.jpg" className="w-full py-4 bg-green-600 hover:bg-green-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-xl shadow-green-500/10 transition-all">
                  <Download className="w-5 h-5"/> Download JPG
                </a>
              )}
            </div>

            <div className="lg:col-span-3 space-y-6">
               <div className="bg-black/40 border border-white/5 rounded-[2rem] p-6 h-[400px] flex items-center justify-center overflow-hidden">
                 <img ref={imgRef} src={previewOriginal!} alt="Original" className="max-w-full max-h-full object-contain" />
               </div>
               
               {resultUrl && (
                 <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                    <h4 className="text-sm font-bold text-slate-400 uppercase mb-4">Final Sign Preview ({width}x{height}{unit})</h4>
                    <div className="flex justify-center bg-white p-4 rounded-xl border border-white/10">
                       <img src={resultUrl} alt="Resized" className="max-h-[150px] shadow-lg border border-slate-200" />
                    </div>
                 </div>
               )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
