// ── WEBSOCKET CLIENT & STATE CONFIGURATION ──────────────────────────────────

const socketUrl = 'ws://localhost:8080';
let ws = null;
let reconnectInterval = 1000;
let maxReconnectInterval = 16000;
let reconnectTimer = null;
let pingIntervalTimer = null;
let lastPingTime = 0;

// Global state cache
let state = {
  doctors: [],
  bookings: [],
  courses: [],
  currentQuiz: null,
  currentQuizIndex: 0,
  quizAnswers: [],
  activeCourseId: null,
  locationStreamInterval: null,
  locationPacketsSent: 0,
  isLocationStreaming: false,
  currentLatitude: 12.9716, // Bengaluru Center
  currentLongitude: 77.5946,
  speechFeedback: true
};

// UI Element selectors
const elements = {
  connDot: document.getElementById('conn-dot'),
  connText: document.getElementById('conn-text'),
  reconnectBtn: document.getElementById('reconnect-btn'),
  latencyVal: document.getElementById('latency-val'),
  uptimeVal: document.getElementById('uptime-val'),
  debugConsole: document.getElementById('debug-console'),
  clearConsoleBtn: document.getElementById('clear-console-btn'),
  pingBtn: document.getElementById('ping-btn'),
  navItems: document.querySelectorAll('.nav-item'),
  tabContents: document.querySelectorAll('.tab-content'),
  
  // Status labels in Dashboard
  hcStatus: document.getElementById('healthcare-status'),
  agStatus: document.getElementById('agriculture-status'),
  lgStatus: document.getElementById('legal-status'),
  
  // Healthcare Elements
  doctorsGrid: document.getElementById('doctors-grid'),
  bookingDocSelect: document.getElementById('booking-doctor-select'),
  bookForm: document.getElementById('book-doctor-form'),
  bookingsList: document.getElementById('bookings-list'),
  successDialog: document.getElementById('booking-success-dialog'),
  dialogDetails: document.getElementById('dialog-booking-details'),
  closeDialogBtn: document.getElementById('close-dialog-btn'),

  // Agriculture Elements
  weatherRow: document.getElementById('weather-row'),
  marketGrid: document.getElementById('market-grid'),
  cropForm: document.getElementById('crop-advisor-form'),
  cropResult: document.getElementById('crop-analysis-result'),
  schemesList: document.getElementById('schemes-list'),

  // Legal Elements
  lawSearchInput: document.getElementById('law-search-input'),
  lawSearchBtn: document.getElementById('law-search-btn'),
  lawSearchResults: document.getElementById('law-search-results'),
  lawCategories: document.getElementById('law-categories'),
  advocatesList: document.getElementById('advocates-list'),
  legalDocsList: document.getElementById('legal-docs-list'),

  // Education Elements
  coursesList: document.getElementById('courses-list'),
  quizWidget: document.getElementById('quiz-widget'),
  quizBox: document.getElementById('quiz-box'),
  quizQuestionTitle: document.getElementById('quiz-question-title'),
  quizOptionsList: document.getElementById('quiz-options-list'),
  prevQuestionBtn: document.getElementById('prev-question'),
  nextQuestionBtn: document.getElementById('next-question'),
  submitQuizBtn: document.getElementById('submit-quiz'),
  quizResultBox: document.getElementById('quiz-result-box'),

  // Safety Elements
  sosBtn: document.getElementById('sos-btn'),
  sosStatus: document.getElementById('sos-alert-status'),
  streamLocBtn: document.getElementById('stream-loc-btn'),
  stopLocBtn: document.getElementById('stop-loc-btn'),
  locTelemetry: document.getElementById('location-telemetry'),
  latVal: document.getElementById('lat-val'),
  lngVal: document.getElementById('lng-val'),
  speedVal: document.getElementById('speed-val'),
  packetsVal: document.getElementById('packets-val'),
  safetyContacts: document.getElementById('safety-contacts'),
  safeZonesList: document.getElementById('safe-zones-list'),

  // JARVIS Chat Elements
  aiEngine: document.getElementById('ai-engine'),
  speechFeedbackCheckbox: document.getElementById('ai-speech-feedback'),
  chatSessionId: document.getElementById('chat-session-id'),
  chatMessageList: document.getElementById('chat-message-list'),
  chatForm: document.getElementById('chat-input-form'),
  chatInput: document.getElementById('chat-input')
};

