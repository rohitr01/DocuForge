import { useState, useRef, useCallback } from 'react';
import { Upload, Download, RotateCw, Trash2 } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export default function ImageRotateHelper() {
  const [file, setFile] = useState<File | null>(null);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0); // in degrees
  const imgRef = useRef<HTMLImageElement>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const f = acceptedFiles[0];
      setFile(f);
      setImgUrl(URL.createObjectURL(f));
      setRotation(0);
      setResultUrl(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
    maxFiles: 1,
  });

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
    setResultUrl(null);
  };

  const applyRotation = () => {
    if (!imgRef.current || !file) return;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = imgRef.current;
    
    if (rotation === 90 || rotation === 270) {
        canvas.width = img.naturalHeight;
        canvas.height = img.naturalWidth;
    } else {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
    }

    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);

    canvas.toBlob((blob) => {
      if (!blob) return;
      setResultUrl(URL.createObjectURL(blob));
    }, file.type, 1);
  };

  const removeFile = () => {
    setFile(null);
    setImgUrl(null);
    setRotation(0);
    setResultUrl(null);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 py-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold text-white">Rotate Image</h1>
        <p className="text-slate-400">Instantly rotate and flip your images cleanly without quality loss.</p>
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
          <motion.div key="edit" className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 border border-white/5 bg-slate-800/30 rounded-3xl p-6 h-fit space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2"><RotateCw className="w-5 h-5"/> Toolset</h3>
                <button onClick={removeFile} className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg"><Trash2 className="w-5 h-5"/></button>
              </div>

              <button 
                onClick={handleRotate} 
                className="w-full py-3 bg-black/40 border border-white/10 hover:bg-white/5 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
              >
                <RotateCw className="w-5 h-5"/> Rotate 90°
              </button>

              <button 
                onClick={applyRotation} disabled={!!resultUrl}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                Apply & Save Output
              </button>

              {resultUrl && (
                <div className="pt-4 border-t border-white/10 mt-4 space-y-4">
                  <a href={resultUrl} download={`rotated_${file.name}`} className="w-full py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors">
                    <Download className="w-5 h-5"/> Download Rotated Image
                  </a>
                </div>
              )}
            </div>

            <div className="lg:col-span-2">
               <div className="bg-black/40 border border-white/5 rounded-3xl p-6 min-h-[500px] flex items-center justify-center overflow-hidden relative">
                  {imgUrl && (
                    <motion.img 
                      ref={imgRef}
                      src={imgUrl} 
                      alt="Rotating" 
                      className="max-h-[450px] w-auto max-w-full drop-shadow-2xl"
                      animate={{ rotate: rotation }}
                      transition={{ type: "spring", bounce: 0.4 }}
                    />
                  )}
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
