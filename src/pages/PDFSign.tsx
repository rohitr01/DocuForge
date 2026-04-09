import { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { PDFDocument } from 'pdf-lib';
import { Upload, Download, PenTool, Trash2, X, Move } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import * as pdfjsLib from 'pdfjs-dist';

export default function PDFSign() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [signFile, setSignFile] = useState<File | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Canvas tracking
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  
  // Draggable properties
  const [signPos, setSignPos] = useState({ x: 50, y: 50 });
  const [scale, setScale] = useState(0.5);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const boxStart = useRef({ x: 0, y: 0 });

  // Set worker inside component to avoid module-level crash during Vite build
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

  const onDropPdf = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) { 
      const f = acceptedFiles[0];
      setPdfFile(f); 
      setSignedUrl(null);
      
      // Render to Custom Canvas instantly
      const arrayBuffer = await f.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(1);
      
      const viewport = page.getViewport({ scale: 1.5 }); // High res rendering
      if (canvasRef.current) {
         const canvas = canvasRef.current;
         const context = canvas.getContext('2d');
         if (context) {
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            await page.render({ canvasContext: context, viewport }).promise;
            
            // Log true PDF dimensions from pdf.js native viewports
            // Dimensions tracked via canvas itself
         }
      }
    }
  }, []);

  const onDropSign = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) { 
      setSignFile(acceptedFiles[0]); 
      setSignedUrl(null); 
    }
  }, []);

  const { getRootProps: getPdfProps, getInputProps: getPdfInput } = useDropzone({ onDrop: onDropPdf, accept: { 'application/pdf': ['.pdf'] }, maxFiles: 1 });
  const { getRootProps: getSignProps, getInputProps: getSignInput } = useDropzone({ onDrop: onDropSign, accept: { 'image/*': ['.png', '.jpg'] }, maxFiles: 1 });

  const handlePointerDown = (e: React.PointerEvent) => {
    isDragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY };
    boxStart.current = { x: signPos.x, y: signPos.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    
    // Boundary checks implicitly loose
    setSignPos({
       x: boxStart.current.x + dx,
       y: boxStart.current.y + dy
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDragging.current = false;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const handleSign = async () => {
    if (!pdfFile || !signFile || !canvasRef.current) return;
    setIsProcessing(true);
    try {
      const pdfBuffer = await pdfFile.arrayBuffer();
      const signBuffer = await signFile.arrayBuffer();
      
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      let signImage;
      if (signFile.type === 'image/png') {
        signImage = await pdfDoc.embedPng(signBuffer);
      } else {
        signImage = await pdfDoc.embedJpg(signBuffer);
      }

      const pages = pdfDoc.getPages();
      const firstPage = pages[0]; // Assuming page 1 since that's what we visual rendering
      const { width: nativeW, height: nativeH } = firstPage.getSize();

      const imgDims = signImage.scale(scale);

      // Math Magic: We must map the visual screen coordinate back to the PDF internal structural matrix
      // Our canvas has a visual bounds, we get it via getBoundingClientRect()
      const rect = canvasRef.current.getBoundingClientRect();
      const scaleX = nativeW / rect.width;
      const scaleY = nativeH / rect.height;

      const physicalPdfX = signPos.x * scaleX;
      // Y is inverted in PDF matrix (0 is at the bottom!)
      const physicalPdfY = nativeH - (signPos.y * scaleY) - imgDims.height;

      firstPage.drawImage(signImage, {
        x: physicalPdfX, 
        y: physicalPdfY,
        width: imgDims.width,
        height: imgDims.height,
      });

      const newPdfBytes = await pdfDoc.save();
      const blob = new Blob([newPdfBytes as unknown as BlobPart], { type: 'application/pdf' });
      setSignedUrl(URL.createObjectURL(blob));
    } catch (e: any) {
      alert("Failed to inject matrix signature. Ensure the file is not heavily encrypted.");
    } finally {
      setIsProcessing(false);
    }
  };

  const clearAll = () => { setPdfFile(null); setSignFile(null); setSignedUrl(null); }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 py-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold text-white">Visual PDF Signature</h1>
        <p className="text-slate-400">Exact bounds drag-and-drop structural injection.</p>
      </div>

      <AnimatePresence mode="wait">
        {!pdfFile ? (
          <motion.div key="drop" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}>
            <div
              {...getPdfProps()}
              className={cn(
                "border-2 border-dashed rounded-3xl p-16 flex flex-col items-center justify-center gap-6 cursor-pointer bg-slate-800/30 transition-all duration-300",
                 "border-slate-700 hover:border-slate-500 hover:bg-slate-800/50"
              )}
            >
              <input {...getPdfInput()} />
              <div className="bg-red-500/20 p-6 rounded-full"><Upload className="w-12 h-12 text-red-400" /></div>
              <p className="text-xl font-medium text-slate-200">Drag & drop your PDF Document</p>
            </div>
          </motion.div>
        ) : (
          <motion.div key="edit" className="grid lg:grid-cols-4 gap-8">
            <div className="lg:col-span-1 border border-white/5 bg-slate-800/30 rounded-3xl p-6 h-fit space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2"><PenTool className="w-5 h-5"/> Toolset</h3>
                <button onClick={clearAll} className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg"><Trash2 className="w-5 h-5"/></button>
              </div>

              <div className="space-y-4">
                 {!signFile ? (
                   <div {...getSignProps()} className="border-2 border-dashed border-blue-500/50 rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer bg-blue-500/10 hover:bg-blue-500/20 transition-all text-center">
                     <input {...getSignInput()} />
                     <Upload className="w-6 h-6 text-blue-400"/>
                     <p className="text-sm font-medium text-blue-200">Load Signature</p>
                   </div>
                 ) : (
                   <div className="space-y-4">
                      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 flex items-center justify-between">
                         <span className="text-xs text-blue-300 truncate w-3/4">{signFile.name}</span>
                         <button onClick={() => setSignFile(null)} className="text-red-400 hover:text-red-300"><X className="w-4 h-4"/></button>
                      </div>

                      <div className="space-y-2">
                          <label className="text-xs font-medium text-slate-300 flex justify-between">
                            <span>Image Scale Vector</span>
                            <span className="text-indigo-400">{scale.toFixed(2)}x</span>
                          </label>
                          <input type="range" min="0.1" max="1.5" step="0.05" value={scale} onChange={e => {setScale(Number(e.target.value)); setSignedUrl(null)}} className="w-full" />
                      </div>
                   </div>
                 )}
              </div>

              <button 
                onClick={handleSign} disabled={isProcessing || !signFile}
                className="w-full py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-medium flex flex-col items-center justify-center gap-1 transition-colors disabled:opacity-50"
              >
                {isProcessing ? "Signing Matrix..." : <span className="font-bold tracking-wide">CONFIRM & INJECT</span>}
                <span className="text-[10px] text-red-200 font-normal">Locks Vector Permanently</span>
              </button>

              {signedUrl && (
                <div className="border-t border-white/10 pt-4 mt-4">
                  <a href={signedUrl} download={`Signed_${pdfFile.name}`} className="w-full py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors block text-center shadow-xl shadow-green-500/20">
                    <Download className="w-5 h-5 inline mr-2"/> Download Output
                  </a>
                </div>
              )}
            </div>

            <div className="lg:col-span-3">
               <div className="bg-black/40 border border-white/5 rounded-3xl p-6 min-h-[700px] flex justify-center items-start overflow-auto relative">
                  
                  {/* Visual Drop Area */}
                  <div className="relative border border-white/20 shadow-2xl bg-white" style={{ maxWidth: '100%' }}>
                     <canvas ref={canvasRef} className="block w-full max-w-[800px] h-auto pointer-events-none" />
                     
                     {/* The Draggable Signature Overlay */}
                     {signFile && (
                        <div 
                          onPointerDown={handlePointerDown}
                          onPointerMove={handlePointerMove}
                          onPointerUp={handlePointerUp}
                          className="absolute group z-20 cursor-move border border-dashed border-transparent hover:border-blue-500/50"
                          style={{
                             left: signPos.x, top: signPos.y,
                             transform: `scale(${scale * 0.5})`, // Visual scaling heuristic for HTML rendering discrepancy
                             transformOrigin: 'top left',
                             touchAction: 'none'
                          }}
                        >
                           <img 
                              src={URL.createObjectURL(signFile)} 
                              alt="signature" 
                              className="pointer-events-none select-none max-w-[300px]" // Standardize visual block
                           />
                           
                           {/* Hover delete handler element */}
                           <button onClick={(e) => { e.stopPropagation(); setSignFile(null); }} className="absolute -top-6 -right-6 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-50">
                             <Trash2 className="w-4 h-4" />
                           </button>

                           {/* Move hint */}
                           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 bg-black/50 text-white p-2 rounded-full pointer-events-none transition-opacity">
                              <Move className="w-6 h-6" />
                           </div>
                        </div>
                     )}
                  </div>

               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
