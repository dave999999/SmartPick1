/**
 * useAppleTick Hook
 * Apple-style haptic and sound feedback for carousel interactions
 * Generates programmatic sound using Web Audio API (no audio files needed)
 */

import { useRef, useCallback } from 'react';

export function useAppleTick() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const isInitializedRef = useRef(false);

  // Initialize AudioContext on first user interaction
  const initializeAudio = useCallback(() => {
    if (isInitializedRef.current) return;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioContextRef.current = new AudioContextClass();
        isInitializedRef.current = true;
      }
    } catch (error) {
      console.warn('Failed to initialize AudioContext:', error);
    }
  }, []);

  // Play Apple-style tick sound with haptic feedback
  const playTick = useCallback(() => {
    // Initialize audio context if needed (lazy initialization)
    if (!isInitializedRef.current) {
      initializeAudio();
    }

    // Haptic feedback (5ms light vibration)
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(5);
    }

    // Generate tick sound using Web Audio API
    const audioContext = audioContextRef.current;
    if (!audioContext) return;

    try {
      // Create oscillator for high-pitched tick
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      // Connect oscillator -> gain -> output
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Configure sound profile
      oscillator.frequency.value = 800; // High-pitched tick (800Hz)
      oscillator.type = 'sine'; // Smooth sine wave

      // Envelope: Quick attack and exponential decay
      const now = audioContext.currentTime;
      gainNode.gain.setValueAtTime(0.5, now); // Start at 50% volume
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.03); // Fade to 1% over 30ms

      // Play sound
      oscillator.start(now);
      oscillator.stop(now + 0.03); // Stop after 30ms
    } catch (error) {
      console.warn('Failed to play tick sound:', error);
    }
  }, [initializeAudio]);

  return { playTick, initializeAudio };
}
