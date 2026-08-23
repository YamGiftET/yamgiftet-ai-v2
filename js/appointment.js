// =====================================
// YamGiftET AI v2
// Appointment Manager
// =====================================

let appointments = [];

function addAppointment(name, phone, date, time) {
  
  const appointment = {
    
    id: Date.now(),
    
    name: name,
    
    phone: phone,
    
    date: date,
    
    time: time
    
  };
  
  appointments.push(appointment);
  
  console.log("📅 Appointment Added");
  
  console.log(appointment);
  
  saveAppointments();
  
}

function saveAppointments() {
  
  localStorage.setItem(
    
    "yamgift_appointments",
    
    JSON.stringify(appointments)
    
  );
  
}

function loadAppointments() {
  
  const data = localStorage.getItem(
    
    "yamgift_appointments"
    
  );
  
  if (data) {
    
    appointments = JSON.parse(data);
    
  }
  
}

function appointmentCount() {
  
  return appointments.length;
  
}

loadAppointments();

console.log(
  
  "📅 Total Appointments:",
  
  appointmentCount()
  
);