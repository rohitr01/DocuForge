import { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import ReactCrop, { type Crop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Upload, Download, ArrowRight, Save, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const TEMPLATES = [
  { id: 'custom', name: 'Custom Parameters', width: 200, height: 200, minKb: 10, maxKb: 100 },
  { id: 'ssc-sig', name: 'SSC Signature', width: 140, height: 60, minKb: 10, maxKb: 20 },
  { id: 'upsc-photo', name: 'UPSC Photo', width: 350, height: 350, minKb: 20, maxKb: 300 },
  { id: 'upsc-sig', name: 'UPSC Signature', width: 350, height: 350, minKb: 20, maxKb: 300 },
  { id: 'dsssb-photo', name: 'DSSSB / State Photo', width: 110, height: 140, minKb: 50, maxKb: 100 },
  { id: 'dsssb-sig', name: 'DSSSB Signature', width: 140, height: 110, minKb: 50, maxKb: 100 },
  { id: 'pan-photo', name: 'PAN Card Photo', width: 213, height: 213, minKb: 20, maxKb: 30 },
  { id: 'pan-sig', name: 'PAN Card Signature', width: 213, height: 213, minKb: 10, maxKb: 15 },
  { id: 'ibps-photo', name: 'IBPS / Bank Photo', width: 200, height: 230, minKb: 20, maxKb: 50 },
  { id: 'ibps-sig', name: 'IBPS Signature', width: 140, height: 60, minKb: 10, maxKb: 20 },
  { id: 'ibps-thumb', name: 'IBPS Left Thumb', width: 240, height: 240, minKb: 20, maxKb: 50 },
  { id: 'gate-photo', name: 'GATE Photo', width: 480, height: 640, minKb: 20, maxKb: 200 },
  { id: 'gate-sig', name: 'GATE Signature', width: 280, height: 160, minKb: 5, maxKb: 100 },
  { id: 'rrb-photo', name: 'Railway (RRB) Photo', width: 320, height: 240, minKb: 20, maxKb: 50 },
  { id: 'up-police', name: 'UP Police Photo', width: 150, height: 180, minKb: 20, maxKb: 50 }
];

export default function FormHelper() {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  
  // Custom states
  const [customW, setCustomW] = useState(300);
  const [customH, setCustomH] = useState(300);
  const [customMin, setCustomMin] = useState(20);
  const [customMax, setCustomMax] = useState(100);

  // Derive active template bounds
  let activeTemplate = TEMPLATES.find(t => t.id === selectedTemplateId);
  if (selectedTemplateId === 'custom') {
     activeTemplate = { id: 'custom', name: 'Custom Builder', width: customW, height: customH, minKb: customMin, maxKb: customMax };
  }
  
  const [src, setSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<any>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultSizeKb, setResultSizeKb] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setSrc(URL.createObjectURL(acceptedFiles[0]));
      setResultUrl(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    maxFiles: 1,
  });

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    if (!activeTemplate) return;
    const { width, height } = e.currentTarget;
    // Set initial crop centered
    const aspect = activeTemplate.width / activeTemplate.height;
    let cropWidth = width * 0.8;
    let cropHeight = cropWidth / aspect;
    if (cropHeight > height * 0.8) {
      cropHeight = height * 0.8;
      cropWidth = cropHeight * aspect;
    }
    setCrop({
      unit: 'px',
      x: (width - cropWidth) / 2,
      y: (height - cropHeight) / 2,
      width: cropWidth,
      height: cropHeight,
    });
  };

  const processImage = async () => {
    if (!completedCrop || !imgRef.current || !activeTemplate) return;
    setIsProcessing(true);

    try {
      const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
      const scaleY = imgRef.current.naturalHeight / imgRef.current.height;

      const canvas = document.createElement('canvas');
      canvas.width = Math.floor(activeTemplate.width);
      canvas.height = Math.floor(activeTemplate.height);
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const cropX = completedCrop.x * scaleX;
      const cropY = completedCrop.y * scaleY;
      const cropWidth = completedCrop.width * scaleX;
      const cropHeight = completedCrop.height * scaleY;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Draw the cropped image resized exactly to template requirements
      ctx.drawImage(
        imgRef.current,
        cropX, cropY, cropWidth, cropHeight,
        0, 0, canvas.width, canvas.height
      );

      // Now we compress to hit the exact KB range.
      let finalBlob = await new Promise<Blob>((resolve) => canvas.toBlob(b => resolve(b!), 'image/jpeg', 1));
      let quality = 0.95;
      
      // Rough binary search / iterative approach for target KB
      const targetMaxBytes = activeTemplate.maxKb * 1024;

      while (finalBlob.size > targetMaxBytes && quality > 0.1) {
        quality -= 0.1;
        finalBlob = await new Promise<Blob>((resolve) => canvas.toBlob(b => resolve(b!), 'image/jpeg', quality));
      }

      setResultSizeKb(finalBlob.size / 1024);
      setResultUrl(URL.createObjectURL(finalBlob));

    } catch (e) {
      console.error(e);
      alert('Processing failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-8 space-y-12 animate-in fade-in zoom-in-95 duration-500">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold text-white">Gov Form Helper</h1>
        <p className="text-slate-400">Never get rejected again. Auto-resize and compress photos & signatures for strict portal rules.</p>
      </div>

      <div className="grid lg:grid-cols-4 gap-8">
        
        {/* Template Selection Sidebar */}
        <div className="col-span-1 space-y-4">
          <h2 className="text-xl font-bold border-b border-indigo-500/20 pb-4 mb-4">Select Form Standard</h2>
          <div className="space-y-3 max-h-[700px] overflow-auto pr-2">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => { setSelectedTemplateId(t.id); setSrc(null); setResultUrl(null); }}
                className={cn(
                  "w-full flex items-center justify-between p-4 rounded-xl border text-left transition-all",
                  selectedTemplateId === t.id 
                    ? "border-indigo-500 bg-indigo-500/10 shadow-[0_0_20px_rgba(99,102,241,0.15)] scale-[1.02]" 
                    : "border-slate-800 bg-slate-800/30 hover:border-slate-600 hover:bg-slate-800/50"
                )}
              >
                <div>
                  <p className={cn("font-semibold", selectedTemplateId === t.id ? "text-indigo-300" : "text-slate-200")}>{t.name}</p>
                  {t.id === 'custom' ? (
                     <p className="text-xs text-slate-400 italic font-medium mt-1">Define your own parameters</p>
                  ) : (
                     <p className="text-[10px] text-slate-500 font-mono mt-1">{t.width}x{t.height}px • {t.minKb}-{t.maxKb}KB</p>
                  )}
                </div>
                <ArrowRight className={cn("w-4 h-4 transition-opacity", selectedTemplateId === t.id ? "text-indigo-400 opacity-100" : "opacity-0")} />
              </button>
            ))}
          </div>
        </div>

        {/* Main Work Area */}
        <div className="col-span-3">
          {!selectedTemplateId ? (
            <div className="h-[400px] border-2 border-dashed border-slate-800 rounded-3xl flex items-center justify-center text-slate-500 bg-black/20">
              <p>Select a verification standard template from the left to start.</p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {/* If Custom is selected, show inputs if we don't have src yet, or just show inputs at top */}
              {selectedTemplateId === 'custom' && (
                <motion.div initial={{opacity:0, height:0}} animate={{opacity:1, height:'auto'}} className="mb-6 grid grid-cols-4 gap-4 bg-indigo-900/10 border border-indigo-500/20 p-4 rounded-2xl">
                  <div className="col-span-4"><p className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Custom Parameters</p></div>
                  <div className="space-y-1"><label className="text-xs text-slate-400 font-medium">Width (px)</label><input type="number" min="10" value={customW} onChange={e=>{setCustomW(Number(e.target.value)||10); setResultUrl(null)}} className="w-full bg-black/40 border border-slate-700 rounded-lg p-2 text-white text-sm" /></div>
                  <div className="space-y-1"><label className="text-xs text-slate-400 font-medium">Height (px)</label><input type="number" min="10" value={customH} onChange={e=>{setCustomH(Number(e.target.value)||10); setResultUrl(null)}} className="w-full bg-black/40 border border-slate-700 rounded-lg p-2 text-white text-sm" /></div>
                  <div className="space-y-1"><label className="text-xs text-slate-400 font-medium">Min KB</label><input type="number" min="1" value={customMin} onChange={e=>setCustomMin(Number(e.target.value)||1)} className="w-full bg-black/40 border border-slate-700 rounded-lg p-2 text-white text-sm" /></div>
                  <div className="space-y-1"><label className="text-xs text-slate-400 font-medium">Max KB</label><input type="number" min="5" value={customMax} onChange={e=>setCustomMax(Number(e.target.value)||5)} className="w-full bg-black/40 border border-slate-700 rounded-lg p-2 text-white text-sm" /></div>
                </motion.div>
              )}

              {!src ? (
                <motion.div
                  key="upload"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="h-full min-h-[400px]"
                >
                  <div
                    {...getRootProps()}
                    className={cn(
                      "h-full min-h-[400px] border-2 border-dashed rounded-3xl flex flex-col items-center justify-center gap-6 cursor-pointer transition-all duration-300",
                      isDragActive ? "border-indigo-400 bg-indigo-400/10 scale-[1.02]" : "border-slate-700 bg-slate-800/30 hover:border-slate-500"
                    )}
                  >
                    <input {...getInputProps()} />
                    <Upload className="w-12 h-12 text-slate-400" />
                    <div className="text-center">
                      <p className="text-xl font-medium text-slate-200">Upload {activeTemplate?.name} source</p>
                      <p className="text-slate-500 mt-2">JPG, PNG, or WEBP</p>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="crop"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="grid lg:grid-cols-2 gap-8"
                >
                  {/* Cropper */}
                  <div className="bg-slate-800/30 border border-white/5 p-4 rounded-3xl flex flex-col items-center justify-center overflow-hidden">
                    <p className="text-xs text-slate-500 uppercase tracking-widest mb-4">Crop Frame ({activeTemplate!.width}x{activeTemplate!.height})</p>
                    
                    {/* The Cropper strictly locks to aspect ratio! */}
                    <ReactCrop
                      crop={crop}
                      onChange={c => setCrop(c)}
                      onComplete={c => setCompletedCrop(c)}
                      aspect={activeTemplate!.width / activeTemplate!.height}
                      className="max-h-[500px]"
                    >
                      <img ref={imgRef} src={src} onLoad={onImageLoad} className="max-h-[500px] object-contain" crossOrigin="anonymous" />
                    </ReactCrop>
                    
                    <button 
                      onClick={processImage}
                      disabled={!completedCrop || isProcessing}
                      className="mt-6 w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                    >
                       {isProcessing ? "Extrapolating Metrics..." : "Compile Final Matrix"}
                    </button>
                    <button onClick={() => {setSrc(null); setResultUrl(null)}} className="mt-3 text-sm text-slate-400 hover:text-white">Cancel & Back</button>
                  </div>

                  {/* Result */}
                  <div className="bg-black/40 border border-white/5 p-4 rounded-3xl flex flex-col items-center">
                    <p className="text-xs text-slate-500 uppercase tracking-widest mb-4">Output Result</p>
                    <div className="flex-1 flex flex-col items-center justify-center gap-6 w-full relative">
                      {resultUrl ? (
                         <>
                           <div className="bg-slate-800 flex items-center justify-center rounded-xl p-2 max-w-full overflow-hidden">
                             <img src={resultUrl} alt="Result" className="shadow-2xl shadow-black/50 border border-white/10 max-h-[300px] w-auto" />
                           </div>
                           
                           <div className="w-full bg-slate-800/50 p-4 rounded-2xl space-y-3 mt-4">
                             <div className="flex justify-between text-sm">
                               <span className="text-slate-400">Target Bounds</span>
                               <span className="text-green-400 flex items-center gap-1 font-mono"><CheckCircle className="w-4 h-4"/> {activeTemplate!.width}x{activeTemplate!.height}px</span>
                             </div>
                             <div className="flex justify-between text-sm">
                               <span className="text-slate-400">Target File Size Range</span>
                               {resultSizeKb >= activeTemplate!.minKb && resultSizeKb <= activeTemplate!.maxKb ? (
                                 <span className="text-green-400 flex items-center gap-1 font-mono"><CheckCircle className="w-4 h-4"/> {resultSizeKb.toFixed(1)} KB</span>
                               ) : (
                                 <span className="text-red-400 flex items-center gap-1 font-mono"><XCircle className="w-4 h-4"/> {resultSizeKb.toFixed(1)} KB (Failed)</span>
                               )}
                             </div>
                             <p className="text-[10px] text-slate-500 italic text-center pt-2 border-t border-white/10 mt-2">Required bounds: {activeTemplate!.minKb}KB - {activeTemplate!.maxKb}KB</p>
                           </div>

                           <a 
                             href={resultUrl} 
                             download={`${activeTemplate!.id}-compliant.jpg`}
                             className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white py-3 rounded-xl font-medium transition-colors"
                           >
                             <Download className="w-5 h-5" /> Download Confirmed File
                           </a>
                         </>
                      ) : (
                        <div className="text-slate-600 text-center space-y-2">
                           <Save className="w-12 h-12 mx-auto opacity-50" />
                           <p>Process the matrix to see strict portal rules compliance check.</p>
                        </div>
                      )}
                    </div>
                  </div>

                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>

      </div>
    </div>
  );
}
