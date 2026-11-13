---
title: "TDarr to the Rescue? Part 1."
description: "Can Tdarr help us save any significant space on our constantly aging media server ?"
date: "2026-11-13T00:44:00.000Z"
category: "homelab"
author: "JD"
featured: false
draft: true
---

# Can Tdarr Make Room on My 172 TB Plex Server? — Part 1

Hey guys. If you already know Tdarr, bear with me while I give everybody else the rough translation.
Tdarr is a transcoding application. **It takes big file, turns it into less big file.** That’s the hope, anyway.
I have a shitload of media taking up a shitload of storage. My Unraid server has **172 TB of capacity, with 123 TB already used**. Before I buy more drives, I want to know how much space I can get back without making the movies and shows we actually watch look worse.

## It started with a Mac mini and a USB drive

I’ve been keeping our media digitally since about 2009. Back then, it was a Mac mini, an external USB drive that might’ve been 1 TB, and Plex for our ripped DVDs and the beginnings of our Blu-ray collection. If you used Plex back then, you might remember how much you could tinker with. Text, wallpapers, categories, fonts. All the things.
After about a year, I decided Plex was my jam and started keeping the whole collection digitally. I also had one of those little Western Digital WD TV media players. It came with a remote and could play videos or show photos from a network share or a USB drive. When we traveled, I’d pack that little box and the drive with our **entire collection** on it. I never cared much for hotel TV.
Then a family friend, who will remain nameless, did something with the drive. Unplugged it, plugged it back in, unplugged it again. I still don’t know exactly what happened. I just know that when I hooked it back up and fired up Plex, I had nothing. Nada. **The entire collection was gone.**
So I went back to ripping discs and rebuilt what I could. Around then, I discovered a Western Digital NAS with two 1 TB drives.
Oooooh. Ahhhh. RAID.
I know. RAID isn’t a backup. But a RAID of a RAID of a RAID of a RAID might be a backup, right?
My setup after that was simple. One copy traveled with us, and one stayed at home on the NAS. I’d sync the two.

## From 1 TB to 172 TB

Fast-forward to today and most of my storage drives are repurposed server drives. A few are just older high-capacity drives I’ve hung onto. I haven’t bought another drive in a while, and lately I’ve stopped adding media altogether. Somewhere along the way, I talked myself into thinking I’d rather have a drive die of old age than run the array harder. That’s apparently what passes for my storage rationale at home.
At work, I follow the usual 3-2-1 backup rule. At home, my media library has outgrown what I can afford to back up. **I’m hoping to recover enough space to free up a drive or two for backups**, even if I can only start with the files I’d hate most to lose.

## Where Tdarr fits in

The **Tdarr Server** manages the library and job queue. **Nodes** run workers that pick up jobs and do the actual processing. The server and a node can run on the same machine, and I can add nodes on other machines to put more GPUs to work.
The settings I choose tell Tdarr which files to leave alone and which to re-encode. The new encode goes into a temporary cache. Depending on how I set up the workflow, it can then replace the original in the library. That last part gets my attention. I’ve already had to rip this collection twice.
I know enough to be dangerous, guys.
*Technical references: [Tdarr workers](https://docs.tdarr.io/docs/nodes/workers/) and [transcode cache](https://docs.tdarr.io/docs/library-setup/transcode-cache/).*

## What I’m starting with

* **19 storage drives** in the Unraid server, with **123 TB used out of 172 TB**.
* **One GPU already in the Unraid server** for Plex. That’s where I’m leaning toward running the Tdarr Server, and I may use that GPU for a local node as well.
* **Five other GPUs** I could put to work on Tdarr nodes.

This is my first go with Tdarr. Part 1 is the starting point. In Part 2, I’ll show which hardware I actually used, what settings I landed on, and what happened to file size, picture quality, and Plex playback.
I’d love to get the settings right the first time. I’d love even more to find out I got them wrong on five files instead of five thousand.
Fingers crossed, my friends.
