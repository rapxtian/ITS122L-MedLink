import { useState, Fragment } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  User,
  Baby,
  Phone } from 'lucide-react';
import logoImg from '../assets/logoo.png';
import { useAuth } from '../context/AuthContext';

interface Props {
  navigate: (page: string) => void;
}

export function RegisterPage({ navigate }: Props) {
  const { register } = useAuth();
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1: Parent
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  // Step 2: Child
  const [childName, setChildName] = useState('');
  const [childDob, setChildDob] = useState('');
  const [childGender, setChildGender] = useState('');
  const [allergies, setAllergies] = useState('');
  const [medicalHistory, setMedicalHistory] = useState('');

  // Step 3: Emergency
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyRelation, setEmergencyRelation] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');

  const steps = [
    { num: 1, label: 'Parent Info', icon: User },
    { num: 2, label: 'Child Patient', icon: Baby },
    { num: 3, label: 'Emergency Contact', icon: Phone },
  ];

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (step < 3) {
      setStep(step + 1);
      return;
    }
    await handleRegister();
  };

  const handleRegister = async () => {
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    if (!fullName || !email || !password) { setError('Please fill in all required fields.'); return; }
    setLoading(true);
    setError('');
    try {
      await register({
        full_name: fullName,
        email,
        password,
        confirm_password: confirmPassword,
        contact_number: phone,
        address,
        child_name: childName,
        child_dob: childDob,
        child_gender: childGender,
        child_allergies: allergies,
        child_medical_history: medicalHistory,
        emergency_contact_name: emergencyName,
        emergency_contact_relationship: emergencyRelation,
        emergency_contact_number: emergencyPhone,
      });
      setSubmitted(true);
    } catch (err: any) {
      setError(err?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900/40 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-10 text-center max-w-sm w-full">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Registration Successful!</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Your account has been created. You can now log in to the patient portal.</p>
          <button onClick={() => navigate('patient-login')}
            className="w-full bg-blue-600 text-white font-semibold py-3 rounded-xl hover:bg-blue-700 transition-colors">
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900/40 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 p-8">
          <div className="mb-4">
            <button
              onClick={() => navigate('patient-login')}
              className="inline-flex items-center text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
              title="Back"
              aria-label="Back"
            >
              <ArrowLeft size={16} />
            </button>
          </div>

          {/* Header */}
          <div className="text-center mb-7">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 overflow-hidden">
              <img src={logoImg} alt="MedLink Logo" className="w-full h-full object-cover" />
            </div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Create Your Account</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Register for Reganion Children Clinic</p>
          </div>

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {steps.map((s, i) =>
              <Fragment key={s.num}>
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${step === s.num ? 'bg-blue-600 text-white' : step > s.num ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400 dark:text-slate-500'}`}>
                  {step > s.num ? <CheckCircle size={12} /> : <s.icon size={12} />}
                  {s.label}
                </div>
                {i < steps.length - 1 && <div className={`h-px w-6 ${step > s.num ? 'bg-green-300' : 'bg-slate-200'}`} />}
              </Fragment>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Step 1 */}
            {step === 1 && (
              <div className="space-y-4 fade-in">
                <h3 className="font-semibold text-slate-700 dark:text-slate-300 mb-3">Parent / Guardian Information</h3>
                {[
                  { label: 'Full Name', value: fullName, set: setFullName, type: 'text', placeholder: 'Maria Santos' },
                  { label: 'Email Address', value: email, set: setEmail, type: 'email', placeholder: 'maria@email.com' },
                  { label: 'Password', value: password, set: setPassword, type: 'password', placeholder: '********' },
                  { label: 'Confirm Password', value: confirmPassword, set: setConfirmPassword, type: 'password', placeholder: '********' },
                  { label: 'Contact Number', value: phone, set: setPhone, type: 'tel', placeholder: '+63 912 345 6789' },
                ].map((f) =>
                  <div key={f.label}>
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">{f.label}</label>
                    <input type={f.type} placeholder={f.placeholder} value={f.value}
                      onChange={(e) => f.set(e.target.value)}
                      autoComplete={
                        f.label === 'Full Name' ? 'name'
                        : f.label === 'Email Address' ? 'email'
                        : f.label === 'Password' ? 'new-password'
                        : f.label === 'Confirm Password' ? 'new-password'
                        : f.label === 'Contact Number' ? 'tel'
                        : 'off'
                      }
                      className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">Home Address</label>
                  <textarea rows={2} placeholder="123 Main Street, City, Province" value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    autoComplete="street-address"
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none" />
                </div>
              </div>
            )}

            {/* Step 2 */}
            {step === 2 && (
              <div className="space-y-4 fade-in">
                <h3 className="font-semibold text-slate-700 dark:text-slate-300 mb-3">Child Patient Information</h3>
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">Child's Full Name</label>
                  <input type="text" placeholder="Juan Santos" value={childName}
                    onChange={(e) => setChildName(e.target.value)}
                    autoComplete="name"
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">Date of Birth</label>
                    <input type="date" title="Child date of birth" value={childDob} onChange={(e) => setChildDob(e.target.value)}
                      autoComplete="bday"
                      className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">Gender</label>
                    <div className="flex gap-3 mt-2">
                      {['Male', 'Female'].map((g) =>
                        <label key={g} className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300 cursor-pointer">
                          <input type="radio" name="gender" value={g} checked={childGender === g}
                            onChange={() => setChildGender(g)} className="accent-blue-600" /> {g}
                        </label>
                      )}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">Known Allergies</label>
                  <textarea rows={2} placeholder="e.g., Penicillin, Peanuts (leave blank if none)" value={allergies}
                    onChange={(e) => setAllergies(e.target.value)}
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">Medical History</label>
                  <textarea rows={3} placeholder="Previous conditions, surgeries, or ongoing treatments..." value={medicalHistory}
                    onChange={(e) => setMedicalHistory(e.target.value)}
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none" />
                </div>
              </div>
            )}

            {/* Step 3 */}
            {step === 3 && (
              <div className="space-y-4 fade-in">
                <h3 className="font-semibold text-slate-700 dark:text-slate-300 mb-3">Emergency Contact</h3>
                {[
                  { label: 'Contact Person Name', value: emergencyName, set: setEmergencyName, placeholder: 'Jose Santos' },
                  { label: 'Relationship', value: emergencyRelation, set: setEmergencyRelation, placeholder: 'Father / Grandfather / etc.' },
                  { label: 'Contact Number', value: emergencyPhone, set: setEmergencyPhone, placeholder: '+63 912 345 6789' },
                ].map((f) =>
                  <div key={f.label}>
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">{f.label}</label>
                    <input type="text" placeholder={f.placeholder} value={f.value}
                      onChange={(e) => f.set(e.target.value)}
                      autoComplete={f.label === 'Contact Number' ? 'tel' : 'name'}
                      className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
                  </div>
                )}
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 text-sm text-blue-700 dark:text-blue-300 mt-2">
                  By registering, you agree to our Terms of Service and Privacy Policy. Your data is protected and secure.
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-7 pt-5 border-t border-slate-100 dark:border-slate-700">
              <button type="button" onClick={() => step === 1 ? navigate('patient-login') : setStep(step - 1)}
                className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 dark:bg-slate-900/40 text-sm font-medium transition-colors">
                <ArrowLeft size={14} /> {step === 1 ? 'Back to Login' : 'Previous'}
              </button>
              {step < 3 ? (
                <button type="submit"
                  className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors">
                  Next <ArrowRight size={14} />
                </button>
              ) : (
                <button type="submit" disabled={loading}
                  className="flex items-center gap-2 px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium transition-colors disabled:opacity-50">
                  {loading ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Registering...</>
                  ) : (
                    <><CheckCircle size={14} /> Register</>
                  )}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

