import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import apiClient, { errorMessage } from '../api/apiClient.js';
import usePageMeta from '../hooks/usePageMeta.js';
import ListingGrid from '../components/listing/ListingGrid.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import { longDate } from '../lib/format.js';

export const AgentProfile = () => {
  const { id } = useParams();
  const [agent, setAgent] = useState(null);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiClient
      .get(`/users/agents/${id}`)
      .then((data) => {
        setAgent(data.agent);
        setListings(data.listings || []);
      })
      .catch((err) => setError(errorMessage(err, 'That agent could not be found')))
      .finally(() => setLoading(false));
  }, [id]);

  usePageMeta({
    title: agent ? agent.agencyName || agent.name : 'Agent',
    description: agent?.bio?.slice(0, 155),
  });

  if (loading) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="container py-16 text-center">
        <h1 className="font-heading text-2xl font-extrabold">Agent not found</h1>
        <p className="mt-2 text-dark-600 dark:text-dark-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="container py-10">
      <header className="card flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
        <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-primary-700 font-heading text-xl font-bold text-white">
          {agent.name?.[0]?.toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-heading text-2xl font-extrabold">
              {agent.agencyName || agent.name}
            </h1>
            {agent.verified ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-semibold text-primary-800">
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
                  <path d="M12 2l2.4 1.8 3-.3 1 2.8 2.6 1.5-1 2.9 1 2.9-2.6 1.5-1 2.8-3-.3L12 22l-2.4-1.8-3 .3-1-2.8L3 16.2l1-2.9-1-2.9 2.6-1.5 1-2.8 3 .3L12 2Z" />
                </svg>
                Verified agent
              </span>
            ) : null}
          </div>
          {agent.agencyName ? <p className="text-sm text-dark-600 dark:text-dark-400">{agent.name}</p> : null}
          {agent.bio ? <p className="mt-2 text-sm text-dark-700 dark:text-dark-300">{agent.bio}</p> : null}
          <p className="mt-2 text-xs text-dark-500">On TafutaKeja since {longDate(agent.createdAt)}</p>
        </div>
        <div className="flex gap-2 sm:flex-col">
          {agent.phone ? <a href={`tel:${agent.phone}`} className="btn-outline">Call</a> : null}
          {agent.whatsapp ? (
            <a
              href={`https://wa.me/254${agent.whatsapp.replace(/^(\+254|0)/, '')}`}
              target="_blank" rel="noreferrer noopener" className="btn-outline"
            >
              WhatsApp
            </a>
          ) : null}
        </div>
      </header>

      <section className="mt-10">
        <h2 className="mb-5 font-heading text-xl font-extrabold">
          {listings.length} {listings.length === 1 ? 'property' : 'properties'} on the market
        </h2>
        <ListingGrid listings={listings} />
      </section>
    </div>
  );
};

export default AgentProfile;
