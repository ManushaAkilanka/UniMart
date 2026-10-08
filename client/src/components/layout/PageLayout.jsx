import React, { useState } from 'react';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { PendingApprovalBanner } from '../ui/PendingApprovalBanner';
import { cn } from '../../utils/cn';

export const PageLayout = ({ children, className, fullWidth = false }) => {
  const [campusModalOpen, setCampusModalOpen] = useState(false);
  const [selectedCampus, setSelectedCampus] = useState('uoc');

  const campuses = [
    {
      id: 'uoc',
      name: 'University of Colombo',
      subtitle: 'Main Campus (Science, Arts, Management, UCSC, Law)',
      activeCount: '1,248 active listings',
    },
    {
      id: 'uom',
      name: 'University of Moratuwa',
      subtitle: 'Katubedda Campus (Engineering, Architecture, IT)',
      activeCount: '980 active listings',
    },
    {
      id: 'uop',
      name: 'University of Peradeniya',
      subtitle: 'Peradeniya Campus (Engineering, Science, Arts, Med)',
      activeCount: '815 active listings',
    },
    {
      id: 'sliit',
      name: 'SLIIT Malabe',
      subtitle: 'New Horizon Campus (Computing, Business, Engineering)',
      activeCount: '640 active listings',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-surface text-on-surface">
      {/* Persistent Navbar */}
      <Navbar onOpenCampusModal={() => setCampusModalOpen(true)} />

      {/* Pending approval banner — only visible to pending_approval users */}
      <PendingApprovalBanner />

      {/* Main Content Body */}
      <main id="main-content" className="flex-1 w-full pt-20 bg-surface">
        <div
          className={cn(
            'w-full mx-auto',
            !fullWidth && 'max-w-7xl px-margin md:px-margin-md lg:px-margin-lg py-space-xl',
            className
          )}
        >
          {children}
        </div>
      </main>

      {/* Footer */}
      <Footer />

      {/* Campus Selector Modal */}
      <Modal
        isOpen={campusModalOpen}
        onClose={() => setCampusModalOpen(false)}
        title="Select Your Campus Hub"
        subtitle="Trade directly with students in your lecture halls and hostels."
        maxWidth="max-w-md"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setCampusModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setCampusModalOpen(false);
              }}
            >
              Confirm Campus
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-space-xs py-1">
          {campuses.map((c) => {
            const isSelected = selectedCampus === c.id;
            return (
              <div
                key={c.id}
                onClick={() => setSelectedCampus(c.id)}
                className={cn(
                  'p-space-sm rounded-xl border cursor-pointer transition-all flex items-start justify-between gap-3',
                  isSelected
                    ? 'border-secondary bg-secondary-container/20 shadow-level1'
                    : 'border-outline-variant/30 bg-surface-container-lowest hover:bg-surface-container-low'
                )}
              >
                <div className="flex flex-col">
                  <span className="font-headline-sm text-headline-sm text-on-surface font-semibold flex items-center gap-1.5">
                    {isSelected && (
                      <span className="material-symbols-outlined text-secondary text-base leading-none">
                        check_circle
                      </span>
                    )}
                    <span>{c.name}</span>
                  </span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">
                    {c.subtitle}
                  </span>
                  <span className="font-code-sm text-code-sm text-secondary font-medium mt-1">
                    {c.activeCount}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </Modal>
    </div>
  );
};
