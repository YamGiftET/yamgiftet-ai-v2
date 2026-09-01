// =====================================
// YamGiftET AI v2
// Appointment Manager — Firestore API
// =====================================

let appointments = [];

const APPOINTMENTS_API = "/api/appointments";

// -------------------------------------
// GET APPOINTMENTS
// -------------------------------------
async function loadAppointments() {
  try {
    const response = await fetch(APPOINTMENTS_API);
    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || "ቀጠሮዎችን ማምጣት አልተቻለም።");
    }

    appointments = Array.isArray(data.appointments)
      ? data.appointments
      : [];

    return appointments;
  } catch (error) {
    console.error("Appointments LOAD Error:", error);
    appointments = [];
    throw error;
  }
}

// -------------------------------------
// ADD APPOINTMENT
// -------------------------------------
async function addAppointment(name, phone, date, time) {
  const appointment = {
    name: String(name || "").trim(),
    phone: String(phone || "").trim(),
    date: String(date || "").trim(),
    time: String(time || "").trim()
  };

  if (
    !appointment.name ||
    !appointment.phone ||
    !appointment.date ||
    !appointment.time
  ) {
    throw new Error("ስም፣ ስልክ፣ ቀን እና ሰዓት ያስፈልጋሉ።");
  }

  try {
    const response = await fetch(APPOINTMENTS_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(appointment)
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || "ቀጠሮውን ማስቀመጥ አልተቻለም።");
    }

    console.log("📅 Appointment Added:", data.appointment);

    await loadAppointments();

    return data.appointment;
  } catch (error) {
    console.error("Appointments CREATE Error:", error);
    throw error;
  }
}

// -------------------------------------
// UPDATE APPOINTMENT
// -------------------------------------
async function updateAppointment(id, name, phone, date, time) {
  const appointment = {
    name: String(name || "").trim(),
    phone: String(phone || "").trim(),
    date: String(date || "").trim(),
    time: String(time || "").trim()
  };

  if (
    !appointment.name ||
    !appointment.phone ||
    !appointment.date ||
    !appointment.time
  ) {
    throw new Error("ስም፣ ስልክ፣ ቀን እና ሰዓት ያስፈልጋሉ።");
  }

  try {
    const response = await fetch(
      `${APPOINTMENTS_API}/${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(appointment)
      }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || "ቀጠሮውን ማስተካከል አልተቻለም።");
    }

    console.log("✏️ Appointment Updated:", data.appointment);

    await loadAppointments();

    return data.appointment;
  } catch (error) {
    console.error("Appointments UPDATE Error:", error);
    throw error;
  }
}

// -------------------------------------
// DELETE → UNIVERSAL TRASH
// -------------------------------------
async function deleteAppointment(id) {
  if (!id) {
    throw new Error("Appointment ID ያስፈልጋል።");
  }

  try {
    const response = await fetch(
      `${APPOINTMENTS_API}/${encodeURIComponent(id)}`,
      {
        method: "DELETE"
      }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || "ቀጠሮውን መሰረዝ አልተቻለም።");
    }

    console.log("🗑️ Appointment moved to Universal Trash:", data);

    await loadAppointments();

    return data;
  } catch (error) {
    console.error("Appointments DELETE Error:", error);
    throw error;
  }
}

// -------------------------------------
// COUNT
// -------------------------------------
function appointmentCount() {
  return appointments.length;
}

console.log("📅 Appointment Manager — Firestore API Ready");
