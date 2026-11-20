/* ==========================================
   DIGITIBEE - CUSTOMER ORDER SUBMIT
   Versi persiapan, belum mengaktifkan checkout.
   Tidak mengubah kode dan desain lama.
========================================== */

(function () {
  "use strict";

  if (window.digitibeeOrderSubmitInstalled) return;

  const oldSendOrder = window.sendOrderWhatsApp;

  if (typeof oldSendOrder !== "function") {
    console.error("Fungsi pesanan lama tidak ditemukan.");
    return;
  }

  window.digitibeeOrderSubmitInstalled = true;

  // JANGAN UBAH KE TRUE SEBELUM BACKEND SIAP.
  const ENABLE_CHECKOUT = false;

  const $ = id => document.getElementById(id);
  let processing = false;

  function showStatus(message, success = false) {
    let status = $("dbCheckoutStatus");

    if (!status) {
      status = document.createElement("div");
      status.id = "dbCheckoutStatus";
      status.setAttribute("role", "status");
      status.style.cssText =
        "margin:12px 0;padding:12px;" +
        "border-radius:13px;font-size:12px;" +
        "line-height:1.6;overflow-wrap:anywhere;";

      const button = document.querySelector(
        '#keranjang button[onclick*="sendOrderWhatsApp"]'
      );

      if (button) button.insertAdjacentElement("afterend", status);
    }

    status.style.background =
      success ? "#e4f7eb" : "#fff0f7";
    status.style.color =
      success ? "#256945" : "#9a426f";
    status.textContent = message;
  }

  function getOrderData() {
    const channel = document.querySelector(
      'input[name="orderChannel"]:checked'
    )?.value || "whatsapp";

    const name = $("customerName")?.value.trim() || "";
    const contact = $("customerPhone")?.value.trim() || "";
    const device = $("customerDevice")?.value.trim() || "";
    const location = $("customerLocation")?.value.trim() || "";
    const note = $("customerNote")?.value.trim() || "";

if (typeof cart === "undefined" ||
    !Array.isArray(cart) ||
    cart.length === 0) {
  throw new Error("Keranjang masih kosong.");
}

    if (!name || !contact || !device || !location) {
      throw new Error(
        "Lengkapi nama, kontak, perangkat, dan lokasi."
      );
    }

    if (
      channel === "whatsapp" &&
      !/^(?:\+?62|0)[0-9]{8,13}$/.test(contact)
    ) {
      throw new Error("Nomor WhatsApp tidak valid.");
    }

    if (
      channel === "instagram" &&
      !/^@?[A-Za-z0-9._]{1,30}$/.test(contact)
    ) {
      throw new Error("Username Instagram tidak valid.");
    }

    const items = cart.map(item => ({
      variant_id: item.variantId,
      quantity: Number(item.quantity)
    }));

    if (!items.length || items.length > 20) {
      throw new Error("Daftar paket tidak valid.");
    }

    return {
      name,
      channel,
      contact,
      device,
      location,
      note,
      items
    };
  }

  async function getRequestId(order) {
    const encoded = new TextEncoder().encode(
      JSON.stringify(order)
    );

    const digest = await crypto.subtle.digest(
      "SHA-256", encoded
    );

    const fingerprint = Array.from(
      new Uint8Array(digest)
    ).map(b => b.toString(16).padStart(2, "0")).join("");

    const key = "digitibeeCheckoutRequest";
    let previous = null;

    try {
      previous = JSON.parse(
        sessionStorage.getItem(key) || "null"
      );
    } catch {
      previous = null;
    }

    if (
      previous &&
      previous.fingerprint === fingerprint &&
      previous.request_id
    ) {
      return previous.request_id;
    }

    const requestId = crypto.randomUUID();

    sessionStorage.setItem(key, JSON.stringify({
      fingerprint,
      request_id: requestId
    }));

    return requestId;
  }

  function getTurnstileToken() {
    if (
      !window.turnstile ||
      typeof window.turnstile.getResponse !== "function"
    ) {
      throw new Error(
        "Cloudflare belum siap. Muat ulang halaman."
      );
    }

    const widget = document.querySelector(
      "#keranjang .cf-turnstile"
    );

    const token = window.turnstile.getResponse(
      widget || undefined
    );

    if (!token) {
      throw new Error(
        "Selesaikan verifikasi Cloudflare terlebih dahulu."
      );
    }

    return token;
  }

  function resetTurnstile() {
    try {
      window.turnstile?.reset();
    } catch (error) {
      console.warn("Reset Turnstile:", error);
    }
  }

  async function submitDigitibeeOrder() {
    if (processing) return;

    const button = document.querySelector(
      '#keranjang button[onclick*="sendOrderWhatsApp"]'
    );

    let order;

    try {
      order = getOrderData();
    } catch (error) {
      alert(error.message);
      return;
    }

    processing = true;

    const oldLabel = button?.textContent;

    if (button) {
      button.disabled = true;
      button.textContent = "MEMPROSES PESANAN...";
    }

    try {
      const requestId = await getRequestId(order);
      const turnstileToken = getTurnstileToken();

      showStatus("Sedang menyimpan pesanan...");

      const { data, error } =
        await supabaseClient.functions.invoke(
          "digitibee-checkout",
          {
            body: {
              ...order,
              request_id: requestId,
              turnstile_token: turnstileToken
            }
          }
        );

      if (error) {
        let message = error.message || "Checkout gagal.";

        try {
          const responseData =
            await error.context?.json?.();
          if (responseData?.error) {
            message = responseData.error;
          }
        } catch {
          // Gunakan pesan error standar.
        }

        throw new Error(message);
      }

      if (data?.success !== true || !data?.order) {
        throw new Error(
          data?.error || "Respons checkout tidak valid."
        );
      }

      const number =
        data.order.order_number || "Tidak tersedia";

      const total = Number(
        data.order.total_amount || 0
      ).toLocaleString("id-ID");

      const next = data.next_step === "contact_admin"
        ? "Menunggu konfirmasi admin."
        : "Pembayaran website belum tersedia.";

      showStatus(
        "Pesanan berhasil disimpan!\n" +
        "Nomor: " + number + "\n" +
        "Total: Rp" + total + "\n" + next,
        true
      );

      alert(
        "Pesanan tersimpan!\n" +
        "Nomor pesanan: " + number + "\n" +
        next
      );

      // Keranjang tidak dihapus otomatis.
      // Pengiriman ke WA/IG tidak dijalankan otomatis.
      // Pesanan belum dinyatakan lunas.

    } catch (error) {
      console.error("Digitibee checkout:", error);

      showStatus(
        "Pesanan belum dapat dipastikan tersimpan. " +
        error.message +
        " Jangan membuat pesanan baru jika status belum jelas."
      );

      resetTurnstile();

    } finally {
      processing = false;

      if (button) {
        button.disabled = false;
        button.textContent = oldLabel;
      }
    }
  }

  // Tombol lama tetap bekerja sampai checkout siap.
  window.sendOrderWhatsApp = function () {
    if (!ENABLE_CHECKOUT) {
      return oldSendOrder.apply(this, arguments);
    }

    return submitDigitibeeOrder();
  };

})();
