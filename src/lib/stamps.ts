// Trust stamps for the Downloads page. JD picks one per download in /admin (Downloads screen).
// Each stamp has its own color AND its own shape, so it still reads for color-blind visitors.
// The editor keeps a copy of these shapes in public/admin/admin.js (STAMPS). Change both together.
import picks from '../data/downloads-stamps.json';

export type StampId = 'approved' | 'tested' | 'pick' | 'caution';
export type Stamp = { id: StampId; label: string; color: string; shape: string; meaning: string; svg: string };

// A seal with 16 scallops, like a wax or rubber stamp.
const seal = (() => {
  const pts: string[] = [];
  for (let i = 0; i < 32; i++) {
    const r = i % 2 ? 10.2 : 11.6, a = (Math.PI * i) / 16 - Math.PI / 2;
    pts.push(`${(12 + r * Math.cos(a)).toFixed(2)},${(12 + r * Math.sin(a)).toFixed(2)}`);
  }
  return pts.join(' ');
})();
const star = (cx: number, cy: number, R: number, r: number) => {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 ? r : R, a = (Math.PI * i) / 5 - Math.PI / 2;
    pts.push(`${(cx + rad * Math.cos(a)).toFixed(2)},${(cy + rad * Math.sin(a)).toFixed(2)}`);
  }
  return pts.join(' ');
};

export const STAMPS: Stamp[] = [
  {
    id: 'approved', label: 'FarmNerds Approved', color: 'Green', shape: 'round seal',
    meaning: 'Our highest trust. We run this ourselves, on our own machines, and would hand it to family without a second thought.',
    svg: `<polygon class="s-fill s-ring" points="${seal}"/><circle class="s-line" cx="12" cy="12" r="7.6"/><path class="s-glyph" d="M8.4 12.3l2.4 2.4 4.8-5"/>`,
  },
  {
    id: 'tested', label: 'Lab Tested', color: 'Blue', shape: 'shield',
    meaning: 'We installed this release on our own homelab gear and it worked as it should. Safe to try.',
    svg: `<path class="s-fill s-ring" d="M12 1.6l9 3.4v6.2c0 5.6-3.8 9.7-9 11.2-5.2-1.5-9-5.6-9-11.2V5z"/><path class="s-glyph" d="M8 8.6h8M8 12h8M8 15.4h8"/>`,
  },
  {
    id: 'pick', label: 'Nerd Pick', color: 'Gold', shape: 'ribbon',
    meaning: 'A favorite of ours. Not essential for everyone, but well made and worth a look.',
    svg: `<path class="s-fill s-ring" d="M8.2 13.2L5.6 22.4l3.4-1.6 1.9 2.8 1.6-8.6zM15.8 13.2l2.6 9.2-3.4-1.6-1.9 2.8-1.6-8.6z"/><circle class="s-fill s-ring" cx="12" cy="9" r="7.4"/><polygon class="s-dot" points="${star(12, 9.3, 4.2, 1.8)}"/>`,
  },
  {
    id: 'caution', label: 'Hold Off', color: 'Orange', shape: 'warning triangle',
    meaning: 'This release has known problems. Read the notes first, or wait for the next version.',
    svg: `<path class="s-fill s-ring" d="M12 2.2l10.4 18.6H1.6z"/><path class="s-glyph" d="M12 8.6v5.6"/><circle class="s-dot" cx="12" cy="17.4" r="1.3"/>`,
  },
];

const byId = new Map(STAMPS.map((s) => [s.id, s]));
const PICKS = picks as Record<string, string>;
/** The stamp JD picked for this download, if any. */
export const stampFor = (downloadId: string) => byId.get(PICKS[downloadId] as StampId);
