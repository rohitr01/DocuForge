import { Routes, Route, Link } from 'react-router-dom'
import { Layers, ChevronDown } from 'lucide-react'

// Page Components
import Home from './pages/Home'
import ImageCompressForm from './pages/ImageCompressForm'
import FormHelper from './pages/FormHelper'
import PDFMerge from './pages/PDFMerge'
import ImageConvert from './pages/ImageConvert'
import ImageResize from './pages/ImageResize'
import PDFSplit from './pages/PDFSplit'
import PDFCompress from './pages/PDFCompress'
import PDFWatermark from './pages/PDFWatermark'
import ImageToPDF from './pages/ImageToPDF'
import PDFRotate from './pages/PDFRotate'
import SignatureGen from './pages/SignatureGen'

// Advanced newly added components
import ImageCropUtility from './pages/ImageCropUtility'
import ImageRotateHelper from './pages/ImageRotateHelper'
import PassportPhotoMaker from './pages/PassportPhotoMaker'
import PDFPageNumberGen from './pages/PDFPageNumberGen'
import SignatureResize from './pages/SignatureResize'
import PhotoSignMerge from './pages/PhotoSignMerge'
import PhotoTextOverlay from './pages/PhotoTextOverlay'

// Additional advanced integrations
import PDFSign from './pages/PDFSign'
import ImageBlur from './pages/ImageBlur'
import PDFOrganize from './pages/PDFOrganize'
import PDFCrop from './pages/PDFCrop'

// Final Advanced Mappings
import ImageUpscale from './pages/ImageUpscale'
import PDFToImage from './pages/PDFToImage'
import PDFUnlock from './pages/PDFUnlock'
import PDFProtect from './pages/PDFProtect'
import PDFEdit from './pages/PDFEdit'
import ImageRemoveBg from './pages/ImageRemoveBg'

const PDF_TOOLS = [
  { name: 'Merge PDF', path: '/pdf/merge' },
  { name: 'Split PDF', path: '/pdf/split' },
  { name: 'Compress PDF', path: '/pdf/compress' },
  { name: 'Rotate PDF', path: '/pdf/rotate' },
  { name: 'Sign PDF', path: '/pdf/sign' },
  { name: 'Organize PDF', path: '/pdf/organize' },
  { name: 'Edit PDF', path: '/pdf/edit' },
  { name: 'Crop PDF', path: '/pdf/crop' },
];

const IMAGE_TOOLS = [
  { name: 'Compress Image', path: '/image/compress' },
  { name: 'Remove Background', path: '/image/remove-bg' },
  { name: 'Resize Image', path: '/image/resize' },
  { name: 'Crop Image', path: '/image/crop' },
  { name: 'Image to PDF', path: '/image/to-pdf' },
  { name: 'Upscale Image', path: '/image/upscale' },
  { name: 'Passport Maker', path: '/image/passport' },
  { name: 'Resize Signature', path: '/image/resize-signature' },
  { name: 'Photo + Sign Merge', path: '/image/photo-sign-merge' },
  { name: 'Photo Text Labeler', path: '/image/photo-text-labeler' },
];

function App() {
  return (
    <div className="min-h-screen bg-gradient-animate flex flex-col text-slate-100">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="bg-indigo-500 p-1.5 rounded-lg group-hover:scale-105 transition-transform">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">File<span className="text-indigo-400">Docs</span></span>
          </Link>
          <nav className="hidden md:flex gap-8 text-sm font-medium h-full">
            {/* PDF Dropdown */}
            <div className="relative group flex items-center h-full">
              <button className="text-slate-300 group-hover:text-white transition-colors flex items-center gap-1 cursor-default">
                PDF Tools <ChevronDown className="w-4 h-4" />
              </button>
              <div className="absolute top-[calc(100%-1px)] left-0 w-48 bg-slate-900 border border-white/10 rounded-b-xl shadow-2xl opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-200 py-2 z-50">
                {PDF_TOOLS.map(tool => (
                  <Link 
                    key={tool.path} 
                    to={tool.path} 
                    className="block px-4 py-2 text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    {tool.name}
                  </Link>
                ))}
              </div>
            </div>

            {/* Image Dropdown */}
            <div className="relative group flex items-center h-full">
              <button className="text-slate-300 group-hover:text-white transition-colors flex items-center gap-1 cursor-default">
                Image Tools <ChevronDown className="w-4 h-4" />
              </button>
              <div className="absolute top-[calc(100%-1px)] left-0 w-48 bg-slate-900 border border-white/10 rounded-b-xl shadow-2xl opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-200 py-2 z-50">
                {IMAGE_TOOLS.map(tool => (
                  <Link 
                    key={tool.path} 
                    to={tool.path} 
                    className="block px-4 py-2 text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    {tool.name}
                  </Link>
                ))}
              </div>
            </div>

            <Link to="/form-helper" className="text-slate-300 hover:text-indigo-400 transition-colors flex items-center gap-1">
              <span className="relative flex h-2 w-2 mr-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
              </span>
              Form Helper
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<Home />} />
          {/* Functional Tools */}
          <Route path="/image/compress" element={<ImageCompressForm />} />
          <Route path="/image/resize" element={<ImageResize />} />
          <Route path="/image/convert" element={<ImageConvert />} />
          <Route path="/image/to-pdf" element={<ImageToPDF />} />
          <Route path="/image/crop" element={<ImageCropUtility />} />
          <Route path="/image/rotate" element={<ImageRotateHelper />} />
          <Route path="/image/passport" element={<PassportPhotoMaker />} />
          <Route path="/image/blur" element={<ImageBlur />} />
          <Route path="/image/upscale" element={<ImageUpscale />} />
          <Route path="/image/remove-bg" element={<ImageRemoveBg />} />
          <Route path="/image/resize-signature" element={<SignatureResize />} />
          <Route path="/image/photo-sign-merge" element={<PhotoSignMerge />} />
          <Route path="/image/photo-text-labeler" element={<PhotoTextOverlay />} />
          
          <Route path="/pdf/merge" element={<PDFMerge />} />
          <Route path="/pdf/split" element={<PDFSplit />} />
          <Route path="/pdf/compress" element={<PDFCompress />} />
          <Route path="/pdf/watermark" element={<PDFWatermark />} />
          <Route path="/pdf/rotate" element={<PDFRotate />} />
          <Route path="/pdf/page-number" element={<PDFPageNumberGen />} />
          <Route path="/pdf/sign" element={<PDFSign />} />
          <Route path="/pdf/organize" element={<PDFOrganize />} />
          <Route path="/pdf/crop" element={<PDFCrop />} />
          <Route path="/pdf/to-image" element={<PDFToImage />} />
          <Route path="/pdf/unlock" element={<PDFUnlock />} />
          <Route path="/pdf/protect" element={<PDFProtect />} />
          <Route path="/pdf/edit" element={<PDFEdit />} />
          
          <Route path="/form-helper" element={<FormHelper />} />
          <Route path="/generate-signature" element={<SignatureGen />} />

          <Route path="*" element={<div className="text-center py-20 text-slate-400">Page Not Found</div>} />
        </Routes>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-black/20 text-slate-400 py-8">
        <div className="container mx-auto px-4 text-center text-sm">
          <p>© 2026 FileDocs. 100% Client-Side Processing for ultimate privacy.</p>
        </div>
      </footer>
    </div>
  )
}

export default App
