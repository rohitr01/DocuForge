import { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Download, Trash2, Type, Calendar, Settings2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function PhotoTextOverlay() {
  const [, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [fontSize, setFontSize] = useState(24);
  const [tagOpacity, setTagOpacity] = useState(0.6);

  const imgRef = useRef<HTMLImageElement>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setPreview(URL.createObjectURL(acceptedFiles[0]));
      setResultUrl(null);
    }
  }, []);

  const handleProcess = async () => {
    if (!preview || !imgRef.current) return;
    setIsProcessing(true);
    
    try {
      const img = imgRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(img, 0, 0);

      if (name || dob) {
        const overlayHeight = Math.round(canvas.height * 0.2);
        ctx.fillStyle = `rgba(0, 0, 0, ${tagOpacity})`;
        ctx.fillRect(0, canvas.height - overlayHeight, canvas.width, overlayHeight);
        
        ctx.fillStyle = '#ffffff';
        const dynamicFontSize = Math.round(overlayHeight * (fontSize / 100));
        ctx.font = `bold ${dynamicFontSize}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        
        if (name && dob) {
          ctx.fillText(name.toUpperCase(), canvas.width / 2, canvas.height - (overlayHeight * 0.55));
          ctx.font = `${Math.round(dynamicFontSize * 0.7)}px Inter, sans-serif`;
          ctx.fillText(`D.O.B: ${dob}`, canvas.width / 2, canvas.height - (overlayHeight * 0.15));
        } else {
          ctx.fillText((name || dob).toUpperCase(), canvas.width / 2, canvas.height - (overlayHeight * 0.35));
        }
      }

      setResultUrl(canvas.toDataURL('image/jpeg', 0.95));
    } catch(e) {
      console.error(e);
      alert("Processing failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 py-8 px-4">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold text-white">Identity Labeler</h1>
        <p className="text-slate-400">Add Name and Date of Birth stickers directly onto your photos for exam forms.</p>
      </div>

      <AnimatePresence mode="wait">
        {!preview ? (
          <motion.div key="drop" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div 
              {...useDropzone({ onDrop, accept: { 'image/*': [] }, maxFiles: 1 }).getRootProps()}
              className="border-2 border-dashed border-slate-700 rounded-3xl p-16 flex flex-col items-center justify-center gap-6 cursor-pointer bg-slate-800/20 hover:border-indigo-400 transition-all"
            >
              <input {...useDropzone({ onDrop, accept: { 'image/*': [] }, maxFiles: 1 }).getInputProps()} />
              <div className="bg-indigo-500/20 p-6 rounded-full"><Upload className="w-12 h-12 text-indigo-400" /></div>
              <p className="text-xl font-medium text-slate-200">Upload Portrait Photo</p>
            </div>
          </motion.div>
        ) : (
          <motion.div key="edit" className="grid lg:grid-cols-4 gap-8">
            <div className="lg:col-span-1 border border-white/5 bg-slate-800/40 rounded-3xl p-6 h-fit space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2"><Settings2 className="w-5 h-5 text-indigo-400"/> Settings</h3>
                <button onClick={() => setPreview(null)} className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg"><Trash2 className="w-5 h-5"/></button>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1"><Type className="w-3 h-3"/> Full Name</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. RAJESH KUMAR" className="w-full bg-black/40 border border-slate-700 rounded-lg p-3 text-white text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1"><Calendar className="w-3 h-3"/> D.O.B / Date</label>
                  <input type="text" value={dob} onChange={e => setDob(e.target.value)} placeholder="e.g. 15/08/1995" className="w-full bg-black/40 border border-slate-700 rounded-lg p-3 text-white text-sm" />
                </div>
                
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase">
                    <label>Font Size</label>
                    <span className="text-indigo-400">{fontSize}%</span>
                  </div>
                  <input type="range" min="10" max="60" value={fontSize} onChange={e => setFontSize(Number(e.target.value))} className="w-full accent-indigo-500" />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase">
                    <label>Sticker Darkness</label>
                    <span className="text-indigo-400">{Math.round(tagOpacity * 100)}%</span>
                  </div>
                  <input type="range" min="0.1" max="1" step="0.1" value={tagOpacity} onChange={e => setTagOpacity(Number(e.target.value))} className="w-full accent-indigo-500" />
                </div>
              </div>

              <button 
                onClick={handleProcess}
                disabled={isProcessing}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black shadow-xl shadow-indigo-500/20 transition-all"
              >
                {isProcessing ? "Processing..." : "Generate Label"}
              </button>

              {resultUrl && (
                <a href={resultUrl} download="identity_labeled.jpg" className="w-full py-4 bg-green-600 hover:bg-green-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-xl shadow-green-500/10 transition-all" rel="noreferrer">
                  <Download className="w-5 h-5"/> Download Result
                </a>
              )}
            </div>

            <div className="lg:col-span-3 space-y-6">
              <div className="bg-black/40 border border-white/5 rounded-[2rem] p-6 h-[500px] flex items-center justify-center overflow-hidden relative">
                <img ref={imgRef} src={preview} alt="Upload" className="max-w-full max-h-full object-contain shadow-2xl" />
              </div>
              
              {resultUrl && (
                <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                   <h4 className="text-sm font-bold text-slate-400 uppercase mb-4">Output Preview</h4>
                   <div className="flex justify-center bg-black/20 p-4 rounded-xl">
                      <img src={resultUrl} alt="Result" className="max-h-[300px] shadow-xl" />
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
