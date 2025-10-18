---
title: Color date picker
location: https://rowan.fyi/made/color-date-picker
image: background.png
description: Quick and dirty entry for the Bad UX World cup where you use the system color picker to select a date.
pubDate: 2025-10-18
---

For the [Bad UX World Cup](https://badux.lol/) I made this quick and dirty entry where you use the system color picker to select a date. Under the hood it's as simple as you might expect. Color is just a number, e.g. `#214365` and the date is just a number, i.e. the number of seconds since 1 January, 1970. So, why not just map one to the other!

The creative choice comes from not being able to map the colour straight to the seconds as as `#ffffff` is 16,777,215 seconds or just over half a year. Since the competition is a date picker, I mapped each color to a day. Of course, a straight color to day mapping would be a tad too bad UX as 16,777,215 seconds is just shy of 45,965 years. Potentially useful if you're [referencing dates from Dune](https://youtu.be/RZ7DkBFjLRI), but less fun for anything within living memory. Instead I just set a window from 1900 to 2100 and loop around in there.

So, click around and see what you can find! How may Blue Mondays and Black Fridays are there? What colour is your birthday? Endless entertainment for the whole family. Let me know on the socials how it looks on your device's date picker.