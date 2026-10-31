---
title: Modern noise (spooky)
location: https://modern-noise.web.app/?sound=spooky
image: modern-noise-preview.jpg
imageAlt: Modern noise machine interface in Spooky mode with a badge reading "Now with added spooky sounds!"
description: A three-layer spooky soundscape update for the Modern noise machine.
pubDate: 2026-10-31
tags:
  - audio
  - webaudio
  - halloween
---

I built the original [Modern noise](/posts/modern-noise/) machine for April Fool's Day to provide the classic and actually useful white, pink, and brown noise options along with more contemporary accompaniments from day-to-day life such as construction noise, heavy traffic, an ongoing beeping noise, and just endless screaming. With both Halloween and Día de Muertos just around the corner, it felt like a good time to add a new "Spooky" option. I'm also now reflecting the current mode in the URL, which appears to be my favourite form of state management, and means I can directly link to spooky mode too.

## Spooky background ambience

The base layer is a set of eight longer atmospheric tracks - howling graveyard wind, eerie forest drones, creaking strings, and a dramatic organ. The engine runs this stream with `background: true`, scheduling the next random track to start one second before the current clip finishes (`Math.max(1, duration - 1)`) so the backing tracks crossfade continuously with no dead air.

Thank you and credit to the Freesound creators behind the ambience tracks:

- [CadereSounds](https://freesound.org/people/CadereSounds/sounds/222547/)
- [DWOBoyle](https://freesound.org/people/DWOBoyle/sounds/147303/)
- [InspectorJ](https://freesound.org/people/InspectorJ/sounds/402095/)
- [klankbeeld](https://freesound.org/people/klankbeeld/sounds/261399/)
- [mistersherlock](https://freesound.org/people/mistersherlock/sounds/159509/)
- [original_sound](https://freesound.org/people/original_sound/sounds/493545/)
- [szegvari](https://freesound.org/people/szegvari/sounds/617747/)
- [TommasoMotteran](https://freesound.org/people/TommasoMotteran/sounds/851791/)

## Sound effects

The middle layer is a catalogue of 39 shorter foreground effects - creaking doors, footsteps on wooden floors, dragging pipes, ghostly moans, creepy whispers, witch cackles, church bells, owl hoots, crows, and the odd axe chopping wood. Instead of firing blindly every second, this stream waits for the current clip to finish (capped at 8 seconds for longer samples) and then pauses for a random 3 to 6 seconds before picking the next one. That gives each effect enough breathing room to stand out against the wind and drones.

Credit to the Freesound users below for the foreground effects:

- [137SOUNDS](https://freesound.org/people/137SOUNDS/sounds/246487/)
- [acekasbo](https://freesound.org/people/acekasbo/sounds/167087/)
- [AmeAngelofSin](https://freesound.org/people/AmeAngelofSin/sounds/326895/)
- [Aris621](https://freesound.org/people/Aris621/sounds/478145/)
- [Bikkit99](https://freesound.org/people/Bikkit99/sounds/837802/)
- [Billy_Storm](https://freesound.org/people/Billy_Storm/sounds/164285/)
- [BrainClaim](https://freesound.org/people/BrainClaim/sounds/267179/)
- [BrandNewHexagon](https://freesound.org/people/BrandNewHexagon/sounds/679003/)
- [CheatinSloth](https://freesound.org/people/CheatinSloth/sounds/738784/)
- [CosmicEmbers](https://freesound.org/people/CosmicEmbers/sounds/160689/)
- [DamTheGreat](https://freesound.org/people/DamTheGreat/sounds/813124/)
- [ddarkerthanblackk](https://freesound.org/people/ddarkerthanblackk/sounds/266359/)
- [dheming](https://freesound.org/people/dheming/sounds/177782/)
- [felix.blume](https://freesound.org/people/felix.blume/sounds/413911/)
- [freemaster2](https://freesound.org/people/freemaster2/sounds/385097/)
- [GabrielaUPF](https://freesound.org/people/GabrielaUPF/sounds/220302/)
- [Gerent](https://freesound.org/people/Gerent/sounds/558398/)
- [HowardV](https://freesound.org/people/HowardV/sounds/393801/)
- [ingudios](https://freesound.org/people/ingudios/sounds/119468/)
- [JuliusMabe](https://freesound.org/people/JuliusMabe/sounds/445196/)
- [junkyard_001](https://freesound.org/people/junkyard_001/sounds/575806/)
- [klankbeeld](https://freesound.org/people/klankbeeld/sounds/240701/)
- [komit.wav](https://freesound.org/people/komit.wav/sounds/513928/)
- [lreeve](https://freesound.org/people/lreeve/sounds/874897/)
- [MaxDemianAGL](https://freesound.org/people/MaxDemianAGL/sounds/132251/)
- [Mish7913](https://freesound.org/people/Mish7913/sounds/741366/)
- [mokasza](https://freesound.org/people/mokasza/sounds/810171/)
- [Nanakisan](https://freesound.org/people/Nanakisan/sounds/253534/)
- [noahpardo](https://freesound.org/people/noahpardo/sounds/345733/)
- [Reitanna](https://freesound.org/people/Reitanna/sounds/242634/)
- [Rudmer_Rotteveel](https://freesound.org/people/Rudmer_Rotteveel/sounds/590950/)
- [SamsCollegeAccount](https://freesound.org/people/SamsCollegeAccount/sounds/722984/)
- [SnowblindSoundDepot](https://freesound.org/people/SnowblindSoundDepot/sounds/464245/)
- [SnowFightStudios](https://freesound.org/people/SnowFightStudios/sounds/643741/)
- [StarLion365](https://freesound.org/people/StarLion365/sounds/792795/)
- [theartisticfellow](https://freesound.org/people/theartisticfellow/sounds/132072/)
- [Ultima_cj0628](https://freesound.org/people/Ultima_cj0628/sounds/487405/)
- [xkeril](https://freesound.org/people/xkeril/sounds/753925/)
- [ZHRØ](https://freesound.org/people/ZHR%C3%98/sounds/528447/)

## Random screams

To stop you getting too comfortable, the top layer reuses the 22 clips from the [original `Screaming` mode](/posts/modern-noise/#screams) on a much longer 50 to 70 second timer. Rather than pre-fetching and decoding all 22 scream files up front when you hit play, `startPeriodicClipStream()` just sets the timer and fetches a single random scream on demand when it fires - just infrequent enough that you've forgotten about it by the time the Wilhelm scream goes off.
