  // Map the invitation's palette + type onto Tailwind's utility classes.
  tailwind.config = {
    theme: {
      extend: {
        colors: {
          lacquer: { DEFAULT: '#6B1E2A', deep: '#42131C' },
          ivory: { DEFAULT: '#FBF5E9', warm: '#F1E4CF' },
          ink: { DEFAULT: '#2A211B', soft: '#5B4C3F' },
          jade: '#3E5A4C',
          gold: { DEFAULT: '#C9A15A', text: '#93702F', dark: '#E7CE9B' },
        },
        fontFamily: {
          display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
          body: ['"Be Vietnam Pro"', '"Segoe UI"', 'sans-serif'],
        },
      },
    },
  };
