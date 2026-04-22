import { useState, useEffect } from "react";
import supabase from "./supabase";

function uid() { return Math.random().toString(36).slice(2, 9).toUpperCase(); }
function generateOTP() { return Math.floor(100000 + Math.random() * 900000).toString(); }

const C = {
  bg: "#F5F7FA", card: "#FFFFFF", primary: "#1A6B8A", primaryLight: "#E8F4F8",
  accent: "#2ECC9B", accentLight: "#E8FAF4", danger: "#E74C3C", dangerLight: "#FDECEA",
  warning: "#F39C12", warningLight: "#FEF9E7",
  text: "#1A2B3C", muted: "#7A8FA6", border: "#E2EAF0",
  shadow: "0 2px 12px rgba(26,107,138,0.08)",
};

const s = {
  page: { minHeight: "100vh", background: C.bg, fontFamily: "'Palatino Linotype', Georgia, serif", color: C.text },
  card: { background: C.card, borderRadius: 16, boxShadow: C.shadow, border: `1px solid ${C.border}` },
  input: { width: "100%", boxSizing: "border-box", border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "10px 14px", fontSize: 14, fontFamily: "inherit", color: C.text, background: "#fff", outline: "none" },
  label: { fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 1, textTransform: "uppercase", display: "block", marginBottom: 6 },
  btn: (v = "primary") => ({ padding: "10px 20px", borderRadius: 10, border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: 14, background: v === "primary" ? C.primary : v === "accent" ? C.accent : v === "danger" ? C.danger : v === "warning" ? C.warning : "#EDF2F7", color: v === "ghost" ? C.muted : "#fff" }),
  badge: (color) => ({ display: "inline-block", borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700, background: color + "22", color, border: `1px solid ${color}44` }),
};

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) fetchUserProfile(session.user.id);
      else setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) fetchUserProfile(session.user.id);
      else { setCurrentUser(null); setLoading(false); }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function fetchUserProfile(userId) {
    const { data } = await supabase.from("users").select("*").eq("id", userId).single();
    if (data) setCurrentUser(data);
    setLoading(false);
  }

  const logout = async () => { await supabase.auth.signOut(); };

  if (loading) return <div style={{ ...s.page, display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ textAlign: "center" }}><div style={{ fontSize: 48, marginBottom: 16 }}>🏥</div><p style={{ color: C.muted }}>Loading MediConnect...</p></div></div>;
  if (!currentUser) return <AuthScreen onLogin={setCurrentUser} />;
  if (currentUser.role === "admin") return <AdminDashboard user={currentUser} onLogout={logout} />;
  if (currentUser.role === "doctor") return <DoctorDashboard user={currentUser} onLogout={logout} />;
  if (currentUser.role === "patient") return <PatientDashboard user={currentUser} onLogout={logout} />;
}

