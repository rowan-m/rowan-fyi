---
title: Musaic box
location: https://rowan.fyi/made/musaic-box
image: background.png
description: Experimenting with Chrome's built-in AI APIs and Tone.js to create a vibe-based music box.
pubDate: 2025-11-12
---

_Experimenting with Chrome's built-in AI APIs and Tone.js to create a vibe-based music box._

At the time of writing, Chrome is running an origin trial (which means it's very early, has limited device support, may have issues, etc.) for a suite of [built-in AI APIs](https://developer.chrome.com/docs/ai/get-started). This means you get a local LLM with a variety of interfaces for summarising, translating, writing, rewriting, proofreading, and plain ol' prompting. I wanted to play with the Prompt API as it provides the most flexibility, however I wasn't particulary excited about building another chat interface. It was [Brecht De Ruyte](https://utilitybend.com/)'s post on ["Build a guessing game with the Prompt API"](https://developer.chrome.com/blog/ai-guessing-game) that highlighted the feature to restrict the model's output to a JSON schema that provided the necessary inspiration. Instead of unstructured text, I should be able to get the model to produce any structured data I need.

In this case, that data is a series of notes that I can feed to [Tone.js](https://tonejs.github.io/) to play with a music box-like effect. I've also been experimenting with AI assisted coding tools, in this case primarily [Gemini CLI](https://github.com/google-gemini/gemini-cli), to understand how to make sure I'm not ["holding it wrong"](https://www.wired.com/2010/06/iphone-4-holding-it-wrong/). The sweet spot I've been finding with these tools is where:

- I can fully articulate the output I want,
- I know what the structure of the code should be,
- I **don't know** the detail to get there.

This applies in a few areas of this demo. My music theory is sorely lacking (despite intermittent efforts to learn the piano), so I fully understand that there are ways you can string notes together that clearly flow harmoniously versus just random noise, or that certain notes are more likely to sound happy or sad. However, I **do know** that you can express those notes in [Scientific pitch notation](https://en.wikipedia.org/wiki/Scientific_pitch_notation) and I know the JSON schema that I need to process them. Likewise, I know what a music box should sound like and I understand how Tone.js wires together its synths and effects, but I don't know what combination of synths and effects will produce that sound.

> _"Oh, yes - the modulation enveloped has clearly decayed too much. Let me just drop a Ping Pong delay in here and make the reverb a touch more wet."_  
> _~ [statements dreamed up by the utterly deranged](https://www.instagram.com/p/B_GZCKwD9Qj/)_

Let's get into a bit of the detail then.

## Prompt API

In its early form, the limited device support and one-time model download mean there's an amount of support structure that needs to be wired up to use them. I found [Rowdy Rabouw](https://rowdy.codes/)'s [Gemini Nano test page](https://gemini-nano.nl/) pretty useful here for understanding the lifecycle. Rather nicely you can wrap up both the download step and model creation together in the same call.

```javascript
model = await LanguageModel.create({
  monitor(m) {
    m.addEventListener("downloadprogress", (e) => {
      // e.loaded indicates download progress
  },
  initialPrompts: [{ role: "system", content: SYSTEM_PROMPT }],
  expectedInputs: [{ type: "text", languages: ["en"] }],
  expectedOutputs: [{ type: "text", languages: ["en"] }],
});
```

The [Prompt API docs](https://developer.chrome.com/docs/ai/prompt-api) cover the detail if you're curious to explore the implmentation more. Let's take a peek at what's in the system prompt.

> _You are a clever, playful, and novel music composer who creates original short tunes based on a suggested vibe or mood from the user._  
> _You provide your output as JSON specifying the note in scientific pitch notation, and its duration in seconds._  
> _Look at the example lines to understand the format for individual notes:_  
> _`{ "note": "F4", "duration": ".5" }`_  
> _Plays F in the 4 octave for a half of a second._  
> _`{ "note": "D#1", "duration": "1" }`_  
> _Plays D sharp in the first octave for one second._  
> _`{ "note": "Fb2", "duration": ".25" }`_  
> _Plays F flat in the second octave for a quarter second._  
> _A valid note matches the regular expression `^[A-G][#b]?[2-9]$`_  
> _Start with a letter from "A", "B", "C", "D", "E", "F", or "G". Then an optional "#" for sharp   notes or "b" for flat notes. End with a number from 2-9 for the octave._
> _Your tune should be approximately 20 notes or fewer._  

This is where I've been learning most of the quirks and limitations of getting reliable output from the model; this is still an iterative work in progress. Most of the tweaking comes from getting it to consistently produce a valid note. In earlier iterations is would sometimes precede notes with a ".". Now it will still sometime produce notes like `Aa3` or `Cc5` rather than using only a `#` or `b`. Adding the regular expression format in there did appear to be the most effective option in constraining the format.

However, the best option is just using the schema to strictly type the output. In the initial version notes could be represented using the more flexible format that [Tone.js Time format](https://github.com/tonejs/tone.js/wiki/Time) which allows string like `4n` for a quarter note or `1:2` for 1 bar and 2 quarter notes. However, the model would regularly just output `quarter` or `whole` which is `whole`ly invalid syntax. Restricting `duration` to a float for the number of seconds removed all this risk.

The schema itself is applied as part of each user prompt.
```javascript
const schema = {
  type: "object",
  properties: {
    notes: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        properties: {
          note: { type: "string" },
          duration: { type: "number" },
        },
        required: ["note", "duration"],
      },
    },
  },
};
const result = await model.prompt(
  `Create a melody based on the vibe: ${vibe}`,
  { responseConstraint: { schema } }
);
```

## Tone.js

The end result of the somewhat vibe-coded vibe-playing synth setup looks like this:

```javascript
synth = new Tone.FMSynth({
  harmonicity: 3.5,
  modulationIndex: 15,
  detune: 2400,
  envelope: { attack: 0.001, decay: 1.4, sustain: 0, release: 1.4 },
  modulationEnvelope: { attack: 0.002, decay: 0.8, sustain: 0, release: 0.8 }
}).toDestination();
const eq = new Tone.EQ3({ low: -12, mid: -2, high: 10 }).toDestination();
const delay = new Tone.PingPongDelay("16n", 0.1).toDestination();
delay.wet.value = 0.05;
const reverb = new Tone.Reverb({ decay: 0.6, wet: 0.15 }).toDestination();
synth.chain(eq, delay, reverb);
```

The first step was feeding the Tone.js docs to Gemini CLI. Rather than needing to download it all, I gave it the URLs for a few key pages and the overall API reference. It was also helpful to throw in a link to a [Reddit discussion on creating music box sounds](https://www.reddit.com/r/edmproduction/comments/7l9q61/help_related_to_music_box_kind_of_synth_sounds/) along with a [YouTube video breaking down the effect in the Serum synthesizer app](https://youtu.be/oHOyUnLANUA). My initial request resulted in something that sounded more like steel drums, but it was enough to start refining with additional prompts. For example, the echo sounded like a large room versus a small box. The Ping Pong delay was too strong and needed to be more subtle.

It also acted as a learning tool since I was treating this like a code review. I'd actually look up the parameters it was setting so that I learned that wet / dry reverb is just the amount of reverb in the output, and then I was tweaking things myself. However, getting that initial boost to having _something_ that worked very quickly really made a difference to my motivation to get it working. It's always more fun to iterate on a working base versus endless errors and a blank screen.

## Sharing

Wholly unrelated to AI, I love that the web makes things so easily shareable. However, needing to store user data is a whole step up in terms of both infrastructure and liability. Keep the output short though, say just a series of notes, and you can stuff the whole thing in the URL instead! So, that's what I do to make the individual tunes shareable - just stringify out the JSON to the URL and push it into the history, then read it back on load.

A few of the machine's creations:
- [Grumpy goblins](/made/musaic-box/?vibe=Grumpy+goblins&notes=%5B%7B%22note%22%3A%22Bb3%22%2C%22duration%22%3A1%7D%2C%7B%22note%22%3A%22A3%22%2C%22duration%22%3A0.5%7D%2C%7B%22note%22%3A%22G%233%22%2C%22duration%22%3A0.75%7D%2C%7B%22note%22%3A%22G3%22%2C%22duration%22%3A0.5%7D%2C%7B%22note%22%3A%22F%233%22%2C%22duration%22%3A0.25%7D%2C%7B%22note%22%3A%22F3%22%2C%22duration%22%3A0.25%7D%2C%7B%22note%22%3A%22Eb2%22%2C%22duration%22%3A1%7D%2C%7B%22note%22%3A%22D%232%22%2C%22duration%22%3A0.5%7D%2C%7B%22note%22%3A%22D2%22%2C%22duration%22%3A0.5%7D%2C%7B%22note%22%3A%22C%232%22%2C%22duration%22%3A0.25%7D%2C%7B%22note%22%3A%22C2%22%2C%22duration%22%3A0.25%7D%2C%7B%22note%22%3A%22B1%22%2C%22duration%22%3A1%7D%2C%7B%22note%22%3A%22A1%22%2C%22duration%22%3A1%7D%2C%7B%22note%22%3A%22G%231%22%2C%22duration%22%3A0.5%7D%2C%7B%22note%22%3A%22G1%22%2C%22duration%22%3A0.5%7D%2C%7B%22note%22%3A%22F%231%22%2C%22duration%22%3A0.25%7D%2C%7B%22note%22%3A%22F1%22%2C%22duration%22%3A0.25%7D%2C%7B%22note%22%3A%22Eb1%22%2C%22duration%22%3A0.75%7D%2C%7B%22note%22%3A%22Db1%22%2C%22duration%22%3A1%7D%5D)
- [Lazy cat napping in the sun](/made/musaic-box/?vibe=Lazy+cat+napping+in+the+sun&notes=%5B%7B%22note%22%3A%22C4%22%2C%22duration%22%3A%221%22%7D%2C%7B%22note%22%3A%22E4%22%2C%22duration%22%3A%221%22%7D%2C%7B%22note%22%3A%22G4%22%2C%22duration%22%3A%22.5%22%7D%2C%7B%22note%22%3A%22G4%22%2C%22duration%22%3A%22.5%22%7D%2C%7B%22note%22%3A%22E4%22%2C%22duration%22%3A%221%22%7D%2C%7B%22note%22%3A%22C4%22%2C%22duration%22%3A%221%22%7D%2C%7B%22note%22%3A%22D4%22%2C%22duration%22%3A%22.25%22%7D%2C%7B%22note%22%3A%22F4%22%2C%22duration%22%3A%22.25%22%7D%2C%7B%22note%22%3A%22G4%22%2C%22duration%22%3A%221%22%7D%2C%7B%22note%22%3A%22A4%22%2C%22duration%22%3A%22.5%22%7D%2C%7B%22note%22%3A%22G4%22%2C%22duration%22%3A%22.5%22%7D%2C%7B%22note%22%3A%22E4%22%2C%22duration%22%3A%221%22%7D%2C%7B%22note%22%3A%22C4%22%2C%22duration%22%3A%221%22%7D%2C%7B%22note%22%3A%22C4%22%2C%22duration%22%3A%22.5%22%7D%2C%7B%22note%22%3A%22D4%22%2C%22duration%22%3A%22.5%22%7D%2C%7B%22note%22%3A%22E4%22%2C%22duration%22%3A%221%22%7D%2C%7B%22note%22%3A%22F4%22%2C%22duration%22%3A%22.25%22%7D%2C%7B%22note%22%3A%22G4%22%2C%22duration%22%3A%22.25%22%7D%2C%7B%22note%22%3A%22C4%22%2C%22duration%22%3A%221%22%7D%2C%7B%22note%22%3A%22G3%22%2C%22duration%22%3A%221%22%7D%5D)

## // TODO

This is very much a toy project to learn, but as ever there are a few things I may tweak if the mood takes me:

- Model download can take ages, so I need to let you cancel it.
- Likewise, running the prompt sometimes takes a while, so also needs an escape.
- The URL mirroring can be much cleaner. It works, but the URL is massive with a lot of redundancy. I should clean up the format.
- I'm really not sanitising input too much here. Instead relying on just using `textContent` to avoid traditional injection attacks, but who knows what holes there are in the JSON processing.
- A little visualisation when the notes play would be neat.
- I do want to figure out if there's a path to more reliably valid output from the model or if I'm simply looking for determinism in a non-deterministic system.
- I'm playing with letting Astro render this page versus my normal static approach, which means it's littered with various data elements. I'm not sure how I feel about this. For demos I prefer that you can just view source and see the simplest possible code... so I may move it back.

Code is on [GitHub rowan-fyi](https://github.com/rowan-m/rowan-fyi/blob/main/src/pages/made/musaic-box/index.astro) if you'd like to dig through. PRs are always welcome!