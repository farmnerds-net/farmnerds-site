// Everything the Downloads page tracks. To add something, copy an entry and change it.
//
// Every entry links to the maker's own download page. We never host files.
//   id      short name used in the data file and the sidebar box (letters, numbers, dashes)
//   name    what visitors see
//   vendor  who makes it
//   group   which section of the Downloads page it goes in (see GROUPS)
//   page    the maker's download page (the "Get it" button)
//   check   finds the newest version. Returns { version, date?, url? }.
//           `url` (optional) is a better link for this exact version, like release notes.
//           Throw an error if it can't tell; the old version is kept and the error is logged.

export const GROUPS = ['GPU drivers', 'Homelab & servers', 'Media & network', 'Bench tools'];

// We say who we are. If a vendor turns automated checks away, that item just keeps its last version until it's fixed by hand in /admin.
const UA = 'FarmNerdsDownloadChecker/1.0 (+https://farmnerds.net/downloads/)';

async function get(url, { json = false, headers = {} } = {}) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: json ? 'application/json' : 'text/html,*/*', 'Accept-Language': 'en-US,en;q=0.9', ...headers },
    signal: AbortSignal.timeout(20000),
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`${url} answered ${res.status}`);
  return json ? res.json() : res.text();
}

/** Compare versions like 621.14, 9.1-1, 32.0.101.9175. Positive when a is newer. */
export function compareVersions(a = '', b = '') {
  const pa = String(a).match(/\d+/g) || [], pb = String(b).match(/\d+/g) || [];
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (+pa[i] || 0) - (+pb[i] || 0);
    if (d) return d;
  }
  return 0;
}
const newest = (list) => {
  if (!list.length) throw new Error('no version found on the page');
  return [...list].sort((x, y) => compareVersions(y.version ?? y, x.version ?? x))[0];
};
const isoDate = (s) => { const d = new Date(s); return isNaN(d) ? undefined : d.toISOString(); };

/** Latest full release on GitHub (skips betas). */
function github(repo) {
  return async () => {
    const headers = { Accept: 'application/vnd.github+json', ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}) };
    const r = await get(`https://api.github.com/repos/${repo}/releases/latest`, { json: true, headers });
    const version = String(r.tag_name || r.name || '').replace(/^[^\d]*/, '');
    if (!version) throw new Error('release has no version');
    return { version, date: r.published_at, url: r.html_url };
  };
}

/** Newest plain-numbered tag on GitHub, for projects that tag releases without publishing them. */
function githubTag(repo) {
  return async () => {
    const headers = { Accept: 'application/vnd.github+json', ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}) };
    const tags = await get(`https://api.github.com/repos/${repo}/tags?per_page=100`, { json: true, headers });
    return { version: newest(tags.map((t) => t.name).filter((n) => /^v?\d+(\.\d+)+$/.test(n))).replace(/^v/, '') };
  };
}

/** Newest file in a plain "index of" folder listing (or a list of mirrors) that matches `re` (first group = version). */
function listing(urls, re) {
  return async () => {
    let html, lastErr;
    // Try each mirror in turn until one answers.
    for (const url of [].concat(urls)) { try { html = await get(url); break; } catch (e) { lastErr = e; } }
    if (html == null) throw lastErr;
    const found = [];
    for (const m of html.matchAll(new RegExp(re.source, 'g'))) {
      // The file's date is usually on the same line, like 19-Nov-2025 or 2025-11-19.
      const end = html.indexOf('\n', m.index);
      const line = html.slice(m.index, end < 0 ? undefined : end);
      const d = line.match(/(\d{1,2})-([A-Za-z]{3})-(\d{4})|(\d{4}-\d{2}-\d{2})/);
      found.push({ version: m[1], date: d ? isoDate(d[4] || `${d[2]} ${d[1]}, ${d[3]}`) : undefined });
    }
    const best = newest(found);
    return { version: best.version, date: best.date };
  };
}

