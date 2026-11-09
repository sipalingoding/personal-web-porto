import { useState } from 'react';
import { API_URL, logoUrl } from '../data/api';
import type { Partner } from '../data/content';

/** The partner's logo in its own colours, or its name when there is no logo or the file fails to load. */
export default function PartnerMark({ partner }: { partner: Partner }) {
  const src = partner.logo && API_URL ? logoUrl(partner.logo) : '';
  const [failed, setFailed] = useState('');

  if (!src || failed === src) return <>{partner.name}</>;

  return <img className="plogo" src={src} alt="" onError={() => setFailed(src)} />;
}
