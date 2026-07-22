// @ts-check
import starlight from '@astrojs/starlight'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'astro/config'

export default defineConfig({
	site: 'https://cyberuni.github.io',
	base: '/gherkin-cli/',
	vite: {
		plugins: [tailwindcss()],
	},
	integrations: [
		starlight({
			title: 'gherkin-cli',
			description:
				'Agent-first Gherkin CLI — parse, validate, and diff .feature files with token-efficient, AXI-conformant output.',
			social: [
				{
					icon: 'github',
					label: 'GitHub',
					href: 'https://github.com/cyberuni/gherkin-cli',
				},
			],
			customCss: ['./src/styles/global.css'],
			sidebar: [
				{
					label: 'Getting Started',
					items: [
						{ label: 'Introduction', slug: 'getting-started/introduction' },
						{ label: 'Installation', slug: 'getting-started/installation' },
					],
				},
				{
					label: 'CLI Reference',
					items: [
						{ label: 'parse', slug: 'cli/parse' },
						{ label: 'validate', slug: 'cli/validate' },
						{ label: 'diff', slug: 'cli/diff' },
					],
				},
				{
					label: 'API Reference',
					items: [
						{ label: 'Overview', slug: 'api/overview' },
						{ label: 'parseFeatures', slug: 'api/parse' },
						{ label: 'validateFeatures', slug: 'api/validate' },
						{ label: 'diffFeatures', slug: 'api/diff' },
					],
				},
				{
					label: 'Concepts',
					items: [
						{ label: 'AXI output contract', slug: 'concepts/axi' },
						{ label: 'TOON format', slug: 'concepts/toon' },
					],
				},
			],
		}),
	],
})