// NVIDIA's own driver lookup, the same one the nvidia.com download form uses. Asked for an RTX 4090 on Windows 11, Game Ready, WHQL.
async function nvidiaGeforce() {
  const j = await get('https://gfwsl.geforce.com/services_toolkit/services/com/nvidia/services/AjaxDriverService.php?func=DriverManualLookup&psid=127&pfid=995&osID=57&languageCode=1033&isWHQL=1&dch=1&sort1=0&numberOfResults=1', { json: true });
  const d = j?.IDS?.[0]?.downloadInfo;
  if (!d?.Version) throw new Error('NVIDIA lookup returned no driver');
  return { version: d.Version, date: isoDate(String(d.ReleaseDateTime || '').replace(/^[A-Za-z]{3}\s+/, '')), url: d.DetailsURL };
}

async function nvidiaLinux() {
  const txt = await get('https://download.nvidia.com/XFree86/Linux-x86_64/latest.txt');
  const version = txt.trim().split(/\s+/)[0];
  if (!/^\d+\.\d+/.test(version)) throw new Error('unexpected latest.txt');
  return { version };
}

// AMD and Intel may turn automated checks away. If one keeps failing, fix the version by hand in /admin.
async function amdAdrenalin() {
  const html = await get('https://www.amd.com/en/support/download/drivers.html');
  const v = newest([...html.matchAll(/adrenalin-edition-(\d+\.\d+\.\d+)/gi)].map((m) => m[1]));
  return { version: v };
}

async function intelArc() {
  const html = await get('https://www.intel.com/content/www/us/en/download/785597/intel-arc-iris-xe-graphics-windows.html');
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  const at = text.search(/\b32\.0\.101\.\d{4,}/);
  if (at < 0) throw new Error('no 32.0.101.x version on the page');
  const version = text.slice(at).match(/^32\.0\.101\.\d+/)[0];
  const date = text.slice(at, at + 400).match(/\b(\d{1,2}\/\d{1,2}\/\d{4})\b/)?.[1];
  return { version, date: date ? isoDate(date) : undefined };
}

async function trueNas() {
  const html = await get('https://www.truenas.com/download-tn-scale/');
  // Only plain numbers like 25.10.8, so release candidates and betas are skipped.
  return { version: newest([...html.matchAll(/\/(\d+\.\d+(?:\.\d+)*)\/TrueNAS-(?:SCALE-)?\1\.iso/g)].map((m) => m[1])) };
}

async function plex() {
  const j = await get('https://plex.tv/api/downloads/5.json', { json: true });
  const p = j?.computer?.Linux || j?.computer?.Windows;
  if (!p?.version) throw new Error('no Plex version');
  return { version: p.version.split('-')[0], date: p.release_date ? new Date(p.release_date * 1000).toISOString() : undefined };
}

async function tailscale() {
  const j = await get('https://pkgs.tailscale.com/stable/?mode=json', { json: true });
  if (!j?.TarballsVersion) throw new Error('no Tailscale version');
  return { version: j.TarballsVersion, url: 'https://tailscale.com/changelog' };
}

const PROXMOX_ISO = ['https://enterprise.proxmox.com/iso/', 'http://download.proxmox.com/iso/', 'https://download.proxmox.com/iso/'];

