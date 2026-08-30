import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, X, RotateCcw, Send, SwitchCamera, AlertCircle } from 'lucide-react';

export function CameraCaptureModal({ isOpen, onClose, onCaptureAndSend, onCapture }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [facingMode, setFacingMode] = useState('user'); // 'user' (front) | 'environment' (back)
  const [capturedImage, setCapturedImage] = useState(null);
  const [capturedBlob, setCapturedBlob] = useState(null);
  const [cameraError, setCameraError] = useState('');
  const [isSending, setIsSending] = useState(false);

  const startCamera = useCallback(async () => {
    setCameraError('');
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    try {
      const constraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err) {
      console.error('[CameraCapture] Failed to access camera:', err);
      setCameraError('Camera access denied or not available. Please allow camera permissions in your browser.');
    }
  }, [facingMode]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setCapturedImage(null);
      setCapturedBlob(null);
      setIsSending(false);
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  if (!isOpen) return null;

  const handleCapture = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
    setCapturedImage(dataUrl);

    canvas.toBlob((blob) => {
      setCapturedBlob(blob);
    }, 'image/jpeg', 0.88);

    stopCamera();
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setCapturedBlob(null);
    startCamera();
  };

  const handleToggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  const handleSend = async () => {
    if (!capturedBlob || isSending) return;
    setIsSending(true);
    try {
      if (onCaptureAndSend) await onCaptureAndSend(capturedBlob, capturedImage);
      else if (onCapture) await onCapture(capturedBlob, capturedImage);
      onClose();
    } catch (err) {
      console.error('[CameraCapture] Send failed:', err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-between p-4 animate-in fade-in select-none">
      {/* Top Header */}
      <div className="w-full max-w-md flex items-center justify-between z-10 py-2">
        <div className="flex items-center gap-2 text-white font-bold text-sm">
          <Camera className="w-5 h-5 text-pink-400" />
          <span>Camera Photo</span>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-full bg-slate-900/80 text-slate-300 hover:text-white hover:bg-slate-800 transition-all"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Main Viewfinder / Image Preview */}
      <div className="relative w-full max-w-md flex-1 max-h-[75vh] flex items-center justify-center overflow-hidden rounded-3xl bg-slate-950 border border-slate-800 shadow-2xl">
        {cameraError ? (
          <div className="p-6 text-center text-slate-400 space-y-3">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
            <p className="text-xs text-red-300">{cameraError}</p>
            <button
              onClick={startCamera}
              className="px-4 py-2 rounded-xl bg-pink-600 text-white text-xs font-bold"
            >
              Retry Camera
            </button>
          </div>
        ) : capturedImage ? (
          <img
            src={capturedImage}
            alt="Captured photo"
            className="w-full h-full object-cover rounded-3xl"
          />
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover rounded-3xl ${
              facingMode === 'user' ? 'scale-x-[-1]' : ''
            }`}
          />
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {/* Bottom Controls */}
      <div className="w-full max-w-md flex items-center justify-around py-4 z-10">
        {capturedImage ? (
          <>
            {/* Retake Button */}
            <button
              onClick={handleRetake}
              disabled={isSending}
              className="p-3.5 rounded-2xl bg-slate-900 text-slate-300 hover:text-white border border-slate-800 flex items-center gap-2 text-xs font-bold transition-transform active:scale-95"
            >
              <RotateCcw className="w-5 h-5" />
              <span>Retake</span>
            </button>

            {/* Send Captured Photo Button */}
            <button
              onClick={handleSend}
              disabled={isSending}
              className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-pink-600 to-indigo-600 text-white font-black text-xs flex items-center gap-2 shadow-xl shadow-pink-600/40 transition-transform active:scale-95 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{isSending ? 'Sending...' : 'Send Photo 🚀'}</span>
            </button>
          </>
        ) : (
          <>
            {/* Switch Camera Front/Back */}
            <button
              onClick={handleToggleFacingMode}
              className="p-3.5 rounded-full bg-slate-900/90 border border-slate-800 text-slate-300 hover:text-white transition-all active:scale-90"
              title="Flip Camera"
            >
              <SwitchCamera className="w-6 h-6" />
            </button>

            {/* Shutter Button */}
            <button
              onClick={handleCapture}
              disabled={!!cameraError}
              className="w-18 h-18 sm:w-20 sm:h-20 rounded-full bg-white p-1.5 shadow-2xl transition-transform active:scale-90 hover:opacity-95"
              title="Take Photo"
            >
              <div className="w-full h-full rounded-full border-4 border-slate-950 bg-pink-500 hover:bg-pink-400 transition-colors flex items-center justify-center">
                <div className="w-6 h-6 rounded-full bg-white/40 animate-pulse" />
              </div>
            </button>

            {/* Placeholder to balance 3 items */}
            <div className="w-12" />
          </>
        )}
      </div>
    </div>
  );
}
