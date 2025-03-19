"use client";
import { useEffect } from "react";

export function useOutputMonitor(
  audioElement: HTMLAudioElement | null,
  setMicMuted: (muted: boolean) => void
) {
  useEffect(() => {
    if (!audioElement) return;

    // Ensure the audio element is playing.
    if (audioElement.paused) {
      console.warn("Audio element is paused. Please ensure it is playing.");
    }

    let cancelled = false;
    let transitionToSilence = false;
    let silenceStartTime: number | null = null;
    const volumeThreshold = 10; // adjust as needed
    const silenceDurationThreshold = 1000; // 1 second

    // Create an audio context and analyser node.
    const audioContext = new AudioContext();
    const source = audioContext.createMediaElementSource(audioElement);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);
    // We don't connect the analyser to the destination to avoid affecting playback.

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const checkOutputVolume = () => {
      if (cancelled) return;
      analyser.getByteTimeDomainData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += Math.abs(dataArray[i] - 128);
      }
      const avg = sum / dataArray.length;
     // console.log("Output avg volume:", avg.toFixed(2));

      if (avg > volumeThreshold) {
        transitionToSilence = false;
        silenceStartTime = null;
      } else {
        if (!transitionToSilence) {
          transitionToSilence = true;
          silenceStartTime = Date.now();
        } else if (Date.now() - (silenceStartTime ?? 0) > silenceDurationThreshold) {
          console.log("Silence detected for 1 second: unmuting microphone.");
          //setMicMuted(false);
          transitionToSilence = false;
          silenceStartTime = null;
        }
      }
      requestAnimationFrame(checkOutputVolume);
    };

    checkOutputVolume();

    return () => {
      cancelled = true;
      audioContext.close();
    };
  }, [audioElement, setMicMuted]);
}