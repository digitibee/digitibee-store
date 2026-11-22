
/* DIGITIBEE - PERMINTAAN KONFIRMASI WA */
(function () {
  "use strict";

  const $ = id => document.getElementById(id);

  function element(tag, value) {
    const el = document.createElement(tag);
    el.textContent = String(value ?? "");
    return el;
  }

  function prepare() {
    const panel = document.querySelector(
      "#orderPage .menu-card"
    );

    if (!panel || $("dbConfirmationList")) return;

    const section = document.createElement("section");
    section.style.cssText =
      "border-top:2px solid #f2bfd6;" +
      "padding-top:18px;margin-top:20px";

    const heading = element(
      "h3", "💬 Permintaan Konfirmasi WA"
    );
    heading.style.color = "#b7467f";

    const refresh = element(
      "button", "↻ REFRESH KONFIRMASI"
    );
    refresh.id = "dbConfirmationRefresh";
    refresh.type = "button";
    refresh.style.cssText =
      "background:#d95791;color:white;border:0;" +
      "border-radius:12px;padding:11px 15px;" +
      "font-weight:bold;margin:10px 0";

    const list = document.createElement("div");
    list.id = "dbConfirmationList";

    refresh.addEventListener(
      "click", loadConfirmations
    );

    section.append(heading, refresh, list);
    panel.appendChild(section);
  }

  async function loadConfirmations() {
    prepare();

    const list = $("dbConfirmationList");
    if (!list) return;

    list.replaceChildren(
      element("p", "Memuat permintaan...")
    );

    try {
      
const { data: response, error } =
  await supabaseClient.functions.invoke(
    "digitibee-confirmation-admin",
    {
      body: { action: "list" }
    }
  );


if (error) {
  let message = error.message || "Gagal menghubungi server";

  try {
    const result = await error.context.json();
    message = result.error || message;
  } catch (_) {
    // Tetap tampilkan pesan awal jika respons tidak berisi JSON.
  }

  throw new Error(message);
}


if (!response?.success) {
  throw new Error(
    response?.error || "Gagal memuat konfirmasi"
  );
}

const data = response.requests;


      if (error) throw error;

      if (!data?.length) {
        list.replaceChildren(
          element("p", "Belum ada permintaan.")
        );
        return;
      }

      const fragment = document.createDocumentFragment();

      for (const request of data) {
        const card = document.createElement("article");
        card.style.cssText =
          "background:#fffafd;" +
          "border:1px solid #f1c4da;" +
          "border-radius:15px;padding:14px;" +
          "margin:12px 0";

        // HEADER: KODE PERMINTAAN + BADGE STATUS
const header = document.createElement("div");
header.className = "db-request-header";

const title = element(
  "h4", "Kode: " + request.request_code
);
title.className = "db-request-code";

const status = element(
  "span", request.status.toUpperCase()
);
status.className =
  "db-request-status db-status-" + request.status;

header.append(title, status);
card.appendChild(header);

// GARIS PUTUS-PUTUS
const separator = document.createElement("div");
separator.className = "db-request-separator";
card.appendChild(separator);

        const items = Array.isArray(request.items)
          ? request.items : [];

  
items.forEach((item, index) => {
  const productName = item.product_name || "Produk";
  const variantName = item.variant_name || "Varian";
  const quantity = Number(item.quantity) || 1;

  const row = document.createElement("div");
  row.className = "db-request-item";

  const number = element("span", index + 1);
  number.className = "db-request-number";

  const line = document.createElement("div");
  line.className = "db-request-line";

  const info = document.createElement("div");
  info.className = "db-request-info";

  const name = element(
    "strong",
    productName + " " + variantName
  );

  const amount = element(
    "p",
    "Jumlah Paket: " + quantity
  );

  info.append(name, amount);
  row.append(number, line, info);
  card.appendChild(row);
});

        if (request.status === "pending") {
          const approve = element(
            "button", "✓ SETUJUI"
          );

          approve.type = "button";
          approve.style.cssText =
            "background:#d95791;color:white;" +
            "border:0;border-radius:10px;" +
            "padding:10px 15px;font-weight:bold";

          approve.addEventListener("click", async () => {
            approve.disabled = true;
            approve.textContent = "Memproses...";

            try {
              const { data, error } =
                await supabaseClient.functions.invoke(
                  "digitibee-confirmation-admin",
                  {
                    
body: {
  action: "approve",
  request_id: request.id
}

                  }
                );

              if (error || !data?.success) {
                throw new Error(
                  data?.error ||
                  error?.message ||
                  "Persetujuan gagal"
                );
              }

              const url =
  "https://digitibee.github.io/digitibee-store/#checkout?token=" +
  encodeURIComponent(data.checkout_token);

              const copy = element(
                "button", "📋 SALIN LINK CHECKOUT"
              );

              copy.type = "button";
              copy.style.cssText =
                "display:block;margin-top:10px;" +
                "padding:10px;border-radius:10px";

              copy.addEventListener("click", async () => {
                await navigator.clipboard.writeText(url);
                alert("Link berhasil disalin");
              });

              card.appendChild(copy);

// Hilangkan kedua tombol setelah berhasil disetujui
actions.remove();

// Perbarui badge status
status.textContent = "APPROVED";
status.className =
  "db-request-status db-status-approved";

            } catch (err) {
              alert(err.message);
              approve.disabled = false;
              approve.textContent = "✓ SETUJUI";
            }
          });

          
const actions = document.createElement("div");
actions.className = "db-request-actions";

const reject = element("button", "✕ TOLAK");
reject.type = "button";
reject.className = "db-reject-button";

approve.className = "db-approve-button";

reject.addEventListener("click", async () => {
  if (!confirm("Yakin ingin menolak permintaan ini?")) {
    return;
  }

  reject.disabled = true;
  approve.disabled = true;
  reject.textContent = "Memproses...";

  try {
    const { data, error } =
      await supabaseClient.functions.invoke(
        "digitibee-confirmation-admin",
        {
          body: {
            action: "reject",
            request_id: request.id
          }
        }
      );

    if (error || !data?.success) {
      let message = data?.error || error?.message ||
        "Penolakan gagal.";

      if (error?.context) {
        try {
          const detail = await error.context.json();
          message = detail.error || message;
        } catch (_) {}
      }

      throw new Error(message);
    }

    await loadConfirmations();

  } catch (err) {
    alert("Gagal menolak: " + err.message);
    reject.disabled = false;
    approve.disabled = false;
    reject.textContent = "✕ TOLAK";
  }
});

actions.append(approve, reject);
card.appendChild(actions);
        }

        fragment.appendChild(card);
      }

      list.replaceChildren(fragment);

    } catch (err) {
      console.error(err);
      list.replaceChildren(
        element("p", "Gagal memuat: " + err.message)
      );
    }
  }

  window.loadConfirmations = loadConfirmations;

  const oldOpen = window.openMenuPage;

  if (typeof oldOpen === "function") {
    window.openMenuPage = function (pageId) {
      oldOpen(pageId);

      if (pageId === "orderPage") {
        loadConfirmations();
      }
    };
  }

  prepare();
})();
