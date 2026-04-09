import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { PDFDocument } from 'pdf-lib';
import { Upload, Download, Settings2, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export default function PDFMerge() {
  const [files, setFiles] = useState<File[]>([]);
  const [mergedUrl, setMergedUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState('docuforge_merged.pdf');

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles((prev) => [...prev, ...acceptedFiles]);
    setMergedUrl(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] }
  });

  const handleMerge = async () => {
    if (files.length < 2) return;
    setIsProcessing(true);
    
    try {
      const mergedPdf = await PDFDocument.create();
      for (const file of files) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }

      const mergedPdfFile = await mergedPdf.save();
      const blob = new Blob([mergedPdfFile as unknown as BlobPart], { type: 'application/pdf' });
      setMergedUrl(URL.createObjectURL(blob));
    } catch (error) {
      console.error(error);
      alert("Failed to merge documents.");
    } finally {
      setIsProcessing(false);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setMergedUrl(null);
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newFiles = [...files];
    const temp = newFiles[index];
    newFiles[index] = newFiles[index - 1];
    newFiles[index - 1] = temp;
    setFiles(newFiles);
    setMergedUrl(null);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 py-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold text-white">PDF Merge</h1>
        <p className="text-slate-400">Combine multiple files into a single master document visually.</p>
      </div>

      <AnimatePresence mode="wait">
        {files.length === 0 ? (
          <motion.div key="drop" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}>
            <div
              {...getRootProps()}
              className={cn(
                "border-2 border-dashed rounded-3xl p-16 flex flex-col items-center justify-center gap-6 cursor-pointer bg-slate-800/30 transition-all duration-300",
                isDragActive ? "border-green-400 bg-green-400/10 scale-105" : "border-slate-700 hover:border-slate-500 hover:bg-slate-800/50"
              )}
            >
              <input {...getInputProps()} />
              <div className="bg-green-500/20 p-6 rounded-full"><Upload className="w-12 h-12 text-green-400" /></div>
              <p className="text-xl font-medium text-slate-200">Drag & drop multiple PDFs</p>
            </div>
          </motion.div>
        ) : (
          <motion.div key="edit" className="grid lg:grid-cols-4 gap-8">
            <div className="lg:col-span-1 border border-white/5 bg-slate-800/30 rounded-3xl p-6 h-fit space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2"><Settings2 className="w-5 h-5"/> Merge Config</h3>
                <button onClick={() => {setFiles([]); setMergedUrl(null);}} className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg"><Trash2 className="w-5 h-5"/></button>
              </div>

              <div className="space-y-4">
                 <div className="space-y-2">
                   <label className="text-sm font-medium text-slate-300">File Output Name</label>
                   <input 
                     type="text" 
                     value={fileName} 
                     onChange={e => setFileName(e.target.value)}
                     className="w-full bg-black/40 border border-slate-700 rounded-xl p-3 text-white focus:border-green-500 text-sm"
                   />
                 </div>

                 <div 
                   {...getRootProps()} 
                   className="w-full py-2 bg-slate-800 hover:bg-slate-700 border border-dashed border-slate-500 rounded-lg text-center cursor-pointer text-sm font-medium transition-colors"
                 >
                    <input {...getInputProps()} />
                    + Add More PDFs
                 </div>
              </div>

              <button 
                onClick={handleMerge} disabled={isProcessing || files.length < 2}
                className="w-full py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                {isProcessing ? "Patching Matrices..." : files.length < 2 ? "Need 2+ Files" : "Merge Documents"}
              </button>

              {mergedUrl && (
                <div className="pt-4 border-t border-white/10 mt-4">
                  <a href={mergedUrl} download={fileName} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors block text-center shadow-lg shadow-indigo-500/20">
                    <Download className="w-5 h-5 inline mr-2"/> Download Output
                  </a>
                </div>
              )}
            </div>

            <div className="lg:col-span-3">
               <div className="bg-black/40 border border-white/5 rounded-3xl p-6 min-h-[500px] flex max-md:flex-col gap-4">
                  <div className="flex-1 border border-white/10 rounded-xl overflow-auto p-4 space-y-2 max-h-[600px]">
                     <h4 className="text-sm font-medium text-slate-400 mb-4 sticky top-0 bg-slate-900/80 p-2 z-10 backdrop-blur-md rounded">Active File Queue</h4>
                     
                     <AnimatePresence>
                        {files.map((f, i) => (
                           <motion.div initial={{opacity:0, scale:0.95}} animate={{opacity:1, scale:1}} exit={{opacity:0, height:0}} key={`${f.name}-${i}`} className="flex items-center justify-between bg-white/5 p-3 rounded-lg border border-white/10 hover:border-slate-500 transition-colors">
                              <span className="text-sm font-medium truncate w-1/2" title={f.name}>{i+1}. {f.name}</span>
                              <div className="flex items-center gap-1">
                                 <button onClick={()=>moveUp(i)} disabled={i===0} className="px-2 py-1 bg-slate-800 rounded hover:bg-slate-700 disabled:opacity-30 text-xs">↑</button>
                                 <button onClick={()=>removeFile(i)} className="p-1.5 bg-red-500/20 text-red-400 rounded hover:bg-red-500/40"><Trash2 className="w-3.5 h-3.5"/></button>
                              </div>
                           </motion.div>
                        ))}
                     </AnimatePresence>
                  </div>
                  
                  {mergedUrl && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex-[1.5] flex flex-col items-center overflow-hidden border-2 border-indigo-500/50 rounded-xl relative shadow-2xl h-[600px]">
                       <span className="absolute top-2 right-2 bg-indigo-500 text-white px-3 py-1 rounded-full text-xs font-mono z-10 shadow-lg">Merged Stream Ready!</span>
                       <iframe src={mergedUrl} className="w-full h-full bg-white border-0" title="Merged Output Preview" />
                    </motion.div>
                  )}
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
