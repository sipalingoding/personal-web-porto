import { useMemo, useState, type ChangeEvent } from 'react';
import { site } from '../data/site';
import { ArrowRight, ArrowUpRight } from './Icons';

type Form = { name: string; email: string; timeline: string; project: string };

const empty: Form = { name: '', email: '', timeline: '', project: '' };

export default function Contact() {
  const [form, setForm] = useState<Form>(empty);

  const set =
    (key: keyof Form) =>
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  // No backend: "Send" opens the visitor's mail app with the answers filled in.
  const mailHref = useMemo(() => {
    const subject = 'New project' + (form.name ? ` from ${form.name}` : '');
    const body = [
      `What I am building: ${form.project || '-'}`,
      `Timeline: ${form.timeline || '-'}`,
      `Name: ${form.name || '-'}`,
      `Email: ${form.email || '-'}`,
    ].join('\n');
    return `mailto:${site.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }, [form]);

  return (
    <section id="contact">
      <div className="wrap">
        <div className="cbox">
          <div>
            <span className="ix">
              <b>05/</b> Contact
            </span>
            <h2 className="hd">
              <span className="ln">Let's build</span>
              <span className="ln mu">something good.</span>
            </h2>
            <p className="lead">
              Tell me what you're working on. Send opens your mail app with the details below
              already filled in.
            </p>
            <a className="mailbig" href={`mailto:${site.email}`}>
              {site.email}
            </a>
            <div className="soc">
              <a className="lnk" href={site.linkedin} target="_blank" rel="noreferrer">
                LinkedIn
                <ArrowUpRight />
              </a>
              <a className="lnk" href={site.instagram} target="_blank" rel="noreferrer">
                Instagram
                <ArrowUpRight />
              </a>
            </div>
          </div>

          <form className="form" onSubmit={(e) => e.preventDefault()}>
            <label className="fld">
              <span>Name</span>
              <input type="text" name="name" autoComplete="name" value={form.name} onChange={set('name')} placeholder="Rina Pratama" />
            </label>
            <label className="fld">
              <span>Email</span>
              <input type="email" name="email" autoComplete="email" value={form.email} onChange={set('email')} placeholder="you@company.com" />
            </label>
            <label className="fld w">
              <span>Timeline (optional)</span>
              <input type="text" name="timeline" value={form.timeline} onChange={set('timeline')} placeholder="e.g. next quarter" />
            </label>
            <label className="fld w">
              <span>What are you building?</span>
              <textarea
                name="project"
                value={form.project}
                onChange={set('project')}
                placeholder="An internal dashboard, a company profile, a design system…"
              />
            </label>
            <div className="fsend">
              <span className="k2">Opens in your mail app</span>
              <a className="btn p" href={mailHref}>
                Send message
                <ArrowRight />
              </a>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
