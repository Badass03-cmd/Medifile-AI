// Scan / OCR and on-device extraction, plus the plain-language summary.

let scanState = { text: "", res: null, busy: "", lang: "" };
const ocrLanguage = () =>
  scanState.lang || (state.lang == "hi" ? "eng+hin" : state.lang == "te" ? "eng+tel" : "eng");
const TEST_ALIASES = {
  ldl: /\bldl\b/i,
  hdl: /\bhdl\b/i,
  tg: /triglycerides?|\btg\b/i,
  a1c: /hba1c|\ba1c\b|glycosylated|glycated/i,
  chol: /total\s+cholesterol|\bcholesterol\b/i,
  hb: /h(a)?emoglobin|\bhb\b/i,
  glu: /glucose|\bfbs\b|blood sugar/i,
  cr: /creatinine/i,
  tsh: /\btsh\b|thyroid stimulating/i,
  vitd: /vitamin\s*d3?|25.?\(?oh\)?/i,
  wbc: /\bwbc\b|white blood|leu[ck]ocyte/i,
  plt: /platelet|\bplt\b/i,
};
function parseDate(s) {
  let m;
  if ((m = s.match(/\b(\d{4})-(\d{2})-(\d{2})\b/))) return m[0];
  if ((m = s.match(/\b(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4}|\d{2})\b/))) {
    if (+m[2] > 12 || +m[1] > 31) return "";
    return (m[3].length == 2 ? "20" + m[3] : m[3]) + "-" + pad2(m[2]) + "-" + pad2(m[1]);
  }
  if ((m = s.match(/\b(\d{1,2})\s+([A-Za-z]{3})[a-z]*\.?,?\s+(\d{4})\b/))) {
    const i = "janfebmaraprmayjunjulaugsepoctnovdec".indexOf(m[2].toLowerCase());
    if (i >= 0 && i % 3 == 0) return m[3] + "-" + pad2(i / 3 + 1) + "-" + pad2(m[1]);
  }
  return "";
}
function parseFrequency(l) {
  let m = l.match(/\b([01])\s*[-–]\s*([01])\s*[-–]\s*([01])\b/);
  if (m) {
    const a = ["08:00", "14:00", "20:00"];
    return [m[1], m[2], m[3]]
      .map((x, i) => (x == "1" ? a[i] : ""))
      .filter(Boolean)
      .join(", ");
  }
  m = l.match(/\b(od|bd|bid|tds|tid|hs)\b/i);
  return m
    ? {
        od: "08:00",
        bd: "08:00, 20:00",
        bid: "08:00, 20:00",
        tds: "08:00, 14:00, 20:00",
        tid: "08:00, 14:00, 20:00",
        hs: "21:00",
      }[m[1].toLowerCase()]
    : "";
}
// Pulls dates, lab values, medicines and diagnoses out of scanned or pasted text.
function extractFromText(tx) {
  const r = {
      d: parseDate(tx),
      doc: (tx.match(/\bDr\.?\s+[A-Z][A-Za-z.]*(?:\s[A-Z][A-Za-z.]*)?/) || [""])[0],
      labs: [],
      meds: [],
      dx: [],
    },
    seen = {};
  tx.split(/\n+/).forEach((l) => {
    for (const k in TEST_ALIASES) {
      const m = l.match(TEST_ALIASES[k]);
      if (!m || seen[k]) continue;
      const n = l.slice(m.index + m[0].length).match(/\d[\d,]*\.?\d*/);
      if (!n) continue;
      let v = parseFloat(n[0].replace(/,/g, ""));
      if ((k == "wbc" || k == "plt") && v > 1000) v /= 1000;
      seen[k] = 1;
      r.labs.push({ k, v, on: true });
      break;
    }
    const md = l.match(
      /\b(?:tab|tabs|tablet|cap|caps|capsule|syp|syrup|inj|injection)\b\.?\s+([A-Za-z][\w\-]+)/i,
    );
    if (md) {
      const ds = l.match(/(\d+(?:\.\d+)?)\s*(mg|mcg|µg|ml|iu|g)\b/i);
      r.meds.push({
        name: md[1],
        dose: ds ? ds[1] + " " + ds[2].toLowerCase() : "",
        times: parseFrequency(l) || "08:00",
        on: true,
      });
    }
    const dg = l.match(
      /(?:diagnosis|dx|impression|assessment|k\/c\/o|known case of)\s*[:\-]?\s*(.+)/i,
    );
    if (dg)
      dg[1]
        .split(/[,;]|\band\b/i)
        .map((x) => x.trim())
        .filter((x) => x.length > 2 && x.length < 60)
        .forEach((x) => r.dx.push({ t: x, on: true }));
  });
  r.type = /discharge/i.test(tx)
    ? "Discharge summary"
    : r.meds.length
      ? "Prescription"
      : r.labs.length > 1
        ? "Lab report"
        : /x-?ray|\bct\b|\bmri\b|ultrasound|\busg\b|ecg|echo/i.test(tx)
          ? "Imaging"
          : "Other";
  return r;
}
const loadTesseract = () =>
  window.Tesseract
    ? Promise.resolve()
    : new Promise((ok, no) => {
        const s = document.createElement("script");
        s.src = "https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/5.1.1/tesseract.min.js";
        s.onload = ok;
        s.onerror = no;
        document.head.append(s);
      });
