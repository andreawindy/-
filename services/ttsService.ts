// Implements local browser Text-to-Speech (Web Speech API)
// Completely offline, no external API calls.

export const initializeAudio = async () => {
  // Cancel any ongoing speech and trigger voice loading
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    // Chrome loads voices asynchronously, this helps trigger it
    window.speechSynthesis.getVoices();
  }
  return Promise.resolve();
};

export const playText = (text: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!('speechSynthesis' in window)) {
      console.error("Browser does not support speech synthesis");
      resolve(); // Fail gracefully so the game continues
      return;
    }

    // Cancel anything currently playing to prevent overlap
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    // Set language to Simplified Chinese
    utterance.lang = 'zh-CN';
    // Slightly slower rate for children
    utterance.rate = 0.8; 
    // Normal pitch
    utterance.pitch = 1.0;

    // Try to select a Chinese voice
    const voices = window.speechSynthesis.getVoices();
    
    // Strategy: Prefer local service voices if available to ensure offline functionality
    const bestVoice = 
      voices.find(v => v.lang === 'zh-CN' && v.localService) || 
      voices.find(v => v.lang === 'zh-CN') || 
      voices.find(v => v.lang.includes('zh'));

    if (bestVoice) {
      utterance.voice = bestVoice;
    }

    utterance.onend = () => {
      resolve();
    };

    utterance.onerror = (event) => {
      console.warn("TTS Error (might be interrupted):", event);
      resolve(); // Resolve anyway to avoid blocking the game loop
    };

    window.speechSynthesis.speak(utterance);
  });
};