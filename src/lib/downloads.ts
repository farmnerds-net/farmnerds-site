import data from '../data/downloads.json';
import box from '../data/downloads-box.json';

export type Download = (typeof data.items)[number];
export const GROUPS: string[] = data.groups;
export const DOWNLOADS: Download[] = data.items;
export const BOX = box;

// Dates are shown as the vendor's release day, so they're read in UTC to avoid slipping a day.
export const dlDate = (iso: string) => (iso ? new Date(iso).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' }) : '');
export const dlShort = (iso: string) => (iso ? new Date(iso).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric' }) : '');
// "New" means it came out in the last 7 days. The page re-checks this in the visitor's browser too.
export const NEW_DAYS = 7;
export const isNew = (d: Download) => !!d.date && Date.now() - +new Date(d.date) < NEW_DAYS * 864e5;
export const linkFor = (d: Download) => d.page;
export const boxItems = () => BOX.items.map((id) => DOWNLOADS.find((d) => d.id === id)).filter((d): d is Download => !!d);
