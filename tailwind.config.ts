import type { Config } from 'tailwindcss'
import animate from 'tailwindcss-animate'

// Lets opacity modifiers (bg-primary/10, text-profit/80 ...) work with the
// hex CSS variables in globals.css. Without this Tailwind silently drops them.
const v = (name: string) => `color-mix(in srgb, var(${name}) calc(<alpha-value> * 100%), transparent)`

const config: Config = {
    darkMode: ["class"],
    content: [
        './pages/**/*.{ts,tsx}',
        './components/**/*.{ts,tsx}',
        './app/**/*.{ts,tsx}',
        './src/**/*.{ts,tsx}',
    ],
    theme: {
        extend: {
            colors: {
                border: v("--border"),
                input: v("--input"),
                ring: v("--ring"),
                background: v("--background"),
                foreground: v("--foreground"),
                primary: {
                    DEFAULT: v("--primary"),
                    foreground: v("--primary-foreground"),
                },
                secondary: {
                    DEFAULT: v("--secondary"),
                    foreground: v("--secondary-foreground"),
                },
                destructive: {
                    DEFAULT: v("--destructive"),
                    foreground: v("--destructive-foreground"),
                },
                muted: {
                    DEFAULT: v("--muted"),
                    foreground: v("--muted-foreground"),
                },
                accent: {
                    DEFAULT: v("--accent"),
                    foreground: v("--accent-foreground"),
                },
                popover: {
                    DEFAULT: v("--popover"),
                    foreground: v("--popover-foreground"),
                },
                card: {
                    DEFAULT: v("--card"),
                    foreground: v("--card-foreground"),
                },
                sidebar: {
                    DEFAULT: v("--sidebar"),
                    foreground: v("--sidebar-foreground"),
                    primary: v("--sidebar-primary"),
                    'primary-foreground': v("--sidebar-primary-foreground"),
                    accent: v("--sidebar-accent"),
                    'accent-foreground': v("--sidebar-accent-foreground"),
                    border: v("--sidebar-border"),
                    ring: v("--sidebar-ring"),
                },
                lime: {
                    DEFAULT: v("--lime"),
                    glow: v("--lime-glow"),
                },
                surface: {
                    DEFAULT: v("--surface"),
                    hover: v("--surface-hover"),
                },
                glass: v("--glass"),
                brand: {
                    DEFAULT: v("--brand"),
                    soft: v("--brand-soft"),
                },
                profit: v("--profit"),
                loss: v("--loss"),
                warning: v("--warning"),
            },
            borderRadius: {
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
                xl: "calc(var(--radius) + 4px)",
            },
            fontFamily: {
                sans: ['var(--font-sans)'],
                mono: ['var(--font-mono)'],
            },
        },
    },
    plugins: [
        animate,
        require('@tailwindcss/typography')
    ],
}

export default config
