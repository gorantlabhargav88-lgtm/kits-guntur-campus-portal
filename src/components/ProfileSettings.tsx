import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  db, 
  doc, 
  setDoc,
  OperationType,
  handleFirestoreError
} from '../lib/firebase';
import { UserProfile } from '../types';
import { 
  Camera, 
  Video, 
  VideoOff, 
  User as UserIcon, 
  Save, 
  X, 
  RefreshCw, 
  AlertCircle,
  Check,
  Shield,
  Briefcase,
  Mail,
  Smartphone,
  Trash2
} from 'lucide-react';

interface ProfileSettingsProps {
  user: UserProfile;
  onClose?: () => void;
}

export default function ProfileSettings({ user, onClose }: ProfileSettingsProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(user.photoURL || null);
  const [isSaving, setIsSaving] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [hasCaptured, setHasCaptured] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Stop camera stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stream]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 320, height: 320, facingMode: 'user' },
        audio: false 
      });
      setStream(mediaStream);
      setCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.error('Error starting camera:', err);
      setCameraError(
        'Could not access your camera. Please ensure permissions are granted and no other application is using it.'
      );
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      // Set canvas dimensions to match video stream
      canvas.width = 320;
      canvas.height = 320;
      
      // Draw circular clip/crop or square image
      ctx.drawImage(video, 0, 0, 320, 320);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setPhotoPreview(dataUrl);
      setHasCaptured(true);
      stopCamera();
    }
  };

  const clearPhoto = () => {
    setPhotoPreview(user.photoURL || null);
    setHasCaptured(false);
    stopCamera();
  };

  const deletePhoto = async () => {
    if (!window.confirm('Are you sure you want to delete your current profile photo?')) {
      return;
    }
    setIsSaving(true);
    const userRef = doc(db, 'users', user.id);
    try {
      await setDoc(userRef, { photoURL: '' }, { merge: true });
      setPhotoPreview(null);
      setHasCaptured(false);
      alert('Success: Profile photo removed successfully.');
    } catch (err: any) {
      console.error('Error deleting photo:', err);
      alert('Error: Could not clear profile photo from database.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePhoto = async () => {
    if (!photoPreview) return;
    setIsSaving(true);

    const userRef = doc(db, 'users', user.id);
    try {
      // Save captured photo URL (base64) into the users collection
      await setDoc(userRef, { photoURL: photoPreview }, { merge: true });
      alert('Success: Profile photo saved successfully!');
      setHasCaptured(false);
      if (onClose) onClose();
    } catch (err: any) {
      console.error('Error saving photo:', err);
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.id}`);
      alert('Error: Could not save photo to database.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-6 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <Camera size={18} />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">Camera Profile Settings</h3>
            <p className="text-[10px] text-slate-400">Capture a new profile photo directly using your webcam/device camera.</p>
          </div>
        </div>
        {onClose && (
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl transition cursor-pointer"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        {/* Left Side: Photo Frame & Video Stream */}
        <div className="md:col-span-6 flex flex-col items-center space-y-3">
          <div className="relative w-40 h-40 rounded-full overflow-hidden border-4 border-indigo-150 dark:border-indigo-900/40 bg-slate-100 dark:bg-slate-950 shadow-md flex items-center justify-center">
            {cameraActive ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]" // mirror image
              />
            ) : photoPreview ? (
              <img 
                src={photoPreview} 
                alt="Profile Preview" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="text-slate-400 flex flex-col items-center">
                <UserIcon size={44} className="stroke-[1.2]" />
                <span className="text-[10px] mt-1 uppercase font-mono tracking-wider">No Photo</span>
              </div>
            )}

            {/* Quick Status Pill */}
            {cameraActive && (
              <span className="absolute top-2 right-2 bg-rose-600 text-white text-[8px] px-1.5 py-0.5 rounded-full font-bold animate-pulse uppercase tracking-wider">
                Live
              </span>
            )}
          </div>

          <canvas ref={canvasRef} className="hidden" />

          {/* Image control buttons */}
          <div className="flex gap-2">
            {cameraActive ? (
              <button
                type="button"
                onClick={capturePhoto}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] rounded-lg shadow-sm transition flex items-center gap-1 cursor-pointer"
              >
                <Check size={12} />
                Capture Snapshot
              </button>
            ) : (
              <button
                type="button"
                onClick={startCamera}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-850 dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-white font-bold text-[10px] rounded-lg shadow-sm transition flex items-center gap-1 cursor-pointer"
              >
                <Video size={12} />
                {photoPreview ? 'Retake Photo' : 'Activate Camera'}
              </button>
            )}

            {cameraActive && (
              <button
                type="button"
                onClick={stopCamera}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300 rounded-lg transition cursor-pointer"
              >
                <VideoOff size={12} />
              </button>
            )}

            {!cameraActive && photoPreview && (
              <>
                <button
                  type="button"
                  onClick={clearPhoto}
                  className="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-medium rounded-lg transition cursor-pointer"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={deletePhoto}
                  title="Remove photo from profile"
                  className="p-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 text-rose-600 rounded-lg transition cursor-pointer"
                >
                  <Trash2 size={12} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Right Side: Identity Info & Save Actions */}
        <div className="md:col-span-6 space-y-4">
          <div className="space-y-2">
            <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider font-mono">User Identity Profile</h4>
            <div className="bg-slate-50 dark:bg-slate-950/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-850 space-y-2.5 text-xs">
              <div className="flex items-center gap-2">
                <Shield size={12} className="text-indigo-500 shrink-0" />
                <span className="text-slate-500 dark:text-slate-400 font-medium">Role:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 capitalize">{user.role}</span>
              </div>
              <div className="flex items-center gap-2">
                <Briefcase size={12} className="text-indigo-500 shrink-0" />
                <span className="text-slate-500 dark:text-slate-400 font-medium">Department:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{user.department}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail size={12} className="text-indigo-500 shrink-0" />
                <span className="text-slate-500 dark:text-slate-400 font-medium text-ellipsis overflow-hidden">Email:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{user.email}</span>
              </div>
              {user.rollNumber && (
                <div className="flex items-center gap-2">
                  <Smartphone size={12} className="text-indigo-500 shrink-0" />
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Roll No:</span>
                  <span className="font-bold font-mono text-slate-800 dark:text-slate-200">{user.rollNumber}</span>
                </div>
              )}
            </div>
          </div>

          {/* Errors */}
          {cameraError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 text-rose-700 dark:text-rose-400 text-[10px] rounded-xl flex gap-2 items-start">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>{cameraError}</span>
            </div>
          )}

          {/* Save Action */}
          {hasCaptured && photoPreview && (
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="pt-2"
            >
              <button
                type="button"
                onClick={handleSavePhoto}
                disabled={isSaving}
                className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Saving Photo...</span>
                  </>
                ) : (
                  <>
                    <Save size={14} />
                    <span>Save Photo to Profile</span>
                  </>
                )}
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
