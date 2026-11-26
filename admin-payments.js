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
    background:linear-gradient(160deg,#ffe1ef,#fffafd);
    border:1px solid #f2b9d5;
    border-radius:18px;
    padding:18px 12px;
    text-align:center;
  ">

    <div style="
      width:48px;
      height:48px;
      background:#fbd5e7;
      border-radius:50%;
      display:flex;
      align-items:center;
      justify-content:center;
      font-size:24px;
      margin:0 auto 12px;
    ">
      🧾
    </div>

    <div style="
      color:#a83f75;
      font-size:12px;
      font-weight:800;
      overflow-wrap:anywhere;
      line-height:1.6;
    ">
      #${escape(order.order_number)}
    </div>

    <div style="
      display:inline-block;
      background:#b97713;
      color:white;
      border-radius:30px;
      padding:8px 13px;
      font-size:10px;
      font-weight:800;
      margin-top:12px;
    ">
      ◷ MENUNGGU VERIFIKASI
    </div>

  </div>

  <hr style="
    border:0;
    border-top:2px dashed #ee91bc;
    margin:16px 0;
  ">

  <div style="
    display:grid;
    grid-template-columns:1fr 1fr 1.2fr;
    gap:7px;
  ">

    <button type="button"
      class="verify-payment"
      style="
        background:#d95791;
        color:white;
        border:1px solid #d95791;
        border-radius:11px;
        padding:12px 4px;
        font-size:12px;
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
        border:1px solid #f9dce9;
        border-radius:11px;
        padding:12px 4px;
        font-size:12px;
        font-weight:800;
        text-decoration:none;
      ">
      ✕ Tolak
    </button>

    <button type="button"
      class="detail-payment"
      style="
        background:#fff7fb;
        color:#b54780;
        border:1px solid #d95791;
        border-radius:11px;
        padding:12px 4px;
        font-size:12px;
        font-weight:800;
        text-decoration:none;
      ">
      Lihat Detail
    </button>

  </div>
`;

card.querySelector(".detail-payment").onclick = () => {
  alert("Halaman detail sedang disiapkan.");
};

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