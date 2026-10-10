// Beta access request form on Home (#beta). Posts to the app's public-beta-request function,
// which answers every accepted request the same way, so the page never learns or shows whether
// an address asked before. Without scripts, the form stays hidden and the email links remain.
export const BETA_ENDPOINT =
  "https://kdmrabimbnetxhxdhwep.supabase.co/functions/v1/public-beta-request";
export const PLATFORMS = ["ios", "android"];
export const INTENTS = ["solo", "race", "host"];
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const MESSAGES = {
  email: "Enter an email address, for example name@example.com.",
  platform: "Choose iPhone or Android.",
  sending: "Sending your request…",
  error: "Something went wrong. Email support@catchfire.run instead.",
};

const text = (value) => (typeof value === "string" ? value.trim() : "");

/** Field errors for the values a person entered; an empty object means the form can be sent. */
export function validateBetaFields(values) {
  const errors = {};
  const email = text(values.email);
  if (!email || email.length > 254 || !emailPattern.test(email))
    errors.email = MESSAGES.email;
  if (!PLATFORMS.includes(values.platform)) errors.platform = MESSAGES.platform;
  return errors;
}

/** The JSON body for the function. Email is trimmed here; the function also lowercases it.
 * source_path is always "/": the form lives only on Home, and the function accepts nothing else. */
export function buildBetaPayload(values) {
  const city = text(values.city).replace(/\s+/g, " ").slice(0, 80);
  const intent = INTENTS.includes(values.intent) ? values.intent : null;
  return {
    email: text(values.email),
    platform: values.platform,
    city: city || null,
    intent,
    source_path: "/",
    website: text(values.website),
  };
}

/** Sends the request. Resolves true only for the function's 204. */
export async function sendBetaRequest(
  payload,
  fetchImpl = fetch,
  timeoutMs = 15000,
) {
  const controller =
    typeof AbortController === "function" ? new AbortController() : null;
  const timer = controller
    ? setTimeout(() => controller.abort(), timeoutMs)
    : null;
  try {
    const response = await fetchImpl(BETA_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
      credentials: "omit",
      referrerPolicy: "no-referrer",
      signal: controller?.signal,
    });
    return response.status === 204;
  } catch {
    return false;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function readForm(form) {
  const data = new FormData(form);
  return {
    email: data.get("email"),
    platform: data.get("platform"),
    city: data.get("city"),
    intent: data.get("intent"),
    website: data.get("website"),
  };
}

function mount(form) {
  const fallback = document.querySelector("[data-beta-fallback]");
  const done = document.querySelector("[data-beta-done]");
  const status = form.querySelector("[data-beta-status]");
  const submit = form.querySelector('button[type="submit"]');
  const fields = {
    email: {
      input: form.querySelector("#beta-email"),
      error: form.querySelector("#beta-email-error"),
    },
    platform: {
      input: form.querySelector('input[name="platform"]'),
      error: form.querySelector("#beta-platform-error"),
      group: form.querySelector(
        'fieldset[aria-describedby="beta-platform-error"]',
      ),
    },
  };
  form.hidden = false;
  if (fallback) fallback.hidden = true;

  function showErrors(errors) {
    for (const [name, field] of Object.entries(fields)) {
      const message = errors[name];
      field.error.textContent = message || "";
      field.error.hidden = !message;
      const target = field.group || field.input;
      if (message) target.setAttribute("aria-invalid", "true");
      else target.removeAttribute("aria-invalid");
    }
  }
  function setStatus(state, message = "") {
    form.dataset.state = state;
    status.replaceChildren();
    if (state === "error") {
      const link = document.createElement("a");
      link.href =
        "mailto:support@catchfire.run?subject=Catchfire%20beta%20access";
      link.textContent = "support@catchfire.run";
      status.append("Something went wrong. Email ", link, " instead.");
    } else {
      status.textContent = message;
    }
  }

  form.addEventListener("input", () => {
    if (form.dataset.state === "error") setStatus("idle");
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (form.dataset.state === "sending") return;
    const values = readForm(form);
    const errors = validateBetaFields(values);
    showErrors(errors);
    const first = Object.keys(errors)[0];
    if (first) {
      (first === "platform"
        ? fields.platform.input
        : fields.email.input
      ).focus();
      return;
    }
    setStatus("sending", MESSAGES.sending);
    // aria-disabled rather than disabled, so keyboard focus stays on the button.
    submit.setAttribute("aria-disabled", "true");
    submit.textContent = "Sending…";
    const ok = await sendBetaRequest(buildBetaPayload(values));
    submit.removeAttribute("aria-disabled");
    submit.textContent = "Request access";
    if (ok) {
      setStatus("sent");
      form.hidden = true;
      done.hidden = false;
      done.focus();
    } else {
      setStatus("error");
    }
  });
  setStatus("idle");
}

if (typeof document !== "undefined")
  document.querySelectorAll("[data-beta-form]").forEach(mount);
