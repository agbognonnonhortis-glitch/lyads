/** Lyads — Design System v1.0
 *  Charger tokens.css en premier : les rôles (surface, border, ink…) pointent vers les variables CSS,
 *  ce qui rend la bascule [data-theme="dark"] automatique.
 */
export default {
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        primary: {
          50:'#FDF5F1',100:'#FAE8DF',200:'#F4CDBB',300:'#EBAA8D',400:'#DF815B',
          500:'#CE5F35',600:'#B44A26',700:'#94391D',800:'#74301C',900:'#5D2A1B',950:'#33150C',
        },
        sand: {
          50:'#FBF9F6',100:'#F4F1EB',200:'#E8E3D9',300:'#D6CFC2',400:'#A9A196',
          500:'#6E6862',600:'#5C564E',700:'#423D37',800:'#2C2925',900:'#1B1916',950:'#0F0E0C',
        },
        agent: {
          50:'#EDEFFC',200:'#C4CAF5',300:'#8E9BF0',500:'#3B4FD1',700:'#2A3AA3',900:'#1A2470',
        },
        success:'#146B4A', warning:'#8F5F08', error:'#C0311F', info:'#3B4FD1',

        // rôles pilotés par tokens.css — préférer ceux-ci dans les composants
        bg:'var(--ly-bg)',
        surface:'var(--ly-surface)',
        'surface-sunken':'var(--ly-surface-sunken)',
        border:'var(--ly-border)',
        'border-strong':'var(--ly-border-strong)',
        ink:'var(--ly-text)',
        'ink-secondary':'var(--ly-text-secondary)',
        'ink-muted':'var(--ly-text-muted)',
        action:'var(--ly-action)',
      },
      fontFamily: {
        sans: ['Figtree', 'system-ui', 'sans-serif'],
        mono: ['"Space Grotesk"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        caption:  ['12px', { lineHeight:'1.45' }],
        label:    ['13px', { lineHeight:'1.3',  fontWeight:'600' }],
        'body-sm':['14px', { lineHeight:'1.55' }],
        body:     ['16px', { lineHeight:'1.65' }],
        heading:  ['19px', { lineHeight:'1.35', fontWeight:'700' }],
        title:    ['26px', { lineHeight:'1.25', fontWeight:'700' }],
        display:  ['34px', { lineHeight:'1.15', letterSpacing:'-.02em', fontWeight:'800' }],
        'num-sm': ['14px', { lineHeight:'1.4',  fontWeight:'500' }],
        'num-md': ['20px', { lineHeight:'1.3',  fontWeight:'700' }],
        'num-lg': ['30px', { lineHeight:'1',    fontWeight:'700', letterSpacing:'-.03em' }],
        'num-hero':['38px',{ lineHeight:'1',    fontWeight:'700', letterSpacing:'-.03em' }],
      },
      spacing: { touch:'48px' },
      minHeight: { touch:'48px' },
      minWidth: { touch:'48px' },
      maxWidth: { content:'1280px' },
      borderRadius: { sm:'6px', md:'10px', lg:'14px', xl:'20px' },
      boxShadow: {
        e1:'0 1px 2px rgba(45,35,25,.06)',
        e2:'0 2px 8px rgba(45,35,25,.10)',
        e3:'0 8px 24px rgba(45,35,25,.14)',
        'mobile-bar':'0 -2px 8px rgba(45,35,25,.10)',
        focus:'0 0 0 3px var(--ly-focus-ring)',
      },
      transitionTimingFunction: { ly:'cubic-bezier(.16,1,.3,1)' },
      transitionDuration: { fast:'140ms', base:'200ms', slow:'320ms' },
      screens: { sm:'360px', md:'768px', lg:'1024px', xl:'1280px', '2xl':'1600px' },
    },
  },
}
