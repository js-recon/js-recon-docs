import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
    title: "JS Recon",
    tagline: "Reconnaissance tool for JavaScript Apps",
    favicon: "img/favicon.ico",

    // Future flags, see https://docusaurus.io/docs/docs/api/docusaurus-config#future
    future: {
        v4: true, // Improve compatibility with the upcoming Docusaurus v4
    },

    // Set the production url of your site here
    url: "https://js-recon.io",
    // Set the /<baseUrl>/ pathname under which your site is served
    // For GitHub pages deployment, it is often '/<projectName>/'
    baseUrl: "/",

    // GitHub pages deployment config.
    // If you aren't using GitHub pages, you don't need these.
    // organizationName: 'facebook', // Usually your GitHub org/user name.
    // projectName: 'docusaurus', // Usually your repo name.

    onBrokenLinks: "throw",
    onBrokenMarkdownLinks: "warn",

    // Even if you don't use internationalization, you can use this field to set
    // useful metadata like html lang. For example, if your site is Chinese, you
    // may want to replace "en" with "zh-Hans".
    i18n: {
        defaultLocale: "en",
        locales: ["en"],
    },

    presets: [
        [
            "@docusaurus/preset-classic",
            {
                docs: {
                    sidebarPath: "./sidebars.ts",
                    // Please change this to your repo.
                    // Remove this to remove the "edit this page" links.
                    editUrl:
                        "https://github.com/js-recon/js-recon-docs/edit/main/",

                    lastVersion: "1.4.4",
                },
                theme: {
                    customCss: "./src/css/custom.css",
                },
            } satisfies Preset.Options,
        ],
    ],

    themeConfig: {
        // Replace with your project's social card
        image: "img/social-card.jpg",
        navbar: {
            title: "JS Recon",
            logo: {
                alt: "JS Recon Logo",
                src: "img/js-recon-logo.png",
            },
            items: [
                {
                    type: "docSidebar",
                    sidebarId: "docsSidebar",
                    position: "left",
                    label: "Docs",
                },
                {
                    type: "docSidebar",
                    sidebarId: "guidesSidebar",
                    position: "left",
                    label: "Guides",
                },
                {
                    href: "/research",
                    label: "Research",
                },
                {
                    href: "/labs",
                    label: "Labs",
                },
                {
                    href: "/remediation",
                    label: "Remediation",
                },
                {
                    href: "/contributing",
                    label: "Contributing",
                },
                {
                    type: "docsVersionDropdown",
                    position: "right",
                },
            ],
        },
        footer: {
            style: "dark",
            links: [
                {
                    title: "Docs",
                    items: [
                        {
                            label: "Installation",
                            to: "/docs/docs/installation",
                        },
                        {
                            label: "Modules",
                            to: "/docs/category/modules",
                        },
                    ],
                },
                {
                    title: "Tool",
                    items: [
                        {
                            label: "GitHub",
                            href: "https://github.com/js-recon/js-recon",
                        },
                        {
                            label: "npm",
                            href: "https://www.npmjs.com/package/@js-recon/js-recon",
                        },
                        {
                            label: "Docker Hub",
                            href: "https://github.com/js-recon/js-recon/pkgs/container/js-recon",
                        },
                        {
                            label: "GitHub Container Registry",
                            href: "https://github.com/js-recon/js-recon/pkgs/container/js-recon",
                        },
                    ],
                },
                // {
                //   title: 'Community',
                //   items: [
                //     {
                //       label: 'Stack Overflow',
                //       href: 'https://stackoverflow.com/questions/tagged/docusaurus',
                //     },
                //     {
                //       label: 'Discord',
                //       href: 'https://discordapp.com/invite/docusaurus',
                //     },
                //     {
                //       label: 'X',
                //       href: 'https://x.com/docusaurus',
                //     },
                //   ],
                // },
                {
                    title: "More",
                    items: [
                        {
                            label: "Black Hills Information Security",
                            href: "https://www.blackhillsinfosec.com",
                        },
                        {
                            label: "Shriyans Sudhi (@shriyanss/@ss0x00)",
                            href: "https://ss0x00.com",
                        },
                        {
                            label: "This site is open source",
                            href: "https://github.com/js-recon/js-recon-docs",
                        },
                    ],
                },
            ],
            copyright: `Copyright © ${new Date().getFullYear()} Shriyans Sudhi. Built with Docusaurus.`,
        },
        colorMode: {
            defaultMode: "dark",
            disableSwitch: false,
            respectPrefersColorScheme: false,
        },
        prism: {
            theme: prismThemes.dracula,
            darkTheme: prismThemes.dracula,
        },
    } satisfies Preset.ThemeConfig,
};

export default config;
