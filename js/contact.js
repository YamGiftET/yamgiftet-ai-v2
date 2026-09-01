// =====================================
// YamGiftET AI v2
// CENTRALIZED CONTACT CENTER
// =====================================

"use strict";

console.log("📞 YamGiftET AI — Contact Center ተጀምሯል።");

let contactsData = [];
let filteredContacts = [];

// =====================================
// HELPERS
// =====================================

function clean(value) {
    return String(value ?? "").trim();
}

function escapeHtml(value) {
    return clean(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function getContactPhone(value) {
  return String(value || "").trim();
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return escapeHtml(value);

  return date.toLocaleString("am-ET-u-ca-ethiopic", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function showError(message) {
    console.error("❌ Contact Error:", message);
    alert(message);
}

// =====================================
// LOAD CONTACTS
// =====================================

async function loadContacts() {
    const body = document.getElementById("contactsBody");

    if (body) {
        body.innerHTML = `
            <tr>
                <td colspan="5" class="contact-empty">
                    ⏳ Contacts በመጫን ላይ...
                </td>
            </tr>
        `;
    }

    try {
        const response = await fetch("/api/contacts");
        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(
                data.error || "Contacts ማምጣት አልተቻለም።"
            );
        }

        contactsData = Array.isArray(data.contacts)
            ? data.contacts
            : [];

        filteredContacts = [...contactsData];

        renderContacts();
        updateStats();

        console.log(
            "📞 Contacts loaded:",
            contactsData.length
        );

    } catch (error) {

        console.error(
            "❌ Load Contacts Error:",
            error
        );

        if (body) {
            body.innerHTML = `
                <tr>
                    <td colspan="5" class="contact-empty">
                        ❌ Contacts ማምጣት አልተቻለም።
                    </td>
                </tr>
            `;
        }

        showError(
            error.message ||
            "Contacts ማምጣት አልተቻለም።"
        );
    }
}

// =====================================
// RENDER CONTACTS
// =====================================

function renderContacts() {
    const body = document.getElementById("contactsBody");

    if (!body) return;

    if (!filteredContacts.length) {

        body.innerHTML = `
            <tr>
                <td colspan="5" class="contact-empty">
                    📭 Contact አልተገኘም።
                </td>
            </tr>
        `;

        return;
    }

    body.innerHTML = filteredContacts
        .map((contact, index) => {

            const name =
                escapeHtml(
                    contact.name || "ያልተጠቀሰ"
                );

            const phone =
                escapeHtml(
                    contact.phone || "—"
                );

            const updated =
                formatDate(
                    contact.updatedAt ||
                    contact.lastSeenAt
                );

            return `
                <tr>

                    <td>${index + 1}</td>

                    <td>
                        <strong>${name}</strong>
                    </td>

                    <td>
                        📞 ${phone}
                    </td>

                    <td>
                        ${updated}
                    </td>

                    <td>
                        <div class="contact-actions">

                            <button
                                type="button"
                                onclick="editContact('${escapeHtml(contact.id)}')"
                            >
                                ✏️
                            </button>

                            <button
                                type="button"
                                onclick="viewContact('${escapeHtml(contact.id)}')"
                            >
                                👁️
                            </button>

                            <button
                                type="button"
                                onclick="deleteContact('${escapeHtml(contact.id)}')"
                            >
                                🗑️
                            </button>

                        </div>
                    </td>

                </tr>
            `;
        })
        .join("");
}

// =====================================
// SEARCH
// =====================================

function searchContacts() {

    const searchInput =
        document.getElementById("contactSearch");

    const query =
        clean(searchInput?.value).toLowerCase();

    if (!query) {

        filteredContacts = [...contactsData];

    } else {

        filteredContacts =
            contactsData.filter(contact => {

                const name =
                    clean(contact.name).toLowerCase();

                const phone =
                    clean(contact.phone).toLowerCase();

                return (
                    name.includes(query) ||
                    phone.includes(query)
                );
            });
    }

    renderContacts();
}

// =====================================
// STATISTICS
// =====================================

function updateStats() {

    const total =
        document.getElementById("contactTotal");

    const active =
        document.getElementById("contactActive");

    const lastUpdated =
        document.getElementById(
            "contactLastUpdated"
        );

    if (total) {
        total.textContent =
            contactsData.length;
    }

    if (active) {
        active.textContent =
            contactsData.length;
    }

    if (lastUpdated) {

        const latest =
            contactsData
                .map(c =>
                    c.updatedAt ||
                    c.lastSeenAt ||
                    c.createdAt
                )
                .filter(Boolean)
                .sort()
                .reverse()[0];

        lastUpdated.textContent =
            latest
                ? formatDate(latest)
                : "—";
    }
}

// =====================================
// OPEN ADD FORM
// =====================================

function openContactForm() {

    const modal =
        document.getElementById(
            "contactFormModal"
        );

    const form =
        document.getElementById(
            "contactForm"
        );

    const title =
        document.getElementById(
            "contactFormTitle"
        );

    const id =
        document.getElementById(
            "contactId"
        );

    const name =
        document.getElementById(
            "contactName"
        );

    const phone =
        document.getElementById(
            "contactPhone"
        );

    if (!modal || !form) return;

    form.reset();

    if (id) id.value = "";

    if (title) {
        title.textContent =
            "➕ Contact ጨምር";
    }

    if (name) name.value = "";
    if (phone) phone.value = "";

    modal.style.display = "flex";

    if (name) {
        setTimeout(() => name.focus(), 50);
    }
}

// =====================================
// CLOSE FORM
// =====================================

function closeContactForm() {

    const modal =
        document.getElementById(
            "contactFormModal"
        );

    if (modal) {
        modal.style.display = "none";
    }
}

// =====================================
// EDIT CONTACT
// =====================================

function editContact(id) {

    const contact =
        contactsData.find(
            item => item.id === id
        );

    if (!contact) {
        showError("Contact አልተገኘም።");
        return;
    }

    const modal =
        document.getElementById(
            "contactFormModal"
        );

    const title =
        document.getElementById(
            "contactFormTitle"
        );

    const idInput =
        document.getElementById(
            "contactId"
        );

    const nameInput =
        document.getElementById(
            "contactName"
        );

    const phoneInput =
        document.getElementById(
            "contactPhone"
        );

    if (!modal) return;

    if (title) {
        title.textContent =
            "✏️ Contact አስተካክል";
    }

    if (idInput) {
        idInput.value = contact.id || "";
    }

    if (nameInput) {
        nameInput.value =
            contact.name || "";
    }

    if (phoneInput) {
        phoneInput.value =
            contact.phone || "";
    }

    modal.style.display = "flex";

    if (nameInput) {
        setTimeout(
            () => nameInput.focus(),
            50
        );
    }
}

// =====================================
// SAVE CONTACT
// =====================================

async function saveContact(event) {

    event.preventDefault();

    const id =
        clean(
            document.getElementById(
                "contactId"
            )?.value
        );

    const name =
        clean(
            document.getElementById(
                "contactName"
            )?.value
        );

    const phone =
        clean(
            document.getElementById(
                "contactPhone"
            )?.value
        );

    if (!name) {
        showError("የContact ስም ያስገቡ።");
        return;
    }

    if (!phone) {
        showError("የስልክ ቁጥር ያስገቡ።");
        return;
    }

    const isEdit = Boolean(id);

    try {

        const response =
            await fetch(
                isEdit
                    ? `/api/contacts/${encodeURIComponent(id)}`
                    : "/api/contacts",
                {
                    method:
                        isEdit
                            ? "PATCH"
                            : "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        name,
                        phone
                    })
                }
            );

        const data =
            await response.json();

        if (!response.ok || !data.success) {
            throw new Error(
                data.error ||
                "Contact ማስቀመጥ አልተቻለም።"
            );
        }

        const savedContactId =
            id || data.contact?.id;

        const photoInput =
            document.getElementById("contactPhoto");

        const photoFile =
            photoInput?.files?.[0];

        if (photoFile && savedContactId) {
            const formData = new FormData();
            formData.append("photo", photoFile);

            const photoResponse =
                await fetch(
                    "/api/contacts/" +
                    encodeURIComponent(savedContactId) +
                    "/photo",
                    {
                        method: "POST",
                        body: formData
                    }
                );

            const photoData =
                await photoResponse.json();

            if (!photoResponse.ok || !photoData.success) {
                throw new Error(
                    photoData.error ||
                    "Contact ፎቶ ማስቀመጥ አልተቻለም።"
                );
            }
        }

        closeContactForm();

        await loadContacts();

        alert(
            isEdit
                ? "✅ Contact ተስተካክሏል።"
                : "✅ Contact ተጨምሯል።"
        );

    } catch (error) {

        console.error(
            "❌ Save Contact Error:",
            error
        );

        showError(
            error.message ||
            "Contact ማስቀመጥ አልተቻለም።"
        );
    }
}

// =====================================
// DELETE CONTACT
// =====================================

async function deleteContact(id) {

    const contact =
        contactsData.find(
            item => item.id === id
        );

    if (!contact) {
        showError("Contact አልተገኘም።");
        return;
    }

    const name =
        contact.name ||
        contact.phone ||
        "ይህ Contact";

    const confirmed =
        confirm(
            `🗑️ "${name}" ወደ Universal Trash ልወስደው?`
        );

    if (!confirmed) return;

    try {

        const response =
            await fetch(
                `/api/contacts/${encodeURIComponent(id)}`,
                {
                    method: "DELETE"
                }
            );

        const data =
            await response.json();

        if (!response.ok || !data.success) {
            throw new Error(
                data.error ||
                "Contact መሰረዝ አልተቻለም።"
            );
        }

        await loadContacts();

        alert(
            "🗑️ Contact ወደ Universal Trash ተወስዷል።"
        );

    } catch (error) {

        console.error(
            "❌ Delete Contact Error:",
            error
        );

        showError(
            error.message ||
            "Contact መሰረዝ አልተቻለም።"
        );
    }
}

// =====================================
// VIEW CONTACT
// =====================================

function normalizeContactPhone(value) {
  return String(value || "").replace(/[^0-9+]/g, "").replace(/^00/, "+");
}

async function loadContactRecordings(contactId, modal) {
  const box = modal.querySelector("#contactRecordingsBody");
  if (!box) return;

  try {
    const response = await fetch(
      "/api/contacts/" + encodeURIComponent(contactId) + "/recordings"
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || "ሪከርዶች ማምጣት አልተቻለም።");
    }

    const recordings = Array.isArray(data.recordings)
      ? data.recordings
      : [];

    if (!recordings.length) {
      box.innerHTML = "<p>🎙️ እስካሁን ሪከርድ የለም።</p>";
      return;
    }

    box.innerHTML = recordings.map(recording => `
      <div class="contact-recording-item">
        <input
          class="contact-recording-name-input"
          data-recording-id="${escapeHtml(recording.id)}"
          value="${escapeHtml(recording.name || "የጥሪ ሪከርድ")}"
        >

        <audio
          controls
          preload="metadata"
          src="${escapeHtml(recording.url)}"
        ></audio>

        <div class="contact-recording-meta">
          <small>📅 ${escapeHtml(formatDate(recording.createdAt))}</small>

          <div class="contact-recording-actions">
            <button
              type="button"
              class="contact-recording-save"
              data-recording-id="${escapeHtml(recording.id)}"
            >💾 Save</button>

            <button
              type="button"
              class="contact-recording-delete"
              data-recording-id="${escapeHtml(recording.id)}"
            >🗑️ Delete</button>
          </div>
        </div>
      </div>
    `).join("");

    box.querySelectorAll(".contact-recording-save").forEach(btn => {
      btn.onclick = async () => {
        try {
          btn.disabled = true;
          await editContactRecording(
            contactId,
            btn.dataset.recordingId,
            modal
          );
        } catch (error) {
          alert("❌ " + (error.message || "ማስተካከል አልተቻለም።"));
        } finally {
          btn.disabled = false;
        }
      };
    });

    box.querySelectorAll(".contact-recording-delete").forEach(btn => {
      btn.onclick = async () => {
        try {
          btn.disabled = true;
          await deleteContactRecording(
            contactId,
            btn.dataset.recordingId,
            modal
          );
        } catch (error) {
          alert("❌ " + (error.message || "መሰረዝ አልተቻለም።"));
        } finally {
          btn.disabled = false;
        }
      };
    });

  } catch (error) {
    console.error("Contact Recordings Error:", error);
    box.innerHTML =
      "<p>❌ " + escapeHtml(error.message) + "</p>";
  }
}

