// Simple synthesizer using Web Audio API to avoid external asset dependencies
// and ensure low-latency response.

let audioCtx: AudioContext | null = null;

const getContext = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
};

export const playCorrectSound = () => {
  try {
    const ctx = getContext();
    if (ctx.state === 'suspended') ctx.resume();

    const now = ctx.currentTime;
    
    // Create a "Magic Chime" sound (Major Triad: C6, E6, G6)
    // Notes: C6 (1046.5Hz), E6 (1318.5Hz), G6 (1568.0Hz)
    const frequencies = [1046.50, 1318.51, 1568.00];

    frequencies.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        // Stagger the notes slightly for an arpeggio effect
        const startTime = now + (i * 0.05);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.type = 'triangle'; // Triangle wave sounds more like a game chime/bell
        osc.frequency.value = freq;
        
        // Envelope
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.15, startTime + 0.02); // Quick attack
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4); // Decay
        
        osc.start(startTime);
        osc.stop(startTime + 0.4);
    });

  } catch (e) {
    console.error("Audio play failed", e);
  }
};

export const playCelebrationSound = () => {
  try {
    const ctx = getContext();
    if (ctx.state === 'suspended') ctx.resume();

    // Play a grand fanfare sequence
    // Low C -> E -> G -> High C -> Hold
    const notes = [
        { freq: 523.25, dur: 0.15 }, // C5
        { freq: 659.25, dur: 0.15 }, // E5
        { freq: 783.99, dur: 0.15 }, // G5
        { freq: 1046.50, dur: 0.8 }  // C6 (Long)
    ];
    
    let startTime = ctx.currentTime;

    notes.forEach((note, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = index === notes.length - 1 ? 'sine' : 'triangle'; 
      osc.frequency.value = note.freq;

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.2, startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + note.dur);

      osc.start(startTime);
      osc.stop(startTime + note.dur);
      
      startTime += 0.12; // Overlap slightly
    });
  } catch (e) {
    console.error("Celebration audio failed", e);
  }
};