// Generate UUID for session id
function generateUUID() {
  return 'js-session-xxxx-4xxx-yxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
const chatSessionUUID = generateUUID();
if (elements.chatSessionId) {
  elements.chatSessionId.textContent = chatSessionUUID.substring(11);
}

// ── CONNECTION LOGGER ────────────────────────────────────────────────────────

function logToConsole(message, type = 'system') {
  const line = document.createElement('div');
  line.className = `console-line ${type}`;
  line.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
  elements.debugConsole.appendChild(line);
  elements.debugConsole.scrollTop = elements.debugConsole.scrollHeight;
}

// ── WEBSOCKET CONNECTION ORCHESTRATION ────────────────────────────────────────

function connectWebSocket() {
  logToConsole(`Connecting to WebSocket server at ${socketUrl}...`, 'system');
  elements.connText.textContent = 'Connecting...';
  elements.connDot.className = 'status-dot reconnecting';
  elements.reconnectBtn.style.display = 'none';

  ws = new WebSocket(socketUrl);

  ws.onopen = () => {
    logToConsole('WebSocket connection established successfully!', 'incoming');
    elements.connText.textContent = 'Connected';
    elements.connDot.className = 'status-dot connected';
    elements.reconnectBtn.style.display = 'none';
    reconnectInterval = 1000;
    
    // Set Dashboard status labels
    elements.hcStatus.textContent = 'Connected';
    elements.agStatus.textContent = 'Connected';
    elements.lgStatus.textContent = 'Connected';

    // Start heartbeat pings
    startPings();
    
    // Load initial data
    fetchInitialData();
  };

  ws.onmessage = (event) => {
    try {
      const parsed = JSON.parse(event.data);
      
      // Log non-telemetry packets to keep console clean
      if (!(parsed.domain === 'system' && parsed.action === 'pong') && 
          !(parsed.domain === 'safety' && parsed.action === 'location_status')) {
        logToConsole(`INCOMING Packet: ${JSON.stringify(parsed)}`, 'incoming');
      }

      handleWebSocketMessage(parsed);
    } catch (err) {
      logToConsole(`Error parsing incoming packet: ${err.message}`, 'error');
    }
  };

  ws.onclose = () => {
    logToConsole('WebSocket connection closed.', 'error');
    elements.connText.textContent = 'Disconnected';
    elements.connDot.className = 'status-dot disconnected';
    elements.reconnectBtn.style.display = 'inline-flex';
    
    elements.hcStatus.textContent = 'Offline';
    elements.agStatus.textContent = 'Offline';
    elements.lgStatus.textContent = 'Offline';

    stopPings();
    scheduleReconnect();
  };

  ws.onerror = (err) => {
    logToConsole(`WebSocket connection error.`, 'error');
  };
}

function scheduleReconnect() {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  logToConsole(`Reconnecting in ${(reconnectInterval / 1000)}s...`, 'system');
  reconnectTimer = setTimeout(() => {
    connectWebSocket();
    reconnectInterval = Math.min(reconnectInterval * 2, maxReconnectInterval);
  }, reconnectInterval);
}

function sendWSMessage(domain, action, payload = {}) {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    logToConsole(`Cannot send packet. WebSocket is not connected.`, 'error');
    return false;
  }
  const packet = { domain, action, payload };
  ws.send(JSON.stringify(packet));
  
  // Log packet
  if (!(domain === 'system' && action === 'ping') && 
      !(domain === 'safety' && action === 'stream_location')) {
    logToConsole(`OUTGOING Packet: ${JSON.stringify(packet)}`, 'outgoing');
  }
  return true;
}

