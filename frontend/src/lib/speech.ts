export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

let activeUtterance: SpeechSynthesisUtterance | null = null;

export function speakText(
  text: string,
  options: { rate?: number; onEnd?: () => void; onError?: (err: any) => void } = {}
): boolean {
  if (!isSpeechSupported()) {
    console.warn('[Speech] Web Speech API is not supported in this browser.');
    return false;
  }

  try {
    window.speechSynthesis.cancel(); // stop any active utterance

    const cleanText = text.trim();
    if (!cleanText) return false;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = Math.max(0.5, Math.min(options.rate || 1.0, 2.0));
    utterance.lang = 'en-US';

    utterance.onend = () => {
      activeUtterance = null;
      options.onEnd?.();
    };

    utterance.onerror = (e) => {
      activeUtterance = null;
      console.warn('[Speech] Utterance error:', e);
      options.onError?.(e);
    };

    activeUtterance = utterance;
    window.speechSynthesis.speak(utterance);
    return true;
  } catch (error) {
    console.error('[Speech] Failed to speak:', error);
    return false;
  }
}

export function stopSpeech(): void {
  if (isSpeechSupported()) {
    window.speechSynthesis.cancel();
    activeUtterance = null;
  }
}
