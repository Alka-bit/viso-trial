const MAX_LOG_LINES = 5;

export class HUD {
  constructor() {
    this.modeValueEl = document.getElementById('hud-mode-value');
    this.confidenceValueEl = document.getElementById('hud-confidence-value');
    this.confidenceMeterEl = document.getElementById('hud-confidence-meter');
    this.logListEl = document.getElementById('hud-log-list');
    this._logCount = 0;
  }

  setMode(label) {
    if (this.modeValueEl) this.modeValueEl.textContent = label;
  }

  setScanning(isScanning) {
    this.setMode(isScanning ? 'AI SCAN ACTIVE' : 'SURFACE SCAN');
  }

  setConfidence(value) {
    if (this.confidenceValueEl) this.confidenceValueEl.textContent = `${value.toFixed(0)}%`;
    if (this.confidenceMeterEl) this.confidenceMeterEl.style.width = `${value}%`;
  }

  logEntry(text, tone = 'ok') {
    if (!this.logListEl) return;
    const li = document.createElement('li');
    li.innerHTML = `<span class="log-${tone}">›</span> ${text}`;
    this.logListEl.prepend(li);
    this._logCount++;
    while (this.logListEl.children.length > MAX_LOG_LINES) {
      this.logListEl.removeChild(this.logListEl.lastChild);
    }
  }
}