// Latency & Telemetry Heartbeats
function startPings() {
  if (pingIntervalTimer) clearInterval(pingIntervalTimer);
  pingIntervalTimer = setInterval(() => {
    lastPingTime = performance.now();
    sendWSMessage('system', 'ping');
  }, 10000);
}

function stopPings() {
  if (pingIntervalTimer) clearInterval(pingIntervalTimer);
}

// ── MESSAGE ROUTING ──────────────────────────────────────────────────────────

function handleWebSocketMessage(packet) {
  const { domain, action, status, data } = packet;

  if (status === 'error') {
    logToConsole(`Error response received: ${packet.message}`, 'error');
    return;
  }

  switch (domain) {
    case 'system':
      if (action === 'pong') {
        const rtt = Math.round(performance.now() - lastPingTime);
        elements.latencyVal.textContent = `${rtt} ms`;
        // Fetch server uptime
        fetch('/health')
          .then(res => res.json())
          .then(d => {
            elements.uptimeVal.textContent = `${Math.round(d.uptime)} s`;
          })
          .catch(() => {});
      }
      break;

    case 'healthcare':
      if (action === 'doctors_list') {
        state.doctors = data;
        renderDoctors();
      } else if (action === 'bookings_list') {
        state.bookings = data;
        renderBookings();
      } else if (action === 'booking_created') {
        state.bookings.unshift(data);
        renderBookings();
        showBookingSuccess(data);
      } else if (action === 'booking_cancelled') {
        const idx = state.bookings.findIndex(b => b.id === data.id);
        if (idx !== -1) {
          state.bookings[idx] = data;
          renderBookings();
        }
      }
      break;

    case 'agriculture':
      if (action === 'weather_forecast') {
        renderWeather(data);
      } else if (action === 'market_prices') {
        renderMarket(data);
      } else if (action === 'gov_schemes') {
        renderSchemes(data);
      } else if (action === 'crop_health') {
        renderCropAnalysis(data);
      }
      break;

    case 'legal':
      if (action === 'categories_list') {
        renderLegalCategories(data);
      } else if (action === 'advocates_list') {
        renderAdvocates(data);
      } else if (action === 'documents_list') {
        renderLegalDocs(data);
      } else if (action === 'search_results') {
        renderLawSearchResults(data);
      }
      break;

    case 'education':
      if (action === 'courses_list') {
        state.courses = data;
        renderCourses();
      } else if (action === 'quiz_data') {
        state.currentQuiz = data.questions;
        state.currentQuizIndex = 0;
        state.quizAnswers = Array(state.currentQuiz.length).fill(null);
        state.activeCourseId = data.courseId;
        renderQuizQuestion();
      } else if (action === 'quiz_result') {
        renderQuizResult(data);
      }
      break;

    case 'safety':
      if (action === 'contacts_list') {
        renderSafetyContacts(data);
      } else if (action === 'safe_zones_list') {
        renderSafeZones(data);
      } else if (action === 'sos_response') {
        renderSOSAlert(data);
      } else if (action === 'location_status') {
        state.locationPacketsSent++;
        elements.packetsVal.textContent = state.locationPacketsSent;
        elements.latVal.textContent = data.latitude.toFixed(6);
        elements.lngVal.textContent = data.longitude.toFixed(6);
      }
      break;

    case 'jarvis':
    case 'ai':
      if (action === 'chat_stream') {
        handleChatStream(data);
      }
      break;
  }
}

// ── RENDER PROCEDURES ────────────────────────────────────────────────────────

function fetchInitialData() {
  // Fetch lists for tabs on connection
  sendWSMessage('healthcare', 'get_doctors');
  sendWSMessage('healthcare', 'get_bookings');
  sendWSMessage('agriculture', 'get_weather');
  sendWSMessage('agriculture', 'get_market');
  sendWSMessage('agriculture', 'get_schemes');
  sendWSMessage('legal', 'get_categories');
  sendWSMessage('legal', 'get_advocates');
  sendWSMessage('legal', 'get_documents');
  sendWSMessage('education', 'get_courses');
  sendWSMessage('safety', 'get_contacts');
  sendWSMessage('safety', 'get_safe_zones');
}

