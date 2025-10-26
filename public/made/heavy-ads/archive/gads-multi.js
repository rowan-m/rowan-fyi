"use strict";

// add a timestamp to URLs to prevent caching
const loadedAt = Date.now();
document.querySelectorAll("input.nocache").forEach((e) => {
  e.setAttribute("value", loadedAt);
});

const numAds = 6;
for (let i = 0; i < numAds; i++) {
  // create an iframe for the add
  const frame = document.createElement("iframe");
  const adType = i < numAds / 2 ? "network" : "cpu";
  frame.setAttribute("allow", "autoplay");
  frame.src = "/" + adType + "/adunit.html?n=" + performance.now() + i;
  frame.scrolling = "no";
  document.querySelector("main").appendChild(frame);
}

// Simple reporting mechanism that's just awaiting a postMessage from the ad frame
const unloadMessage = document.createElement("pre");
unloadMessage.textContent =
  "[Reports from ads that trigger an intervention will show here]";
document.querySelector("main").appendChild(unloadMessage);

// Handle incoming messages from the iframes
function handlePostMessage(event) {
  unloadMessage.textContent += "\n" + event.data;
}

window.addEventListener("message", handlePostMessage, false);
