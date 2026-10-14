// Rule-based assistant (no network) and visit-prep text.

// Rule-based assistant: no network, answers from the built-in tables and saved data.
function assistantReply(q) {
  const s = q.toLowerCase();
  if (RED_FLAGS.test(s))
    return "This could be serious. Please call emergency services right now (112 in India, 911 in the US, 999 in the UK) or get to the nearest hospital. Do not wait for a reply from me.";
  for (const k in LAB_TESTS)
    if (s.includes(LAB_TESTS[k][0].toLowerCase()) || new RegExp("\\b" + k + "\\b").test(s)) {
      const l = latestLabs().find((x) => x.k == k);
      return (
        `${LAB_TESTS[k][0]} (usual range ${LAB_TESTS[k][2]}–${LAB_TESTS[k][3]} ${LAB_TESTS[k][1]}).\nIf it is low: ${LAB_TESTS[k][4] || "that is rarely a worry."}\nIf it is high: ${LAB_TESTS[k][5] || "that is rarely a worry."}` +
        (l ? `\n\nYour latest result: ${l.v} ${LAB_TESTS[k][1]} (${flagWord(labFlag(k, l.v)).toLowerCase()}).` : "")
      );
    }
  if (/lab|result|report|test/.test(s)) {
    const l = latestLabs();
    return l.length
      ? "Here is where your latest results stand:\n" +
          l
            .map(
              (x) =>
                `• ${LAB_TESTS[x.k][0]}: ${x.v} ${LAB_TESTS[x.k][1]} – ${flagWord(labFlag(x.k, x.v)).toLowerCase()}`,
            )
            .join("\n") +
          "\n\nYou will find simple explanations and trends under Test results. Please talk to your doctor about anything outside the usual range."
      : "You have not added any test results yet. Add one under Test results and I will explain what it means.";
  }
  if (/medic|pill|dose|tablet|medicine/.test(s)) {
    const d = allDoses();
    return d.length
      ? "Your medicines today:\n" +
          d
            .map(
              (x) =>
                `• ${x.tm} ${x.m.name} ${x.m.dose} – ${isDoseTaken(x.key) ? "taken" : "not yet"}`,
            )
            .join("\n")
      : "You have not added any medicines yet. You can add them under My medicines.";
  }
  if (/appoint|next visit|doctor visit/.test(s)) {
    const n = nextAppointment();
    return n
      ? `Your next visit is ${formatDate(n.dt)} with ${n.doc}. Tap Get ready for this visit under Doctor visits for a handy summary to bring along.`
      : "You do not have any visits booked right now.";
  }
  for (const [r, a] of SYMPTOM_ADVICE)
    if (r.test(s))
      return a + "\n\nTip: note it under How I feel, so you can show your doctor how it changes.";
  return 'Ask me to explain a test (try “what is TSH?”), get tips for everyday symptoms like fever, headache, cough, an upset stomach or tiredness, or hear a summary of your medicines, results and visits. If something feels urgent, please contact a doctor.';
}
function visitPrepText(a) {
  const w = toDateKey(new Date(Date.now() - 14 * 864e5)),
    ab = latestLabs().filter((x) => labFlag(x.k, x.v) != "Normal"),
    e = state.emg;
  return `VISIT PREPARATION\n${formatDate(a.dt)} – ${a.doc}${a.spec ? " (" + a.spec + ")" : ""}\nReason: ${a.why || "–"}\n\nPatient: ${e.name || "–"}, age ${e.age || "–"}\nAllergies: ${e.allergies || "–"}\nConditions: ${e.cond || "–"}\n\nCURRENT MEDICINES\n${state.meds.map((m) => `• ${m.name} ${m.dose} at ${m.times.join(", ")}`).join("\n") || "• none listed"}\n\nSYMPTOMS, LAST 14 DAYS\n${
    state.syms
      .filter((s) => s.d >= w)
      .map((s) => `• ${s.d}: ${s.s} ${s.sev}/10 ${s.n || ""}`)
      .join("\n") || "• none logged"
  }\n\nRECENT VITALS\n${vitalsText()}\n\nOUT-OF-RANGE LABS\n${ab.map((x) => `• ${LAB_TESTS[x.k][0]} ${x.v} ${LAB_TESTS[x.k][1]} (${labFlag(x.k, x.v)})`).join("\n") || "• none"}\n\nQUESTIONS YOU MAY WANT TO ASK\n• What is the most likely cause of my symptoms?\n• Do any of my medicines need a change?\n• Which tests or follow-up do I need, and when?\n• What warning signs should send me back sooner?`;
}