// 🩺 Healthcare (Prescripto) Rendering
function renderDoctors() {
  elements.doctorsGrid.innerHTML = '';
  elements.bookingDocSelect.innerHTML = '<option value="">-- Choose Doctor --</option>';

  state.doctors.forEach(doc => {
    // Add to card grid
    const card = document.createElement('div');
    card.className = 'doctor-card';
    card.innerHTML = `
      <div class="doctor-photo-wrapper" style="background-image: url('${doc.profileImage}')">
        <span class="doctor-badge ${doc.isAvailable ? 'available' : 'unavailable'}">
          ${doc.isAvailable ? 'Available' : 'Unavailable'}
        </span>
      </div>
      <div class="doctor-info">
        <div>
          <h4>${doc.name}</h4>
          <p class="specialty">${doc.specialty}</p>
          <p style="font-size: 11px; color: var(--text-secondary);">${doc.hospital}</p>
        </div>
        <div class="doctor-stats-row">
          <span>Exp: <strong>${doc.experience} yrs</strong></span>
          <span>Fee: <strong>₹${doc.consultationFee}</strong></span>
          <span>Rating: <strong>★ ${doc.rating}</strong></span>
        </div>
      </div>
    `;
    elements.doctorsGrid.appendChild(card);

    // Add option to select menu if available
    if (doc.isAvailable) {
      const opt = document.createElement('option');
      opt.value = doc.id;
      opt.dataset.name = doc.name;
      opt.dataset.specialty = doc.specialty;
      opt.textContent = `${doc.name} (${doc.specialty})`;
      elements.bookingDocSelect.appendChild(opt);
    }
  });
}

function renderBookings() {
  elements.bookingsList.innerHTML = '';
  if (state.bookings.length === 0) {
    elements.bookingsList.innerHTML = '<p class="info-text">No active bookings found.</p>';
    return;
  }

  state.bookings.forEach(b => {
    const item = document.createElement('div');
    item.className = 'booking-item';
    
    let cancelBtn = b.status === 'Cancelled' ? '' : 
      `<button class="btn btn-sm btn-outline cancel-booking-btn" data-id="${b.id}" style="color: var(--accent-red); border-color: rgba(255,23,68,0.2);">Cancel</button>`;

    item.innerHTML = `
      <div class="booking-desc">
        <h4>${b.doctorName}</h4>
        <p>${new Date(b.appointmentDate).toLocaleString()}</p>
        <p style="font-size:10px; color: var(--text-muted);">Patient: ${b.patientName}</p>
      </div>
      <div style="display:flex; align-items:center; gap:8px;">
        <span class="booking-status ${b.status.toLowerCase()}">${b.status}</span>
        ${cancelBtn}
      </div>
    `;
    elements.bookingsList.appendChild(item);
  });

  // Attach cancel listeners
  document.querySelectorAll('.cancel-booking-btn').forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.id;
      sendWSMessage('healthcare', 'cancel_booking', { id });
    };
  });
}

function showBookingSuccess(booking) {
  elements.dialogDetails.innerHTML = `
    <strong>Doctor:</strong> ${booking.doctorName}<br>
    <strong>Patient:</strong> ${booking.patientName}<br>
    <strong>Time:</strong> ${new Date(booking.appointmentDate).toLocaleString()}<br>
    <strong>Booking ID:</strong> ${booking.id}
  `;
  elements.successDialog.showModal();
}

// 🌾 Agriculture (AgroGen) Rendering
function renderWeather(list) {
  elements.weatherRow.innerHTML = '';
  list.forEach(w => {
    const card = document.createElement('div');
    card.className = 'weather-card';
    card.innerHTML = `
      <h4>${w.day}</h4>
      <div class="cond">${w.condition}</div>
      <div class="temp">${w.tempHigh}° / ${w.tempLow}°C</div>
      <div class="hum">💧 ${w.humidity}% Hum</div>
    `;
    elements.weatherRow.appendChild(card);
  });
}

