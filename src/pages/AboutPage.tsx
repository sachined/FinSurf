import React from 'react';
import { motion } from 'motion/react';
import { Mail, Linkedin, Github, Globe, Briefcase, GraduationCap, Code2, Rocket, ArrowLeft, Quote, BookOpen } from 'lucide-react';
import { resumeData } from '../data/resumeData';
import { cn } from '../utils/cn';

interface AboutPageProps {
  onBack: () => void;
}

function SectionTitle({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-amber-500">
        <Icon size={16} className="text-white" />
      </div>
      <h2 className="text-lg font-black uppercase tracking-[0.2em] text-slate-700 dark:text-slate-200">
        {label}
      </h2>
    </div>
  );
}

export function AboutPage({ onBack }: AboutPageProps) {
  const d = resumeData;

  const card = "bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-[2rem] border border-white dark:border-slate-800 shadow-sm p-8";

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">

      {/* Back button */}
      <motion.button
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={onBack}
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-bold transition-all",
          "text-slate-500 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-800/60",
        )}
      >
        <ArrowLeft size={16} />
        Back to FinSurf
      </motion.button>

      {/* ── Hero Card ─────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className={cn(card, "flex flex-col sm:flex-row items-center sm:items-start gap-6")}
      >
        {/* Avatar */}
        {d.photo ? (
          <img
            src={d.photo}
            alt={d.name}
            className="w-20 h-20 rounded-3xl object-cover shrink-0 shadow-lg"
          />
        ) : (
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-white text-2xl font-black shrink-0 shadow-lg bg-amber-500">
            {d.avatarInitials}
          </div>
        )}

        <div className="text-center sm:text-left flex-1">
          <h1 className="text-3xl font-black tracking-tighter text-slate-800 dark:text-white leading-tight">
            {d.name}
          </h1>
          <p className="text-sm font-bold mt-1 text-amber-500 dark:text-amber-400">
            {d.title}
          </p>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 leading-relaxed">
            {d.tagline}
          </p>

          {/* Contact links */}
          <div className="flex flex-wrap justify-center sm:justify-start gap-3 mt-4">
            {d.contact.email && (
              <a href={`mailto:${d.contact.email}`} className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors">
                <Mail size={13} /> {d.contact.email}
              </a>
            )}
            {d.contact.linkedin && (
              <a href={d.contact.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors">
                <Linkedin size={13} /> LinkedIn
              </a>
            )}
            {d.contact.github && (
              <a href={d.contact.github} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors">
                <Github size={13} /> GitHub
              </a>
            )}
            {d.contact.website && (
              <a href={d.contact.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors">
                <Globe size={13} /> Website
              </a>
            )}
            <a href="/blog" className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors">
              <BookOpen size={13} /> Blog
            </a>
          </div>
        </div>
      </motion.div>

      {/* ── Stat Strip ────────────────────────────────────────────────────── */}
      {d.stats && d.stats.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3"
        >
          {d.stats.map((s) => (
            <div
              key={s.label}
              className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm rounded-2xl border border-white dark:border-slate-800 shadow-sm px-4 py-4 text-center"
            >
              <p className="text-lg font-black text-amber-500 dark:text-amber-400 leading-none">{s.value}</p>
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 mt-1 uppercase tracking-wider">{s.label}</p>
            </div>
          ))}
        </motion.div>
      )}

      {/* ── Bio ───────────────────────────────────────────────────────────── */}
      {d.bio.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={card}
        >
          <SectionTitle icon={Globe} label="About" />
          <div className="space-y-3">
            {d.bio.map((para, i) => (
              <p key={i} className="text-slate-800 dark:text-slate-100 leading-relaxed text-sm">
                {para}
              </p>
            ))}
          </div>

        </motion.div>
      )}

      {/* ── Skills ────────────────────────────────────────────────────────── */}
      {d.skills.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className={card}
        >
          <SectionTitle icon={Code2} label="Skills" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {d.skills.map((group) => (
              <div key={group.category}>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                  {group.category}
                </p>
                <div className="flex flex-wrap gap-2">
                  {group.items.map((skill) => (
                    <span
                      key={skill}
                      className="px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Experience ────────────────────────────────────────────────────── */}
      {d.experience.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={card}
        >
          <SectionTitle icon={Briefcase} label="Experience" />
          <div className="space-y-6">
            {d.experience.map((job, i) => (
              <div key={i} className="pl-4 border-l-2 border-amber-400/30">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-2">
                  <div>
                    <span className="font-black text-slate-800 dark:text-white text-sm">{job.role}</span>
                    <span className="text-slate-400 dark:text-slate-500 text-sm"> · {job.company}</span>
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 shrink-0">
                    {job.period}
                  </span>
                </div>
                <ul className="space-y-1">
                  {job.bullets.map((b, j) => (
                    <li key={j} className="text-slate-800 dark:text-slate-100 text-xs leading-relaxed flex gap-2">
                      <span className="mt-1.5 w-1 h-1 rounded-full shrink-0 bg-amber-500" />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Education ─────────────────────────────────────────────────────── */}
      {d.education.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className={card}
        >
          <SectionTitle icon={GraduationCap} label="Education" />
          <div className="space-y-3">
            {d.education.map((edu, i) => (
              <div key={i} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <div>
                  <span className="font-black text-slate-800 dark:text-white text-sm">{edu.degree}</span>
                  <span className="text-slate-400 dark:text-slate-500 text-sm"> · {edu.school}</span>
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {edu.year}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Projects ──────────────────────────────────────────────────────── */}
      {d.projects.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className={card}
        >
          <SectionTitle icon={Rocket} label="Projects" />
          <div className="space-y-4">
            {d.projects.map((proj, i) => (
              <div key={i} className="pl-4 border-l-2 border-amber-400/30">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-black text-slate-800 dark:text-white text-sm">{proj.name}</span>
                  {proj.url && (
                    <a
                      href={proj.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold uppercase tracking-wider hover:underline text-amber-500 dark:text-amber-400"
                    >
                      ↗ Visit
                    </a>
                  )}
                </div>
                <p className="text-slate-800 dark:text-slate-100 text-xs leading-relaxed">{proj.description}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Closing CTA ───────────────────────────────────────────────────── */}
      {d.cta && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className={cn(card, "text-center")}
        >
          <Quote size={20} className="mx-auto mb-4 text-amber-400/60" />
          <blockquote className="text-slate-800 dark:text-slate-100 italic text-sm leading-relaxed max-w-lg mx-auto">
            "{d.cta.quote}"
          </blockquote>
          <p className="text-xs font-bold text-amber-500 dark:text-amber-400 mt-2">— {d.cta.attribution}</p>

          <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
            <p className="font-black text-slate-800 dark:text-white text-base">{d.cta.headline}</p>
            <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">{d.cta.sub}</p>
            <div className="flex flex-wrap justify-center gap-3 mt-5">
              {d.contact.email && (
                <a
                  href={`mailto:${d.contact.email}`}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold bg-amber-500 hover:bg-amber-400 text-white transition-colors shadow-sm"
                >
                  <Mail size={14} /> Get in touch
                </a>
              )}
              {d.contact.linkedin && (
                <a
                  href={d.contact.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <Linkedin size={14} /> LinkedIn
                </a>
              )}
            </div>
          </div>
        </motion.div>
      )}

    </div>
  );
}