async function editContactRecording(contactId, recordingId, modal) {
  const input = modal.querySelector(
    ".contact-recording-name-input[data-recording-id=\"" +
    recordingId +
    "\"]"
  );

  const name = clean(input?.value);

  if (!name) {
    alert("የሪከርዱ ስም ያስፈልጋል።");
    return;
  }

  const response = await fetch(
    "/api/contacts/" +
    encodeURIComponent(contactId) +
    "/recordings/" +
    encodeURIComponent(recordingId),
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ name })
    }
  );

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(
      data.error || "ሪከርዱን ማስተካከል አልተቻለም።"
    );
  }

  alert("✅ የሪከርዱ ስም ተስተካክሏል።");

  await loadContactRecordings(contactId, modal);
}

async function deleteContactRecording(contactId, recordingId, modal) {
  if (!confirm(
    "ይህን ሪከርድ ወደ Universal Trash ማስገባት ይፈልጋሉ?"
  )) {
    return;
  }

  const response = await fetch(
    "/api/contacts/" +
    encodeURIComponent(contactId) +
    "/recordings/" +
    encodeURIComponent(recordingId),
    {
      method: "DELETE"
    }
  );

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(
      data.error || "ሪከርዱን መሰረዝ አልተቻለም።"
    );
  }

  alert("🗑️ ሪከርዱ Universal Trash ውስጥ ገብቷል።");

  await loadContactRecordings(contactId, modal);
}