function renderMarket(prices) {
  elements.marketGrid.innerHTML = '';
  prices.forEach(p => {
    const card = document.createElement('div');
    card.className = 'market-card';
    const isUpClass = p.isUp ? 'up' : 'down';
    card.innerHTML = `
      <h4>${p.crop}</h4>
      <div class="val">${p.price}</div>
      <div class="change ${isUpClass}">${p.change}</div>
    `;
    elements.marketGrid.appendChild(card);
  });
}

function renderSchemes(list) {
  elements.schemesList.innerHTML = '';
  list.forEach(s => {
    const card = document.createElement('div');
    card.className = 'scheme-item';
    card.innerHTML = `
      <h4>${s.name}</h4>
      <p>${s.description}</p>
      <div class="date">Deadline: ${s.deadline}</div>
    `;
    elements.schemesList.appendChild(card);
  });
}

function renderCropAnalysis(data) {
  elements.cropResult.style.display = 'block';
  elements.cropResult.innerHTML = `
    <h4>Analysis: ${data.cropName} (${data.status})</h4>
    <p>Health Score: <strong>${data.healthScore}/100</strong></p>
    <ul style="list-style: none; margin-top: 8px;">
      ${data.recommendations.map(r => `<li style="margin-bottom:4px; padding-left:12px; position:relative;"><span style="color:var(--accent-green); position:absolute; left:0;">✓</span>${r}</li>`).join('')}
    </ul>
  `;
}

// ⚖️ Legal (LawGen) Rendering
function renderLegalCategories(list) {
  elements.lawCategories.innerHTML = '';
  list.forEach(cat => {
    const card = document.createElement('div');
    card.className = 'category-item';
    card.innerHTML = `
      <div class="category-item-info">
        <h4>${cat.name}</h4>
        <p>${cat.description}</p>
      </div>
      <span class="category-count">${cat.count} files</span>
    `;
    elements.lawCategories.appendChild(card);
  });
}

function renderAdvocates(list) {
  elements.advocatesList.innerHTML = '';
  list.forEach(adv => {
    const item = document.createElement('div');
    item.className = 'advocate-item';
    item.innerHTML = `
      <h4>${adv.name}</h4>
      <div class="spec">${adv.specialization} (${adv.experience})</div>
      <div class="contact-row">
        <span>📧 ${adv.email}</span>
        <span>📞 ${adv.phone}</span>
      </div>
    `;
    elements.advocatesList.appendChild(item);
  });
}

function renderLegalDocs(list) {
  elements.legalDocsList.innerHTML = '';
  list.forEach(doc => {
    const card = document.createElement('div');
    card.className = 'doc-template-item';
    card.innerHTML = `
      <h4>${doc.title}</h4>
      <div class="meta">
        <span>Category: ${doc.category}</span>
        <span>Date: ${doc.date}</span>
      </div>
    `;
    card.onclick = () => {
      alert(`Document Preview:\n\nTitle: ${doc.title}\n\nContent:\n${doc.content}`);
    };
    elements.legalDocsList.appendChild(card);
  });
}

function renderLawSearchResults(results) {
  elements.lawSearchResults.innerHTML = '';
  if (results.length === 0) {
    elements.lawSearchResults.innerHTML = '<p class="info-text">No law codes matching search criteria.</p>';
    return;
  }

  results.forEach(res => {
    const item = document.createElement('div');
    item.className = 'legal-result-item';
    item.innerHTML = `
      <h4>${res.section} : ${res.title}</h4>
      <p>${res.desc}</p>
    `;
    elements.lawSearchResults.appendChild(item);
  });
}

// 🎓 Education Rendering
function renderCourses() {
  elements.coursesList.innerHTML = '';
  state.courses.forEach(c => {
    const card = document.createElement('div');
    card.className = 'course-card';
    card.innerHTML = `
      <div class="course-card-details">
        <h4>${c.title}</h4>
        <p>${c.subtitle} (Instructor: ${c.instructor})</p>
        <div class="progress-bar-container">
          <div class="progress-bar-fill" style="width: ${c.progress}%"></div>
        </div>
      </div>
      <button class="btn btn-sm btn-outline start-exam-btn" data-id="${c.id}">Start Quiz</button>
    `;
    elements.coursesList.appendChild(card);
  });

  // Attach start exam listeners
  document.querySelectorAll('.start-exam-btn').forEach(btn => {
    btn.onclick = () => {
      const courseId = btn.dataset.id;
      sendWSMessage('education', 'get_quiz', { courseId });
    };
  });
}

