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
  <div style="
    display:flex;
    align-items:center;
    gap:10px;
  ">

    <div style="
      width:36px;
      height:36px;
      flex-shrink:0;
      background:#fbd5e7;
      border-radius:50%;
      display:flex;
      align-items:center;
      justify-content:center;
      font-size:20px;
    ">
      🧾
    </div>

    <div style="flex:1;min-width:0;">

      <div style="
        color:#a83f75;
        font-size:11px;
        font-weight:800;
        overflow-wrap:anywhere;
        line-height:1.4;
      ">
        #${escape(order.order_number)}
      </div>

      <span style="
        display:inline-block;
        background:#b97713;
        color:white;
        border-radius:20px;
        padding:6px 9px;
        font-size:9px;
        font-weight:800;
        margin-top:6px;
      ">
        ◷ MENUNGGU VERIFIKASI
      </span>

    </div>
  </div>

  <hr style="
    border:0;
    border-top:2px dashed #ee91bc;
    margin:12px 0;
  ">

<div style="
  font-size:15px;
  color:#b54780;
  font-weight:600;
">
  <div style="
    display:flex;
    justify-content:space-between;
    align-items:center;
    gap:8px;
    margin-bottom:12px;
  ">
    <span>Metode Pembayaran</span>
    <span>${escape(order.payment_method)}</span>
  </div>

  <div style="
    display:flex;
    justify-content:space-between;
    align-items:center;
    gap:8px;
    margin-bottom:14px;
  ">
    <span>Total Pembayaran</span>
    <span>${rupiah(order.total_amount)}</span>
  </div>
</div>

  <div style="
  display:grid;
  grid-template-columns:110px 110px;
  justify-content:center;
  gap:8px;
">

    <button type="button"
      class="verify-payment"
      style="
        background:#d95791;
        color:white;
        border:none;
        border-radius:10px;
        padding:11px;
        font-size:15px;
        font-weight:800;
        text-decoration:none;
      ">
      ✓ Terima
    </button>

    <button type="button"
      class="reject-payment"
      style="
        background:#f9dce9;
        color:#a7477d;
        border:none;
        border-radius:10px;
        padding:11px;
        font-size:15px;
        font-weight:800;
        text-decoration:none;
      ">
      ✕ Tolak
    </button>

  </div>
`;

card.style.background = "#ffffff";
card.style.border = "1.5px solid #efbfd5";
card.style.borderRadius = "16px";
card.style.padding = "14px";
card.style.margin = "10px 0";

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
  
  function showPaymentDetail(order, card) {
  const detail = document.createElement("div");

  detail.innerHTML = `
    <button type="button" class="back-payment"
      style="background:#f9d5e6;color:#a7477d;
      border-radius:12px;padding:12px 18px;
      text-decoration:none;margin-bottom:18px;">
      ← Kembali
    </button>

    <h3 style="text-align:center;margin-bottom:20px;">
      📋 Detail Pembayaran
    </h3>

    <div style="background:#fff0f7;
      border:1px solid #f2bfd7;
      border-radius:16px;padding:15px;
      margin-bottom:16px;text-align:center;">

      <strong style="font-size:12px;color:#a83f75;
        overflow-wrap:anywhere;">
        #${escape(order.order_number)}
      </strong>

      <div style="margin-top:12px;">
        <span style="background:#b97713;color:white;
          padding:8px 12px;border-radius:30px;
          font-size:11px;font-weight:bold;">
          MENUNGGU VERIFIKASI
        </span>
      </div>
    </div>

    <section style="background:white;
      border:1px solid #efbfd5;
      border-radius:16px;overflow:hidden;
      margin-bottom:16px;">

      <h3 style="background:#ffe4f0;
        padding:15px;margin:0;font-size:15px;">
        💳 Informasi Pembayaran
      </h3>

      <div style="padding:15px;">

        <div style="display:flex;
          justify-content:space-between;
          gap:10px;align-items:center;">
          <span>Metode Pembayaran</span>
          <strong style="color:#b54780;">
            ${escape(order.payment_method)}
          </strong>
        </div>

        <hr style="border:0;
          border-top:1px solid #efbfd5;
          margin:15px 0;">

        <div style="display:flex;
          justify-content:space-between;
          gap:10px;align-items:center;">
          <strong>Total Pembayaran</strong>
          <strong style="color:#d95791;
            font-size:18px;">
            ${rupiah(order.total_amount)}
          </strong>
        </div>

      </div>
    </section>

    <section style="background:white;
      border:1px solid #efbfd5;
      border-radius:16px;overflow:hidden;
      margin-bottom:16px;">

      <h3 style="background:#ffe4f0;
        padding:15px;margin:0;font-size:15px;">
        📦 Detail Produk
      </h3>

      <div style="padding:12px;">

        ${(order.order_items || []).map(item => `
          <div style="background:#fff7fb;
            border:1px solid #f2bfd7;
            border-radius:12px;
            overflow:hidden;margin-bottom:10px;">

            <div style="background:#fce1ee;
              padding:13px;color:#a83f75;
              font-size:16px;font-weight:800;">
              ${escape(item.product_name)}
            </div>

            <div style="padding:13px;
              font-size:13px;line-height:2;">

              <div>
                <b>Plan / Variasi:</b>
                ${escape(item.product_variants?.name)}
              </div>

              <div>
                <b>Durasi:</b>
                ${escape(item.product_variants?.duration)}
              </div>

              <div>
                <b>Jumlah:</b>
                ${escape(item.quantity)}
              </div>

            </div>
          </div>
        `).join("")}

      </div>
    </section>

    <div style="display:grid;
      grid-template-columns:1fr 1fr;gap:10px;">

      <button type="button" class="detail-accept"
        style="background:#d95791;color:white;
        padding:14px;border-radius:12px;
        text-decoration:none;">
        ✓ Terima
      </button>

      <button type="button" class="detail-reject"
        style="background:#f9dce9;color:#a7477d;
        padding:14px;border-radius:12px;
        text-decoration:none;">
        ✕ Tolak
      </button>

    </div>
  `;

  list.replaceChildren(detail);

  detail.querySelector(".back-payment").onclick = () => {
    window.loadAdminPayments();
  };

  detail.querySelector(".detail-accept").onclick = () => {
    updatePayment(order.id, true, detail);
  };

  detail.querySelector(".detail-reject").onclick = () => {
    updatePayment(order.id, false, detail);
  };

  page.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

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