async function uploadContactRecording(contactId, modal) {
  const fileInput = modal.querySelector("#contactRecordingFile");
  const nameInput = modal.querySelector("#contactRecordingName");
  const file = fileInput?.files?.[0];

  if (!file) {
    alert("🎙️ የሪከርድ ፋይል ይምረጡ።");
    return;
  }

  const formData = new FormData();
  formData.append("recording", file);
  formData.append(
    "name",
    clean(nameInput?.value) || file.name
  );

  const response = await fetch(
    "/api/contacts/" +
    encodeURIComponent(contactId) +
    "/recordings",
    {
      method: "POST",
      body: formData
    }
  );

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(
      data.error || "ሪከርድ ማስገባት አልተቻለም።"
    );
  }

  fileInput.value = "";
  nameInput.value = "";

  await loadContactRecordings(contactId, modal);

  alert("✅ ሪከርዱ ተቀምጧል።");
}

function viewContact(id) {
  const contact = contactsData.find(item => item.id === id);
  if (!contact) {
    showError("Contact አልተገኘም።");
    return;
  }

  const name = contact.name || "ያልተጠቀሰ";
  const phone = contact.phone || "—";
  const contactPhone = normalizeContactPhone(phone);

  const old = document.getElementById("contactDetailsModal");
  if (old) old.remove();

  const modal = document.createElement("div");
  modal.id = "contactDetailsModal";
  modal.className = "contact-details-modal";

  modal.innerHTML = `
    <div class="contact-details-card">
      <div class="contact-details-header">
        <div>
          <div class="contact-details-title">👤 የContact ዝርዝር</div>
          <div class="contact-details-subtitle">📞 ${escapeHtml(phone)}</div>
        </div>
        <button type="button" class="contact-details-close">✕</button>
      </div>

      <div class="contact-details-body">
        <div class="contact-profile">
          <div class="contact-avatar">${contact.photoUrl ? `<img src="${escapeHtml(contact.photoUrl)}" alt="Contact Photo" class="contact-avatar-img">` : "👤"}</div>
          <h2>${escapeHtml(name)}</h2>
          <p class="contact-phone-display">📞 ${escapeHtml(phone)}</p>
          <div class="contact-quick-actions">
            <a class="contact-call-btn" href="tel:${encodeURIComponent(contactPhone)}">📞 ደውል</a>
            <a class="contact-message-btn" href="sms:${encodeURIComponent(contactPhone)}">💬 Message</a>
          </div>
        </div>

        <div class="contact-recordings-section">
          <h3>🎙️ የጥሪ ሪከርዶች</h3>
          <div class="contact-recording-upload">
            <input id="contactRecordingName" type="text" placeholder="የሪከርዱ ስም">
            <label class="contact-audio-picker">📁 File Choose <input id="contactRecordingFile" type="file" accept=".mp3,.wav,.m4a,.aac,.ogg,.opus,.amr,audio/*"></label>
            <button type="button" id="contactRecordingUploadBtn">⬆️ ሪከርድ አስገባ</button>
          </div>
          <div id="contactRecordingsBody" class="contact-recordings-body">
            <p>⏳ ሪከርዶችን በመጫን ላይ...</p>
          </div>
        </div>

        <div class="contact-360-summary"><h3>📊 የደንበኛ 360° ማጠቃለያ</h3><div class="contact-360-grid"><div class="contact-360-box"><span>📦</span><small>ጠቅላላ ትዕዛዝ</small><strong id="contact360Orders">0</strong></div><div class="contact-360-box"><span>🎁</span><small>የተረከበ ስራ</small><strong id="contact360Delivered">0 ብር</strong></div><div class="contact-360-box"><span>💳</span><small>የተከፈለ</small><strong id="contact360Paid">0 ብር</strong></div><div class="contact-360-box"><span>📈</span><small>ጠቅላላ ትርፍ</small><strong id="contact360Profit">0 ብር</strong></div></div></div><div class="contact-orders-section"><h3>📦 የትዕዛዝ ታሪክ</h3><div id="contactOrdersBody" class="contact-orders-body"><p>⏳ በመጫን ላይ...</p></div></div><div class="contact-timeline-section"><h3>🕒 የደንበኛ የጊዜ መስመር</h3><div id="contactTimelineBody" class="contact-timeline-body"><p>⏳ በመጫን ላይ...</p></div></div><div class="contact-info-grid">
          <div class="contact-info-box">
            <span>📅</span>
            <small>የተፈጠረበት</small>
            <strong>${escapeHtml(formatDate(contact.createdAt))}</strong>
          </div>

          <div class="contact-info-box">
            <span>🕒</span>
            <small>የመጨረሻ ማዘመኛ</small>
            <strong>${escapeHtml(formatDate(contact.updatedAt || contact.lastSeenAt))}</strong>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelector(".contact-details-close").onclick = () => modal.remove();
  modal.onclick = event => {
    if (event.target === modal) modal.remove();
  };

  requestAnimationFrame(() => modal.classList.add("show"));

  const recordingUploadBtn = modal.querySelector("#contactRecordingUploadBtn");
  if (recordingUploadBtn) {
    recordingUploadBtn.onclick = async () => {
      try {
        recordingUploadBtn.disabled = true;
        recordingUploadBtn.textContent = "⏳ በመጫን ላይ...";
        await uploadContactRecording(id, modal);
      } catch (error) {
        console.error("Contact Recording Upload Error:", error);
        alert("❌ " + (error.message || "ሪከርድ ማስገባት አልተቻለም።"));
      } finally {
        recordingUploadBtn.disabled = false;
        recordingUploadBtn.textContent = "⬆️ ሪከርድ አስገባ";
      }
    };
  }

  loadContactRecordings(id, modal);
  modal.querySelectorAll(".contact-recording-save").forEach(btn => {
    btn.onclick = async () => {
      try {
        btn.disabled = true;
        await editContactRecording(id, btn.dataset.recordingId, modal);
      } catch (error) {
        alert("❌ " + (error.message || "ማስተካከል አልተቻለም።"));
      } finally {
        btn.disabled = false;
      }
    };
  });

  modal.querySelectorAll(".contact-recording-delete").forEach(btn => {
    btn.onclick = async () => {
      try {
        btn.disabled = true;
        await deleteContactRecording(id, btn.dataset.recordingId, modal);
      } catch (error) {
        alert("❌ " + (error.message || "መሰረዝ አልተቻለም።"));
      } finally {
        btn.disabled = false;
      }
    };
  });


  const timelineBox = modal.querySelector("#contactTimelineBody");

  Promise.all([
    fetch("/api/orders").then(r => r.json()),
    fetch("/api/delivered-orders").then(r => r.json()),
    fetch("/api/appointments").then(r => r.json())
  ]).then(([ordersData, deliveredData, appointmentsData]) => {

    const allOrders = Array.isArray(ordersData.orders)
      ? ordersData.orders : [];

    const delivered = Array.isArray(deliveredData.orders)
      ? deliveredData.orders : [];

    const appointments = Array.isArray(appointmentsData.appointments)
      ? appointmentsData.appointments : [];

    const matchedOrders = allOrders.filter(order =>
      normalizeContactPhone(order.phone) === contactPhone
    );

    const matchedDelivered = delivered.filter(order =>
      normalizeContactPhone(order.phone) === contactPhone
    );

    const matchedAppointments = appointments.filter(item =>
      normalizeContactPhone(item.phone) === contactPhone
    );

    const totalAmount = matchedOrders.reduce(
      (sum, item) => sum + Number(item.totalAmount || 0), 0
    );

    const paid = matchedOrders.reduce(
      (sum, item) => sum + Number(item.deposit || 0), 0
    );

    const remaining = matchedOrders.reduce(
      (sum, item) => sum + Number(item.remaining || 0), 0
    );

    const profit = matchedOrders.reduce(
      (sum, item) => sum + Number(item.profit || 0), 0
    );

    const deliveredTotal = matchedDelivered.reduce(
      (sum, item) => sum + Number(item.totalAmount || 0), 0
    );

    const ordersEl = modal.querySelector("#contact360Orders");
    const deliveredEl = modal.querySelector("#contact360Delivered");
    const paidEl = modal.querySelector("#contact360Paid");
    const profitEl = modal.querySelector("#contact360Profit");

    if (ordersEl)
      ordersEl.textContent =
        matchedOrders.length.toLocaleString("am-ET") +
        " | " +
        totalAmount.toLocaleString("am-ET") +
        " ብር";

    if (deliveredEl)
      deliveredEl.textContent =
        deliveredTotal.toLocaleString("am-ET") + " ብር";

    if (paidEl)
      paidEl.textContent =
        paid.toLocaleString("am-ET") +
        " ብር | ቀሪ " +
        remaining.toLocaleString("am-ET") +
        " ብር";

    if (profitEl)
      profitEl.textContent =
        profit.toLocaleString("am-ET") + " ብር";

    if (timelineBox) {
      const timeline = [];

      matchedOrders.forEach(item => {
        timeline.push({
          date: item.orderDate || item.createdAt,
          title: "🛒 አዲስ ትዕዛዝ",
          detail: item.productName || "ምርት"
        });
      });

      matchedAppointments.forEach(item => {
        timeline.push({
          date: item.createdAt,
          title: "📅 ቀጠሮ",
          detail:
            (item.date || "") +
            (item.time ? " — " + item.time : "")
        });
      });

      matchedDelivered.forEach(item => {
        timeline.push({
          date: item.deliveredAt || item.createdAt,
          title: "🎁 ስራ ተረከበ",
          detail: item.productName || "ስራ"
        });
      });

      timeline.sort(
        (a, b) => new Date(b.date) - new Date(a.date)
      );

      if (!timeline.length) {
        timelineBox.innerHTML =
          "<p>🕒 የጊዜ መስመር መረጃ የለም።</p>";
      } else {
        timelineBox.innerHTML = timeline.map(item => `
          <div class="contact-timeline-item">
            <div class="contact-timeline-dot">●</div>
            <div class="contact-timeline-content">
              <strong>${escapeHtml(item.title)}</strong>
              <span>${escapeHtml(formatDate(item.date))}</span>
              <p>${escapeHtml(item.detail)}</p>
            </div>
          </div>
        `).join("");
      }
    }

  }).catch(error => {
    console.error("Customer 360 Error:", error);

    if (timelineBox) {
      timelineBox.innerHTML =
        "<p>❌ የ360° መረጃ መጫን አልተቻለም።</p>";
    }
  });

  const ordersBox = modal.querySelector("#contactOrdersBody");
  if (ordersBox) {
    fetch("/api/orders")
      .then(r => r.json())
      .then(data => {
        const matched = orders.filter(order =>
          normalizeContactPhone(order.phone) === contactPhone
        );

        if (!matched.length) {
          ordersBox.innerHTML = "<p>📦 የትዕዛዝ ታሪክ የለም።</p>";
          return;
        }

        ordersBox.innerHTML = matched.map(order => `
          <div class="contact-order-item">
            <strong>🎁 ${escapeHtml(order.productName || "-")}</strong>
            <span>📅 ${escapeHtml(formatDate(order.orderDate || order.createdAt))}</span>
            <span>💰 ${Number(order.totalAmount || 0).toLocaleString()} ብር</span>
            <span>💳 የተከፈለ: ${Number(order.deposit || 0).toLocaleString()} ብር</span>
            <span>💳 ቀሪ: ${Number(order.remaining || 0).toLocaleString()} ብር</span>
            <span>📈 ትርፍ: ${Number(order.profit || 0).toLocaleString()} ብር</span>
            <span>📌 ${escapeHtml(order.status || "-")}</span>
          </div>
        `).join("");
      })
      .catch(() => {
        ordersBox.innerHTML = "<p>❌ የOrder መረጃ መጫን አልተቻለም።</p>";
      });
  }
}

// =====================================
// EVENTS
// =====================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        const search =
            document.getElementById(
                "contactSearch"
            );

        if (search) {
            search.addEventListener(
                "input",
                searchContacts
            );
        }

        const form =
            document.getElementById(
                "contactForm"
            );

        if (form) {
            form.addEventListener(
                "submit",
                saveContact
            );
        }

        const modal =
            document.getElementById(
                "contactFormModal"
            );

        if (modal) {

            modal.addEventListener(
                "click",
                event => {

                    if (
                        event.target === modal
                    ) {
                        closeContactForm();
                    }

                }
            );
        }

        loadContacts();
    }
);
