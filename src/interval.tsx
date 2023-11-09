export class IntervalWithPause {
  func: () => void;
  interval_id: number;
  handle_visibility_change: () => void;
  constructor(func: () => void, time_ms: number) {
    this.func = func;
    this.interval_id = setInterval(func, time_ms);
    this.handle_visibility_change = () => {
      if (document.hidden) {
        clearInterval(this.interval_id);
      } else {
        this.interval_id = setInterval(func, time_ms);
      }
    };

    document.addEventListener(
      "visibilitychange",
      this.handle_visibility_change
    );
  }

  clear() {
    clearInterval(this.interval_id);
    document.removeEventListener(
      "visibilitychange",
      this.handle_visibility_change
    );
  }
}
