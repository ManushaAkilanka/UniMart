import React, { useState } from 'react';
import { Button } from '../components/ui/Button';
import {
  Badge,
  VerifiedStudentBadge,
  CampusBadge,
  ConditionBadge,
} from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Checkbox } from '../components/ui/Checkbox';
import { ListingCard } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { Pagination } from '../components/ui/Pagination';
import { Avatar } from '../components/ui/Avatar';
import { CardSkeleton } from '../components/ui/Skeleton';

export const DesignCheck = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [inputValue, setInputValue] = useState('Casio fx-991ES Plus Scientific Calculator');
  const [currentPage, setCurrentPage] = useState(1);
  const [checkedState, setCheckedState] = useState(true);
  const [activePills, setActivePills] = useState([
    'Category: Academic',
    'Under Rs. 10,000',
    'Negotiable only',
  ]);

  const removePill = (pill) => {
    setActivePills(activePills.filter((p) => p !== pill));
  };

  return (
    <div className="flex flex-col gap-space-2xl pb-space-3xl">
      {/* Banner / Header */}
      <div className="bg-surface-container-low rounded-2xl p-space-lg md:p-space-xl border border-outline-variant/30 flex flex-col gap-space-xs">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-secondary inline-block animate-pulse"></span>
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary font-bold">
            Stitch UI/UX Verification Harness
          </span>
        </div>
        <h1 className="font-display-hero text-display-hero text-on-surface tracking-tight">
          UniMart Design System
        </h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant max-w-3xl">
          Visual verification ground for all tokens, atoms, and layout structures extracted directly
          from Stitch project <code className="text-secondary font-mono">476644850781708724</code>.
        </p>

        {/* Color Palette Tokens Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-space-xs pt-space-md">
          <div className="p-3 rounded-lg bg-secondary text-white text-center font-label-sm shadow-level1">
            <div className="font-bold">#006c4a</div>
            <div className="opacity-80 text-[10px]">secondary / emerald</div>
          </div>
          <div className="p-3 rounded-lg bg-secondary-container text-on-secondary-container text-center font-label-sm shadow-level1">
            <div className="font-bold">#82f5c1</div>
            <div className="opacity-80 text-[10px]">secondary-container</div>
          </div>
          <div className="p-3 rounded-lg bg-brand-navy text-white text-center font-label-sm shadow-level1">
            <div className="font-bold">#0F172A</div>
            <div className="opacity-80 text-[10px]">brand-navy</div>
          </div>
          <div className="p-3 rounded-lg bg-surface border border-outline-variant/40 text-on-surface text-center font-label-sm shadow-level1">
            <div className="font-bold">#F8F9FF</div>
            <div className="opacity-80 text-[10px]">surface / canvas</div>
          </div>
          <div className="p-3 rounded-lg bg-surface-container text-on-surface text-center font-label-sm shadow-level1">
            <div className="font-bold">#E5EEFF</div>
            <div className="opacity-80 text-[10px]">surface-container</div>
          </div>
          <div className="p-3 rounded-lg bg-status-success text-white text-center font-label-sm shadow-level1">
            <div className="font-bold">#10B981</div>
            <div className="opacity-80 text-[10px]">status-success</div>
          </div>
          <div className="p-3 rounded-lg bg-error text-white text-center font-label-sm shadow-level1">
            <div className="font-bold">#BA1A1A</div>
            <div className="opacity-80 text-[10px]">error</div>
          </div>
        </div>
      </div>

      {/* 1. BUTTONS */}
      <section className="flex flex-col gap-space-md">
        <div className="border-b border-outline-variant/20 pb-space-xs">
          <h2 className="font-headline-xl text-headline-xl text-on-surface">1. Buttons</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Primary (Emerald CTA), Secondary (Navy institutional), Outline, Ghost, Danger, and Surface.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-space-sm p-space-lg bg-surface-container-lowest rounded-xl border border-outline-variant/20">
          <Button variant="primary" size="md" leftIcon="add">
            Post Listing (Primary)
          </Button>
          <Button variant="secondary" size="md" leftIcon="lock">
            Sign In (Navy)
          </Button>
          <Button variant="outline" size="md" leftIcon="tune">
            Filter Options
          </Button>
          <Button variant="ghost" size="md" leftIcon="favorite">
            Ghost Action
          </Button>
          <Button variant="danger" size="md" leftIcon="delete">
            Delete Listing
          </Button>
          <Button variant="surface" size="md" rightIcon="arrow_forward">
            Claim for Pickup
          </Button>
          <Button variant="primary" size="md" isLoading={true}>
            Loading...
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-space-sm p-space-md bg-surface-container-lowest rounded-xl border border-outline-variant/20">
          <span className="font-label-sm text-on-surface-variant font-semibold uppercase mr-2">
            Sizes:
          </span>
          <Button variant="primary" size="sm" leftIcon="bolt">
            Small (32px)
          </Button>
          <Button variant="primary" size="md" leftIcon="bolt">
            Medium (40px)
          </Button>
          <Button variant="primary" size="lg" leftIcon="bolt">
            Large (48px)
          </Button>
        </div>
      </section>

      {/* 2. BADGES & PILLS */}
      <section className="flex flex-col gap-space-md">
        <div className="border-b border-outline-variant/20 pb-space-xs">
          <h2 className="font-headline-xl text-headline-xl text-on-surface">
            2. Badges, Chips & Student Verification
          </h2>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Condition badges, university verification shields, campus location pills, and removable
            filter chips.
          </p>
        </div>

        <div className="flex flex-col gap-space-md p-space-lg bg-surface-container-lowest rounded-xl border border-outline-variant/20">
          {/* Student Verification & Campus */}
          <div className="flex flex-wrap items-center gap-space-sm">
            <VerifiedStudentBadge domain="@cmb.ac.lk" />
            <VerifiedStudentBadge domain="@uom.ac.lk" />
            <CampusBadge campus="University of Colombo" faculty="Science Quad" />
            <CampusBadge campus="University of Moratuwa" faculty="Eng Dept" />
          </div>

          {/* Condition Badges */}
          <div className="flex flex-wrap items-center gap-space-sm">
            <ConditionBadge condition="Brand New" />
            <ConditionBadge condition="Like New" />
            <ConditionBadge condition="Used - Good" />
            <ConditionBadge condition="Fair / Negotiable" />
            <Badge variant="free">Free (Rs. 0)</Badge>
            <Badge variant="success">Transaction Completed</Badge>
            <Badge variant="warning">Price Dropped</Badge>
            <Badge variant="danger">Prohibited Item</Badge>
          </div>

          {/* Active Filter Pills (Removable) */}
          <div className="flex flex-wrap items-center gap-space-xs pt-space-xs border-t border-outline-variant/15">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold mr-1">
              Active Filters:
            </span>
            {activePills.map((pill) => (
              <Badge
                key={pill}
                variant="emerald"
                size="md"
                removable={true}
                onRemove={() => removePill(pill)}
              >
                {pill}
              </Badge>
            ))}
            {activePills.length < 3 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setActivePills(['Category: Academic', 'Under Rs. 10,000', 'Negotiable only'])
                }
              >
                Reset pills
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* 3. INPUTS & SELECTS */}
      <section className="flex flex-col gap-space-md">
        <div className="border-b border-outline-variant/20 pb-space-xs">
          <h2 className="font-headline-xl text-headline-xl text-on-surface">
            3. Inputs, Selects & Checkboxes
          </h2>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Text fields with character counting, keyboard hints, error states, and custom chevrons.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-space-lg p-space-lg bg-surface-container-lowest rounded-xl border border-outline-variant/20">
          {/* Search Input */}
          <Input
            label="Campus Search Bar"
            leftIcon="search"
            kbdShortcut="⌘K"
            placeholder="Search textbooks, laptops, calculators, hostel items..."
            helperText="Instant peer-to-peer filter by faculty or keyword."
          />

          {/* Title with Char Counter */}
          <Input
            label="Listing Title"
            required={true}
            value={inputValue}
            maxLength={90}
            onChange={(e) => setInputValue(e.target.value)}
            helperText="Include brand, model, and primary faculty application."
          />

          {/* Select Dropdown */}
          <Select
            label="Primary Category"
            required={true}
            options={[
              'Academic & Study Tools',
              'Textbooks & Past Paper Bundles',
              'Laptops & Campus Electronics',
              'Hostel & Dorm Room Gear',
              'Campus Bicycles & Transport',
              'Student Mutual Free Pool',
            ]}
          />

          {/* Input with Error State */}
          <Input
            label="Price in Sri Lankan Rupees"
            required={true}
            placeholder="e.g., 4500"
            defaultValue="-500"
            error="Price must be 0 (free) or a positive integer in LKR."
          />

          {/* Checkboxes */}
          <div className="md:col-span-2 flex flex-col sm:flex-row gap-space-md pt-space-xs border-t border-outline-variant/15">
            <Checkbox
              label="Verified Students Only"
              description="Hide unverified guest posts across Colombo campus"
              checked={checkedState}
              onChange={(e) => setCheckedState(e.target.checked)}
              icon="verified"
              className="flex-1 p-space-sm rounded-lg bg-surface-container-low"
            />

            <Checkbox
              label="Negotiable Pricing"
              description="Open to student counter-offers during campus meetup"
              badge="64 items"
              checked={true}
              onChange={() => {}}
              className="flex-1 p-space-sm rounded-lg bg-surface-container-low"
            />
          </div>
        </div>
      </section>

      {/* 4. MARKETPLACE CARDS & SKELETON */}
      <section className="flex flex-col gap-space-md">
        <div className="border-b border-outline-variant/20 pb-space-xs">
          <h2 className="font-headline-xl text-headline-xl text-on-surface">
            4. Marketplace Listing Cards & Skeletons
          </h2>
          <p className="font-body-md text-body-md text-on-surface-variant">
            4:3 ratio image container, condition overlay, price in LKR, and verified seller badge.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-space-lg">
          {/* Card 1: Casio */}
          <ListingCard
            title="Casio fx-991EX ClassWiz Scientific Calculator"
            price={6500}
            isNegotiable={true}
            condition="Like New"
            location="Science Faculty Quad"
            timeAgo="2h ago"
            imageUrl="https://lh3.googleusercontent.com/aida-public/AB6AXuDiCFf56EdSdlQVXHjvmlmoDqtqEYm-Kz7598FsocHHTBaOuvukFDVFyprw83gJiDaIEwdfU2bPgRrejtqFPko3oIuY25MybdQBJkCzWYh6uZoUwWoLW2Th1Mszkxwq80gIymfajteJ1AxfDCcEqdahfbDg_p0LK1pZHsnzybCj_Pqy5cjYra31xCRpyvR6xr3h-ZvRNERTUb3E-wx-9kHiqSSeMy5F4MRusjw3uI-OoDwdNGQuyEg"
            seller={{
              name: 'Kaveen P.',
              isVerified: true,
              emailDomain: '@cmb.ac.lk',
            }}
          />

          {/* Card 2: Organic Chemistry Book */}
          <ListingCard
            title="Organic Chemistry Loudon & Parise 6th Ed + Study Guide"
            price={4200}
            isNegotiable={false}
            condition="Very Good"
            location="Chemistry Dept · Room 302"
            timeAgo="2d ago"
            imageUrl="https://lh3.googleusercontent.com/aida-public/AB6AXuAP1cK1SzYDgIYX_EJ4b81o3P2mtGqJ2oy1aQ5DXkYg77bd_vdx7EBdaeViUjjKpbKS-NO0lFhH0fc4q4umre4jwrgM_l6YBGFKCXPUnDmplU6UdeaOGamzSIq2a3PUt0B0JPiVv8VH2oHXD8S1Bkk5WHkB_l8gY0sDvV3v__c0yUogHtY_TXpZooFtNgW8Si4BO5FkxDeJde0GxZHKsrY8pTgOhj2PCmxkAlIVUYgvse2fj0JSEko"
            seller={{
              name: 'Malsha F.',
              isVerified: true,
              emailDomain: '@cmb.ac.lk',
            }}
          />

          {/* Card 3: Skeleton Loader */}
          <CardSkeleton />
        </div>
      </section>

      {/* 5. AVATARS & PAGINATION */}
      <section className="flex flex-col gap-space-md">
        <div className="border-b border-outline-variant/20 pb-space-xs">
          <h2 className="font-headline-xl text-headline-xl text-on-surface">
            5. Avatars & Pagination Controls
          </h2>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Initials fallback with university verification badges and complete catalog pagination.
          </p>
        </div>

        <div className="flex flex-col gap-space-lg p-space-lg bg-surface-container-lowest rounded-xl border border-outline-variant/20">
          <div className="flex flex-wrap items-center gap-space-lg">
            <div className="flex items-center gap-2">
              <Avatar name="Kaveen Perera" size="sm" isVerified={true} />
              <span className="font-label-sm">Small (24px)</span>
            </div>
            <div className="flex items-center gap-2">
              <Avatar name="Dinuka S." size="md" isVerified={true} />
              <span className="font-label-sm">Medium (32px)</span>
            </div>
            <div className="flex items-center gap-2">
              <Avatar name="Malsha Fernando" size="lg" isVerified={true} />
              <span className="font-label-sm">Large (40px)</span>
            </div>
            <div className="flex items-center gap-2">
              <Avatar name="Ravindu Chathuranga" size="xl" isVerified={true} />
              <span className="font-label-sm">Extra Large (56px)</span>
            </div>
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={12}
            totalItems={148}
            itemsPerPage={9}
            onPageChange={(page) => setCurrentPage(page)}
          />
        </div>
      </section>

      {/* 6. MODAL DEMO */}
      <section className="flex flex-col gap-space-md">
        <div className="border-b border-outline-variant/20 pb-space-xs">
          <h2 className="font-headline-xl text-headline-xl text-on-surface">6. Dialog Modal</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Level 4 elevation modal with backdrop scrim blur and keyboard accessibility.
          </p>
        </div>

        <div className="p-space-lg bg-surface-container-lowest rounded-xl border border-outline-variant/20 flex items-center justify-between">
          <div>
            <h3 className="font-headline-md text-on-surface">Test Modal Dialog</h3>
            <p className="font-body-sm text-on-surface-variant">
              Opens message seller dialog / campus meetup guarantee overlay.
            </p>
          </div>
          <Button variant="primary" size="md" leftIcon="chat" onClick={() => setModalOpen(true)}>
            Open Message Seller Modal
          </Button>
        </div>

        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Message Seller (Kaveen P.)"
          subtitle="Casio fx-991EX ClassWiz · Rs. 6,500 (Negotiable)"
          footer={
            <>
              <Button variant="outline" size="sm" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                leftIcon="send"
                onClick={() => setModalOpen(false)}
              >
                Send Message
              </Button>
            </>
          }
        >
          <div className="flex flex-col gap-space-sm py-1">
            <div className="p-space-sm rounded-lg bg-surface-container-low flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-secondary text-xl">verified_user</span>
              <p className="font-body-sm text-body-sm text-on-surface">
                <strong>Honor Code:</strong> You are messaging from a verified{' '}
                <span className="text-secondary font-semibold">@cmb.ac.lk</span> student account.
              </p>
            </div>

            <Select
              label="Proposed Campus Meetup Spot"
              options={[
                'Main Library Entrance (Daylight hours)',
                'Science Faculty Canteen',
                'UCSC Ground Floor Lobby',
                'Reid Avenue Security Gate',
              ]}
            />

            <Input
              label="Your Message"
              placeholder="Hi! Is this still available? Can we meet today during lunch break?"
              defaultValue="Hi Kaveen! Is the Casio fx-991EX still available? I can meet at the Science Quad around 1:15 PM."
            />
          </div>
        </Modal>
      </section>
    </div>
  );
};
