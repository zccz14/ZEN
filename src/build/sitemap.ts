import * as path from 'path';
import * as fs from 'fs/promises';
import { CZON_DIST_DIR } from '../paths';
import { writeFile } from '../utils/writeFile';

interface SitemapUrlEntry {
  slug: string;
  langs: Array<{
    lang: string;
    path: string;
  }>;
}

const sitemapUrls: Map<string, SitemapUrlEntry> = new Map();

export const collectUrl = (lang: string, slug: string): void => {
  if (!slug) return;

  let entry = sitemapUrls.get(slug);
  if (!entry) {
    entry = { slug, langs: [] };
    sitemapUrls.set(slug, entry);
  }

  if (!entry.langs.some(l => l.lang === lang)) {
    entry.langs.push({ lang, path: `/${lang}/${slug}.html` });
  }
};

export const collectIndexPage = (lang: string): void => {
  const slug = 'index';
  let entry = sitemapUrls.get(slug);
  if (!entry) {
    entry = { slug, langs: [] };
    sitemapUrls.set(slug, entry);
  }
  if (!entry.langs.some(l => l.lang === lang)) {
    entry.langs.push({ lang, path: `/${lang}/index.html` });
  }
};

export const collectCategoryPage = (lang: string, category: string): void => {
  const slug = `categories_${category}`;
  let entry = sitemapUrls.get(slug);
  if (!entry) {
    entry = { slug, langs: [] };
    sitemapUrls.set(slug, entry);
  }
  if (!entry.langs.some(l => l.lang === lang)) {
    entry.langs.push({ lang, path: `/${lang}/categories_${category}.html` });
  }
};

export const generateSitemap = async (baseUrl: string): Promise<void> => {
  if (sitemapUrls.size === 0) {
    console.warn('⚠️ No URLs collected for sitemap');
    return;
  }

  const baseUrlClean = baseUrl.replace(/\/$/, '');

  let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
`;

  for (const entry of sitemapUrls.values()) {
    sitemap += `  <url>\n`;

    for (const langEntry of entry.langs) {
      const fullUrl = `${baseUrlClean}${langEntry.path}`;
      const fullUrlEncoded = encodeURI(fullUrl);
      if (langEntry.lang === entry.langs[0].lang) {
        sitemap += `    <loc>${fullUrlEncoded}</loc>\n`;
      }
      sitemap += `    <xhtml:link rel="alternate" hreflang="${langEntry.lang}" href="${fullUrlEncoded}"/>\n`;
    }

    sitemap += `  </url>\n`;
  }

  sitemap += `</urlset>`;

  const sitemapPath = path.join(CZON_DIST_DIR, 'sitemap.xml');
  await writeFile(sitemapPath, sitemap);
  console.log(`✅ Generated sitemap.xml with ${sitemapUrls.size} URLs`);
};

export const clearSitemapCollection = (): void => {
  sitemapUrls.clear();
};
