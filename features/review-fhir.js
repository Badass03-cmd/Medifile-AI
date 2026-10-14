// Record review screen and FHIR (ABDM-style) export / import.

/* --- views --- */
function reviewHtml(r) {
  const ck = (c, i, o) =>
    `<input type="checkbox" style="width:auto" data-c="${c}.${i}" ${o.on ? "checked" : ""} aria-label="Include">`;
  return `<div class="sec"><h3>${uiText("rev")}</h3><form data-f="none" style="margin-bottom:10px"><label>Type<select data-e="type">${["Prescription", "Lab report", "Imaging", "Vaccination", "Discharge summary", "Other"].map((x) => `<option ${x == r.type ? "selected" : ""}>${x}</option>`).join("")}</select></label><label>Date<input type="date" data-e="d" value="${escapeHtml(r.d)}"></label><label>Doctor<input data-e="doc" value="${escapeHtml(r.doc)}"></label></form>
${r.labs.map((x, i) => `<div class="row">${ck("labs", i, x)}<div>${testName(x.k)}</div><input type="number" step="any" data-e="labs.${i}.v" value="${x.v}" style="max-width:110px"><span class="m">${LAB_TESTS[x.k][1]}</span></div>`).join("")}
${r.meds.map((x, i) => `<div class="row">${ck("meds", i, x)}<div><input data-e="meds.${i}.name" value="${escapeHtml(x.name)}" aria-label="Medicine"></div><input data-e="meds.${i}.dose" value="${escapeHtml(x.dose)}" style="max-width:100px" placeholder="Dose"><input data-e="meds.${i}.times" value="${escapeHtml(x.times)}" style="max-width:150px" placeholder="08:00, 20:00"></div>`).join("")}
${r.dx.map((x, i) => `<div class="row">${ck("dx", i, x)}<div><input data-e="dx.${i}.t" value="${escapeHtml(x.t)}" aria-label="Diagnosis"></div></div>`).join("")}
${r.labs.length + r.meds.length + r.dx.length ? "" : `<p class="m">${uiText("none")}</p>`}<p><button class="b" data-a="sv">${uiText("sv")}</button> <button class="g" data-a="dis">Start over</button></p></div>`;
}
Object.assign(views, {
  scan() {
    const sl = ocrLanguage();
    return `<h2>${tabText("scan")}</h2><div class="sec"><label>${uiText("dl")}<select data-sl>${[
      ["eng", "English"],
      ["eng+hin", "English + हिन्दी"],
      ["eng+tel", "English + తెలుగు"],
    ]
      .map(([v, n]) => `<option value="${v}" ${v == sl ? "selected" : ""}>${n}</option>`)
      .join("")}</select></label>
<label style="margin-top:10px">${uiText("pick")}<input type="file" accept="image/*" data-ocr></label><p class="m" id="ocrb" aria-live="polite">${escapeHtml(scanState.busy)}</p>
<label>${uiText("paste")}<textarea rows="6" data-tx>${escapeHtml(scanState.text)}</textarea></label><p><button class="b" data-a="ext">${uiText("ext")}</button></p><p class="m">${uiText("hw")}</p></div>${scanState.res ? reviewHtml(scanState.res) : ""}`;
  },
  tl() {
    const e = state.emg,
      a = state.abha,
      mo = (d) => new Date(d).toLocaleString([], { month: "long", year: "numeric" });
    const ev = [
      ...state.recs.map((x) => ({ d: x.d, k: "Document", t: x.title, m: x.doc })),
      ...state.labs
        .filter((x) => LAB_TESTS[x.k])
        .map((x) => ({
          d: x.d,
          k: "Test result",
          t: `${LAB_TESTS[x.k][0]} ${x.v} ${LAB_TESTS[x.k][1]}`,
          f: labFlag(x.k, x.v),
        })),
      ...state.dx.map((x) => ({ d: x.d, k: "Diagnosis", t: x.t })),
      ...state.meds
        .filter((x) => x.d)
        .map((x) => ({ d: x.d, k: "Medicine", t: `${x.name} ${x.dose}` })),
      ...state.syms.map((x) => ({ d: x.d, k: "Symptom", t: `${x.s} ${x.sev}/10` })),
      ...state.appts.map((x) => ({
        d: x.dt.slice(0, 10),
        k: "Visit",
        t: x.doc + (x.spec ? " (" + x.spec + ")" : ""),
      })),
    ]
      .filter((x) => x.d)
      .sort((x, y) => (x.d < y.d ? 1 : -1));
    let cm = "";
    return `<h2>${tabText("tl")}</h2><div class="sec"><h3>${escapeHtml(e.name) || "–"}</h3><p class="m">${e.age ? escapeHtml(e.age) + " · " : ""}${e.blood ? escapeHtml(e.blood) + " · " : ""}${e.allergies ? "Allergies: " + escapeHtml(e.allergies) + " · " : ""}${a.no ? "ABHA " + escapeHtml(a.no) : "ABHA not connected yet"}</p></div>
<div class="sec"><h3>${uiText("sumh")}</h3><ul>${plainSummary()
      .map((x) => `<li>${escapeHtml(x)}</li>`)
      .join("")}</ul></div>
<div class="sec"><h3>${uiText("tlh")}</h3><input placeholder="Search your timeline" data-q style="margin-bottom:8px">${
      ev.length
        ? ev
            .map((x) => {
              let h = "";
              if (mo(x.d) != cm) {
                cm = mo(x.d);
                h = `<div class="m" style="margin-top:10px"><b>${cm}</b></div>`;
              }
              return (
                h +
                `<div class="row" data-s="${escapeHtml((x.k + x.t + (x.m || "")).toLowerCase())}"><span class="tag" style="flex:0 0 auto">${x.k}</span><div>${escapeHtml(x.t)} ${x.f ? `<span class="tag ${x.f}">${flagWord(x.f)}</span>` : ""}<div class="m">${formatDate(x.d)} ${escapeHtml(x.m || "")}</div></div></div>`
              );
            })
            .join("")
        : emptyNote(uiText("nodata"))
    }</div>`;
  },
  abha() {
    const a = state.abha;
    return `<h2>${tabText("abha")}</h2><div class="sec"><h3>ABHA</h3>${a.no ? `<p><b>${escapeHtml(a.no)}</b> ${a.addr ? "· " + escapeHtml(a.addr) : ""}</p><p class="m">${uiText("mock")}</p><button class="g" data-a="unlink">${uiText("unl")}</button>` : `<div class="chips" style="align-items:end"><label>${uiText("no")}<input data-ab="no" inputmode="numeric" placeholder="12-3456-7890-1234"></label><label>${uiText("ad")}<input data-ab="ad" placeholder="name@abdm"></label><label>${uiText("otp")}<input data-ab="otp" inputmode="numeric" maxlength="6" placeholder="123456"></label><button class="b" data-a="abha">${uiText("lnk")}</button></div><p class="m">${uiText("mock")}</p>`}</div>
<div class="sec"><h3>FHIR</h3><p class="m">${uiText("fh")}</p><button class="b" data-a="fx">${uiText("exp")}</button> <button class="g" data-a="fs">${uiText("smp")}</button> <label class="g" style="display:inline-block;cursor:pointer;margin:0">${uiText("imp")}<input type="file" accept=".json" data-fi style="display:none"></label></div>`;
  },
});

