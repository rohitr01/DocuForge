import { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Download, Layout, Image as ImageIcon, PenTool } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export default function PhotoSignMerge() {
  const [photo, setPhoto] = useState<string | null>(null);
  const [sign, setSign] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [layout, setLayout] = useState<'VERTICAL' | 'HORIZONTAL'>('VERTICAL');

  const photoImgRef = useRef<HTMLImageElement>(null);
  const signImgRef = useRef<HTMLImageElement>(null);

  const onDropPhoto = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setPhoto(URL.createObjectURL(acceptedFiles[0]));
      setResultUrl(null);
    }
  }, []);

  const onDropSign = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setSign(URL.createObjectURL(acceptedFiles[0]));
      setResultUrl(null);
    }
  }, []);

  const handleMerge = async () => {
    if (!photo || !sign || !photoImgRef.current || !signImgRef.current) return;
    setIsProcessing(true);
    
    try {
      const pImg = photoImgRef.current;
      const sImg = signImgRef.current;
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      if (layout === 'VERTICAL') {
        const width = 600;
        const photoHeight = Math.round(width * (pImg.naturalHeight / pImg.naturalWidth));
        const signHeight = Math.round(width * (sImg.naturalHeight / sImg.naturalWidth));
        
        canvas.width = width;
        canvas.height = photoHeight + signHeight;
        
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.drawImage(pImg, 0, 0, width, photoHeight);
        ctx.drawImage(sImg, 0, photoHeight, width, signHeight);
      } else {
        const height = 400;
        const photoWidth = Math.round(height * (pImg.naturalWidth / pImg.naturalHeight));
        const signWidth = Math.round(height * (sImg.naturalWidth / sImg.naturalHeight));
        
        canvas.width = photoWidth + signWidth;
        canvas.height = height;
        
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.drawImage(pImg, 0, 0, photoWidth, height);
        ctx.drawImage(sImg, photoWidth, 0, signWidth, height);
      }

      setResultUrl(canvas.toDataURL('image/jpeg', 0.9));
    } catch(e) {
      console.error(e);
      alert("Merge failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 py-8 px-4">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold text-white">Identity Merger</h1>
        <p className="text-slate-400">Combine your Portrait Photo and Signature into a single file for form uploads.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2"><ImageIcon className="w-4 h-4 text-indigo-400"/> Step 1: Upload Photo</label>
          <div 
            {...useDropzone({ onDrop: onDropPhoto, accept: { 'image/*': [] }, maxFiles: 1 }).getRootProps()}
            className={cn(
              "border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center gap-4 cursor-pointer min-h-[250px] transition-all",
              photo ? "border-green-500/30 bg-green-500/5" : "border-slate-700 bg-slate-800/10 hover:border-indigo-500"
            )}
          >
            {photo ? (
              <img ref={photoImgRef} src={photo} alt="Upload" className="max-h-56 rounded-lg shadow-xl" />
            ) : (
              <div className="text-center space-y-2">
                <Upload className="w-10 h-10 text-slate-500 mx-auto" />
                <p className="text-sm text-slate-400">Click to upload Photo</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2"><PenTool className="w-4 h-4 text-indigo-400"/> Step 2: Upload Signature</label>
          <div 
            {...useDropzone({ onDrop: onDropSign, accept: { 'image/*': [] }, maxFiles: 1 }).getRootProps()}
            className={cn(
              "border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center gap-4 cursor-pointer min-h-[250px] transition-all",
              sign ? "border-green-500/30 bg-green-500/5" : "border-slate-700 bg-slate-800/10 hover:border-indigo-500"
            )}
          >
            {sign ? (
              <img ref={signImgRef} src={sign} alt="Signature" className="max-h-56 rounded-lg shadow-xl" />
            ) : (
              <div className="text-center space-y-2">
                <Upload className="w-10 h-10 text-slate-500 mx-auto" />
                <p className="text-sm text-slate-400">Click to upload Signature</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center gap-6">
        <div className="bg-slate-800/40 p-1 rounded-2xl border border-white/10 flex gap-1">
          <button onClick={() => setLayout('VERTICAL')} className={cn("px-6 py-2 rounded-xl text-xs font-bold transition-all", layout === 'VERTICAL' ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-white")}>Vertical Stack</button>
          <button onClick={() => setLayout('HORIZONTAL')} className={cn("px-6 py-2 rounded-xl text-xs font-bold transition-all", layout === 'HORIZONTAL' ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-white")}>Side by Side</button>
        </div>

        <button 
          onClick={handleMerge}
          disabled={!photo || !sign || isProcessing}
          className="px-12 py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-2xl font-black text-lg shadow-xl shadow-indigo-500/20 transition-all active:scale-95 flex items-center gap-3"
        >
          {isProcessing ? "Processing..." : <><Layout className="w-5 h-5"/> Generate Merged Identity</>}
        </button>
      </div>

      <AnimatePresence>
        {resultUrl && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="pt-8 border-t border-white/10 flex flex-col items-center gap-8">
             <div className="bg-white p-4 rounded-xl shadow-2xl border-4 border-indigo-500/10">
                <img src={resultUrl} alt="Merged" className="max-h-[500px] shadow-lg" />
             </div>
             
             <div className="flex gap-4">
                <button onClick={() => setResultUrl(null)} className="px-8 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold transition-colors">Start Over</button>
                <a href={resultUrl} download="merged_identity.jpg" className="px-12 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold flex items-center gap-2 shadow-xl shadow-green-500/20 transition-all">
                  <Download className="w-5 h-5"/> Download JPG
                </a>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
