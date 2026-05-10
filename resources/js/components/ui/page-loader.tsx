'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { PawPrint } from 'lucide-react';

interface PageLoaderProps {
  show: boolean;
}

export function PageLoader({ show }: PageLoaderProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-600 dark:from-emerald-900 dark:via-emerald-800 dark:to-teal-900"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
        >
          {/* Background pulse circles */}
          <motion.div
            className="absolute h-[400px] w-[400px] rounded-full bg-white/5"
            animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.1, 0.3] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute h-[300px] w-[300px] rounded-full bg-white/5"
            animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.05, 0.2] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
          />

          {/* Content */}
          <div className="relative flex flex-col items-center gap-6">
            {/* Animated paw print logo */}
            <motion.div
              className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm shadow-2xl"
              animate={{
                scale: [1, 1.1, 1],
                rotate: [0, -5, 5, 0],
              }}
              transition={{
                scale: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' },
                rotate: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
              }}
            >
              <PawPrint className="h-10 w-10 text-white" />
            </motion.div>

            {/* Loading text with animated dots */}
            <div className="flex items-center gap-1.5">
              <span className="text-xl font-semibold text-white tracking-wide">Cargando</span>
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="inline-block h-2 w-2 rounded-full bg-white/80"
                    animate={{ y: [0, -8, 0] }}
                    transition={{
                      duration: 0.6,
                      repeat: Infinity,
                      delay: i * 0.15,
                      ease: 'easeInOut',
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Subtle progress bar */}
            <div className="w-48 h-1 rounded-full bg-white/20 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-white/80"
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 0.8, ease: 'easeInOut' }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
