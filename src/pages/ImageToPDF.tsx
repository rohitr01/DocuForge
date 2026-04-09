import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { PDFDocument } from 'pdf-lib';
import { Upload, Download, FileImage, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export default function ImageToPDF() {
  const [file, setFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setPdfUrl(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
    maxFiles: 1,
  });

  const handleConvert = async () => {
    if (!file) return;
    setIsProcessing(true);
    try {
      const arrayBuffer = await file.arrayBuffer() as ArrayBuffer;
      const pdfDoc = await PDFDocument.create();
      
      let image;
      if (file.type === 'image/png') {
        image = await pdfDoc.embedPng(arrayBuffer);
      } else if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
        image = await pdfDoc.embedJpg(arrayBuffer);
      } else {
        throw new Error('Unsupported image format for direct PDF conversion (only JPG/PNG natively supported). Convert to JPG first.');
      }

      const dims = image.scale(1);
      const page = pdfDoc.addPage([dims.width, dims.height]);
      page.drawImage(image, {
        x: 0,
        y: 0,
        width: dims.width,
        height: dims.height,
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
      setPdfUrl(URL.createObjectURL(blob));
    } catch (e: any) {
      console.error(e);
      alert("Failed to convert to PDF: " + e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const removeFile = () => {
    setFile(null);
    setPdfUrl(null);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 py-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold text-white">Image to PDF</h1>
        <p className="text-slate-400">Convert any image directly into a standard PDF document.</p>
      </div>

      <AnimatePresence mode="wait">
        {!file ? (
          <motion.div key="drop" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}>
            <div
              {...getRootProps()}
              className={cn(
                "border-2 border-dashed rounded-3xl p-16 flex flex-col items-center justify-center gap-6 cursor-pointer bg-slate-800/30 transition-all duration-300",
                isDragActive ? "border-indigo-400 bg-indigo-400/10 scale-105" : "border-slate-700 hover:border-slate-500 hover:bg-slate-800/50"
              )}
            >
              <input {...getInputProps()} />
              <div className="bg-indigo-500/20 p-6 rounded-full"><Upload className="w-12 h-12 text-indigo-400" /></div>
              <p className="text-xl font-medium text-slate-200">Drag & drop your Image here (JPG/PNG)</p>
            </div>
          </motion.div>
        ) : (
          <motion.div key="edit" className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 border border-white/5 bg-slate-800/30 rounded-3xl p-6 h-fit space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2"><FileImage className="w-5 h-5"/> Image Info</h3>
                <button onClick={removeFile} className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg"><Trash2 className="w-5 h-5"/></button>
              </div>

              <div className="flex items-center justify-center bg-black/40 rounded-xl p-4 overflow-hidden h-40">
                <img src={URL.createObjectURL(file)} alt="Preview" className="max-h-full max-w-full object-contain" />
              </div>
              
              <button 
                onClick={handleConvert} disabled={isProcessing || !!pdfUrl}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                {isProcessing ? "Converting..." : "Convert to PDF"}
              </button>

              {pdfUrl && (
                <div className="pt-4 border-t border-white/10 mt-4">
                  <a href={pdfUrl} download={`${file.name.split('.')[0]}.pdf`} className="w-full py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors">
                    <Download className="w-5 h-5"/> Download PDF
                  </a>
                </div>
              )}
            </div>

            <div className="lg:col-span-2">
               <div className="bg-black/40 border border-white/5 rounded-3xl p-10 h-[500px] flex flex-col gap-4 items-center justify-center overflow-hidden">
                 <FileImage className="w-24 h-24 text-indigo-500 xl opacity-20" />
                 {pdfUrl ? (
                   <p className="text-xl font-semibold text-green-400">PDF successfully created!</p>
                 ) : (
                   <p className="text-slate-400 text-center max-w-sm">The image will be embedded perfectly mapped 1:1 on a new PDF page securely in your browser.</p>
                 )}
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
