import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { removeBackground } from '@imgly/background-removal';
import { Upload, Download, Scissors, Settings2, Trash2, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export default function ImageRemoveBg() {
  const [file, setFile] = useState<File | null>(null);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [processUrl, setProcessUrl] = useState<string | null>(null);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setImgUrl(URL.createObjectURL(acceptedFiles[0]));
      setProcessUrl(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
    maxFiles: 1,
  });

  const handleApply = async () => {
    if (!file || !imgUrl) return;
    setIsProcessing(true);
    setProgressMsg('Loading AI Inference Models (First time takes longer)...');
    
    try {
      // imgly removal locally in browser!
      // @ts-ignore
      const imageBlob = await removeBackground(imgUrl, {
         progress: (_key: string, current: number, total: number) => {
            setProgressMsg(`Downloading Models: ${Math.round((current/total)*100)}%`);
         }
      });
      
      setProgressMsg('Extracting Foreground Matrix...');
      const url = URL.createObjectURL(imageBlob);
      setProcessUrl(url);

    } catch (e) {
      console.error(e);
      alert("Failed to slice background AI nodes. Network block or memory error.");
    } finally {
      setIsProcessing(false);
      setProgressMsg('');
    }
  };

  const removeFile = () => {
    setFile(null);
    setImgUrl(null);
    setProcessUrl(null);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 py-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold text-white">AI Background Removal</h1>
        <p className="text-slate-400">Deep-learning foreground extraction processing entirely within your local browser memory.</p>
      </div>

      <AnimatePresence mode="wait">
        {!file ? (
          <motion.div key="drop" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}>
            <div
              {...getRootProps()}
              className={cn(
                "border-2 border-dashed rounded-3xl p-16 flex flex-col items-center justify-center gap-6 cursor-pointer bg-slate-800/30 transition-all duration-300",
                isDragActive ? "border-blue-400 bg-blue-400/10 scale-105" : "border-slate-700 hover:border-slate-500 hover:bg-slate-800/50"
              )}
            >
              <input {...getInputProps()} />
              <div className="bg-blue-500/20 p-6 rounded-full"><Upload className="w-12 h-12 text-blue-400" /></div>
              <p className="text-xl font-medium text-slate-200">Drag & drop your Image</p>
            </div>
          </motion.div>
        ) : (
          <motion.div key="edit" className="grid lg:grid-cols-4 gap-8">
            <div className="lg:col-span-1 border border-white/5 bg-slate-800/30 rounded-3xl p-6 h-fit space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2"><Settings2 className="w-5 h-5"/> Inference Setup</h3>
                <button onClick={removeFile} className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg"><Trash2 className="w-5 h-5"/></button>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl text-xs text-blue-200 leading-relaxed">
                 Uses WebAssembly and ONNX Neural Networks to slice objects natively. Data never leaves your PC.
              </div>

              <button 
                onClick={handleApply} disabled={isProcessing}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                {isProcessing ? <><Loader2 className="w-4 h-4 animate-spin"/> Processing AI Node</>  : "Remove Background"}
              </button>
              
              {progressMsg && (
                 <p className="text-xs text-center text-blue-400 animate-pulse font-mono">{progressMsg}</p>
              )}

              {processUrl && (
                <div className="pt-4 border-t border-white/10 mt-4">
                  <a href={processUrl} download={`nobg_${file.name.replace(/\.[^/.]+$/, "")}.png`} className="w-full py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors block text-center shadow-lg shadow-green-500/20">
                    <Download className="w-5 h-5 inline mr-2"/> Download True PNG
                  </a>
                </div>
              )}
            </div>

            <div className="lg:col-span-3">
               <div className="bg-black/40 border border-white/5 rounded-3xl p-6 min-h-[500px] flex gap-4 max-md:flex-col">
                  <div className="flex-1 flex flex-col items-center justify-center overflow-hidden rounded-xl relative bg-slate-900 border border-white/10 p-4">
                     <span className="absolute top-2 left-2 bg-slate-800/80 px-3 py-1 rounded-full text-[10px] font-mono z-10 shadow-lg text-slate-300">Original Upload</span>
                     {imgUrl && <img src={imgUrl} className="max-w-full max-h-[500px] object-contain rounded-lg shadow-2xl" alt="Source" />}
                  </div>
                  
                  {processUrl ? (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex-1 flex flex-col items-center justify-center overflow-hidden border border-blue-500/50 rounded-xl relative shadow-[0_0_50px_rgba(59,130,246,0.15)] bg-[#1a1c29]" 
                                style={{backgroundImage: 'url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAAMUlEQVQ4T2P8z8Dwn4G0wHhU86hm0sLgwB/O///jB8eI0s8w6vQZ1TzCDA6D6cI3EwCDQz/z2U/hKwAAAABJRU5ErkJggg==")'}}>
                       <span className="absolute top-2 right-2 bg-blue-500 text-white px-3 py-1 rounded-full text-[10px] font-mono z-10 shadow-lg">Extracted Output!</span>
                       <img src={processUrl} className="max-w-full max-h-[500px] object-contain drop-shadow-2xl" alt="No Background" />
                    </motion.div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center border border-dashed border-white/10 rounded-xl flex-col gap-4 text-slate-500 bg-white/5 relative overflow-hidden">
                      <Scissors className="w-16 h-16 opacity-30 text-blue-400"/>
                      Pending AI Mask Data
                    </div>
                  )}
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
