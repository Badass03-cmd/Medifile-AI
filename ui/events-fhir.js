// Events for review and FHIR actions.

document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-a]");
  if (!b) return;
  const a = b.dataset.a,
    g = (k) => (qs("[data-ab=" + k + "]") || { value: "" }).value.trim();
  if (a == "ext") {
    scanState.res = extractFromText(scanState.text);
    renderApp();
  } else if (a == "sv") saveScanResult();
  else if (a == "dis") {
    scanState.res = null;
    renderApp();
  } else if (a == "abha") {
    const n = g("no").replace(/\D/g, "");
    if (n.length != 14) return showToast(uiText("bad14"));
    if (!/^\d{6}$/.test(g("otp"))) return showToast(uiText("badotp"));
    state.abha = {
      no: n.replace(/(\d\d)(\d{4})(\d{4})(\d{4})/, "$1-$2-$3-$4"),
      addr: g("ad"),
    };
    saveState();
    renderApp();
    showToast(uiText("linked"));
  } else if (a == "unlink") {
    state.abha = {};
    saveState();
    renderApp();
  } else if (a == "fx") {
    const l = document.createElement("a");
    l.href = URL.createObjectURL(
      new Blob([JSON.stringify(buildFhirBundle(), null, 2)], {
        type: "application/fhir+json",
      }),
    );
    l.download = "medifile-ai-fhir-bundle.json";
    l.click();
  } else if (a == "fs") importFhirBundle(SAMPLE_BUNDLE);
});
document.addEventListener("change", (e) => {
  const x = e.target,
    d = x.dataset;
  if ("ocr" in d && x.files[0]) runOcr(x.files[0]);
  else if ("sl" in d) scanState.lang = x.value;
  else if ("fi" in d && x.files[0])
    x.files[0].text().then((j) => {
      try {
        importFhirBundle(JSON.parse(j));
      } catch (_) {
        showToast(uiText("badf"));
      }
    });
  else if (d.c) {
    const [k, i] = d.c.split(".");
    scanState.res[k][i].on = x.checked;
  }
});
document.addEventListener("input", (e) => {
  const d = e.target.dataset;
  if ("tx" in d) scanState.text = e.target.value;
  if (d.e && scanState.res) {
    const k = d.e.split(".");
    let o = scanState.res;
    while (k.length > 1) o = o[k.shift()];
    o[k[0]] = e.target.value;
  }
});
