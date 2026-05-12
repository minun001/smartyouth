import type { Config } from 'tailwindcss';
import forms from '@tailwindcss/forms';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        smarty: {
          green: '#22c55e',
          lime: '#84cc16',
          yellow: '#facc15',
          orange: '#f97316',
          red: '#ef4444',
          gray: '#64748b',
          dark: '#0f172a',
          bg: '#f8fafc'
        }
      },
      boxShadow: {
        soft: '0 10px 30px rgba(15, 23, 42, 0.08)'
      }
    }
  },
  plugins: [forms]
};

export default config;
