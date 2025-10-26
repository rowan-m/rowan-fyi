"use strict";
document
  .querySelector('input[name="nocache"]')
  .setAttribute("value", Date.now());

const tag = document.createElement("script");
tag.src = "https://www.youtube.com/player_api";
const firstScriptTag = document.getElementsByTagName("script")[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

let player;

function onYouTubeIframeAPIReady() {
  player = new YT.Player("ytplayer", {
    height: "560",
    width: "315",
    videoId: "CAQuoH_fOWM",
    playerVars: {
      autoplay: 1,
      playsinline: 1,
    },
    events: {
      onReady: onPlayerReady,
    },
  });
}

function onPlayerReady(event) {
  event.target.playVideo();
}
