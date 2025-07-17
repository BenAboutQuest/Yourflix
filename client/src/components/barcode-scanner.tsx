import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Zap, Camera, X } from "lucide-react";

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBarcodeScanned: (barcode: string) => void;
}

export default function BarcodeScannerModal({
  isOpen,
  onClose,
  onBarcodeScanned,
}: BarcodeScannerModalProps) {
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => stopCamera();
  }, [isOpen]);

  const startCamera = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera if available
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setError('Unable to access camera. Please check permissions.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const toggleFlash = async () => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack && 'getCapabilities' in videoTrack) {
        const capabilities = videoTrack.getCapabilities();
        if (capabilities.torch) {
          try {
            await videoTrack.applyConstraints({
              advanced: [{ torch: !isFlashOn }],
            });
            setIsFlashOn(!isFlashOn);
          } catch (err) {
            console.error('Flash toggle error:', err);
          }
        }
      }
    }
  };

  const handleCapture = () => {
    // In a real implementation, this would use a barcode scanning library
    // For now, we'll simulate a successful scan
    const mockBarcode = "123456789012";
    onBarcodeScanned(mockBarcode);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-black text-white border-none p-0 max-w-none w-full h-full">
        <div className="relative w-full h-full flex items-center justify-center">
          {error ? (
            <div className="text-center">
              <div className="text-6xl mb-4 text-gray-500">📷</div>
              <p className="text-xl mb-2">Camera Access Error</p>
              <p className="text-gray-400 mb-6">{error}</p>
              <Button onClick={onClose} variant="outline" className="border-gray-600 text-white">
                Close
              </Button>
            </div>
          ) : (
            <>
              {/* Camera Preview */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* Scanning Frame */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-80 h-80 border-4 border-app-accent rounded-lg relative">
                  {/* Corner Markers */}
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-app-accent"></div>
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-app-accent"></div>
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-app-accent"></div>
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-app-accent"></div>
                  
                  {/* Scanning Line Animation */}
                  <div className="absolute inset-x-0 top-1/2 h-1 bg-app-accent opacity-75 animate-pulse"></div>
                </div>
              </div>

              {/* Controls */}
              <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex items-center space-x-6">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleFlash}
                  className={`bg-white/20 backdrop-blur-sm text-white p-4 rounded-full hover:bg-white/30 ${
                    isFlashOn ? 'bg-app-accent' : ''
                  }`}
                >
                  <Zap className="h-6 w-6" />
                </Button>
                <Button
                  onClick={handleCapture}
                  className="bg-app-accent text-white p-6 rounded-full hover:bg-orange-600"
                >
                  <Camera className="h-8 w-8" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="bg-white/20 backdrop-blur-sm text-white p-4 rounded-full hover:bg-white/30"
                >
                  <X className="h-6 w-6" />
                </Button>
              </div>

              {/* Instructions */}
              <div className="absolute top-8 left-1/2 transform -translate-x-1/2 text-center text-white">
                <h2 className="text-xl font-bold mb-2">Scan Barcode</h2>
                <p className="text-gray-300">Position the barcode within the frame</p>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