/* --- FHIR (ABDM-style) export / import --- */
const LOINC_CODES = {
    hb: "718-7",
    glu: "1558-6",
    a1c: "4548-4",
    chol: "2093-3",
    ldl: "13457-7",
    hdl: "2085-9",
    tg: "2571-8",
    cr: "2160-0",
    tsh: "3016-3",
    vitd: "1989-3",
    wbc: "6690-2",
    plt: "777-3",
  },
  UCUM_UNITS = { "mIU/L": "m[IU]/L", "×10³/µL": "10*3/uL" };
// Exports saved data as a FHIR R4-style bundle (ABDM-aligned resource types).
function buildFhirBundle() {
  const e = state.emg,
    a = state.abha,
    P = { reference: "Patient/pat-1" },
    en = [],
    ad = (r) => en.push({ resource: r });
  ad({
    resourceType: "Patient",
    id: "pat-1",
    identifier: a.no ? [{ system: "https://healthid.ndhm.gov.in", value: a.no }] : [],
    name: [{ text: e.name || "" }],
  });
  state.labs
    .filter((x) => LAB_TESTS[x.k])
    .forEach((x) =>
      ad({
        resourceType: "Observation",
        id: x.id,
        status: "final",
        category: [
          {
            coding: [
              {
                system: "http://terminology.hl7.org/CodeSystem/observation-category",
                code: "laboratory",
              },
            ],
          },
        ],
        code: {
          coding: [
            {
              system: "http://loinc.org",
              code: LOINC_CODES[x.k],
              display: LAB_TESTS[x.k][0],
            },
          ],
        },
        subject: P,
        effectiveDateTime: x.d,
        valueQuantity: {
          value: x.v,
          unit: LAB_TESTS[x.k][1],
          system: "http://unitsofmeasure.org",
          code: UCUM_UNITS[LAB_TESTS[x.k][1]] || LAB_TESTS[x.k][1],
        },
        interpretation: [
          {
            coding: [
              {
                system: "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation",
                code: { Low: "L", High: "H", Normal: "N" }[labFlag(x.k, x.v)],
              },
            ],
          },
        ],
        referenceRange: [
          { low: { value: LAB_TESTS[x.k][2] }, high: { value: LAB_TESTS[x.k][3] } },
        ],
      }),
    );
  state.dx.forEach((x) =>
    ad({
      resourceType: "Condition",
      id: x.id,
      clinicalStatus: {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/condition-clinical",
            code: "active",
          },
        ],
      },
      code: { text: x.t },
      subject: P,
      recordedDate: x.d,
    }),
  );
  state.meds.forEach((m) =>
    ad({
      resourceType: "MedicationRequest",
      id: m.id,
      status: "active",
      intent: "order",
      medicationCodeableConcept: { text: m.name },
      subject: P,
      authoredOn: m.d,
      dosageInstruction: [
        {
          text: ((m.dose || "") + " " + (m.note || "")).trim(),
          timing: { repeat: { timeOfDay: m.times.map((z) => z + ":00") } },
        },
      ],
    }),
  );
  state.recs.forEach((r) =>
    ad({
      resourceType: "DocumentReference",
      id: r.id,
      status: "current",
      type: { text: r.type },
      subject: P,
      date: r.d,
      description: r.title,
    }),
  );
  return {
    resourceType: "Bundle",
    type: "collection",
    timestamp: new Date().toISOString(),
    entry: en,
  };
}
function importFhirBundle(b) {
  const inv = Object.fromEntries(Object.entries(LOINC_CODES).map(([k, v]) => [v, k])),
    td = toDateKey(new Date());
  let n = 0;
  (b.entry || [])
    .map((x) => x.resource)
    .filter(Boolean)
    .forEach((r) => {
      const ty = r.resourceType,
        cc = r.code || r.medicationCodeableConcept || {};
      if (ty == "Patient") {
        const i = (r.identifier || []).find((i) => /ndhm|abdm/.test(i.system || ""));
        if (i && !state.abha.no) state.abha = { no: i.value, addr: "" };
        const nm = (r.name || [])[0];
        if (nm && !state.emg.name)
          state.emg.name = nm.text || [...(nm.given || []), nm.family || ""].join(" ").trim();
      } else if (ty == "Observation") {
        const c = (cc.coding || []).find((c) => inv[c.code]),
          q = r.valueQuantity;
        if (c && q) {
          state.labs.push({
            id: newId(),
            k: inv[c.code],
            v: +q.value,
            d: (r.effectiveDateTime || td).slice(0, 10),
          });
          n++;
        }
      } else if (ty == "Condition") {
        const x = cc.text || ((cc.coding || [])[0] || {}).display;
        if (x) {
          state.dx.push({ id: newId(), t: x, d: (r.recordedDate || td).slice(0, 10) });
          n++;
        }
      } else if (ty == "MedicationRequest" || ty == "MedicationStatement") {
        const x = cc.text || ((cc.coding || [])[0] || {}).display,
          dz = (r.dosageInstruction || r.dosage || [])[0] || {};
        if (x) {
          state.meds.push({
            id: newId(),
            name: x,
            dose: "",
            note: dz.text || "",
            times: (((dz.timing || {}).repeat || {}).timeOfDay || ["08:00:00"]).map((z) =>
              z.slice(0, 5),
            ),
            d: (r.authoredOn || td).slice(0, 10),
          });
          n++;
        }
      }
    });
  saveState();
  renderApp();
  showToast(n + " items imported");
}
const sampleObservation = (c, v, d) => ({
  resource: {
    resourceType: "Observation",
    code: { coding: [{ system: "http://loinc.org", code: c }] },
    valueQuantity: { value: v },
    effectiveDateTime: d,
  },
});
const SAMPLE_BUNDLE = {
  resourceType: "Bundle",
  type: "collection",
  entry: [
    {
      resource: {
        resourceType: "Patient",
        identifier: [{ system: "https://healthid.ndhm.gov.in", value: "91-1234-5678-9012" }],
        name: [{ text: "Demo Patient" }],
      },
    },
    sampleObservation("718-7", 10.8, "2026-08-10"),
    sampleObservation("4548-4", 6.9, "2026-08-10"),
    {
      resource: {
        resourceType: "Condition",
        code: { text: "Type 2 diabetes" },
        recordedDate: "2026-08-10",
      },
    },
    {
      resource: {
        resourceType: "MedicationRequest",
        medicationCodeableConcept: { text: "Metformin" },
        authoredOn: "2026-08-10",
        dosageInstruction: [
          {
            text: "500 mg after food",
            timing: { repeat: { timeOfDay: ["08:00:00", "20:00:00"] } },
          },
        ],
      },
    },
  ],
};

/* --- events --- */
