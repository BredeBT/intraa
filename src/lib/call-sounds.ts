// Browser-only — always guard with typeof window check before using

class CallSounds {
  startRinging(): () => void {
    if (typeof window === "undefined") return () => undefined;

    const ctx = new AudioContext();
    let interval: ReturnType<typeof setInterval>;

    const playRing = () => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.setValueAtTime(480, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    };

    playRing();
    interval = setInterval(playRing, 3000);

    return () => {
      clearInterval(interval);
      void ctx.close();
    };
  }

  startDialing(): () => void {
    if (typeof window === "undefined") return () => undefined;

    const ctx = new AudioContext();
    let interval: ReturnType<typeof setInterval>;

    const playDial = () => {
      [440, 480].forEach((freq, i) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime + i * 0.05);
        osc.stop(ctx.currentTime + 0.3);
      });
    };

    playDial();
    interval = setInterval(playDial, 4000);

    return () => {
      clearInterval(interval);
      void ctx.close();
    };
  }
}

export const callSounds = new CallSounds();