async function runOcr(file) {
  scanState.busy = "Getting ready…";
  renderApp();
  try {
    await loadTesseract();
    const r = await Tesseract.recognize(file, ocrLanguage(), {
      logger: (m) => {
        if (m.status == "recognizing text") {
          const b = qs("#ocrb");
          if (b) b.textContent = "Reading your document… " + Math.round(m.progress * 100) + "%";
        }
      },
    });
    scanState.text = r.data.text;
    scanState.res = extractFromText(scanState.text);
  } catch (e) {
    showToast(
      "I could not read that image. The reader needs internet the first time. You can paste the text instead.",
    );
  }
  scanState.busy = "";
  renderApp();
}
function saveScanResult() {
  const r = scanState.res,
    d = r.d || toDateKey(new Date()),
    rid = newId(),
    on = (a) => a.filter((x) => x.on);
  state.recs.push({
    id: rid,
    title: r.type + " " + d,
    type: r.type,
    d,
    doc: r.doc,
    n: "",
    ocr: scanState.text.slice(0, 4000),
  });
  on(r.labs).forEach(
    (x) =>
      isFinite(x.v) &&
      x.v !== "" &&
      state.labs.push({ id: newId(), k: x.k, v: +x.v, d, rid }),
  );
  on(r.meds).forEach((x) => {
    const tm = (String(x.times).match(/\d{1,2}:\d{2}/g) || ["08:00"]).map((z) => {
      const [h, m] = z.split(":");
      return pad2(h) + ":" + m;
    });
    state.meds.push({ id: newId(), name: x.name, dose: x.dose, note: "", times: tm, d, rid });
  });
  on(r.dx).forEach((x) => state.dx.push({ id: newId(), t: x.t, d, rid }));
  scanState = { text: "", res: null, busy: "", lang: scanState.lang };
  state.tab = "tl";
  saveState();
  renderApp();
  showToast("Saved to your health summary");
}

/* --- plain-language summary, in the selected language --- */
// Builds the plain-language summary in the selected language.
function plainSummary() {
  const e = state.emg,
    lt = latestLabs(),
    ab = lt.filter((x) => labFlag(x.k, x.v) != "Normal"),
    since = toDateKey(new Date(Date.now() - 14 * 864e5)),
    recentSymptoms = [...state.syms]
      .filter((x) => x.d >= since)
      .sort((a, b) => (a.d < b.d ? 1 : -1))
      .slice(0, 5),
    next = nextAppointment(),
    o = [];
  const cond = [
    ...new Set(
      [...(e.cond ? e.cond.split(/[,;]/) : []), ...state.dx.map((x) => x.t)]
        .map((x) => x.trim())
        .filter(Boolean),
    ),
  ];
  if (cond.length) o.push(uiText("c") + ": " + cond.join(", "));
  if (e.age) o.push(uiText("age") + ": " + e.age);
  if (e.allergies) o.push(uiText("allergies") + ": " + e.allergies);
  if (state.meds.length)
    o.push(
      uiText("m") +
        ": " +
        state.meds.map((m) => (m.name + " " + (m.dose || "")).trim()).join(", "),
    );
  if (recentSymptoms.length)
    o.push(
      uiText("recent") +
        ": " +
        recentSymptoms
          .map((x) => `${x.s} (${x.sev}/10, ${formatDate(x.d)})`)
          .join("; "),
    );
  if (next)
    o.push(uiText("next") + ": " + formatDate(next.dt) + " with " + next.doc);
  if (lt.length) o.push(uiText("tests") + ": " + lt.length);
  ab.forEach((x) => {
    const lo = labFlag(x.k, x.v) == "Low";
    o.push(
      `${testName(x.k)}: ${x.v} ${LAB_TESTS[x.k][1]} – ${uiText(lo ? "low" : "high")} (${uiText("us")} ${LAB_TESTS[x.k][2]}–${LAB_TESTS[x.k][3]}). ${state.lang == "en" ? LAB_TESTS[x.k][lo ? 4 : 5] : ""}`.trim(),
    );
  });
  if (lt.length && !ab.length) o.push(uiText("allok"));
  if (!o.length) return [uiText("nodata")];
  if (ab.length) o.push(uiText("doc"));
  return o;
}
