---
title: "6-watt mini PC as a Proxmox node"
description: "Three nodes, fourteen guests, one feed-store power strip. Benchmarks, power draw and what broke."
date: "2026-11-11T18:40:00-06:00"
category: "homelab"
kind: "Homelab"
featured: true
sample: true
approved: true
verdict: "The cheapest good node you can buy"
tested: "Tested for 90 days"
disclosure: "Bought with our own money. No sponsor saw this before it went live."
facts: [{"label": "Price paid", "value": "$159"}, {"label": "CPU", "value": "4 cores / 4 threads"}, {"label": "Idle power", "value": "6.2 W"}, {"label": "Best for", "value": "Always-on services"}]
specs: [{"label": "Processor", "value": "4 cores / 4 threads, 3.4 GHz burst"}, {"label": "Memory", "value": "16 GB DDR5 (1 slot)"}, {"label": "Storage", "value": "500 GB NVMe + 1 × 2.5 in SATA bay"}, {"label": "Network", "value": "2 × 2.5 GbE"}, {"label": "Size", "value": "4.5 × 4.2 × 1.6 in"}]
charts: [{"title": "Multi-core score", "note": "Higher is better · tested unit highlighted", "rows": [{"label": "8-core mini PC", "value": 9840}, {"label": "Used office desktop", "value": 5710}, {"label": "This mini PC", "value": 3050, "highlight": true}, {"label": "Single-board computer", "value": 2160}]}, {"title": "Idle power draw (watts)", "note": "Lower is better · measured at the wall", "rows": [{"label": "Used office desktop", "value": 31}, {"label": "8-core mini PC", "value": 11.2}, {"label": "This mini PC", "value": 6.2, "highlight": true}, {"label": "Single-board computer", "value": 3.4}]}]
pros: ["Sips power, so a small UPS lasts hours", "Two 2.5 GbE ports for a proper cluster network", "Handles five Plex transcodes"]
cons: ["One memory slot caps it at 16 GB", "Fan gets whiny in dust until you clean it"]
breakdown: [{"label":"Farm test","score":9},{"label":"Power and noise","score":9.6},{"label":"Value","score":9.8,"weight":2},{"label":"Expandability","score":6.5}]
---

Every homelab starts with a machine that was already lying around. Ours was a ten-year-old tower pulling 70 watts to run a handful of containers. This little box promises the same work on less power than a porch light.

Text before the first heading becomes the **Introduction** page.

## Farm test

Every `## Heading` you write starts a new page in the review. This one is called "Farm test".

We ran three of these as a Proxmox cluster for 90 days in a barn that swings from 28 to 104 °F.

## Power and noise

Write as many pages as you like. Specs, Benchmarks and Verdict are added after them from the boxes you fill in the editor.
