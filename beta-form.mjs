const endpoint =
  "https://kdmrabimbnetxhxdhwep.supabase.co/functions/v1/public-beta-request";

export function buildBetaPayload(values) {
  const errors = {};
  const rawEmail = typeof values.email === "string" ? values.email : "";
  const email = rawEmail.trim().toLowerCase();
  const city = typeof values.city === "string" ? values.city : "";
  const intent = values.intent || null;
  if (
    rawEmail.length > 254 ||
    !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/.test(
      email,
    ) ||
    email.split("@")[0].length > 64
  )
    errors.email = "Enter a valid email address.";
  if (!["ios", "android"].includes(values.platform))
    errors.platform = "Choose iPhone or Android.";
  if (city.length > 80 || /[\u0000-\u001f\u007f]/.test(city))
    errors.city = "Use a city name of up to 80 characters.";
  if (intent !== null && !["solo", "race", "host"].includes(intent))
    errors.intent = "Choose one of the listed options.";
  return {
    errors,
    payload: Object.keys(errors).length
      ? null
      : {
          email,
          platform: values.platform,
          city: city.trim() || null,
          intent,
          source_path: "/",
          website: typeof values.website === "string" ? values.website : "",
        },
  };
}

export async function sendBetaRequest(payload, fetcher = fetch) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetcher(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
      referrerPolicy: "no-referrer",
      credentials: "omit",
      signal: controller.signal,
    });
    if (response.status !== 204) throw new Error("Beta request unavailable");
  } finally {
    clearTimeout(timeout);
  }
}

export function initBetaForm(form) {
  if (!form || form.dataset.ready) return;
  const fields = form.querySelector(".beta-fields");
  const button = form.querySelector('[type="submit"]');
  const status = form.querySelector("[data-beta-status]");
  let busy = false;
  form.noValidate = true;
  form.dataset.ready = "true";
  form.dataset.state = "idle";
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (busy || form.dataset.state === "sent") return;
    const values = Object.fromEntries(new FormData(form));
    const { payload, errors } = buildBetaPayload(values);
    for (const name of ["email", "platform", "city", "intent"]) {
      form.querySelector(`#beta-${name}-error`).textContent =
        errors[name] || "";
      for (const field of form.querySelectorAll(`[name="${name}"]`))
        field.setAttribute("aria-invalid", String(Boolean(errors[name])));
    }
    if (!payload) {
      status.textContent = "Check the highlighted fields.";
      form.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }
    busy = true;
    fields.disabled = true;
    form.dataset.state = "sending";
    form.setAttribute("aria-busy", "true");
    button.textContent = "Sending…";
    status.textContent = "Sending your request.";
    try {
      await sendBetaRequest(payload);
      form.dataset.state = "sent";
      button.textContent = "Request received";
      status.textContent =
        "Thanks. We will email you the testing instructions.";
      form.reset();
    } catch {
      form.dataset.state = "error";
      button.textContent = "Request access";
      status.replaceChildren(document.createTextNode("Something went wrong. "));
      const fallback = document.createElement("a");
      fallback.href = "mailto:support@catchfire.run";
      fallback.textContent = "Email support@catchfire.run instead.";
      status.append(fallback);
      fields.disabled = false;
    } finally {
      busy = false;
      form.setAttribute("aria-busy", "false");
      status.focus();
    }
  });
  form.hidden = false;
}