export const SOURCES = [
  // GPU drivers
  { id: 'nvidia-geforce', name: 'NVIDIA GeForce Game Ready', vendor: 'NVIDIA', group: 'GPU drivers', note: 'Windows 10/11',
    page: 'https://www.nvidia.com/en-us/geforce/drivers/', check: nvidiaGeforce },
  { id: 'amd-adrenalin', name: 'AMD Software: Adrenalin Edition', vendor: 'AMD', group: 'GPU drivers', note: 'Windows 10/11',
    page: 'https://www.amd.com/en/support/download/drivers.html', check: amdAdrenalin },
  { id: 'intel-arc', name: 'Intel Arc & Iris Xe Graphics', vendor: 'Intel', group: 'GPU drivers', note: 'Windows 10/11',
    page: 'https://www.intel.com/content/www/us/en/download/785597/intel-arc-iris-xe-graphics-windows.html', check: intelArc },
  { id: 'nvidia-linux', name: 'NVIDIA Linux Display Driver', vendor: 'NVIDIA', group: 'GPU drivers', note: 'Linux x86-64',
    page: 'https://www.nvidia.com/en-us/drivers/unix/', check: nvidiaLinux },

  // Homelab & servers
  { id: 'proxmox-ve', name: 'Proxmox VE', vendor: 'Proxmox', group: 'Homelab & servers', note: 'ISO installer',
    page: 'https://www.proxmox.com/en/downloads/proxmox-virtual-environment/iso',
    check: listing(PROXMOX_ISO, /proxmox-ve_(\d+\.\d+-\d+)\.iso/) },
  { id: 'proxmox-backup', name: 'Proxmox Backup Server', vendor: 'Proxmox', group: 'Homelab & servers', note: 'ISO installer',
    page: 'https://www.proxmox.com/en/downloads/proxmox-backup-server/iso',
    check: listing(PROXMOX_ISO, /proxmox-backup-server_(\d+\.\d+-\d+)\.iso/) },
  { id: 'truenas', name: 'TrueNAS Community Edition', vendor: 'iXsystems', group: 'Homelab & servers', note: 'ISO installer',
    page: 'https://www.truenas.com/download-tn-scale/', check: trueNas },
  { id: 'home-assistant-os', name: 'Home Assistant OS', vendor: 'Home Assistant', group: 'Homelab & servers', note: 'Images for Pi, x86, VMs',
    page: 'https://www.home-assistant.io/installation/', check: github('home-assistant/operating-system') },
  { id: 'opnsense', name: 'OPNsense', vendor: 'Deciso', group: 'Homelab & servers', note: 'Firewall and router',
    page: 'https://opnsense.org/download/', check: githubTag('opnsense/core') },
  { id: 'debian', name: 'Debian', vendor: 'Debian Project', group: 'Homelab & servers', note: 'amd64 netinst',
    page: 'https://www.debian.org/distrib/',
    check: listing('https://cdimage.debian.org/debian-cd/current/amd64/iso-cd/', /debian-(\d+\.\d+\.\d+)-amd64-netinst\.iso/) },
  { id: 'docker-engine', name: 'Docker Engine', vendor: 'Docker', group: 'Homelab & servers', note: 'Linux',
    page: 'https://docs.docker.com/engine/install/', check: github('moby/moby') },

  // Media & network
  { id: 'plex', name: 'Plex Media Server', vendor: 'Plex', group: 'Media & network', note: 'Windows, Linux, NAS',
    page: 'https://www.plex.tv/media-server-downloads/', check: plex },
  { id: 'jellyfin', name: 'Jellyfin Server', vendor: 'Jellyfin', group: 'Media & network', note: 'Windows, Linux, Docker',
    page: 'https://jellyfin.org/downloads/server', check: github('jellyfin/jellyfin') },
  { id: 'tailscale', name: 'Tailscale', vendor: 'Tailscale', group: 'Media & network', note: 'All platforms',
    page: 'https://tailscale.com/download', check: tailscale },

  // Bench tools
  { id: 'rufus', name: 'Rufus', vendor: 'Pete Batard', group: 'Bench tools', note: 'Bootable USB maker (Windows)',
    page: 'https://rufus.ie/', check: github('pbatard/rufus') },
  { id: 'ventoy', name: 'Ventoy', vendor: 'Ventoy', group: 'Bench tools', note: 'Multi-ISO boot USB',
    page: 'https://www.ventoy.net/en/download.html', check: github('ventoy/Ventoy') },
  { id: 'rpi-imager', name: 'Raspberry Pi Imager', vendor: 'Raspberry Pi', group: 'Bench tools', note: 'SD card flasher',
    page: 'https://www.raspberrypi.com/software/', check: github('raspberrypi/rpi-imager') },
  { id: 'balena-etcher', name: 'balenaEtcher', vendor: 'Balena', group: 'Bench tools', note: 'USB and SD flasher',
    page: 'https://etcher.balena.io/', check: github('balena-io/etcher') },
  { id: 'memtest86plus', name: 'Memtest86+', vendor: 'Memtest86+', group: 'Bench tools', note: 'Memory tester',
    page: 'https://www.memtest.org/', check: github('memtest86plus/memtest86plus') },
  { id: '7zip', name: '7-Zip', vendor: 'Igor Pavlov', group: 'Bench tools', note: 'File archiver',
    page: 'https://www.7-zip.org/download.html', check: github('ip7z/7zip') },
];
