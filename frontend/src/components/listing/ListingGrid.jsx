import ListingCard from './ListingCard.jsx';
import EmptyState from '../ui/EmptyState.jsx';

const Skeleton = () => (
  <div className="card overflow-hidden">
    <div className="skeleton aspect-[4/3] rounded-none" />
    <div className="space-y-2 p-4">
      <div className="skeleton h-5 w-24" />
      <div className="skeleton h-4 w-full" />
      <div className="skeleton h-4 w-2/3" />
    </div>
  </div>
);

export const ListingGrid = ({ listings, loading, count = 6, showStatus, empty, onSavedChange }) => {
  if (loading) {
    return (
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: count }, (_, i) => (
          <Skeleton key={i} />
        ))}
      </div>
    );
  }

  if (!listings?.length) {
    return empty || <EmptyState title="No properties found">Try widening your search.</EmptyState>;
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {listings.map((listing) => (
        <ListingCard
          key={listing._id}
          listing={listing}
          showStatus={showStatus}
          onSavedChange={onSavedChange}
        />
      ))}
    </div>
  );
};

export default ListingGrid;
