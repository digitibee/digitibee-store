(function () {
  "use strict";

  const page = document.getElementById("paymentPage");
  const panel = page.querySelector(".menu-card");

  panel.innerHTML = `
    <h3>💳 Verifikasi Pembayaran</h3>
    <div id="dbPaymentList"></div>
  `;

  const list = document.getElementById("dbPaymentList");

  const rupiah = n =>
    "Rp" + Number(n || 0).toLocaleString("id-ID");

  function escape(value) {
    return String(value ?? "-").replace(/[&<>"']/g, c => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[c]);
  }

  window.loadAdminPayments = async function () {
    list.textContent = "Memuat pembayaran...";

    try {
      const { data, error } = await supabaseClient
        .from("orders")
        .select(`
          id,
          order_number,
          total_amount,
          payment_method,
          payment_status,
          order_status,
          contact_value,
          order_channel,
          customers(full_name),
          order_items(product_name,quantity,subtotal)
        `)
        .eq("order_status", "payment_review")
        .eq("payment_status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;

      list.replaceChildren();

      if (!data.length) {
        list.textContent = "Belum ada pembayaran yang perlu diverifikasi.";
        return;
      }

      data.forEach(order => {
        const card = document.createElement("article");

        card.style.cssText = `
          background:#ffffff;
          border:1.5px solid #efbfd5;
          border-radius:18px;
          padding:16px;
          margin:15px 0;
          overflow-wrap:anywhere;
        `;

        card.innerHTML = `
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
            <strong style="color:#a7477d;">
              #${escape(order.order_number)}
            </strong>

            <span style="background:#b97713;color:white;padding:7px 10px;border-radius:20px;font-size:10px;font-weight:bold;">
              MENUNGGU VERIFIKASI
            </span>
          </div>

          <hr style="border:0;border-top:2px dashed #ee91bc;margin:15px 0;">

          <p><b>Nama:</b> ${escape(order.customers?.full_name)}</p>
          <p><b>Kontak:</b> ${escape(order.contact_value)}</p>
          <p><b>Metode:</b> ${escape(order.payment_method)}</p>

          <div style="margin:15px 0;">
            ${(order.order_items || []).map(item => `
              <p>
                <b>${escape(item.product_name)}</b><br>
                Jumlah: ${escape(item.quantity)}<br>
                ${rupiah(item.subtotal)}
              </p>
            `).join("")}
          </div>

          <div style="background:#fff0f7;padding:13px;border-radius:12px;display:flex;justify-content:space-between;gap:8px;">
            <strong>Total Pembayaran</strong>
            <strong style="color:#a83f75;">
              ${rupiah(order.total_amount)}
            </strong>
          </div>

          <p style="font-size:11px;color:#97768a;line-height:1.6;">
            ⓘ Periksa bukti pembayaran dan mutasi rekening sebelum melakukan verifikasi.
          </p>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:15px;">
            <button class="verify-payment"
              style="background:#d95791;color:white;border-radius:12px;padding:13px;text-decoration:none;">
              ✓ Verifikasi
            </button>

            <button class="reject-payment"
              style="background:#f8dce6;color:#a9476e;border-radius:12px;padding:13px;text-decoration:none;">
              ✕ Tolak
            </button>
          </div>
        `;

        card.querySelector(".verify-payment").onclick =
          () => updatePayment(order.id, true, card);

        card.querySelector(".reject-payment").onclick =
          () => updatePayment(order.id, false, card);

        list.appendChild(card);
      });

    } catch (error) {
      list.textContent = "Gagal memuat: " + error.message;
    }
  };

  async function updatePayment(id, approved, card) {
    if (!confirm(
      approved
        ? "Pastikan pembayaran sudah diterima. Verifikasi pembayaran ini?"
        : "Yakin ingin menolak pembayaran ini?"
    )) return;

    const buttons = card.querySelectorAll("button");
    buttons.forEach(button => button.disabled = true);

    try {
      const changes = approved
        ? {
            payment_status: "verified",
            order_status: "paid",
            payment_verified_at: new Date().toISOString()
          }
        : {
            payment_status: "rejected",
            payment_verified_at: null
          };

      const { data, error } = await supabaseClient
        .from("orders")
        .update(changes)
        .eq("id", id)
        .eq("payment_status", "pending")
        .eq("order_status", "payment_review")
        .select("id")
        .single();

      if (error) throw error;
      if (!data) throw new Error("Status tidak berubah.");

      alert(
        approved
          ? "Pembayaran berhasil diverifikasi! 💗"
          : "Pembayaran berhasil ditolak."
      );

      await window.loadAdminPayments();

    } catch (error) {
      alert("Gagal memperbarui pembayaran: " + error.message);
    } finally {
      buttons.forEach(button => button.disabled = false);
    }
  }

  const oldOpenMenu = window.openMenuPage;

  window.openMenuPage = function (pageId) {
    oldOpenMenu(pageId);

    if (pageId === "paymentPage") {
      window.loadAdminPayments();
    }
  };

})();