import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import type { LinkPreview } from '@seamflow/schemas';

const TIMEOUT_MS = 5000;
const MAX_BYTES = 512 * 1024; // read at most 512KB of HTML
const MAX_HOPS = 4;

/**
 * Fetches Open-Graph metadata for a pasted URL so chat can show a preview card.
 *
 * SSRF is the whole risk here — the URL comes from an untrusted chat participant
 * and the fetch runs from our server, which can see internal hosts a user can't.
 * Defences: http/https only; DNS-resolve and reject private/loopback/link-local/
 * reserved IPs; follow redirects MANUALLY and re-validate the host at every hop;
 * hard timeout; capped read; HTML-only.
 */
@Injectable()
export class LinksService {
  private readonly logger = new Logger(LinksService.name);

  async unfurl(rawUrl: string): Promise<LinkPreview> {
    const url = this.validateUrl(rawUrl);
    const { finalUrl, html } = await this.fetchHtml(url);
    return this.parse(finalUrl, html);
  }

  private validateUrl(raw: string): URL {
    let u: URL;
    try {
      u = new URL(raw);
    } catch {
      throw new BadRequestException('Invalid URL');
    }
    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      throw new BadRequestException('Unsupported protocol');
    }
    return u;
  }

  private async assertPublicHost(hostname: string): Promise<void> {
    let addrs: { address: string }[] = [];
    try {
      addrs = await lookup(hostname, { all: true });
    } catch {
      throw new BadRequestException('Cannot resolve host');
    }
    for (const { address } of addrs) {
      if (this.isPrivate(address)) throw new BadRequestException('Blocked host');
    }
  }

  private isPrivate(ip: string): boolean {
    const v = isIP(ip);
    if (v === 4) {
      const p = ip.split('.').map(Number);
      if (p[0] === 0 || p[0] === 10 || p[0] === 127) return true;
      if (p[0] === 169 && p[1] === 254) return true; // link-local
      if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return true;
      if (p[0] === 192 && p[1] === 168) return true;
      if (p[0] >= 224) return true; // multicast / reserved
      return false;
    }
    if (v === 6) {
      const lc = ip.toLowerCase();
      if (lc === '::1' || lc === '::') return true;
      if (lc.startsWith('fe80') || lc.startsWith('fc') || lc.startsWith('fd')) return true;
      if (lc.startsWith('::ffff:')) return this.isPrivate(lc.slice(7)); // v4-mapped
      return false;
    }
    return true; // unknown family → block
  }

  private async fetchHtml(startUrl: URL): Promise<{ finalUrl: URL; html: string }> {
    let url = startUrl;
    for (let hop = 0; hop < MAX_HOPS; hop++) {
      await this.assertPublicHost(url.hostname);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      try {
        const res = await fetch(url, {
          signal: controller.signal,
          redirect: 'manual',
          headers: {
            'user-agent': 'SeamFlowBot/1.0 (+link-preview)',
            accept: 'text/html,application/xhtml+xml',
          },
        });
        if (res.status >= 300 && res.status < 400) {
          const loc = res.headers.get('location');
          if (!loc) return { finalUrl: url, html: '' };
          url = new URL(loc, url);
          if (url.protocol !== 'http:' && url.protocol !== 'https:') {
            throw new BadRequestException('Unsupported protocol');
          }
          continue; // re-validate + fetch the next hop
        }
        const ct = res.headers.get('content-type') ?? '';
        if (!ct.includes('text/html')) return { finalUrl: url, html: '' };
        return { finalUrl: url, html: await this.readCapped(res) };
      } catch (e) {
        if (e instanceof BadRequestException) throw e;
        this.logger.warn(`unfurl failed for ${url.href}: ${String(e)}`);
        return { finalUrl: url, html: '' };
      } finally {
        clearTimeout(timer);
      }
    }
    return { finalUrl: url, html: '' };
  }

  private async readCapped(res: Response): Promise<string> {
    const reader = res.body?.getReader();
    if (!reader) return '';
    const chunks: Buffer[] = [];
    let received = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        received += value.length;
        chunks.push(Buffer.from(value));
        if (received > MAX_BYTES) {
          void reader.cancel();
          break;
        }
      }
    }
    return Buffer.concat(chunks).toString('utf8');
  }

  private parse(url: URL, html: string): LinkPreview {
    const meta = (prop: string): string | null => {
      const re = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*>`, 'i');
      const tag = html.match(re)?.[0];
      if (!tag) return null;
      const c = tag.match(/content=["']([^"']*)["']/i)?.[1];
      return c ? this.decode(c) : null;
    };
    const titleTag = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1];
    return {
      url: url.href,
      title: meta('og:title') ?? (titleTag ? this.decode(titleTag) : null),
      description: meta('og:description') ?? meta('description'),
      imageUrl: this.absolutize(meta('og:image') ?? meta('twitter:image'), url),
      siteName: meta('og:site_name') ?? url.hostname,
    };
  }

  private absolutize(src: string | null, base: URL): string | null {
    if (!src) return null;
    try {
      const u = new URL(src, base);
      return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : null;
    } catch {
      return null;
    }
  }

  private decode(s: string): string {
    return s
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
  }
}