function renderQuizQuestion() {
  elements.quizResultBox.style.display = 'none';
  elements.quizBox.style.display = 'block';
  elements.quizWidget.querySelector('h3').style.display = 'none';

  const q = state.currentQuiz[state.currentQuizIndex];
  elements.quizQuestionTitle.textContent = `Q${state.currentQuizIndex + 1}: ${q.question}`;
  elements.quizOptionsList.innerHTML = '';

  q.options.forEach((opt, idx) => {
    const btn = document.createElement('button');
    btn.className = `quiz-option-btn ${state.quizAnswers[state.currentQuizIndex] === idx ? 'selected' : ''}`;
    btn.textContent = opt;
    btn.onclick = () => {
      state.quizAnswers[state.currentQuizIndex] = idx;
      // Re-render select state
      document.querySelectorAll('.quiz-option-btn').forEach((b, i) => {
        b.className = `quiz-option-btn ${i === idx ? 'selected' : ''}`;
      });
    };
    elements.quizOptionsList.appendChild(btn);
  });

  // Toggle button footer visibility
  elements.prevQuestionBtn.style.display = state.currentQuizIndex > 0 ? 'inline-flex' : 'none';
  if (state.currentQuizIndex === state.currentQuiz.length - 1) {
    elements.nextQuestionBtn.style.display = 'none';
    elements.submitQuizBtn.style.display = 'inline-flex';
  } else {
    elements.nextQuestionBtn.style.display = 'inline-flex';
    elements.submitQuizBtn.style.display = 'none';
  }
}

function renderQuizResult(result) {
  elements.quizBox.style.display = 'none';
  elements.quizResultBox.style.display = 'block';
  elements.quizResultBox.innerHTML = `
    <h4>Exam Results!</h4>
    <p style="font-size:24px; font-weight:bold; margin:10px 0; color:var(--accent-yellow);">${result.score} / ${result.total}</p>
    <p style="font-size:14px; margin-bottom:12px;">Grade: ${result.percentage}%</p>
    <p style="font-size:11px; color:var(--text-secondary);">${result.feedback}</p>
    <button class="btn btn-sm btn-outline" id="retake-quiz-btn" style="margin-top:14px;">Close Test</button>
  `;

  document.getElementById('retake-quiz-btn').onclick = () => {
    elements.quizResultBox.style.display = 'none';
    elements.quizWidget.querySelector('h3').style.display = 'block';
  };
}

// 🚨 Safety / SOS Rendering
function renderSOSAlert(data) {
  elements.sosStatus.style.display = 'block';
  elements.sosStatus.innerHTML = `
    <strong style="color:var(--accent-red);">[EMERGENCY SOS ACTIVE]</strong><br>
    ${data.message}<br>
    <span style="font-size:10px; color:var(--text-muted);">${new Date(data.timestamp).toLocaleTimeString()}</span>
  `;
}

function renderSafetyContacts(list) {
  elements.safetyContacts.innerHTML = '';
  list.forEach(c => {
    const card = document.createElement('div');
    card.className = 'contact-card';
    card.innerHTML = `
      <div class="contact-card-info">
        <h4>${c.name}</h4>
        <p>${c.phone}</p>
      </div>
      <span class="relation-tag">${c.relation}</span>
    `;
    elements.safetyContacts.appendChild(card);
  });
}

function renderSafeZones(list) {
  elements.safeZonesList.innerHTML = '';
  list.forEach(z => {
    const card = document.createElement('div');
    card.className = 'zone-card';
    card.innerHTML = `
      <div class="zone-card-info">
        <h4>${z.name}</h4>
        <p>${z.address}</p>
      </div>
      <span class="dist-tag">${z.distance}</span>
    `;
    elements.safeZonesList.appendChild(card);
  });
}

