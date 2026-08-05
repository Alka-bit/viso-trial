const STATUS_STEPS = [
  'Calibrating optical array…',
  'Compiling PBR shaders…',
  'Building corrugated hull mesh…',
  'Generating HDR environment…',
  'Linking OCR & damage models…'
];

export class LoadingScreen {
  constructor() {
    this.el = document.getElementById('loading-screen');
    this.barEl = document.getElementById('loading-bar-fill');
    this.statusEl = document.getElementById('loading-status');
    this.progress = 0;
    this._stepIndex = 0;
    this._setStatus(STATUS_STEPS[0]);
  }

  _setStatus(text) {
    if (this.statusEl) this.statusEl.textContent = text;
  }

  setProgress(p) {
    this.progress = Math.min(1, p);
    if (this.barEl) this.barEl.style.width = `${this.progress * 100}%`;
    const step = Math.min(STATUS_STEPS.length - 1, Math.floor(this.progress * STATUS_STEPS.length));
    if (step !== this._stepIndex) {
      this._stepIndex = step;
      this._setStatus(STATUS_STEPS[step]);
    }
  }

  finish() {
    this.setProgress(1);
    setTimeout(() => {
      this.el && this.el.classList.add('is-hidden');
    }, 350);
  }
}
