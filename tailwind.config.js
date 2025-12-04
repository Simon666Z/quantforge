/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ['class', '[data-theme="dark"]'], 
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Quicksand"', '"Noto Sans SC"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        // --- 语义化颜色系统 ---
        page: 'var(--bg-page)',
        card: 'var(--bg-card)',
        input: 'var(--bg-input)',
        
        // 文字
        main: 'var(--text-main)',
        muted: 'var(--text-muted)',
        
        // 品牌色
        primary: {
          DEFAULT: 'var(--primary)',
          hover: 'var(--primary-hover)',
          '/10': 'var(--primary-10)', // 注意：加了引号
          '/20': 'var(--primary-20)', // 注意：加了引号
        },
        
        // 功能色
        success: 'var(--success)',
        danger: 'var(--danger)',
        
        // 边框
        border: 'var(--border-color)',
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite', // 补充了这个动画
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        }
      }
    },
  },
  plugins: [],
}