function AuthScreen({ onLogin }) {
  const [tab, setTab] = useState("login");
  const [role, setRole] = useState("patient");
  const [form, setForm] = useState({ name: "", email: "", password: "", specialization: "", age: "", bloodGroup: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setLoading(true); setError("");
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
      if (error) throw error;
      const { data: profile } = await supabase.from("users").select("*").eq("id", data.user.id).single();
      if (!profile) throw new Error("Profile not found.");
      if (!profile.approved && profile.role !== "admin") throw new Error("Account pending admin approval.");
      onLogin(profile);
    } catch (err) { setError(err.message); }
    setLoading(false);
  }

  async function handleRegister() {
    if (!form.name || !form.email || !form.password) return setError("Please fill all required fields.");
    setLoading(true); setError("");
    try {
      const { data, error } = await supabase.auth.signUp({ email: form.email, password: form.password });
      if (error) throw error;
      const newProfile = { id: data.user.id, name: form.name, email: form.email, role, unique_id: role === "doctor" ? `DOC-${uid()}` : `PAT-${uid()}`, approved: false, specialization: form.specialization || null, age: form.age ? parseInt(form.age) : null, blood_group: form.bloodGroup || null, password_hash: "supabase-auth" };
      const { error: profileError } = await supabase.from("users").insert(newProfile);
      if (profileError) throw profileError;
      setTab("login");
      setForm({ name: "", email: "", password: "", specialization: "", age: "", bloodGroup: "" });
      alert("Registration successful! Please wait for admin approval.");
    } catch (err) { setError(err.message); }
    setLoading(false);
  }

  return (
    <div style={{ ...s.page, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🏥</div>
          <h1 style={{ margin: 0, fontSize: 28, color: C.primary }}>MediConnect</h1>
          <p style={{ margin: "4px 0 0", color: C.muted, fontSize: 13 }}>Clinic Management Portal</p>
        </div>
        <div style={{ ...s.card, padding: 28 }}>
          <div style={{ display: "flex", background: C.bg, borderRadius: 10, padding: 4, marginBottom: 24 }}>
            {["login", "register"].map(t => (
              <button key={t} onClick={() => { setTab(t); setError(""); }} style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "none", fontFamily: "inherit", fontSize: 13, cursor: "pointer", background: tab === t ? C.card : "transparent", color: tab === t ? C.primary : C.muted, fontWeight: tab === t ? 700 : 400 }}>{t === "login" ? "Login" : "Register"}</button>
            ))}
          </div>
          {tab === "register" && (
            <div style={{ marginBottom: 16 }}>
              <label style={s.label}>I am a</label>
              <div style={{ display: "flex", gap: 8 }}>
                {["patient", "doctor"].map(r => (
                  <button key={r} onClick={() => setRole(r)} style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: `2px solid ${role === r ? C.primary : C.border}`, background: role === r ? C.primaryLight : "#fff", color: role === r ? C.primary : C.muted, cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: 13 }}>{r === "doctor" ? "👨‍⚕️ Doctor" : "🧑 Patient"}</button>
                ))}
              </div>
            </div>
          )}
          {tab === "register" && <Field label="Full Name" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="Your full name" />}
          <Field label="Email" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} placeholder="email@example.com" type="email" />
          <Field label="Password" value={form.password} onChange={v => setForm(f => ({ ...f, password: v }))} placeholder="Password (min 6 chars)" type="password" />
          {tab === "register" && role === "doctor" && <Field label="Specialization" value={form.specialization} onChange={v => setForm(f => ({ ...f, specialization: v }))} placeholder="e.g. Cardiologist" />}
          {tab === "register" && role === "patient" && (
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}><Field label="Age" value={form.age} onChange={v => setForm(f => ({ ...f, age: v }))} placeholder="25" type="number" /></div>
              <div style={{ flex: 1 }}><Field label="Blood Group" value={form.bloodGroup} onChange={v => setForm(f => ({ ...f, bloodGroup: v }))} placeholder="O+" /></div>
            </div>
          )}
          {error && <p style={{ color: C.danger, fontSize: 13, marginBottom: 14, padding: "8px 12px", background: C.dangerLight, borderRadius: 8 }}>{error}</p>}
          <button onClick={tab === "login" ? handleLogin : handleRegister} disabled={loading} style={{ ...s.btn("primary"), width: "100%", padding: "12px", opacity: loading ? 0.7 : 1 }}>
            {loading ? "Please wait..." : tab === "login" ? "Login" : "Register"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AdminDashboard({ user, onLogout }) {
  const [tab, setTab] = useState("overview");
  const [users, setUsers] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    const { data: u } = await supabase.from("users").select("*").order("created_at", { ascending: false });
    const { data: rx } = await supabase.from("prescriptions").select("*");
    setUsers(u || []); setPrescriptions(rx || []);
  }

  const doctors = users.filter(u => u.role === "doctor");
  const patients = users.filter(u => u.role === "patient");
  const pending = users.filter(u => u.role !== "admin" && !u.approved);

  async function approve(id) { await supabase.from("users").update({ approved: true }).eq("id", id); fetchData(); }
  async function reject(id) { await supabase.from("users").delete().eq("id", id); fetchData(); }

  return (
    <Layout user={user} onLogout={onLogout} role="admin"
      tabs={[["overview", "📊 Overview"], ["doctors", "👨‍⚕️ Doctors"], ["patients", "🧑 Patients"], ["pending", `⏳ Pending${pending.length ? ` (${pending.length})` : ""}`]]}
      activeTab={tab} onTabChange={setTab}
    >
      {tab === "overview" && (
        <div>
          <h2 style={headingStyle}>Dashboard Overview</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 28 }}>
            <StatCard icon="👨‍⚕️" label="Doctors" value={doctors.length} color={C.primary} />
            <StatCard icon="🧑" label="Patients" value={patients.length} color={C.accent} />
            <StatCard icon="📋" label="Prescriptions" value={prescriptions.length} color="#9B59B6" />
            <StatCard icon="⏳" label="Pending" value={pending.length} color={C.danger} />
          </div>
          {pending.length > 0 && <><h3 style={{ color: C.danger, fontSize: 15, marginBottom: 12 }}>⚠️ Pending Approvals</h3>{pending.map(u => <PendingCard key={u.id} user={u} onApprove={() => approve(u.id)} onReject={() => reject(u.id)} />)}</>}
          {pending.length === 0 && <Empty text="No pending approvals!" />}
        </div>
      )}
      {tab === "doctors" && <div><h2 style={headingStyle}>Registered Doctors</h2>{doctors.length === 0 ? <Empty text="No doctors yet." /> : doctors.map(d => <UserCard key={d.id} user={d} extra={d.specialization} onDelete={() => reject(d.id)} />)}</div>}
      {tab === "patients" && <div><h2 style={headingStyle}>Registered Patients</h2>{patients.length === 0 ? <Empty text="No patients yet." /> : patients.map(p => <UserCard key={p.id} user={p} extra={`Age ${p.age} • ${p.blood_group}`} onDelete={() => reject(p.id)} />)}</div>}
      {tab === "pending" && <div><h2 style={headingStyle}>Pending Approvals</h2>{pending.length === 0 ? <Empty text="No pending approvals." /> : pending.map(u => <PendingCard key={u.id} user={u} onApprove={() => approve(u.id)} onReject={() => reject(u.id)} />)}</div>}
    </Layout>
  );
}