// Location Streaming Simulation
function startLocationSimulation() {
  state.isLocationStreaming = true;
  state.locationPacketsSent = 0;
  elements.locTelemetry.style.display = 'flex';
  elements.streamLocBtn.style.display = 'none';
  elements.stopLocBtn.style.display = 'inline-flex';

  state.locationStreamInterval = setInterval(() => {
    // Slightly perturb coordinates to simulate walking
    state.currentLatitude += (Math.random() - 0.5) * 0.0005;
    state.currentLongitude += (Math.random() - 0.5) * 0.0005;
    const speed = Math.floor(Math.random() * 5) + 3; // 3-8 km/h

    sendWSMessage('safety', 'stream_location', {
      lat: state.currentLatitude,
      lng: state.currentLongitude,
      alt: 920.0,
      speed: speed
    });
  }, 1500);
}

function stopLocationSimulation() {
  state.isLocationStreaming = false;
  clearInterval(state.locationStreamInterval);
  elements.locTelemetry.style.display = 'none';
  elements.streamLocBtn.style.display = 'inline-flex';
  elements.stopLocBtn.style.display = 'none';
}

// 💬 JARVIS Chat Streaming Handlers
let activeBotMsgBubble = null;
let currentSynthUtterance = null;

function handleChatStream(data) {
  // If we receive the start of a stream
  if (!activeBotMsgBubble) {
    elements.chatMessageList.querySelector('.chat-msg.system')?.remove(); // remove preview message
    
    // Create new bot message container
    const botMsg = document.createElement('div');
    botMsg.className = 'chat-msg ai';
    botMsg.innerHTML = `
      <div class="avatar">🤖</div>
      <div class="text-content"></div>
    `;
    elements.chatMessageList.appendChild(botMsg);
    activeBotMsgBubble = botMsg.querySelector('.text-content');
    elements.chatMessageList.scrollTop = elements.chatMessageList.scrollHeight;
  }

  // Append character chunks
  activeBotMsgBubble.textContent += data.chunk;
  elements.chatMessageList.scrollTop = elements.chatMessageList.scrollHeight;

  // Stream end trigger
  if (data.done) {
    const fullText = activeBotMsgBubble.textContent;
    activeBotMsgBubble = null;
    elements.chatInput.disabled = false;
    elements.chatSendBtn.disabled = false;
    
    // Perform text-to-speech if enabled
    if (state.speechFeedback && window.speechSynthesis) {
      if (currentSynthUtterance) window.speechSynthesis.cancel();
      currentSynthUtterance = new SpeechSynthesisUtterance(fullText);
      // Select an English voice if possible
      const voices = window.speechSynthesis.getVoices();
      const engVoice = voices.find(v => v.lang.startsWith('en'));
      if (engVoice) currentSynthUtterance.voice = engVoice;
      window.speechSynthesis.speak(currentSynthUtterance);
    }
  }
}

// ── EVENT LISTENERS ──────────────────────────────────────────────────────────

// Tab Swapping
elements.navItems.forEach(item => {
  item.onclick = () => {
    elements.navItems.forEach(i => i.classList.remove('active'));
    elements.tabContents.forEach(c => c.classList.remove('active-content'));

    item.classList.add('active');
    const tabName = item.dataset.tab;
    document.getElementById(`tab-${tabName}`).classList.add('active-content');
  };
});

// Reconnection Button
elements.reconnectBtn.onclick = () => {
  connectWebSocket();
};

// Clear Console Log
elements.clearConsoleBtn.onclick = () => {
  elements.debugConsole.innerHTML = '<div class="console-line system">[System] Console logs cleared.</div>';
};

// Ping Button
elements.pingBtn.onclick = () => {
  lastPingTime = performance.now();
  sendWSMessage('system', 'ping');
};

