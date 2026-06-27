import express from 'express';
import { WebSocketServer } from 'ws';
import http from 'http';

const app = express();
const port = 8080;
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// ── HEALTH CHECK ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    ws_port: port,
    uptime: process.uptime(),
    timestamp: new Date()
  });
});

// ── MOCK DATABASES ────────────────────────────────────────────────────────────

// 1. Healthcare (Prescripto) Data
const doctors = [
  { id: 'd001', name: 'Dr. Anjali Sharma', specialty: 'General Physician', hospital: 'City Health Centre', experience: 12, rating: 4.9, consultationFee: 500, profileImage: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=300', isAvailable: true },
  { id: 'd002', name: 'Dr. Rahul Verma', specialty: 'Cardiology', hospital: 'Apollo Hospitals', experience: 15, rating: 4.7, consultationFee: 1000, profileImage: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=300', isAvailable: true },
  { id: 'd003', name: 'Dr. Neha Singh', specialty: 'Dermatology', hospital: 'Skin & Care Clinic', experience: 8, rating: 4.8, consultationFee: 700, profileImage: 'https://images.unsplash.com/photo-1594824813573-246434de83fb?auto=format&fit=crop&q=80&w=300', isAvailable: true },
  { id: 'd004', name: 'Dr. Amit Patel', specialty: 'Dentistry', hospital: 'Bright Smile Dental', experience: 10, rating: 4.6, consultationFee: 600, profileImage: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=300', isAvailable: false },
  { id: 'd005', name: 'Dr. Priya Nair', specialty: 'Gynecology', hospital: 'Metropolis Hospital', experience: 14, rating: 4.9, consultationFee: 800, profileImage: 'https://images.unsplash.com/photo-1614608682850-e0d6ed316d47?auto=format&fit=crop&q=80&w=300', isAvailable: true },
  { id: 'd006', name: 'Dr. Vikram Mehta', specialty: 'Neurology', hospital: 'Brain & Spine Institute', experience: 18, rating: 4.9, consultationFee: 1200, profileImage: 'https://images.unsplash.com/photo-1536064485894-ce84015ef3b5?auto=format&fit=crop&q=80&w=300', isAvailable: true }
];

const bookings = [
  { id: 'b001', doctorId: 'd001', doctorName: 'Dr. Anjali Sharma', specialty: 'General Physician', patientName: 'John Doe', appointmentDate: '2026-07-02T10:30:00.000Z', status: 'Confirmed' },
  { id: 'b002', doctorId: 'd002', doctorName: 'Dr. Rahul Verma', specialty: 'Cardiology', patientName: 'Jane Smith', appointmentDate: '2026-07-03T14:00:00.000Z', status: 'Pending' }
];

// 2. Agriculture (AgroGen) Data
const weatherForecast = [
  { day: 'Today', condition: '⛅ Partly Cloudy', tempHigh: 32, tempLow: 24, humidity: 68 },
  { day: 'Tomorrow', condition: '🌧 Light Rain', tempHigh: 28, tempLow: 21, humidity: 85 },
  { day: 'Wednesday', condition: '☀️ Sunny', tempHigh: 35, tempLow: 26, humidity: 55 },
  { day: 'Thursday', condition: '🌩 Thunderstorm', tempHigh: 27, tempLow: 20, humidity: 90 },
  { day: 'Friday', condition: '⛅ Partly Cloudy', tempHigh: 31, tempLow: 23, humidity: 65 }
];

const marketPrices = [
  { crop: 'Wheat', price: '₹2,250/quintal', change: '+1.2%', isUp: true },
  { crop: 'Rice', price: '₹1,980/quintal', change: '-0.5%', isUp: false },
  { crop: 'Cotton', price: '₹6,800/quintal', change: '+2.8%', isUp: true },
  { crop: 'Soybean', price: '₹4,200/quintal', change: '+0.9%', isUp: true },
  { crop: 'Maize', price: '₹1,750/quintal', change: '-1.1%', isUp: false }
];

const agriSchemes = [
  { name: 'PM-KISAN', description: '₹6,000 annual income support for small farmers.', deadline: '30 Jun 2026' },
  { name: 'Fasal Bima Yojana', description: 'Crop insurance cover against natural calamities.', deadline: '15 Jul 2026' },
  { name: 'Soil Health Card Scheme', description: 'Free soil testing & recommendations.', deadline: 'Ongoing' }
];

const farmProfiles = [];

// 3. Legal (LawGen) Data
const advocates = [
  { id: 'adv001', name: 'Advocate Rajesh K. Sharma', title: 'Senior Supreme Court Advocate', specialization: 'Constitutional Law & Criminal Defense', experience: '18 Years', rating: 4.9, email: 'rajesh.sharma@sc-advocates.in', phone: '+91 98765 43210' },
  { id: 'adv002', name: 'Advocate Priya S. Nair', title: 'Corporate & IP Consultant', specialization: 'Company Law, Trademark & Patent', experience: '12 Years', rating: 4.8, email: 'priya.nair@ipr-associates.in', phone: '+91 80555 12345' },
  { id: 'adv003', name: 'Advocate Amit V. Patel', title: 'Family Law Specialist', specialization: 'Divorce, Custody, Mediation & Wills', experience: '10 Years', rating: 4.7, email: 'amit.patel@familylawyers.in', phone: '+91 91122 33445' }
];

const legalDocuments = [
  { title: 'Non-Disclosure Agreement', category: 'Contract', date: '12 Jun 2026', content: 'This Non-Disclosure Agreement (the "Agreement") is entered into by and between the Disclosing Party and the Receiving Party for the purpose of preventing the unauthorized disclosure of Confidential Information...' },
  { title: 'Power of Attorney', category: 'Personal', date: '08 Jun 2026', content: 'Know all men by these presents, that I, the Principal, do hereby constitute and appoint the Attorney-in-Fact to act in my name, place, and stead in any way which I myself could do, if I were personally present...' },
  { title: 'Rental Agreement Draft', category: 'Property', date: '02 Jun 2026', content: 'This Lease Agreement is made on this 2nd day of June 2026, by and between the Landlord and the Tenant. The Landlord hereby leases the premises located at MG Road to the Tenant under the following terms...' }
];

const legalCases = [
  { id: 'l001', title: 'Employment Dispute — Wrongful Termination', type: 'Labour', status: 'Active', date: '10 Jun 2026' },
  { id: 'l002', title: 'Consumer Complaint — Defective Product', type: 'Consumer', status: 'Under Review', date: '05 Jun 2026' },
  { id: 'l003', title: 'Property Boundary Dispute', type: 'Civil', status: 'Resolved', date: '01 May 2026' }
];

const lawCategories = [
  { id: 'civil', name: 'Civil & Constitutional Law', description: 'Fundamental rights, property disputes, family law, and contracts.', count: 324 },
  { id: 'criminal', name: 'Criminal & Penal Law', description: 'Penal code, police procedure, offenses, and punishments.', count: 187 },
  { id: 'corporate', name: 'Corporate & Commercial Law', description: 'Company filings, trade, business disputes, and intellectual property.', count: 215 },
  { id: 'labour', name: 'Labour & Employment Law', description: 'Workplace rights, employee disputes, wages, and pensions.', count: 96 }
];

// 4. Education (Learning) Data
const courses = [
  {
    id: 'c001',
    title: 'Python for Beginners',
    subtitle: 'Master Python from scratch with hands-on projects',
    instructor: 'Dr. Sarah Chen',
    rating: 4.7,
    duration: '12h 30m',
    level: 'Beginner',
    category: 'AI & ML',
    progress: 70,
    lessons: [
      { title: '1. Introduction to Python', duration: '45 min' },
      { title: '2. Variables & Data Types', duration: '55 min' },
      { title: '3. Control Structures', duration: '1h 10m' }
    ]
  },
  {
    id: 'c002',
    title: 'UI/UX Design Fundamentals',
    subtitle: 'Learn the basics of UI/UX design and design principles',
    instructor: 'Mark Rivera',
    rating: 4.8,
    duration: '8h 15m',
    level: 'Beginner',
    category: 'App Design',
    progress: 65,
    lessons: [
      { title: '1. Introduction to UI/UX', duration: '30 min' },
      { title: '2. Design Principles', duration: '45 min' }
    ]
  }
];

const courseQuizzes = {
  'c001': [
    { question: 'What is the correct file extension for Python files?', options: ['.pyt', '.py', '.pyw', '.pyc'], correct: 1 },
    { question: 'Which keyword is used to define a function in Python?', options: ['func', 'define', 'def', 'function'], correct: 2 },
    { question: 'What is the output of print(type([])) in Python?', options: ["<class 'list'>", "<class 'tuple'>", "<class 'dict'>", "<class 'array'>"], correct: 0 }
  ],
  'c002': [
    { question: 'What does UX stand for?', options: ['User Experience', 'User Extension', 'Unified Experience', 'Unique Xenon'], correct: 0 },
    { question: 'Which design rule describes the spacing of layouts?', options: ['Rule of Thirds', 'Grid System', 'Fitts Law', 'Contrast Ratio'], correct: 1 }
  ]
};

// 5. Safety (SafeGuard) Data
const safetyContacts = [
  { name: 'Mom', phone: '+91 98765 43210', relation: 'Family' },
  { name: 'Dad', phone: '+91 91234 56789', relation: 'Family' },
  { name: 'Riya (Friend)', phone: '+91 87654 32109', relation: 'Friend' }
];

const safeZones = [
  { name: 'City Police Station', address: 'MG Road, Sector 12', distance: '0.8 km' },
  { name: 'Apollo Hospital', address: 'Ring Road, Near Bus Stand', distance: '1.2 km' },
  { name: 'Fire Station', address: 'Industrial Area, Sector 5', distance: '2.1 km' }
];

// ── WEBSOCKET EVENT HANDLING ──────────────────────────────────────────────────

wss.on('connection', (ws) => {
  console.log(`[WebSocket] Client connected.`);
  ws.isAlive = true;

  // Heartbeat check
  ws.on('pong', () => {
    ws.isAlive = true;
  });

  // Handle incoming commands
  ws.on('message', async (message) => {
    try {
      const parsed = JSON.parse(message.toString());
      const { domain, action, payload } = parsed;

      console.log(`[WebSocket] Received message: Domain [${domain}] Action [${action}]`);

      switch (domain) {
        // Heartbeat ping
        case 'system':
          if (action === 'ping') {
            ws.send(JSON.stringify({ domain: 'system', action: 'pong', status: 'success', data: { timestamp: new Date() } }));
          }
          break;

        // Healthcare Domain (Prescripto)
        case 'healthcare':
          if (action === 'get_doctors') {
            ws.send(JSON.stringify({ domain: 'healthcare', action: 'doctors_list', status: 'success', data: doctors }));
          } else if (action === 'get_bookings') {
            ws.send(JSON.stringify({ domain: 'healthcare', action: 'bookings_list', status: 'success', data: bookings }));
          } else if (action === 'create_booking') {
            const newBooking = {
              id: 'b' + (bookings.length + 1).toString().padStart(3, '0'),
              doctorId: payload.doctorId,
              doctorName: payload.doctorName,
              specialty: payload.specialty,
              patientName: payload.patientName,
              appointmentDate: payload.appointmentDate,
              status: 'Confirmed'
            };
            bookings.push(newBooking);
            ws.send(JSON.stringify({ domain: 'healthcare', action: 'booking_created', status: 'success', data: newBooking }));
          } else if (action === 'cancel_booking') {
            const idx = bookings.findIndex(b => b.id === payload.id);
            if (idx !== -1) {
              bookings[idx].status = 'Cancelled';
              ws.send(JSON.stringify({ domain: 'healthcare', action: 'booking_cancelled', status: 'success', data: bookings[idx] }));
            } else {
              ws.send(JSON.stringify({ domain: 'healthcare', action: 'booking_cancelled', status: 'error', message: 'Booking not found.' }));
            }
          }
          break;

        // Agriculture Domain (AgroGen)
        case 'agriculture':
          if (action === 'get_weather') {
            ws.send(JSON.stringify({ domain: 'agriculture', action: 'weather_forecast', status: 'success', data: weatherForecast }));
          } else if (action === 'get_market') {
            ws.send(JSON.stringify({ domain: 'agriculture', action: 'market_prices', status: 'success', data: marketPrices }));
          } else if (action === 'get_schemes') {
            ws.send(JSON.stringify({ domain: 'agriculture', action: 'gov_schemes', status: 'success', data: agriSchemes }));
          } else if (action === 'save_farm') {
            const newProfile = { id: Date.now(), ...payload };
            farmProfiles.push(newProfile);
            ws.send(JSON.stringify({ domain: 'agriculture', action: 'farm_saved', status: 'success', data: newProfile }));
          } else if (action === 'buy_product') {
            ws.send(JSON.stringify({ domain: 'agriculture', action: 'product_bought', status: 'success', data: { orderId: 'ord' + Math.floor(Math.random() * 10000), ...payload } }));
          } else if (action === 'get_crop_health') {
            const score = Math.floor(Math.random() * 20) + 75; // 75-95
            const status = score > 85 ? 'Excellent' : 'Good';
            ws.send(JSON.stringify({
              domain: 'agriculture',
              action: 'crop_health',
              status: 'success',
              data: {
                cropName: payload.cropName || 'Rice',
                healthScore: score,
                status: status,
                recommendations: [
                  'Keep moisture levels around 65% for standard growth.',
                  'Apply nitrogen-rich fertilizer within 4 days.',
                  'Ensure proper drainage to avoid root rot.'
                ]
              }
            }));
          }
          break;

        // Legal Domain (LawGen)
        case 'legal':
          if (action === 'get_categories') {
            ws.send(JSON.stringify({ domain: 'legal', action: 'categories_list', status: 'success', data: lawCategories }));
          } else if (action === 'get_advocates') {
            ws.send(JSON.stringify({ domain: 'legal', action: 'advocates_list', status: 'success', data: advocates }));
          } else if (action === 'get_documents') {
            ws.send(JSON.stringify({ domain: 'legal', action: 'documents_list', status: 'success', data: legalDocuments }));
          } else if (action === 'get_cases') {
            ws.send(JSON.stringify({ domain: 'legal', action: 'cases_list', status: 'success', data: legalCases }));
          } else if (action === 'search_laws') {
            const query = (payload.query || '').toLowerCase();
            const results = [
              { section: 'Section 302 IPC', title: 'Punishment for Murder', desc: 'Provides penalty of death or imprisonment for life and fine.' },
              { section: 'Section 420 IPC', title: 'Cheating & Dishonestly Inducing Delivery', desc: 'Covers cheating, fraud, and illegal property acquisitions.' },
              { section: 'Section 378 IPC', title: 'Theft', desc: 'Taking movable property out of possession without consent.' },
              { section: 'BNS Section 101', title: 'Murder Provisions', desc: 'Updated provisions for criminal homicides under Bharatiya Nyaya Sanhita.' }
            ].filter(l => l.title.toLowerCase().includes(query) || l.section.toLowerCase().includes(query));
            ws.send(JSON.stringify({ domain: 'legal', action: 'search_results', status: 'success', data: results }));
          }
          break;

        // Education Domain (Learning)
        case 'education':
          if (action === 'get_courses') {
            ws.send(JSON.stringify({ domain: 'education', action: 'courses_list', status: 'success', data: courses }));
          } else if (action === 'get_quiz') {
            const quiz = courseQuizzes[payload.courseId] || [];
            ws.send(JSON.stringify({ domain: 'education', action: 'quiz_data', status: 'success', data: { courseId: payload.courseId, questions: quiz } }));
          } else if (action === 'submit_quiz') {
            const quiz = courseQuizzes[payload.courseId] || [];
            const answers = payload.answers || [];
            let score = 0;
            quiz.forEach((q, idx) => {
              if (answers[idx] === q.correct) {
                score++;
              }
            });
            const percent = Math.round((score / quiz.length) * 100);
            const feedback = percent >= 70 ? 'Excellent work! Keep it up!' : 'Review the course material and try again.';
            ws.send(JSON.stringify({
              domain: 'education',
              action: 'quiz_result',
              status: 'success',
              data: { courseId: payload.courseId, score, total: quiz.length, percentage: percent, feedback }
            }));
          }
          break;

        // Safety Domain (SafeGuard)
        case 'safety':
          if (action === 'get_contacts') {
            ws.send(JSON.stringify({ domain: 'safety', action: 'contacts_list', status: 'success', data: safetyContacts }));
          } else if (action === 'get_safe_zones') {
            ws.send(JSON.stringify({ domain: 'safety', action: 'safe_zones_list', status: 'success', data: safeZones }));
          } else if (action === 'trigger_sos') {
            console.log(`[SOS ALERT] Real-time emergency trigger for ${payload.user || 'Unknown User'}!`);
            // Broadcast SOS
            ws.send(JSON.stringify({
              domain: 'safety',
              action: 'sos_response',
              status: 'success',
              data: {
                triggered: true,
                message: 'Emergency SOS received. Dispatching GPS tracking. Alerts sent to emergency contacts via Web3Forms.',
                timestamp: new Date()
              }
            }));
          } else if (action === 'stream_location') {
            ws.send(JSON.stringify({
              domain: 'safety',
              action: 'location_status',
              status: 'success',
              data: { latitude: payload.lat, longitude: payload.lng, altitude: payload.alt, speed: payload.speed }
            }));
          }
          break;

        // JARVIS Voice Assistant & Ollama RAG Chatbot
        case 'jarvis':
        case 'ai':
          if (action === 'send_chat') {
            const query = payload.message;
            console.log(`[AI Chat Request] user: ${query}`);

            // 1. Try querying local Ollama instance if available
            try {
              const controller = new AbortController();
              const timeout = setTimeout(() => controller.abort(), 3000); // 3 seconds connect timeout
              const response = await fetch('http://127.0.0.1:11434/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model: 'llama3', prompt: query, stream: true }),
                signal: controller.signal
              }).finally(() => clearTimeout(timeout));

              if (response.ok) {
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;
                  const chunkStr = decoder.decode(value);
                  const lines = chunkStr.split('\n').filter(l => l.trim().length > 0);
                  for (const line of lines) {
                    try {
                      const json = JSON.parse(line);
                      if (json.response) {
                        ws.send(JSON.stringify({
                          domain: domain,
                          action: 'chat_stream',
                          status: 'success',
                          data: { chunk: json.response, done: false }
                        }));
                      }
                    } catch (e) {
                      // ignore parse errors
                    }
                  }
                }
                ws.send(JSON.stringify({
                  domain: domain,
                  action: 'chat_stream',
                  status: 'success',
                  data: { chunk: '', done: true }
                }));
                return;
              }
            } catch (err) {
              console.log('[Ollama] Offline or unavailable. Falling back to offline AI helper.');
            }

            // 2. Offline Fallback Chat (Word-by-word streaming generator)
            let answer = `I am your Multi-Domain AI Assistant. How can I help you today? I support learning, health bookings, crop advising, legal research, or safety SOS alerts.`;
            const lower = query.toLowerCase();
            if (lower.includes('weather') || lower.includes('farming') || lower.includes('crop') || lower.includes('soil')) {
              answer = `Regarding your farming query: For optimal crop yields, ensure your soil nitrogen levels are balanced. You can check our Agriculture tab for live weather forecasts and market prices, or consult the Crop Advisor.`;
            } else if (lower.includes('doctor') || lower.includes('health') || lower.includes('appointment') || lower.includes('pain')) {
              answer = `If you are feeling unwell, please consult a medical professional. Our Healthcare tab allows you to book an appointment with certified General Physicians, Cardiologists, and Dermatologists in real-time.`;
            } else if (lower.includes('law') || lower.includes('legal') || lower.includes('court') || lower.includes('rights')) {
              answer = `Legal Assistant Notice: In India, consumer rights are protected under the Consumer Protection Act. For detailed consultation, go to the Legal tab and view our Advocates list, or search the Indian Law Library.`;
            } else if (lower.includes('python') || lower.includes('learn') || lower.includes('course') || lower.includes('class')) {
              answer = `Ready to learn? Our Education portal features courses on Python Programming, UI/UX Design, and Machine Learning. Try taking the Python quiz to test your skill level!`;
            } else if (lower.includes('sos') || lower.includes('danger') || lower.includes('safe') || lower.includes('emergency')) {
              answer = `If you are in immediate danger, please trigger the SOS Panic Button in the Safety tab. It will instantly stream your coordinates to your emergency contacts and local security centers.`;
            }

            // Stream word by word with delay
            const words = answer.split(' ');
            let i = 0;
            const streamInterval = setInterval(() => {
              if (i < words.length) {
                ws.send(JSON.stringify({
                  domain: domain,
                  action: 'chat_stream',
                  status: 'success',
                  data: { chunk: words[i] + ' ', done: false }
                }));
                i++;
              } else {
                clearInterval(streamInterval);
                ws.send(JSON.stringify({
                  domain: domain,
                  action: 'chat_stream',
                  status: 'success',
                  data: { chunk: '', done: true }
                }));
              }
            }, 100);
          }
          break;

        default:
          ws.send(JSON.stringify({ domain: 'unknown', status: 'error', message: `Unknown domain: ${domain}` }));
          break;
      }
    } catch (err) {
      console.error(`[WebSocket] Error processing message:`, err);
      ws.send(JSON.stringify({ status: 'error', message: err.message }));
    }
  });

  ws.on('close', () => {
    console.log(`[WebSocket] Client disconnected.`);
  });
});

// Periodic heartbeat to keep connections alive
setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

// Listen
server.listen(port, () => {
  console.log(`================================================`);
  console.log(` WebSocket Server running on ws://localhost:${port}`);
  console.log(` Health status available on http://localhost:${port}/health`);
  console.log(`================================================`);
});