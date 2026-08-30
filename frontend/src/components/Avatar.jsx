import React, { useState } from 'react';

const GRADIENTS = [
  'from-emerald-500 to-teal-600',
  'from-blue-500 to-indigo-600',
  'from-purple-500 to-pink-600',
  'from-amber-500 to-orange-600',
  'from-cyan-500 to-blue-600',
  'from-rose-500 to-red-600',
  'from-teal-500 to-emerald-700',
  'from-violet-600 to-purple-800'
];

export function Avatar({
  src,
  name = 'User',
  className = 'w-10 h-10 rounded-2xl ring-2 ring-emerald-500/40',
  alt = 'Avatar'
}) {
  const [hasError, setHasError] = useState(false);
  const cleanName = (name || 'User').trim();
  const initial = cleanName.charAt(0).toUpperCase() || 'U';

  const charCode = cleanName.charCodeAt(0) || 0;
  const gradient = GRADIENTS[charCode % GRADIENTS.length];

  const defaultAvatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(cleanName)}&background=059669&color=ffffff&bold=true&size=128`;
  const imageSrc = (src && src.startsWith('http')) ? src : defaultAvatarUrl;

  if (hasError) {
    return (
      <div
        className={`flex items-center justify-center font-black text-white bg-gradient-to-tr ${gradient} shadow-md select-none shrink-0 ${className}`}
      >
        <span>{initial}</span>
      </div>
    );
  }

  return (
    <img
      src={imageSrc}
      alt={alt}
      onError={() => setHasError(true)}
      className={`object-cover select-none shrink-0 ${className}`}
    />
  );
}

export default Avatar;
