import { useState, useCallback, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import imageCompression from 'browser-image-compression';
import { Upload, Download, Image as ImageIcon, Settings2, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export default function ImageCompressForm() {
  const [file, setFile] = useState<File | null>(null);
  const [compressedFile, setCompressedFile] = useState<File | null>(null);
  const [previewOriginal, setPreviewOriginal] = useState<string | null>(null);
  const [previewCompressed, setPreviewCompressed] = useState<string | null>(null);
  
  const [isCompressing, setIsCompressing] = useState(false);
  
  // Advanced Compression options
  const [mode, setMode] = useState<'low' | 'basic' | 'high' | 'target'>('basic');
  const [targetKb, setTargetKb] = useState<number>(500); // 500 KB default
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const selectedInfo = acceptedFiles[0];
      setFile(selectedInfo);
      setPreviewOriginal(URL.createObjectURL(selectedInfo));
      setCompressedFile(null);
      setPreviewCompressed(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    maxFiles: 1,
  });

  const handleCompress = async () => {
    if (!file) return;
    try {
      setIsCompressing(true);
      
      let options: any = {
        useWebWorker: true,
        maxWidthOrHeight: 1920,
      };

      if (mode === 'low') {
        options.initialQuality = 0.85;
      } else if (mode === 'basic') {
        options.initialQuality = 0.65;
      } else if (mode === 'high') {
        options.initialQuality = 0.35;
      } else if (mode === 'target') {
        // maxSizeMB is expected by the package
        options.maxSizeMB = targetKb / 1024;
      }

      const result = await imageCompression(file, options);
      setCompressedFile(result);
      setPreviewCompressed(URL.createObjectURL(result));
    } catch (error) {
      console.error(error);
      alert("Failed to compress image.");
    } finally {
      setIsCompressing(false);
    }
  };

  useEffect(() => {
    if (!file) return;
    // Debounce compression run so typing target KB doesn't freeze the browser
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    timeoutRef.current = setTimeout(() => {
      handleCompress();
    }, 400); // 400ms delay
    
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }
  }, [mode, file, targetKb]);

  const removeFile = () => {
    setFile(null);
    setCompressedFile(null);
    setPreviewOriginal(null);
    setPreviewCompressed(null);
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-500 py-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold text-white">Compress Image</h1>
        <p className="text-slate-400">Reduce image file size instantly with maximum quality maintained. Works firmly in your browser.</p>
      </div>

      <AnimatePresence mode="wait">
        {!file ? (
          <motion.div key="dropzone" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}>
            <div
              {...getRootProps()}
              className={cn(
                "border-2 border-dashed rounded-3xl p-16 flex flex-col items-center justify-center gap-6 cursor-pointer bg-slate-800/30 transition-all duration-300",
                isDragActive ? "border-indigo-400 bg-indigo-400/10 scale-105" : "border-slate-700 hover:border-slate-500 hover:bg-slate-800/50"
              )}
            >
              <input {...getInputProps()} />
              <div className="bg-indigo-500/20 p-6 rounded-full">
                <Upload className="w-12 h-12 text-indigo-400" />
              </div>
              <div className="text-center">
                <p className="text-xl font-medium text-slate-200">Drag & drop your image here</p>
                <p className="text-slate-500 mt-2">or click to browse files</p>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div key="editor" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid lg:grid-cols-3 gap-8">
            
            <div className="lg:col-span-1 bg-slate-800/30 border border-white/5 rounded-3xl p-6 h-fit space-y-8">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2"><Settings2 className="w-5 h-5"/> Settings</h3>
                <button onClick={removeFile} className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                 <div className="space-y-2">
                   <label className="text-sm font-medium text-slate-300">Compression Mode</label>
                   <select 
                     title="Mode"
                     value={mode} onChange={(e) => setMode(e.target.value as any)}
                     className="w-full bg-black/40 border border-slate-700 rounded-xl p-3 text-white focus:border-indigo-500 text-sm"
                   >
                     <option value="low">Low Compress (Best Quality)</option>
                     <option value="basic">Basic Compress (Balanced)</option>
                     <option value="high">High Compress (Smallest Size)</option>
                     <option value="target">Exact Target KB Size</option>
                   </select>
                 </div>

                 {mode === 'target' && (
                    <motion.div initial={{opacity:0, height:0}} animate={{opacity:1, height:'auto'}} className="space-y-2 pt-2">
                      <label className="text-xs text-slate-400 uppercase font-semibold tracking-wider">Target Size in KB</label>
                      <input 
                        type="number" 
                        min="10" 
                        max="50000"
                        value={targetKb} 
                        onChange={(e) => setTargetKb(Number(e.target.value) || 10)}
                        className="w-full bg-black/40 border border-slate-700 rounded-xl p-3 text-white text-sm"
                        placeholder="e.g. 200"
                      />
                      <p className="text-[10px] text-slate-500 leading-tight">Algorithm uses binary tree searching to shrink within this exact value range.</p>
                    </motion.div>
                 )}
              </div>

              <div className="pt-4 border-t border-white/10 space-y-4">
                <div className="flex justify-between items-center bg-black/20 p-4 rounded-xl">
                  <span className="text-sm text-slate-400">Original Size</span>
                  <span className="font-mono font-medium text-slate-200">{formatSize(file.size)}</span>
                </div>
                
                {isCompressing ? (
                  <div className="flex justify-center py-2 h-[54px] items-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500"></div>
                  </div>
                ) : compressedFile ? (
                  <div className="flex justify-between items-center bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-xl">
                     <span className="text-sm text-indigo-300">New Size</span>
                     <div className="text-right">
                        <span className="font-mono font-medium text-indigo-400 block">{formatSize(compressedFile.size)}</span>
                        {mode === 'target' && (
                           <span className="text-[10px] text-indigo-500/70 inline-block font-mono">
                             {(compressedFile.size / 1024).toFixed(1)} KB
                           </span>
                        )}
                     </div>
                  </div>
                ) : null}

                {compressedFile && !isCompressing && (
                  <div className="text-center text-sm font-medium text-green-400 bg-green-400/10 py-1.5 rounded-lg border border-green-400/20">
                    Saved {Math.round((1 - compressedFile.size / file.size) * 100)}% space!
                  </div>
                )}
              </div>

              {compressedFile && !isCompressing && (
                <a 
                  href={previewCompressed!} 
                  download={'compressed_' + file.name}
                  className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-medium transition-colors cursor-pointer"
                >
                  <Download className="w-5 h-5" /> Download Result
                </a>
              )}
            </div>

            <div className="lg:col-span-2 space-y-4">
              <div className="grid md:grid-cols-2 gap-4 h-[500px]">
                <div className="bg-black/40 rounded-3xl border border-white/5 overflow-hidden flex flex-col">
                  <div className="bg-white/5 py-2 px-4 text-xs font-semibold tracking-wider text-slate-400 text-center border-b border-white/5 uppercase">Original Vector</div>
                  <div className="flex-1 flex items-center justify-center p-4 relative bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAAMUlEQVQ4T2P8z8Dwn4G0wHhU86hm0sLgwB/O///jB8eI0s8w6vQZ1TzCDA6D6cI3EwCDQz/z2U/hKwAAAABJRU5ErkJggg==')] bg-repeat">
                     {previewOriginal && <img src={previewOriginal} alt="Original" className="max-w-full max-h-full object-contain drop-shadow-2xl" />}
                  </div>
                </div>

                <div className="bg-black/40 rounded-3xl border border-white/5 overflow-hidden flex flex-col">
                  <div className="bg-indigo-500/10 py-2 px-4 text-xs font-semibold tracking-wider text-indigo-300 text-center border-b border-indigo-500/10 uppercase">Compressed Output</div>
                  <div className="flex-1 flex items-center justify-center p-4 relative bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAAMUlEQVQ4T2P8z8Dwn4G0wHhU86hm0sLgwB/O///jB8eI0s8w6vQZ1TzCDA6D6cI3EwCDQz/z2U/hKwAAAABJRU5ErkJggg==')] bg-repeat">
                    {isCompressing ? (
                      <div className="animate-spin rounded-full h-8 w-8 border-b-4 border-indigo-500"></div>
                    ) : previewCompressed ? (
                       <img src={previewCompressed} alt="Compressed" className="max-w-full max-h-full object-contain drop-shadow-2xl" />
                    ) : (
                      <ImageIcon className="w-12 h-12 text-slate-700" />
                    )}
                  </div>
                </div>
              </div>
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
