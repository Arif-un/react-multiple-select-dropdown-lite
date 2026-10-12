// @ts-check
import react from '@astrojs/react'
import starlight from '@astrojs/starlight'
import { defineConfig } from 'astro/config'

const repo = 'https://github.com/Arif-un/react-multiple-select-dropdown-lite'

export default defineConfig({
  site: 'https://arif-un.github.io',
  base: '/react-multiple-select-dropdown-lite',
  integrations: [
    starlight({
      title: 'React Multiple Select Dropdown Lite',
      description:
        'Lightweight, accessible multi / single select dropdown for React: searchable, creatable, groupable and themeable with CSS variables.',
      social: [{ icon: 'github', label: 'GitHub', href: repo }],
      editLink: { baseUrl: `${repo}/edit/master/docs/` },
      customCss: ['./src/styles/custom.css'],
      sidebar: [
        { label: 'Getting started', slug: 'getting-started' },
        { label: 'Examples', slug: 'examples' },
        { label: 'API', slug: 'api' },
        { label: 'Styling', slug: 'styling' },
        { label: 'Accessibility', slug: 'accessibility' },
        { label: 'Next.js and SSR', slug: 'ssr' },
        { label: 'Changelog', slug: 'changelog' },
        {
          label: 'npm',
          link: 'https://www.npmjs.com/package/react-multiple-select-dropdown-lite'
        }
      ]
    }),
    react()
  ],
  vite: {
    // the demos use the repo's dist through `link:..`: one React, and let dev serve files from the repo
    resolve: { dedupe: ['react', 'react-dom'] },
    server: { fs: { allow: ['..'] } }
  }
})
