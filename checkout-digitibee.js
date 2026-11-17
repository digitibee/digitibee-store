
/* =====================================
   DIGITIBEE CUSTOMER
   STATUS READY / KONFIRMASI WA
   Versi 1 - Aman untuk kode lama
===================================== */

(function () {
  "use strict";

  // Mencegah script dipasang dua kali
  if (window.digitibeeStatusInstalled) return;

  const originalModal = window.openProductModal;

  if (typeof originalModal !== "function") {
    console.error("Popup produk belum tersedia.");
    return;
  }

  window.digitibeeStatusInstalled = true;

  let requestNumber = 0;

  /* CSS LABEL STATUS */

  const style = document.createElement("style");

  style.textContent = `
    .digitibee-status {
      display: inline-block;
      width: fit-content;
      padding: 5px 9px;
      margin: 6px 0;
      border-radius: 15px;
      font-size: 10px;
      font-weight: 700;
      line-height: 1.4;
    }

    .digitibee-ready {
      background: #dff6e9;
      color: #28754e;
    }

    .digitibee-confirm {
      background: #fff0da;
      color: #98621b;
    }

    .digitibee-empty {
      background: #eeeeee;
      color: #777777;
    }
  `;

  document.head.appendChild(style);

  /* TAMBAHKAN STATUS KE POPUP */

  window.openProductModal = function(product, variants) {

    // Jalankan popup asli Digitibee
    const result = originalModal.apply(this, arguments);

    const currentRequest = ++requestNumber;

    const container =
      document.getElementById("modalVariantList");

    if (!container || !Array.isArray(variants)) {
      return result;
    }

    const rows = container.querySelectorAll(
      ".modal-variant"
    );

    const labels = [];

    variants.forEach((variant, index) => {

      const row = rows[index];

      if (!row) return;

      const label = document.createElement("span");

      label.className =
        "digitibee-status digitibee-empty";

      label.textContent = "Memeriksa status...";

      const target =
        row.querySelector(".variant-left") || row;

      target.appendChild(label);

      labels.push({
        id: String(variant.id),
        element: label
      });

    });

    /* AMBIL STATUS DARI SUPABASE */

    (async function() {

      try {

        if (typeof supabaseClient === "undefined") {
          throw new Error("Supabase belum siap.");
        }

        const ids = labels.map(item => item.id);

        if (!ids.length) return;

        const { data, error } = await supabaseClient
          .from("product_variants")
          .select("id, requires_confirmation, stock")
          .in("id", ids);

        if (error) throw error;

        // Abaikan hasil popup yang sudah ditutup
        if (
          currentRequest !== requestNumber ||
          document.getElementById("productModal")?.hidden
        ) {
          return;
        }

        const statusMap = new Map(
          (data || []).map(item => [
            String(item.id),
            item
          ])
        );

        labels.forEach(item => {

          const variant = statusMap.get(item.id);
          const label = item.element;

          if (!variant) {
            label.textContent = "Status tidak tersedia";
            return;
          }

          if (variant.requires_confirmation !== false) {

            label.className =
              "digitibee-status digitibee-confirm";

            label.textContent =
              "💬 Perlu Konfirmasi WhatsApp";

          } else if (Number(variant.stock) > 0) {

            label.className =
              "digitibee-status digitibee-ready";

            label.textContent =
              "✓ Ready";

          } else {

            label.className =
              "digitibee-status digitibee-empty";

            label.textContent =
              "Stok Habis";

          }

        });

      } catch (error) {

        console.error(
          "Digitibee status error:",
          error
        );

        if (currentRequest !== requestNumber) return;

        labels.forEach(item => {
          item.element.textContent =
            "Status belum dapat dimuat";
        });

      }

    })();

    return result;

  };

})();