// Healthcare Booking form submit
elements.bookForm.onsubmit = (e) => {
  e.preventDefault();
  const select = elements.bookingDocSelect;
  const docId = select.value;
  const docName = select.options[select.selectedIndex].dataset.name;
  const specialty = select.options[select.selectedIndex].dataset.specialty;
  const patientName = elements.bookingPatientName.value;
  const dateVal = elements.bookingDate.value;

  sendWSMessage('healthcare', 'create_booking', {
    doctorId: docId,
    doctorName: docName,
    specialty: specialty,
    patientName: patientName,
    appointmentDate: dateVal
  });

  // Reset form inputs
  elements.bookForm.reset();
};

elements.closeDialogBtn.onclick = () => {
  elements.successDialog.close();
};

// Crop Health Form Submit
elements.cropForm.onsubmit = (e) => {
  e.preventDefault();
  const crop = document.getElementById('crop-name').value;
  sendWSMessage('agriculture', 'get_crop_health', { cropName: crop });
};

// Legal Law Search
elements.lawSearchBtn.onclick = () => {
  const query = elements.lawSearchInput.value;
  sendWSMessage('legal', 'search_laws', { query });
};
elements.lawSearchInput.onkeypress = (e) => {
  if (e.key === 'Enter') {
    const query = elements.lawSearchInput.value;
    sendWSMessage('legal', 'search_laws', { query });
  }
};

// Education Quiz Buttons
elements.prevQuestionBtn.onclick = () => {
  if (state.currentQuizIndex > 0) {
    state.currentQuizIndex--;
    renderQuizQuestion();
  }
};

elements.nextQuestionBtn.onclick = () => {
  if (state.currentQuizIndex < state.currentQuiz.length - 1) {
    state.currentQuizIndex++;
    renderQuizQuestion();
  }
};

elements.submitQuizBtn.onclick = () => {
  sendWSMessage('education', 'submit_quiz', {
    courseId: state.activeCourseId,
    answers: state.quizAnswers
  });
};

// SOS Trigger
elements.sosBtn.onclick = () => {
  // Animate SOS Button
  elements.sosBtn.style.transform = 'scale(0.85)';
  setTimeout(() => { elements.sosBtn.style.transform = 'scale(1)'; }, 150);

  sendWSMessage('safety', 'trigger_sos', {
    user: 'Demo User (WebSocket Panel)',
    lat: state.currentLatitude,
    lng: state.currentLongitude
  });
};

// Location Streaming
elements.streamLocBtn.onclick = () => startLocationSimulation();
elements.stopLocBtn.onclick = () => stopLocationSimulation();

// JARVIS AI Chat Form Submit
elements.chatForm.onsubmit = (e) => {
  e.preventDefault();
  const query = elements.chatInput.value.trim();
  if (!query) return;

  // Append user bubble
  const userMsg = document.createElement('div');
  userMsg.className = 'chat-msg user';
  userMsg.innerHTML = `
    <div class="avatar">👤</div>
    <div class="text-content">${query}</div>
  `;
  elements.chatMessageList.appendChild(userMsg);
  elements.chatInput.value = '';
  elements.chatMessageList.scrollTop = elements.chatMessageList.scrollHeight;

  // Disable inputs while streaming response
  elements.chatInput.disabled = true;
  elements.chatSendBtn.disabled = true;

  // Dispatch query
  sendWSMessage(elements.aiEngine.value.toLowerCase(), 'send_chat', { message: query });
};

// Speech Synthesis Toggle
elements.speechFeedbackCheckbox.onchange = (e) => {
  state.speechFeedback = e.target.checked;
  logToConsole(`Text-To-Speech feedback ${state.speechFeedback ? 'enabled' : 'disabled'}.`);
};

// Add helper form fields mapping for Healthcare form inputs
elements.bookingPatientName = document.getElementById('booking-patient-name');
elements.bookingDate = document.getElementById('booking-date');

// Bootstrap connection
window.onload = () => {
  connectWebSocket();
  // Warm up speechSynthesis voices list cache in Chrome/Safari
  if (window.speechSynthesis) window.speechSynthesis.getVoices();
};
