import React from 'react';
import {
  Calendar,
  FileText,
  Users,
  ArrowRight,
  CheckCircle,
  Phone,
  MapPin,
  Clock,
} from
  'lucide-react';
import logoImg from '../assets/logoo.png';
import doctor1Img from '../assets/doctors/doctor1.png';
import doctor2Img from '../assets/doctors/doctor2.png';
import doctor3Img from '../assets/doctors/doctor3.png';
import doctor4Img from '../assets/doctors/doctor4.png';
interface Props {
  navigate: (page: string) => void;
}
export function LandingPage({ navigate }: Props) {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-800">
      {/* Navbar */}
      <nav className="border-b border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800/90 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={logoImg} alt="MedLink Logo" className="w-9 h-9 rounded-xl object-cover" />
            <div>
              <div className="font-bold text-slate-800 dark:text-slate-100 text-lg leading-none">
                MedLink
              </div>
              <div className="text-[11px] text-slate-400 dark:text-slate-500">
                Reganion Children Clinic
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('patient-login')}
              className="px-4 py-2 text-sm font-medium text-blue-600 rounded-lg transition-colors hover:bg-blue-50 dark:hover:bg-blue-900/20">

              Patient Login
            </button>
            <button
              onClick={() => navigate('doctor-admin-login')}
              className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">

              Doctor / Admin
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
          <CheckCircle size={12} /> More than 30 years of trusted service
        </div>
        <h1 className="text-5xl font-bold text-slate-900 dark:text-slate-100 leading-tight mb-5">
          Quality Pediatric Care,
          <br />
          <span className="text-blue-600">Simplified</span>
        </h1>
        <p className="text-lg text-slate-500 dark:text-slate-400 max-w-xl mx-auto mb-8 leading-relaxed">
          Reganion Children Clinic - Book appointments, access medical records,
          and manage your child's health all in one place.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <button
            onClick={() => navigate('patient-login')}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200">

            <Calendar size={18} /> Patient Portal
          </button>
          <button
            onClick={() => navigate('doctor-admin-login')}
            className="flex items-center gap-2 px-6 py-3 border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl hover:border-blue-300 hover:text-blue-600 transition-colors">

            Doctor / Admin Login <ArrowRight size={16} />
          </button>
        </div>
        <div className="flex items-center justify-center gap-6 mt-8 text-sm text-slate-400 dark:text-slate-500">
          <span className="flex items-center gap-1">
            <CheckCircle size={14} className="text-green-500" /> Secure &
            Private
          </span>
          <span className="flex items-center gap-1">
            <CheckCircle size={14} className="text-green-500" /> Easy to Use
          </span>
          <span className="flex items-center gap-1">
            <CheckCircle size={14} className="text-green-500" /> 24/7 Access
          </span>
        </div>
      </section>

      {/* Features */}
      <section className="bg-slate-50 dark:bg-slate-900/40 py-16">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 text-center mb-10">
            Everything you need in one place
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: Calendar,
                title: 'Easy Appointment Booking',
                desc: 'Book appointments online anytime. Choose your preferred doctor and time slot with real-time availability.',
                color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600'
              },
              {
                icon: FileText,
                title: 'Digital Medical Records',
                desc: 'Access lab results, prescriptions, and medical history securely from any device, anytime.',
                color: 'bg-green-50 text-green-600'
              },
              {
                icon: Users,
                title: 'Expert Pediatric Doctors',
                desc: 'Our team of experienced pediatricians provide the best care for your children.',
                color: 'bg-purple-50 text-purple-600'
              }].
              map((f, i) =>
                <div
                  key={i}
                  className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">

                  <div
                    className={`w-12 h-12 rounded-xl ${f.color} flex items-center justify-center mb-4`}>

                    <f.icon size={22} />
                  </div>
                  <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-2">{f.title}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                    {f.desc}
                  </p>
                </div>
              )}
          </div>
        </div>
      </section>

      {/* Meet Our Doctors */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 text-center mb-3">
            Meet Our Doctors
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-center mb-10 max-w-xl mx-auto">
            Our team of experienced pediatricians is dedicated to providing the best care for your children.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                name: 'Dr. Celerina Gonzales-Reganion, MD, FPPS',
                specialty: 'General Pediatrics',
                description: 'Provides comprehensive pediatric care for newborns, infants, children, and adolescents, including wellness checkups, preventive care, and treatment of common childhood illnesses.',
                image: doctor1Img,
              },
              {
                name: 'Dr. Juan G. Reganion, MD',
                specialty: 'Pediatric Cardiologist',
                description: 'Specializes in diagnosing and managing heart conditions in infants, children, and adolescents, including congenital and acquired cardiac disorders.',
                image: doctor2Img,
              },
              {
                name: 'Dr. Jeanie Karen K. Uy, MD, DPPS, DPIDSP',
                specialty: 'General Pediatrics / Pediatric Infectious Disease',
                description: 'Provides general pediatric care and specializes in the prevention, diagnosis, and treatment of infectious diseases affecting infants, children, and adolescents.',
                image: doctor3Img,
              },
              {
                name: 'Dr. Patricia G. De Leon, MD',
                specialty: 'Pediatric Cardiologist',
                description: 'Specializes in diagnosing and managing heart conditions in infants, children, and adolescents, including congenital and acquired cardiac disorders.',
                image: doctor4Img,
              },
            ].map((doc, i) => (
              <div
                key={i}
                className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 text-center"
              >
                <img
                  src={doc.image}
                  alt={doc.name}
                  className="w-24 h-24 rounded-full object-cover mx-auto mb-4 border-4 border-blue-100 dark:border-blue-800"
                />
                <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-lg mb-1">{doc.name}</h3>
                <p className="text-sm font-medium text-blue-600 mb-2">{doc.specialty}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{doc.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="bg-blue-600 py-14">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-3">
            Book Your Appointment Online
          </h2>
          <p className="text-blue-100 mb-7">
            No more waiting in line. Schedule your child's visit in minutes.
          </p>
          <button
            onClick={() => navigate('patient-login')}
            className="px-8 py-3 bg-white dark:bg-slate-800 text-blue-600 font-bold rounded-xl hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors shadow-lg">

            Get Started Today
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 dark:text-slate-500 py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src={logoImg} alt="MedLink Logo" className="w-7 h-7 rounded-lg object-cover" />
            <span className="text-white font-semibold">MedLink</span>
            <span className="text-slate-500 dark:text-slate-400">- Reganion Children Clinic</span>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <span className="flex items-center gap-1.5">
              <MapPin size={13} /> 123 Clinic Street, City
            </span>
            <span className="flex items-center gap-1.5">
              <Phone size={13} /> (02) 8123-4567
            </span>
            <span className="flex items-center gap-1.5">
              <Clock size={13} /> Mon-Sat 8AM-5PM
            </span>
          </div>
        </div>
      </footer>
    </div>);

}

