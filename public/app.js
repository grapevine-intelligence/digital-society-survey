// Wires up the two plots, enforces one-submission-per-respondent, and submits.

const SUBMITTED_KEY = 'waterfutures_submitted';

const labels = { a: 'Survival', b: 'Innovation', c: 'Nature' };

const statusEl = document.getElementById('status');
const submitBtn = document.getElementById('submit-btn');
const readoutPresent = document.getElementById('readout-present');
const readoutFuture = document.getElementById('readout-future');
const counterEl = document.getElementById('counter');

async function refreshCounter() {
  try {
    const res = await fetch('/api/count');
    const data = await res.json();
    counterEl.textContent = `${data.count} responses collected so far.`;
  } catch {
    // Non-critical; leave counter blank if it fails.
  }
}
refreshCounter();

// Stable per-browser respondent id so the same person can't submit twice.
function getRespondentId() {
  let id = localStorage.getItem('waterfutures_id');
  if (!id) {
    id = 'r_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem('waterfutures_id', id);
  }
  return id;
}

function formatReadout(w) {
  return `Survival ${w.survival}% · Innovation ${w.innovation}% · Nature ${w.nature}%`;
}

function refreshSubmitState() {
  const p = present.getWeights();
  const f = future.getWeights();
  submitBtn.disabled = !(p && f);
}

const present = new TernaryPlot(
  document.getElementById('plot-present'),
  labels,
  (w) => {
    readoutPresent.textContent = formatReadout(w);
    refreshSubmitState();
  }
);

const future = new TernaryPlot(
  document.getElementById('plot-future'),
  labels,
  (w) => {
    readoutFuture.textContent = formatReadout(w);
    refreshSubmitState();
  }
);

// If this browser already submitted, lock everything down.
if (localStorage.getItem(SUBMITTED_KEY)) {
  lockAll('You have already submitted a response. Thank you!');
}

function lockAll(message) {
  present.lock();
  future.lock();
  submitBtn.disabled = true;
  submitBtn.textContent = 'Response submitted';
  statusEl.textContent = message;
  statusEl.classList.add('done');
}

submitBtn.addEventListener('click', async () => {
  const p = present.getWeights();
  const f = future.getWeights();
  if (!p || !f) return;

  submitBtn.disabled = true;
  statusEl.textContent = 'Submitting…';

  try {
    const res = await fetch('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        respondentId: getRespondentId(),
        present: p,
        future: f
      })
    });

    const data = await res.json();

    if (res.ok) {
      localStorage.setItem(SUBMITTED_KEY, '1');
      lockAll(`Thank you! Your response was recorded (response #${data.count}).`);
      refreshCounter();
    } else {
      statusEl.textContent = data.error || 'Something went wrong.';
      submitBtn.disabled = false;
    }
  } catch (err) {
    statusEl.textContent = 'Could not reach the server. Please try again.';
    submitBtn.disabled = false;
  }
});
