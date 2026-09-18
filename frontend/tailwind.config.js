/** @type {import('tailwindcss').Config} */
// Tailwind v3 — the workspace config uses the v3 JS-config system; v4 will not
// read this file.
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    /* Padding widens at `lg`, where the frame's navigation rail appears and
       the content column stops being the whole screen. It matches the listing
       page's own `lg:p-12`, so every page inside the frame indents alike. */
    container: {
      center: true,
      padding: { DEFAULT: '1.5rem', lg: '3rem' },
      screens: { '2xl': '1400px' },
    },
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        heading: ['var(--font-heading)', 'system-ui', 'sans-serif'],
      },
      colors: {
        /*
         * Harbour navy.
         *
         * The frame paints this across the entire viewport, so the primary has
         * to hold up at full-page scale: deep, and desaturated enough not to
         * tire the eye. Navy is also the conventional ground for property and
         * architecture for a reason — it is cool, so a photograph of a house is
         * the only warm thing on the page and the pictures carry the colour.
         */
        primary: {
          50: '#f3f7fc',
          100: '#e4edf8',
          200: '#c9dbf1',
          300: '#a2c0e4',
          400: '#729cd2',
          500: '#4d79ba',
          600: '#3a5f9c',
          700: '#314e7f',
          800: '#2c4267',
          900: '#293854',
          950: '#172032',
        },
        /*
         * Brass. Bronzed rather than yellow: the price block is a solid slab of
         * this, and a yellower tone at that size reads as a discount sticker
         * rather than the asking price. Still rationed to money and the primary
         * action, so it never competes with the navy for attention.
         */
        secondary: {
          50: '#fdf8ef',
          100: '#f9edd4',
          200: '#f1d7a5',
          300: '#e7bb6e',
          400: '#dca044',
          500: '#c9862c',
          600: '#a96a22',
          700: '#86501f',
          800: '#6d3f1f',
          900: '#5b361d',
          950: '#33190a',
        },
        /*
         * Near-neutral, with only a whisper of blue at the deep end so the
         * darks sit with the navy rather than drifting green.
         *
         * The mid steps are deliberately darker than a stock grey ramp. This
         * scale's 500 is small print — spec labels, captions, breadcrumbs, the
         * agency line under an agent's name — in around forty places, and a
         * lighter one does not clear 4.5:1 on white at that size.
         */
        dark: {
          50: '#f9fafb',
          100: '#f2f4f7',
          200: '#e5e8ed',
          300: '#d0d5de',
          400: '#9aa2b1',
          500: '#6b7383',
          600: '#4c5563',
          700: '#39414e',
          800: '#272d38',
          900: '#1a1f28',
          950: '#0e131d',
        },
      },
      /*
       * Every shadow is cast in the deepest ink of the neutral scale rather
       * than pure black. Black over a navy ground goes flat and slightly
       * violet; this keeps the shade the same family as everything under it.
       */
      boxShadow: {
        card: '0 1px 2px rgba(14, 19, 29, 0.05), 0 4px 12px -2px rgba(14, 19, 29, 0.09)',
        'card-hover': '0 2px 4px rgba(14, 19, 29, 0.07), 0 12px 28px -6px rgba(14, 19, 29, 0.16)',
        /*
         * The app frame and the panels inside it. Trillo's two-shadow system:
         * one deep shadow lifting the whole window off the gradient, one
         * barely-there shadow separating a white panel from the tinted ground
         * it sits on.
         */
        frame: '0 2rem 6rem rgba(14, 19, 29, 0.38)',
        panel: '0 2rem 5rem rgba(14, 19, 29, 0.07)',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        // Trillo's focus pulse, used on the two-face CTA button.
        pulsate: {
          '0%, 100%': { transform: 'scale(1)', boxShadow: 'none' },
          '50%': {
            transform: 'scale(1.05)',
            boxShadow: '0 2rem 4rem rgba(14, 19, 29, 0.3)',
          },
        },
        slideUp: {
          '0%': { transform: 'translateY(16px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        shimmer: 'shimmer 1.6s linear infinite',
        pulsate: 'pulsate 1s infinite',
      },
    },
  },
  plugins: [require('@tailwindcss/forms'), require('@tailwindcss/typography')],
};
