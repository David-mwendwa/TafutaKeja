import { Link } from 'react-router-dom';
import usePageMeta from '../hooks/usePageMeta.js';
import { site } from '../data/site.js';

export const About = () => {
  usePageMeta({
    title: 'About',
    description:
      'A Kenyan property marketplace built with the MERN stack. Search by estate, compare rent against service charge and deposit, shortlist places and message the agent.',
  });

  return (
    <div className="container max-w-3xl py-14">
      <h1 className="font-heading text-4xl font-extrabold">About {site.name}</h1>

      <div className="prose prose-dark mt-6 max-w-none dark:prose-invert">
        <p className="lead text-lg text-dark-700 dark:text-dark-300">
          <strong>Tafuta keja</strong> is “look for a house”, Swahili and Sheng together. It is what most people in
          Nairobi are actually doing when they open a property site: not browsing an
          investment portfolio, but trying to find somewhere to live by the end of the month.
        </p>

        <h2>What it does</h2>
        <p>
          TafutaKeja is a property marketplace covering the whole journey: searching by estate
          rather than by county, comparing rent against service charge and deposit, saving
          places to a shortlist with private notes, and messaging the agent in a thread that
          both sides can read afterwards.
        </p>
        <p>
          Agents get a dashboard to draft, publish and manage listings, upload photographs and
          answer enquiries. Every listing passes through a moderation queue before it goes
          live, and editing a published listing sends it back for review, because an approval that
          only applies to the words that were there at the time is not much of an approval.
        </p>

        <h2>About the listings</h2>
        <p>
          There is no open feed of Kenyan property, so the properties here are{' '}
          <strong>composed rather than real</strong>. None of them is a place you could go
          and rent. What is real is the part that makes the product worth building:
        </p>
        <ul>
          <li>
            the neighbourhoods and their coordinates: Kilimani, Buruburu, Syokimau, Nyali,
            Elgon View and thirty-odd others
          </li>
          <li>
            the price bands each one actually trades in, so a bedsitter in Juja and a
            four-bedroom in Runda are priced the way the market prices them
          </li>
          <li>the photography, and the amenities Kenyan listings genuinely advertise: borehole
            water, a backup generator, a DSQ</li>
        </ul>

        <h2>How it is built</h2>
        <p>
          React and Vite on the front, Express and MongoDB behind it, with photographs resized
          into responsive WebP at three widths so a page of twelve properties costs a couple of
          hundred kilobytes rather than several megabytes. The public pages are prerendered to
          static HTML at build time, and each property page carries structured data, though a
          property that has been let or sold drops it and asks not to be indexed, because
          advertising something nobody can rent is worse than saying nothing.
        </p>
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link to="/listings" className="btn-primary">Browse properties</Link>
        <Link to="/register?role=agent" className="btn-outline">List a property</Link>
      </div>
    </div>
  );
};

export default About;
