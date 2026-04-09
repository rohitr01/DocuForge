import { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Download, Settings2, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export default function ImageConvert() {
  const [file, setFile] = useState<File | null>(null);
  const [convertedUrl, setConvertedUrl] = useState<string | null>(null);
  const [previewOriginal, setPreviewOriginal] = useState<string | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [targetFormat, setTargetFormat] = useState('image/png');

  const imgRef = useRef<HTMLImageElement>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const selected = acceptedFiles[0];
      setFile(selected);
      setPreviewOriginal(URL.createObjectURL(selected));
      setConvertedUrl(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    maxFiles: 1,
  });

  const handleConvert = async () => {
    if (!file || !imgRef.current) return;
    setIsConverting(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = imgRef.current.naturalWidth;
      canvas.height = imgRef.current.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(imgRef.current, 0, 0);

      const blob = await new Promise<Blob>((resolve) => canvas.toBlob(b => resolve(b!), targetFormat, 0.95));
      setConvertedUrl(URL.createObjectURL(blob));
    } catch(e) {
      console.error(e);
      alert("Conversion failed.");
    } finally {
      setIsConverting(false);
    }
  };

  const removeFile = () => {
    setFile(null);
    setConvertedUrl(null);
    setPreviewOriginal(null);
  };

  const getExtension = (mime: string) => mime.split('/')[1];

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 py-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold text-white">Convert Image</h1>
        <p className="text-slate-400">Change image formats securely. Supports JPG, PNG, WEBP entirely locally.</p>
      </div>

      <AnimatePresence mode="wait">
        {!file ? (
          <motion.div
            key="drop"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <div
              {...getRootProps()}
              className={cn(
                "border-2 border-dashed rounded-3xl p-16 flex flex-col items-center justify-center gap-6 cursor-pointer bg-slate-800/30 transition-all duration-300",
                isDragActive ? "border-blue-400 bg-blue-400/10 scale-105" : "border-slate-700 hover:border-slate-500 hover:bg-slate-800/50"
              )}
            >
              <input {...getInputProps()} />
              <div className="bg-blue-500/20 p-6 rounded-full">
                <Upload className="w-12 h-12 text-blue-400" />
              </div>
              <div className="text-center">
                <p className="text-xl font-medium text-slate-200">Drag & drop your image here</p>
                <p className="text-slate-500 mt-2">or click to browse files</p>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="edit"
            className="grid lg:grid-cols-3 gap-8"
          >
            <div className="lg:col-span-1 border border-white/5 bg-slate-800/30 rounded-3xl p-6 h-fit space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2"><Settings2 className="w-5 h-5"/> Settings</h3>
                <button onClick={removeFile} className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"><Trash2 className="w-5 h-5"/></button>
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-300">Convert to Format</label>
                <select 
                  value={targetFormat} 
                  onChange={(e) => {setTargetFormat(e.target.value); setConvertedUrl(null);}}
                  className="w-full bg-black/40 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="image/png">PNG</option>
                  <option value="image/jpeg">JPG / JPEG</option>
                  <option value="image/webp">WEBP</option>
                </select>
              </div>

              <button 
                onClick={handleConvert}
                disabled={isConverting}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                {isConverting ? "Processing..." : `Convert to ${getExtension(targetFormat).toUpperCase()}`}
              </button>

              {convertedUrl && (
                <div className="pt-4 border-t border-white/10 mt-4">
                  <a 
                    href={convertedUrl} 
                    download={`converted_${file.name.split('.')[0]}.${getExtension(targetFormat)}`}
                    className="w-full py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
                  >
                    <Download className="w-5 h-5"/> Download File
                  </a>
                </div>
              )}
            </div>

            <div className="lg:col-span-2">
               <div className="bg-black/40 border border-white/5 rounded-3xl p-6 h-[500px] flex items-center justify-center overflow-hidden">
                 <img ref={imgRef} src={previewOriginal!} alt="Original" className="max-w-full max-h-full object-contain" />
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
