import React from 'react';
import { motion } from 'framer-motion';

const AvatarComponent = ({ gender = 'female', state = 'idle', className = "" }) => {
  const isMale = gender === 'male';

  const animations = {
    idle: {
      y: [0, -10, 0],
      transition: { duration: 3, repeat: Infinity, ease: "easeInOut" }
    },
    studying: {
      scale: [1, 1.02, 1],
      rotate: [-1, 1, -1],
      transition: { duration: 4, repeat: Infinity, ease: "easeInOut" }
    },
    celebrating: {
      y: [0, -20, 0],
      scale: [1, 1.1, 1],
      transition: { duration: 0.5, repeat: 3, ease: "easeOut" }
    }
  };

  return (
    <motion.div
      className={`relative w-48 h-48 flex items-center justify-center ${className}`}
      animate={animations[state]}
    >
      <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-2xl">
        {/* Background Aura */}
        <motion.circle
          cx="100" cy="100" r="80"
          fill="none" stroke="currentColor" strokeWidth="2"
          className="text-indigo-500/20"
          animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 4, repeat: Infinity }}
        />

        {/* Simple Anime Style Avatar SVG */}
        <g className={isMale ? "text-indigo-400" : "text-pink-400"}>
          {/* Hair Background */}
          <path d={isMale ? "M60,80 Q100,20 140,80" : "M50,80 Q100,10 150,80 L160,150 Q100,160 40,150 Z"} fill="currentColor" opacity="0.8" />

          {/* Face */}
          <circle cx="100" cy="100" r="50" fill="#FFE0BD" />

          {/* Hair Front */}
          <path d={isMale ? "M60,80 Q100,40 140,80 Q120,70 100,90 Q80,70 60,80" : "M50,80 Q100,30 150,80 Q130,70 100,100 Q70,70 50,80"} fill="currentColor" />

          {/* Eyes */}
          <g fill="#333">
            <motion.ellipse
              cx="80" cy="105" rx="5" ry={state === 'studying' ? "2" : "6"}
              animate={state === 'idle' ? { ry: [6, 1, 6] } : {}}
              transition={{ duration: 4, repeat: Infinity, times: [0, 0.1, 1] }}
            />
            <motion.ellipse
              cx="120" cy="105" rx="5" ry={state === 'studying' ? "2" : "6"}
              animate={state === 'idle' ? { ry: [6, 1, 6] } : {}}
              transition={{ duration: 4, repeat: Infinity, times: [0, 0.1, 1] }}
            />
          </g>

          {/* Blush */}
          <circle cx="75" cy="120" r="5" fill="#FFB6C1" opacity="0.4" />
          <circle cx="125" cy="120" r="5" fill="#FFB6C1" opacity="0.4" />

          {/* Mouth */}
          <motion.path
            d={state === 'celebrating' ? "M90,130 Q100,145 110,130" : "M95,135 Q100,138 105,135"}
            fill="none" stroke="#333" strokeWidth="2" strokeLinecap="round"
          />

          {/* Body */}
          <path d="M70,148 Q100,160 130,148 L140,190 H60 Z" fill={isMale ? "#4F46E5" : "#DB2777"} />

          {/* Accessory based on state */}
          {state === 'studying' && (
            <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
               <rect x="110" y="140" width="40" height="30" rx="4" fill="#fff" transform="rotate(15, 130, 155)" />
               <path d="M115,150 H145 M115,160 H145" stroke="#ccc" strokeWidth="1" />
            </motion.g>
          )}
        </g>
      </svg>
    </motion.div>
  );
};

export default AvatarComponent;
