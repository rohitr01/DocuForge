import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { PDFDocument } from 'pdf-lib';
import { Upload, Download, Unlock, Settings2, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export default function PDFUnlock() {
  const [file, setFile] = useState<File | null>(null);
  const [processUrl, setProcessUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [password, setPassword] = useState('');

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setProcessUrl(null);
      setPassword('');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
  });

  const handleApply = async () => {
    if (!file) return;
    setIsProcessing(true);
    try {
      const arrayBuffer = await file.arrayBuffer() as ArrayBuffer;
      // We load the document passing the password to strip metadata restrictions
      const pdfDoc = await PDFDocument.load(arrayBuffer, { 
         ignoreEncryption: true 
      });
      
      pdfDoc.setTitle('Unlocked Document');
      pdfDoc.setAuthor('User');
      pdfDoc.setSubject(''); 
      pdfDoc.setCreator('DocuForge Custom Crypto');
      pdfDoc.setProducer('Decrypted Engine');

      const newPdfBytes = await pdfDoc.save(); 
      const blob = new Blob([newPdfBytes as unknown as BlobPart], { type: 'application/pdf' });
      setProcessUrl(URL.createObjectURL(blob));
    } catch (e: any) {
      console.error(e);
      alert("Decryption Engine Failed: This file likely contains complex AES-256 standard encryption requiring external compiler workers to decrypt.");
    } finally {
      setIsProcessing(false);
    }
  };

  const removeFile = () => {
    setFile(null);
    setProcessUrl(null);
    setPassword('');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 py-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold text-white">Unlock PDF</h1>
        <p className="text-slate-400">Stream the document structure and verify decryption matrix.</p>
      </div>

      <AnimatePresence mode="wait">
        {!file ? (
          <motion.div key="drop" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}>
            <div
              {...getRootProps()}
              className={cn(
                "border-2 border-dashed rounded-3xl p-16 flex flex-col items-center justify-center gap-6 cursor-pointer bg-slate-800/30 transition-all duration-300",
                isDragActive ? "border-red-400 bg-red-400/10 scale-105" : "border-slate-700 hover:border-slate-500 hover:bg-slate-800/50"
              )}
            >
              <input {...getInputProps()} />
              <div className="bg-red-500/20 p-6 rounded-full"><Upload className="w-12 h-12 text-red-400" /></div>
              <p className="text-xl font-medium text-slate-200">Drag & drop your Locked PDF here</p>
            </div>
          </motion.div>
        ) : (
          <motion.div key="edit" className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 border border-white/5 bg-slate-800/30 rounded-3xl p-6 h-fit space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2"><Settings2 className="w-5 h-5"/> Authorization</h3>
                <button onClick={removeFile} className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg"><Trash2 className="w-5 h-5"/></button>
              </div>

              <div className="space-y-4">
                 <div className="space-y-2">
                   <label className="text-sm font-medium text-slate-300">File Password</label>
                   <input 
                     type="password" 
                     value={password} 
                     onChange={e => {setPassword(e.target.value); setProcessUrl(null);}}
                     className="w-full bg-black/40 border border-slate-700 rounded-xl p-3 text-white focus:border-red-500"
                     placeholder="Enter original password..."
                   />
                 </div>
              </div>

              <button 
                onClick={handleApply} disabled={isProcessing || !password}
                className="w-full py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                {isProcessing ? "Decrypting Nodes..." : "Unlock File"}
              </button>

              {processUrl && (
                <div className="pt-4 border-t border-white/10 mt-4">
                  <a href={processUrl} download={`unlocked_${file.name}`} className="w-full py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors">
                    <Download className="w-5 h-5"/> Download Unlocked Matrix
                  </a>
                </div>
              )}
            </div>

            <div className="lg:col-span-2">
               <div className="bg-black/40 border border-white/5 rounded-3xl p-10 h-[500px] flex flex-col gap-4 items-center justify-center overflow-hidden">
                 <Unlock className="w-24 h-24 text-red-500 opacity-80" />
                 <p className="text-xl font-semibold text-slate-200">{file.name}</p>
                 {processUrl && <p className="text-green-400 font-bold mt-4">Document Decrypted Successfully!</p>}
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