function DoctorDashboard({ user, onLogout }) {
  const [tab, setTab] = useState("find");
  const [searchId, setSearchId] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [searchError, setSearchError] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpInput, setOtpInput] = useState("");
  const [otpError, setOtpError] = useState("");
  const [accessGranted, setAccessGranted] = useState(false);
  const [patientPrescriptions, setPatientPrescriptions] = useState([]);
  const [showRxForm, setShowRxForm] = useState(false);
  const [myPrescriptions, setMyPrescriptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [otpRequestId, setOtpRequestId] = useState(null);

  useEffect(() => { fetchMyPrescriptions(); }, []);

  async function fetchMyPrescriptions() {
    const { data } = await supabase.from("prescriptions").select(`*, prescription_medicines(*), patient:patient_id(name, unique_id, age, blood_group)`).eq("doctor_id", user.id).order("date", { ascending: false });
    setMyPrescriptions(data || []);
  }

  async function searchPatient() {
    setSearchError(""); setSearchResult(null); setOtpSent(false); setAccessGranted(false);
    const { data } = await supabase.from("users").select("*").eq("unique_id", searchId.trim().toUpperCase()).eq("role", "patient").eq("approved", true).single();
    if (data) setSearchResult(data);
    else setSearchError("No patient found with this ID.");
  }

  async function sendOTP() {
    setLoading(true);
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const { data: otpData } = await supabase.from("otp_requests").insert({
      doctor_id: user.id, patient_id: searchResult.id, otp_code: otp, expires_at: expiresAt,
    }).select().single();
    setOtpCode(otp);
    setOtpRequestId(otpData?.id);
    setOtpSent(true);
    setLoading(false);
  }

  async function verifyOTP() {
    // Check if patient approved this OTP
    const { data: otpData } = await supabase.from("otp_requests").select("*").eq("id", otpRequestId).single();
    
    if (otpData?.patient_approved) {
      setAccessGranted(true);
      setOtpError("");
      const { data } = await supabase.from("prescriptions").select(`*, prescription_medicines(*), doctor:doctor_id(name, specialization)`).eq("patient_id", searchResult.id).order("date", { ascending: false });
      setPatientPrescriptions(data || []);
    } else if (otpInput === otpCode) {
      setAccessGranted(true);
      setOtpError("");
      const { data } = await supabase.from("prescriptions").select(`*, prescription_medicines(*), doctor:doctor_id(name, specialization)`).eq("patient_id", searchResult.id).order("date", { ascending: false });
      setPatientPrescriptions(data || []);
    } else {
      setOtpError("Invalid OTP or patient hasn't approved yet. Try again.");
    }
  }

  async function savePrescription(rxData) {
    const { data: rx, error } = await supabase.from("prescriptions").insert({ diagnosis: rxData.diagnosis, notes: rxData.notes, doctor_id: user.id, patient_id: searchResult.id }).select().single();
    if (error) { alert("Error saving prescription!"); return; }
    await supabase.from("prescription_medicines").insert(rxData.medicines.map(m => ({ medicine_name: m.name, dosage: m.dosage, frequency: m.frequency, duration: m.duration, prescription_id: rx.id })));
    setShowRxForm(false);
    fetchMyPrescriptions();
    const { data } = await supabase.from("prescriptions").select(`*, prescription_medicines(*), doctor:doctor_id(name, specialization)`).eq("patient_id", searchResult.id).order("date", { ascending: false });
    setPatientPrescriptions(data || []);
    alert("Prescription saved!");
  }

  function resetSearch() {
    setSearchId(""); setSearchResult(null); setOtpSent(false);
    setOtpCode(""); setOtpInput(""); setOtpError("");
    setAccessGranted(false); setPatientPrescriptions([]);
    setShowRxForm(false); setOtpRequestId(null);
  }

  return (
    <Layout user={user} onLogout={onLogout} role="doctor"
      tabs={[["find", "🔍 Find Patient"], ["myprescriptions", "📋 My Prescriptions"]]}
      activeTab={tab} onTabChange={(t) => { setTab(t); resetSearch(); }} subtitle={user.specialization}
    >
      {tab === "find" && !showRxForm && (
        <div>
          <h2 style={headingStyle}>Find Patient</h2>

          {!searchResult && (
            <div style={{ ...s.card, padding: 20, marginBottom: 20 }}>
              <div style={{ fontWeight: 700, color: C.primary, marginBottom: 8 }}>Step 1: Enter Patient Unique ID</div>
              <div style={{ display: "flex", gap: 10 }}>
                <input value={searchId} onChange={e => setSearchId(e.target.value)} onKeyDown={e => e.key === "Enter" && searchPatient()} placeholder="e.g. PAT-ABC123" style={{ ...s.input, marginBottom: 0 }} />
                <button onClick={searchPatient} style={s.btn("primary")}>Search</button>
              </div>
              {searchError && <p style={{ color: C.danger, fontSize: 13, marginTop: 10 }}>{searchError}</p>}
            </div>
          )}

          {searchResult && !otpSent && (
            <div style={{ ...s.card, padding: 20, marginBottom: 20 }}>
              <div style={{ fontWeight: 700, color: C.primary, marginBottom: 12 }}>Step 2: Patient Found</div>
              <div style={{ padding: 16, background: C.accentLight, borderRadius: 12, marginBottom: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{searchResult.name}</div>
                <div style={{ color: C.muted, fontSize: 13 }}>{searchResult.unique_id} • Age {searchResult.age} • {searchResult.blood_group}</div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={resetSearch} style={{ ...s.btn("ghost"), flex: 1 }}>← Back</button>
                <button onClick={sendOTP} disabled={loading} style={{ ...s.btn("primary"), flex: 2 }}>
                  {loading ? "Sending..." : "📲 Send Access Request to Patient"}
                </button>
              </div>
            </div>
          )}

          {searchResult && otpSent && !accessGranted && (
            <div style={{ ...s.card, padding: 20, marginBottom: 20 }}>
              <div style={{ fontWeight: 700, color: C.primary, marginBottom: 12 }}>Step 3: Waiting for Patient Approval</div>
              <div style={{ padding: 16, background: C.warningLight, borderRadius: 12, marginBottom: 16, border: `1px solid ${C.warning}44` }}>
                <div style={{ fontWeight: 700, color: C.warning, marginBottom: 4 }}>⏳ Request Sent!</div>
                <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>Patient ke app mein OTP request gayi hai. Patient OTP approve karega aur tumhe batayega.</p>
              </div>
              <Field label="Patient ne OTP bataya? Enter karo:" value={otpInput} onChange={setOtpInput} placeholder="6-digit OTP" />
              {otpError && <p style={{ color: C.danger, fontSize: 13, marginBottom: 10 }}>{otpError}</p>}
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={resetSearch} style={{ ...s.btn("ghost"), flex: 1 }}>← Back</button>
                <button onClick={verifyOTP} style={{ ...s.btn("primary"), flex: 2 }}>✓ Verify & Get Access</button>
              </div>
            </div>
          )}

          {searchResult && accessGranted && (
            <div>
              <div style={{ ...s.card, padding: 16, marginBottom: 20, background: C.accentLight, border: `1px solid ${C.accent}44` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>✅ Access Granted — {searchResult.name}</div>
                    <div style={{ color: C.muted, fontSize: 13 }}>{searchResult.unique_id} • Age {searchResult.age} • {searchResult.blood_group}</div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => setShowRxForm(true)} style={s.btn("primary")}>✍️ Write Rx</button>
                    <button onClick={resetSearch} style={s.btn("ghost")}>✕</button>
                  </div>
                </div>
              </div>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>All Prescriptions ({patientPrescriptions.length})</h3>
              {patientPrescriptions.length === 0 ? <Empty text="No prescriptions yet." /> :
                patientPrescriptions.map(rx => <RxCard key={rx.id} rx={rx} showDoctor doctor={rx.doctor} />)}
            </div>
          )}
        </div>
      )}

      {tab === "find" && showRxForm && (
        <PrescriptionForm patient={searchResult} onSave={savePrescription} onCancel={() => setShowRxForm(false)} />
      )}

      {tab === "myprescriptions" && (
        <div>
          <h2 style={headingStyle}>My Prescriptions</h2>
          {myPrescriptions.length === 0 ? <Empty text="No prescriptions yet." /> :
            myPrescriptions.map(rx => <RxCard key={rx.id} rx={rx} showPatient patient={rx.patient} />)}
        </div>
      )}
    </Layout>
  );
}

function PatientDashboard({ user, onLogout }) {
  const [tab, setTab] = useState("requests");
  const [prescriptions, setPrescriptions] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);

  useEffect(() => {
    fetchPrescriptions();
    fetchPendingRequests();
    // Poll every 10 seconds for new requests
    const interval = setInterval(fetchPendingRequests, 10000);
    return () => clearInterval(interval);
  }, []);

  async function fetchPrescriptions() {
    const { data } = await supabase.from("prescriptions").select(`*, prescription_medicines(*), doctor:doctor_id(name, specialization)`).eq("patient_id", user.id).order("date", { ascending: false });
    setPrescriptions(data || []);
  }

  async function fetchPendingRequests() {
    const { data } = await supabase
      .from("otp_requests")
      .select(`*, doctor:doctor_id(name, specialization)`)
      .eq("patient_id", user.id)
      .eq("used", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });
    setPendingRequests(data || []);
  }

  async function approveRequest(request) {
    await supabase.from("otp_requests").update({ patient_approved: true, used: true }).eq("id", request.id);
    alert(`OTP approved! Share this OTP with Dr. ${request.doctor?.name}: ${request.otp_code}`);
    fetchPendingRequests();
  }

  async function rejectRequest(requestId) {
    await supabase.from("otp_requests").update({ used: true }).eq("id", requestId);
    fetchPendingRequests();
  }

  return (
    <Layout user={user} onLogout={onLogout} role="patient"
      tabs={[
        ["requests", `🔔 Requests${pendingRequests.length ? ` (${pendingRequests.length})` : ""}`],
        ["prescriptions", "📋 Prescriptions"],
        ["profile", "👤 Profile"]
      ]}
      activeTab={tab} onTabChange={setTab} subtitle={`ID: ${user.unique_id}`}
    >
      {tab === "requests" && (
        <div>
          <h2 style={headingStyle}>Doctor Access Requests</h2>
          {pendingRequests.length === 0 ? (
            <div>
              <Empty text="No pending requests." />
              <p style={{ textAlign: "center", color: C.muted, fontSize: 13 }}>Jab koi doctor tumhara data access karna chahega — yahan dikhega!</p>
            </div>
          ) : (
            pendingRequests.map(req => (
              <div key={req.id} style={{ ...s.card, padding: 20, marginBottom: 14, borderLeft: `4px solid ${C.warning}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
                      👨‍⚕️ Dr. {req.doctor?.name}
                    </div>
                    <div style={{ color: C.muted, fontSize: 13, marginBottom: 4 }}>
                      {req.doctor?.specialization}
                    </div>
                    <div style={{ color: C.muted, fontSize: 12 }}>
                      Request time: {new Date(req.created_at).toLocaleTimeString()}
                    </div>
                    <div style={{ marginTop: 8, padding: "6px 12px", background: C.warningLight, borderRadius: 8, fontSize: 13, color: C.warning, fontWeight: 600 }}>
                      ⚠️ Ye doctor tumhari saari prescriptions dekhna chahta hai
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                  <button onClick={() => rejectRequest(req.id)} style={{ ...s.btn("danger"), flex: 1 }}>✕ Reject</button>
                  <button onClick={() => approveRequest(req)} style={{ ...s.btn("accent"), flex: 2 }}>✓ Approve & Show OTP</button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "prescriptions" && (
        <div>
          <h2 style={headingStyle}>My Prescriptions ({prescriptions.length})</h2>
          {prescriptions.length === 0 ? <Empty text="No prescriptions yet." /> :
            prescriptions.map(rx => <RxCard key={rx.id} rx={rx} showDoctor doctor={rx.doctor} />)}
        </div>
      )}

      {tab === "profile" && (
        <div>
          <h2 style={headingStyle}>My Profile</h2>
          <div style={{ ...s.card, padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
              <div style={{ width: 64, height: 64, borderRadius: 16, background: C.primaryLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>🧑</div>
              <div><div style={{ fontWeight: 700, fontSize: 20 }}>{user.name}</div><div style={{ color: C.muted, fontSize: 13 }}>{user.email}</div></div>
            </div>
            {[["Unique ID", user.unique_id], ["Age", user.age], ["Blood Group", user.blood_group]].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
                <span style={{ color: C.muted, fontSize: 13 }}>{k}</span><span style={{ fontWeight: 600 }}>{v || "—"}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Layout>
  );
}

function PrescriptionForm({ patient, onSave, onCancel }) {
  const [diagnosis, setDiagnosis] = useState("");
  const [notes, setNotes] = useState("");
  const [medicines, setMedicines] = useState([{ name: "", dosage: "", frequency: "", duration: "" }]);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <button onClick={onCancel} style={{ ...s.btn("ghost"), padding: "8px 12px" }}>← Back</button>
        <h2 style={{ ...headingStyle, margin: 0 }}>Write Prescription</h2>
      </div>
      <div style={{ ...s.card, padding: 16, marginBottom: 20, background: C.primaryLight }}>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>PATIENT</div>
        <div style={{ fontWeight: 700, fontSize: 16 }}>{patient.name}</div>
        <div style={{ color: C.muted, fontSize: 13 }}>{patient.unique_id} • Age {patient.age} • {patient.blood_group}</div>
      </div>
      <Field label="Diagnosis" value={diagnosis} onChange={setDiagnosis} placeholder="e.g. Hypertension" />
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <label style={s.label}>Medicines</label>
          <button onClick={() => setMedicines(p => [...p, { name: "", dosage: "", frequency: "", duration: "" }])} style={{ ...s.btn("accent"), padding: "6px 14px", fontSize: 12 }}>+ Add</button>
        </div>
        {medicines.map((med, i) => (
          <div key={i} style={{ ...s.card, padding: 14, marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontWeight: 600, color: C.primary, fontSize: 13 }}>Medicine {i + 1}</span>
              {medicines.length > 1 && <button onClick={() => setMedicines(p => p.filter((_, idx) => idx !== i))} style={{ background: "none", border: "none", color: C.danger, cursor: "pointer", fontSize: 16 }}>✕</button>}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Field label="Name" value={med.name} onChange={v => setMedicines(p => p.map((m, idx) => idx === i ? { ...m, name: v } : m))} placeholder="Medicine name" noMargin />
              <Field label="Dosage" value={med.dosage} onChange={v => setMedicines(p => p.map((m, idx) => idx === i ? { ...m, dosage: v } : m))} placeholder="500mg" noMargin />
              <Field label="Frequency" value={med.frequency} onChange={v => setMedicines(p => p.map((m, idx) => idx === i ? { ...m, frequency: v } : m))} placeholder="2x daily" noMargin />
              <Field label="Duration" value={med.duration} onChange={v => setMedicines(p => p.map((m, idx) => idx === i ? { ...m, duration: v } : m))} placeholder="7 days" noMargin />
            </div>
          </div>
        ))}
      </div>
      <Field label="Notes (optional)" value={notes} onChange={setNotes} placeholder="Additional advice..." textarea />
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={onCancel} style={{ ...s.btn("ghost"), flex: 1 }}>Cancel</button>
        <button onClick={() => { if (!diagnosis.trim()) return alert("Please enter diagnosis."); if (medicines.some(m => !m.name.trim())) return alert("Fill all medicine names."); onSave({ diagnosis, notes, medicines }); }} style={{ ...s.btn("primary"), flex: 2 }}>💾 Save Prescription</button>
      </div>
    </div>
  );
}

function RxCard({ rx, doctor, patient, showDoctor, showPatient }) {
  const [open, setOpen] = useState(false);
  const medicines = rx.prescription_medicines || [];
  return (
    <div style={{ ...s.card, marginBottom: 12, overflow: "hidden" }}>
      <div onClick={() => setOpen(o => !o)} style={{ padding: "14px 18px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{rx.diagnosis}</div>
          <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>{showDoctor && doctor && `Dr. ${doctor.name} • `}{showPatient && patient && `${patient.name} • `}{rx.date}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={s.badge(C.primary)}>{medicines.length} med{medicines.length !== 1 ? "s" : ""}</span>
          <span style={{ color: C.muted, fontSize: 18 }}>{open ? "▲" : "▼"}</span>
        </div>
      </div>
      {open && (
        <div style={{ borderTop: `1px solid ${C.border}`, padding: "14px 18px", background: "#FAFCFF" }}>
          {showDoctor && doctor && <div style={{ marginBottom: 12, padding: 10, background: C.primaryLight, borderRadius: 8 }}><span style={{ fontSize: 12, color: C.muted }}>Prescribed by: </span><strong>{doctor.name}</strong><span style={{ color: C.muted, fontSize: 12 }}> ({doctor.specialization})</span></div>}
          {showPatient && patient && <div style={{ marginBottom: 12, padding: 10, background: C.accentLight, borderRadius: 8 }}><span style={{ fontSize: 12, color: C.muted }}>Patient: </span><strong>{patient.name}</strong><span style={{ color: C.muted, fontSize: 12 }}> ({patient.unique_id})</span></div>}
          {medicines.map((m, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 8, padding: "8px 0", borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
              <span style={{ fontWeight: 600 }}>💊 {m.medicine_name}</span>
              <span style={{ color: C.muted }}>{m.dosage}</span>
              <span style={{ color: C.muted }}>{m.frequency}</span>
              <span style={{ color: C.muted }}>{m.duration}</span>
            </div>
          ))}
          {rx.notes && <div style={{ marginTop: 10, padding: 10, background: "#FFF9E6", borderRadius: 8, fontSize: 13, color: "#7A6030" }}>📝 {rx.notes}</div>}
        </div>
      )}
    </div>
  );
}

function Layout({ user, onLogout, role, tabs, activeTab, onTabChange, subtitle, children }) {
  const roleColors = { admin: "#E74C3C", doctor: C.primary, patient: C.accent };
  const roleColor = roleColors[role];
  return (
    <div style={s.page}>
      <div style={{ background: "#fff", borderBottom: `3px solid ${roleColor}`, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 26 }}>🏥</span>
            <div><div style={{ fontWeight: 800, fontSize: 18, color: C.primary }}>MediConnect</div><div style={{ fontSize: 11, color: C.muted }}>{user.name}{subtitle ? ` • ${subtitle}` : ""}</div></div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={s.badge(roleColor)}>{role.toUpperCase()}</span>
            <button onClick={onLogout} style={{ ...s.btn("ghost"), padding: "6px 12px", fontSize: 12 }}>Logout</button>
          </div>
        </div>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 20px", display: "flex" }}>
          {tabs.map(([t, label]) => (
            <button key={t} onClick={() => onTabChange(t)} style={{ padding: "10px 18px", border: "none", borderBottom: `3px solid ${activeTab === t ? roleColor : "transparent"}`, background: "transparent", fontFamily: "inherit", fontSize: 13, cursor: "pointer", color: activeTab === t ? roleColor : C.muted, fontWeight: activeTab === t ? 700 : 400, marginBottom: -3 }}>{label}</button>
          ))}
        </div>
      </div>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 20px" }}>{children}</div>
    </div>
  );
}

function StatCard({ icon, label, value, color }) {
  return <div style={{ ...s.card, padding: 20, textAlign: "center", borderTop: `4px solid ${color}` }}><div style={{ fontSize: 32, marginBottom: 8 }}>{icon}</div><div style={{ fontSize: 32, fontWeight: 800, color }}>{value}</div><div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{label}</div></div>;
}

function PendingCard({ user, onApprove, onReject }) {
  return (
    <div style={{ ...s.card, padding: 16, marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center", borderLeft: `4px solid ${C.danger}` }}>
      <div><div style={{ fontWeight: 700 }}>{user.name} <span style={s.badge(user.role === "doctor" ? C.primary : C.accent)}>{user.role}</span></div><div style={{ color: C.muted, fontSize: 12 }}>{user.email}{user.specialization ? ` • ${user.specialization}` : ""}</div></div>
      <div style={{ display: "flex", gap: 8 }}><button onClick={onApprove} style={s.btn("accent")}>✓ Approve</button><button onClick={onReject} style={s.btn("danger")}>✕ Reject</button></div>
    </div>
  );
}

function UserCard({ user, extra, onDelete }) {
  return (
    <div style={{ ...s.card, padding: 16, marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div><div style={{ fontWeight: 700 }}>{user.name}</div><div style={{ color: C.muted, fontSize: 12 }}>{user.unique_id} • {extra} • {user.email}</div><div style={{ marginTop: 4 }}><span style={s.badge(user.approved ? C.accent : C.danger)}>{user.approved ? "Active" : "Pending"}</span></div></div>
      <button onClick={onDelete} style={{ background: "none", border: "none", color: `${C.danger}66`, cursor: "pointer", fontSize: 20, padding: 4 }}>🗑</button>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text", textarea, noMargin }) {
  return (
    <div style={{ marginBottom: noMargin ? 0 : 14 }}>
      <label style={s.label}>{label}</label>
      {textarea ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ ...s.input, height: 80, resize: "vertical", marginBottom: 0 }} /> : <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ ...s.input, marginBottom: 0 }} />}
    </div>
  );
}

function Empty({ text }) {
  return <div style={{ textAlign: "center", color: C.muted, padding: "48px 20px", fontSize: 15 }}>🗂 {text}</div>;
}

const headingStyle = { fontSize: 20, fontWeight: 800, marginBottom: 18, color: C.text };
